const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

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
    return success(res, { ...rows[0], details, payments });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { clientID, brokerID, brokerContactID, transporterID,
          transporterContactID, items, transportCost, tax, address, payment } = req.body;
  const clientContactID = req.user.contactID;
  const conn = await db.getConnection();
  try {
    if (!Array.isArray(items) || items.length === 0) {
      conn.release();
      return error(res, 'At least one item is required', 400);
    }
    if (!payment?.paymentMethodID) {
      conn.release();
      return error(res, 'A payment method is required', 400);
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
    let subTotal = 0;
    for (const item of items) {
      subTotal += item.quantity * item.unitPrice;
    }
    const total = subTotal + (transportCost || 0) + (tax || 0);

    await conn.query(
      `INSERT INTO sell (sellID, clientID, clientContactID, brokerID, brokerContactID,
       transporterID, transporterContactID, sellDate, subTotal, transportCost, tax, total, completed)
       VALUES (?,?,?,?,?,?,?,NOW(),?,?,?,?,0)`,
      [sellID, clientID || null, clientContactID || null, brokerID || null, brokerContactID || null,
       transporterID || null, transporterContactID || null, subTotal, transportCost || 0, tax || 0, total]
    );

    for (const item of items) {
      await conn.query(
        'INSERT INTO selldetails (sellID, productID, lenghtID, quantity, unitPrice, total) VALUES (?,?,?,?,?,?)',
        [sellID, item.productID, item.lenghtID || null, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
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
    await conn.rollback();
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
  try {
    await db.query('DELETE FROM selldetails WHERE sellID=?', [req.params.id]);
    const [result] = await db.query('DELETE FROM sell WHERE sellID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Sale not found', 404);
    return success(res, null, 'Sale deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, setStatus, remove };
