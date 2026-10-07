const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

// Purchase orders: SBO (admin) buying stock from a supplier for one of its shops.
// Lifecycle: created (stock counted as "on order" at the shop) → received (moved into
// stock) — or cancelled while still pending.

// Most recent active contact linked to a supplier/transporter company.
const activeContact = async (conn, link, idColumn, id) => {
  const [[row]] = await conn.query(
    `SELECT contactID FROM ${link}
     WHERE ${idColumn} = ? AND (endedDate IS NULL OR endedDate > NOW())
     ORDER BY startedDate DESC LIMIT 1`,
    [id]
  );
  return row?.contactID || null;
};

const getAll = async (req, res) => {
  try {
    const { supplierID, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ' WHERE 1=1';
    const params = [];
    if (supplierID) { where += ' AND pu.supplierID = ?'; params.push(supplierID); }
    if (status === 'pending') where += ' AND pu.receivedDate IS NULL';
    if (status === 'received') where += ' AND pu.receivedDate IS NOT NULL';

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM purchase pu${where}`, params);
    const [rows] = await db.query(
      `SELECT pu.purchaseID, pu.purchaseDate, pu.receivedDate, pu.total,
              s.name AS supplierName, st.storeName, t.name AS transporterName,
              (SELECT COUNT(*) FROM purchasedetails pd WHERE pd.purchaseID = pu.purchaseID) AS itemCount
       FROM purchase pu
       LEFT JOIN supplier s ON s.supplierID = pu.supplierID
       LEFT JOIN store st ON st.storeID = pu.storeID
       LEFT JOIN transporter t ON t.transporterID = pu.transporterID
       ${where}
       ORDER BY (pu.receivedDate IS NULL) DESC, pu.purchaseDate DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return success(res, { rows, total, page: Number(page), totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pu.*, s.name AS supplierName, b.name AS brokerName, t.name AS transporterName, st.storeName,
              CONCAT(sc.firstName, ' ', sc.lastName) AS supplierContactName, sc.email AS supplierContactEmail,
              sc.phone AS supplierContactPhone
       FROM purchase pu
       LEFT JOIN supplier s ON s.supplierID = pu.supplierID
       LEFT JOIN broker b ON b.brokerID = pu.brokerID
       LEFT JOIN transporter t ON t.transporterID = pu.transporterID
       LEFT JOIN store st ON st.storeID = pu.storeID
       LEFT JOIN contact sc ON sc.contactID = pu.supplierContactID
       WHERE pu.purchaseID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Purchase not found', 404);
    const [details] = await db.query(
      `SELECT pd.*, p.name AS productName, ps.supplierProductCode
       FROM purchasedetails pd
       JOIN product p ON p.productID = pd.productID
       LEFT JOIN productsupplier ps ON ps.productID = pd.productID AND ps.supplierID = ?
       WHERE pd.purchaseID = ?
       ORDER BY p.name`,
      [rows[0].supplierID, req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

// Choices for the "new purchase order" form.
const getOptions = async (req, res) => {
  try {
    // Only suppliers that can actually receive an order: an active contact and at least one product.
    const [suppliers] = await db.query(
      `SELECT s.supplierID, s.name, COUNT(ps.productID) AS productCount
       FROM supplier s
       JOIN productsupplier ps ON ps.supplierID = s.supplierID
       WHERE EXISTS (SELECT 1 FROM suppliercontact sc
                     WHERE sc.supplierID = s.supplierID AND (sc.endedDate IS NULL OR sc.endedDate > NOW()))
       GROUP BY s.supplierID, s.name
       ORDER BY s.name`
    );
    const [stores] = await db.query('SELECT storeID, storeName FROM store ORDER BY storeName');
    const [transporters] = await db.query('SELECT transporterID, name FROM transporter ORDER BY name');
    return success(res, { suppliers, stores, transporters });
  } catch (err) {
    return error(res, err.message);
  }
};

// A supplier's products with the price that applies for a given shop: their per-shop
// price for that shop's location if they set one, else their general unit price.
const getSupplierOffer = async (req, res) => {
  const { supplierID } = req.params;
  const { storeID } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT ps.productID, p.name, ps.supplierProductCode, ps.supplierUnitPrice,
              psl.supplierAreaUnitPrice AS shopPrice,
              COALESCE(psl.supplierAreaUnitPrice, ps.supplierUnitPrice) AS unitPrice,
              i.quantityInStock, i.minQuantity, i.quantityOnCommand
       FROM productsupplier ps
       JOIN product p ON p.productID = ps.productID
       LEFT JOIN store st ON st.storeID = ?
       LEFT JOIN productsupplierlocation psl
              ON psl.productID = ps.productID AND psl.supplierID = ps.supplierID AND psl.locationID = st.locationID
       LEFT JOIN inventory i ON i.productID = ps.productID AND i.storeID = st.storeID
       WHERE ps.supplierID = ?
       ORDER BY (i.quantityInStock IS NOT NULL AND i.quantityInStock <= i.minQuantity) DESC, p.name`,
      [storeID || null, supplierID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { supplierID, storeID, transporterID, items } = req.body;
  const transportCost = Number(req.body.transportCost) || 0;
  const tax = Number(req.body.tax) || 0;
  const conn = await db.getConnection();
  try {
    const [[store]] = await conn.query('SELECT storeID, locationID FROM store WHERE storeID = ?', [storeID]);
    if (!store) return error(res, 'Boutique introuvable', 400);

    const supplierContactID = await activeContact(conn, 'suppliercontact', 'supplierID', supplierID);
    if (!supplierContactID) return error(res, 'Ce fournisseur n’a aucun contact actif', 400);

    let transporterContactID = null;
    if (transporterID) {
      const [[transporter]] = await conn.query('SELECT transporterID FROM transporter WHERE transporterID = ?', [transporterID]);
      if (!transporter) return error(res, 'Transporteur introuvable', 400);
      transporterContactID = await activeContact(conn, 'transportercontact', 'transporterID', transporterID);
    }

    // Prices come from the supplier's own offer, not from the request — only products the
    // supplier actually offers can be ordered. An explicit unitPrice overrides (negotiated price).
    const [offer] = await conn.query(
      `SELECT ps.productID, COALESCE(psl.supplierAreaUnitPrice, ps.supplierUnitPrice) AS unitPrice
       FROM productsupplier ps
       LEFT JOIN productsupplierlocation psl
              ON psl.productID = ps.productID AND psl.supplierID = ps.supplierID AND psl.locationID = ?
       WHERE ps.supplierID = ? AND ps.productID IN (?)`,
      [store.locationID, supplierID, items.map((i) => i.productID)]
    );
    const offerPrice = new Map(offer.map((o) => [o.productID, o.unitPrice]));
    const lines = [];
    for (const item of items) {
      if (!offerPrice.has(item.productID)) {
        return error(res, `Le produit ${item.productID} ne fait pas partie de l’offre de ce fournisseur`, 400);
      }
      const quantity = Number(item.quantity);
      const hasOverride = item.unitPrice != null && item.unitPrice !== '';
      const unitPrice = hasOverride ? Number(item.unitPrice) : Number(offerPrice.get(item.productID) || 0);
      lines.push({ productID: item.productID, quantity, unitPrice, total: quantity * unitPrice });
    }
    if (new Set(lines.map((l) => l.productID)).size !== lines.length) {
      return error(res, 'Un même produit apparaît plusieurs fois', 400);
    }

    const [[house]] = await conn.query('SELECT brokerID, contactID FROM brokercontact ORDER BY startedDate LIMIT 1');
    if (!house) return error(res, 'No broker configured to attribute this purchase to', 500);

    const subTotal = lines.reduce((sum, l) => sum + l.total, 0);
    const total = subTotal + transportCost + tax;
    const purchaseID = generateId();

    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO purchase (purchaseID, brokerID, brokerContactID, transporterID, transporterContactID,
                             supplierID, supplierContactID, storeID, purchaseDate, subTotal, transportCost, tax, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [purchaseID, house.brokerID, house.contactID, transporterID || null, transporterContactID,
       supplierID, supplierContactID, storeID, subTotal, transportCost, tax, total]
    );
    for (const l of lines) {
      await conn.query(
        'INSERT INTO purchasedetails (purchaseID, productID, quantity, unitPrice, total) VALUES (?, ?, ?, ?, ?)',
        [purchaseID, l.productID, l.quantity, l.unitPrice, l.total]
      );
      // Count the goods as "on order" at the destination shop until they arrive.
      await conn.query(
        `INSERT INTO inventory (productID, storeID, quantityInStock, quantityOnCommand, minQuantity, lastUpdate)
         VALUES (?, ?, 0, ?, 0, NOW())
         ON DUPLICATE KEY UPDATE quantityOnCommand = COALESCE(quantityOnCommand, 0) + VALUES(quantityOnCommand), lastUpdate = NOW()`,
        [l.productID, storeID, l.quantity]
      );
    }
    await conn.commit();
    return success(res, { purchaseID }, 'Commande créée', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

// Goods arrived: move the ordered quantities from "on order" into stock at the shop.
const receive = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[purchase]] = await conn.query(
      'SELECT storeID, receivedDate FROM purchase WHERE purchaseID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!purchase) { await conn.rollback(); return error(res, 'Commande introuvable', 404); }
    if (purchase.receivedDate) { await conn.rollback(); return error(res, 'Cette commande a déjà été réceptionnée', 409); }
    if (!purchase.storeID) { await conn.rollback(); return error(res, 'Aucune boutique de destination pour cette commande', 400); }

    const [details] = await conn.query('SELECT productID, quantity FROM purchasedetails WHERE purchaseID = ?', [req.params.id]);
    for (const d of details) {
      await conn.query(
        `INSERT INTO inventory (productID, storeID, quantityInStock, quantityOnCommand, minQuantity, lastUpdate)
         VALUES (?, ?, ?, 0, 0, NOW())
         ON DUPLICATE KEY UPDATE
           quantityInStock = COALESCE(quantityInStock, 0) + VALUES(quantityInStock),
           quantityOnCommand = GREATEST(COALESCE(quantityOnCommand, 0) - VALUES(quantityInStock), 0),
           lastUpdate = NOW()`,
        [d.productID, purchase.storeID, d.quantity]
      );
    }
    await conn.query('UPDATE purchase SET receivedDate = NOW() WHERE purchaseID = ?', [req.params.id]);
    await conn.commit();
    return success(res, null, 'Commande réceptionnée — stock mis à jour');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

// Cancel a pending order: release the "on order" quantities and delete it.
const remove = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[purchase]] = await conn.query(
      'SELECT storeID, receivedDate FROM purchase WHERE purchaseID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!purchase) { await conn.rollback(); return error(res, 'Purchase not found', 404); }
    if (purchase.receivedDate) {
      await conn.rollback();
      return error(res, 'Une commande réceptionnée ne peut pas être annulée', 409);
    }
    if (purchase.storeID) {
      await conn.query(
        `UPDATE inventory i
         JOIN purchasedetails pd ON pd.productID = i.productID AND pd.purchaseID = ?
         SET i.quantityOnCommand = GREATEST(COALESCE(i.quantityOnCommand, 0) - pd.quantity, 0), i.lastUpdate = NOW()
         WHERE i.storeID = ?`,
        [req.params.id, purchase.storeID]
      );
    }
    await conn.query('DELETE FROM purchasedetails WHERE purchaseID = ?', [req.params.id]);
    await conn.query('DELETE FROM purchase WHERE purchaseID = ?', [req.params.id]);
    await conn.commit();
    return success(res, null, 'Commande annulée');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getById, getOptions, getSupplierOffer, create, receive, remove };
