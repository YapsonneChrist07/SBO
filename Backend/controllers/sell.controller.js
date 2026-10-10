const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');
const { currentUnitPrices } = require('../utils/pricing');
const { shippingOptions } = require('../utils/shipping');

const validItems = (items) => Array.isArray(items) && items.length > 0
  && items.every((i) => i && typeof i.productID === 'string' && Number.isInteger(Number(i.quantity)) && Number(i.quantity) >= 1);

// The delivery city: the one entered at checkout, else the shopper's saved address.
const deliveryCityID = async (conn, contactID, cityID) => {
  if (cityID) return cityID;
  const [[row]] = await conn.query(
    'SELECT a.cityID FROM contact c JOIN address a ON a.addressID = c.addressID WHERE c.contactID = ?',
    [contactID]
  );
  return row?.cityID || null;
};

const NO_TRANSPORTER = 'Aucun transporteur ne livre encore à cette adresse. Choisissez une autre ville ou contactez SBO.';

// Delivery choices and prices for a cart, shown at checkout before the order is placed.
const shippingQuote = async (req, res) => {
  const { items, cityID } = req.body;
  if (!validItems(items)) return error(res, 'At least one valid item is required', 400);
  try {
    const city = await deliveryCityID(db, req.user.contactID, cityID);
    const { weight, country, options } = await shippingOptions(db, { cityID: city, items });
    return success(res, {
      weight,
      country,
      options: options.map(({ contactID, ...o }) => o),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

const getAll = async (req, res) => {
  try {
    const { clientContactID, mine, completed, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    const isAdmin = !!req.user.adminEntity;

    const where = ['1=1'];
    const params = [];

    // Non-admins can only ever see their own orders, regardless of what they pass.
    if (!isAdmin || mine === 'true') {
      where.push('s.clientContactID = ?');
      params.push(req.user.contactID);
    } else if (clientContactID) {
      where.push('s.clientContactID = ?');
      params.push(clientContactID);
    }
    if (completed !== undefined) { where.push('s.completed = ?'); params.push(completed === 'true' ? 1 : 0); }
    if (isAdmin && search) {
      where.push('(s.sellID LIKE ? OR ct.firstName LIKE ? OR ct.lastName LIKE ? OR ct.username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereSql = where.join(' AND ');

    const [rows] = await db.query(
      `SELECT s.sellID, s.sellDate, s.total, s.subTotal, s.tax, s.transportCost,
              CAST(s.completed AS UNSIGNED) AS completed,
              ct.contactID AS clientContactID, ct.firstName, ct.lastName, ct.username,
              b.name AS brokerName
       FROM sell s
       LEFT JOIN contact ct ON ct.contactID = s.clientContactID
       LEFT JOIN broker b ON b.brokerID = s.brokerID
       WHERE ${whereSql}
       ORDER BY s.sellDate DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM sell s LEFT JOIN contact ct ON ct.contactID = s.clientContactID WHERE ${whereSql}`,
      params
    );

    return success(res, { orders: rows, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, CAST(s.completed AS UNSIGNED) AS completed,
              ct.firstName, ct.lastName, ct.username, ct.email AS clientEmail,
              b.name AS brokerName, t.name AS transporterName,
              a.lineOfAddress, a.postalCode, a.phone AS addressPhone, ci.name AS cityName
       FROM sell s
       LEFT JOIN contact ct ON ct.contactID = s.clientContactID
       LEFT JOIN broker b ON b.brokerID = s.brokerID
       LEFT JOIN transporter t ON t.transporterID = s.transporterID
       LEFT JOIN address a ON a.addressID = ct.addressID
       LEFT JOIN city ci ON ci.cityID = a.cityID
       WHERE s.sellID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Sale not found', 404);
    const order = rows[0];
    const isAdmin = !!req.user.adminEntity;
    if (!isAdmin && order.clientContactID !== req.user.contactID) {
      return error(res, 'Sale not found', 404);
    }
    const [details] = await db.query(
      `SELECT sd.*, p.name AS productName, l.lenghtValue
       FROM selldetails sd
       JOIN product p ON p.productID = sd.productID
       LEFT JOIN lenghtlookup l ON l.lenghtID = sd.lenghtID
       WHERE sd.sellID = ?`,
      [req.params.id]
    );
    const [payments] = await db.query(
      `SELECT pay.*, pm.paymentMethodName FROM payment pay
       JOIN paymentmethod pm ON pm.paymentMethodID = pay.paymentMethodID
       WHERE pay.sellID = ?`,
      [req.params.id]
    );
    const [[shipment]] = await db.query(
      `SELECT sh.status, sh.shipmentDate, sh.receivedDate, sh.expectedDaysDuration,
              sh.transporterID, TRIM(t.name) AS transporterName
       FROM shipment sh LEFT JOIN transporter t ON t.transporterID = sh.transporterID
       WHERE sh.sellID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details, payments, shipment: shipment || null });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  // Only the items (product + quantity), address, payment and the choice of transporter come
  // from the shopper. Prices and the delivery fee are looked up here, and the transporter must
  // be one of the offers for this address — trusting amounts from the request let anyone pick
  // their own price. Without a transporterID, the cheapest offer is used.
  const { items, address, payment, transporterID } = req.body;
  const clientContactID = req.user.contactID;
  const conn = await db.getConnection();
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return error(res, 'At least one item is required', 400);
    }
    if (!payment?.paymentMethodID) {
      return error(res, 'A payment method is required', 400);
    }
    if (items.some((i) => !Number.isInteger(Number(i.quantity)) || Number(i.quantity) < 1)) {
      return error(res, 'Invalid quantity', 400);
    }
    const prices = await currentUnitPrices(conn, [...new Set(items.map((i) => i.productID))]);
    if (items.some((i) => !prices.has(i.productID))) {
      return error(res, 'Product not found', 400);
    }
    const delivery = await shippingOptions(conn, {
      cityID: await deliveryCityID(conn, clientContactID, address?.cityID),
      items,
    });
    if (!delivery.options.length) {
      return error(res, NO_TRANSPORTER, 400);
    }
    const shipping = transporterID
      ? delivery.options.find((o) => o.transporterID === transporterID)
      : delivery.options[0];
    if (!shipping) {
      return error(res, 'Ce transporteur ne livre pas à cette adresse', 400);
    }
    // A saved card / mobile money account can only be used by its owner.
    for (const [table, id] of [['creditcard', 'creditCardID'], ['mobilemoney', 'mobileMoneyID']]) {
      if (!payment[id]) continue;
      const [[owned]] = await conn.query(`SELECT 1 AS ok FROM ${table} WHERE ${id} = ? AND contactID = ?`, [payment[id], clientContactID]);
      if (!owned) {
        return error(res, 'Payment method not found', 400);
      }
    }
    await conn.beginTransaction();

    if (address) {
      const [[contact]] = await conn.query('SELECT addressID FROM contact WHERE contactID = ?', [clientContactID]);
      if (contact?.addressID) {
        await conn.query(
          `UPDATE address SET lineOfAddress=?, cityID=?, postalCode=?, phone=?
           WHERE addressID=?`,
          [address.lineOfAddress || null, address.cityID, address.postalCode || null,
           address.phone || null, contact.addressID]
        );
      }
    }

    const sellID = generateId();
    const lines = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = prices.get(item.productID);
      return { productID: item.productID, lenghtID: item.lenghtID || null, quantity, unitPrice, total: quantity * unitPrice };
    });
    const subTotal = lines.reduce((sum, l) => sum + l.total, 0);
    const transportCost = shipping.cost;
    const total = Math.round((subTotal + transportCost) * 100) / 100;

    // Explicit NULLs: sell.brokerID defaults to 'BRK_0000000001', which is not a broker
    // and fails its foreign key if the column is simply left out.
    await conn.query(
      `INSERT INTO sell (sellID, clientID, clientContactID, brokerID, brokerContactID,
       transporterID, transporterContactID, sellDate, subTotal, transportCost, tax, total, completed)
       VALUES (?,NULL,?,NULL,NULL,?,?,NOW(),?,?,0,?,0)`,
      [sellID, clientContactID, shipping.transporterID, shipping.contactID, subTotal, transportCost, total]
    );

    for (const l of lines) {
      await conn.query(
        'INSERT INTO selldetails (sellID, productID, lenghtID, quantity, unitPrice, total) VALUES (?,?,?,?,?,?)',
        [sellID, l.productID, l.lenghtID, l.quantity, l.unitPrice, l.total]
      );
    }

    const paymentID = generateId();
    await conn.query(
      `INSERT INTO payment (paymentID, paymentMethodID, sellID, paymentDate, paymentAmount, creditCardID, mobileMoneyID)
       VALUES (?,?,?,NOW(),?,?,?)`,
      [paymentID, payment.paymentMethodID, sellID, total, payment.creditCardID || null, payment.mobileMoneyID || null]
    );

    await conn.commit();
    return success(res, { sellID }, 'Sale created', 201);
  } catch (err) {
    await conn.rollback().catch(() => {});
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const setStatus = async (req, res) => {
  const completed = req.body.completed !== false;
  try {
    const [result] = await db.query('UPDATE sell SET completed=? WHERE sellID=?', [completed ? 1 : 0, req.params.id]);
    if (!result.affectedRows) return error(res, 'Sale not found', 404);
    return success(res, null, completed ? 'Sale marked as completed' : 'Sale marked as pending');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  const conn = await db.getConnection();
  try {
    // Paid or shipped orders are records to keep; deleting the details first and then
    // failing on those foreign keys used to leave an order with no items.
    const [[refs]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM payment WHERE sellID = ?) AS payments,
              (SELECT COUNT(*) FROM shipment WHERE sellID = ?) AS shipments`,
      [req.params.id, req.params.id]
    );
    if (refs.payments || refs.shipments) {
      return error(res, 'Une commande payée ou expédiée ne peut pas être supprimée', 409);
    }
    await conn.beginTransaction();
    await conn.query('DELETE FROM selldetails WHERE sellID=?', [req.params.id]);
    const [result] = await conn.query('DELETE FROM sell WHERE sellID=?', [req.params.id]);
    if (!result.affectedRows) { await conn.rollback(); return error(res, 'Sale not found', 404); }
    await conn.commit();
    return success(res, null, 'Sale deleted');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getById, shippingQuote, create, setStatus, remove };
