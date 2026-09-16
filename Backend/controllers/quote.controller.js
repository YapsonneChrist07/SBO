const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { clientID, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT q.quoteID, q.createdDate, q.expiredDate, q.status, q.total, q.nbrOfItems,
             c.name AS clientName
      FROM quote q LEFT JOIN client c ON c.clientID = q.clientID WHERE 1=1`;
    const params = [];
    if (clientID) { query += ' AND q.clientID = ?'; params.push(clientID); }
    if (status) { query += ' AND q.status = ?'; params.push(status); }
    query += ' ORDER BY q.createdDate DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT q.*, c.name AS clientName, b.name AS brokerName
       FROM quote q
       LEFT JOIN client c ON c.clientID = q.clientID
       LEFT JOIN broker b ON b.brokerID = q.brokerID
       WHERE q.quoteID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Quote not found', 404);
    const [details] = await db.query(
      `SELECT qd.*, p.name AS productName, s.name AS supplierName
       FROM quotedetails qd
       JOIN product p ON p.productID = qd.productID
       LEFT JOIN supplier s ON s.supplierID = qd.supplierID
       WHERE qd.quoteID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { clientID, clientContactID, brokerID, items, transportCost, tax, expiredDate } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const quoteID = generateId();
    let subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subTotal + (transportCost || 0) + (tax || 0);

    await conn.query(
      `INSERT INTO quote (quoteID, clientID, clientContactID, brokerID, createdDate,
       nbrOfItems, subTotal, transportCost, tax, total, expiredDate, status)
       VALUES (?,?,?,?,NOW(),?,?,?,?,?,?,'PENDING')`,
      [quoteID, clientID || null, clientContactID || null, brokerID || null,
       items.length, subTotal, transportCost || 0, tax || 0, total, expiredDate || null]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO quotedetails (quoteID, productID, supplierID, quantity, unitPrice, total, discount, newUnitPrice, margin)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [quoteID, item.productID, item.supplierID || null, item.quantity, item.unitPrice,
         item.quantity * item.unitPrice, item.discount || 0, item.newUnitPrice || item.unitPrice, item.margin || 0]
      );
    }

    await conn.commit();
    return success(res, { quoteID }, 'Quote created', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
  if (!allowed.includes(status)) return error(res, `Status must be one of: ${allowed.join(', ')}`, 400);
  try {
    const [result] = await db.query('UPDATE quote SET status=? WHERE quoteID=?', [status, req.params.id]);
    if (!result.affectedRows) return error(res, 'Quote not found', 404);
    return success(res, null, 'Quote status updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM quotedetails WHERE quoteID=?', [req.params.id]);
    const [result] = await db.query('DELETE FROM quote WHERE quoteID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Quote not found', 404);
    return success(res, null, 'Quote deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, updateStatus, remove };
