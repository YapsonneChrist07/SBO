const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { supplierID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT pu.purchaseID, pu.purchaseDate, pu.total, pu.subTotal, pu.tax, pu.transportCost,
             s.name AS supplierName, b.name AS brokerName
      FROM purchase pu
      LEFT JOIN supplier s ON s.supplierID = pu.supplierID
      LEFT JOIN broker b ON b.brokerID = pu.brokerID
      WHERE 1=1`;
    const params = [];
    if (supplierID) { query += ' AND pu.supplierID = ?'; params.push(supplierID); }
    query += ' ORDER BY pu.purchaseDate DESC LIMIT ? OFFSET ?';
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
      `SELECT pu.*, s.name AS supplierName, b.name AS brokerName, t.name AS transporterName
       FROM purchase pu
       LEFT JOIN supplier s ON s.supplierID = pu.supplierID
       LEFT JOIN broker b ON b.brokerID = pu.brokerID
       LEFT JOIN transporter t ON t.transporterID = pu.transporterID
       WHERE pu.purchaseID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Purchase not found', 404);
    const [details] = await db.query(
      `SELECT pd.*, p.name AS productName FROM purchasedetails pd
       JOIN product p ON p.productID = pd.productID WHERE pd.purchaseID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { supplierID, supplierContactID, brokerID, brokerContactID, transporterID,
          transporterContactID, items, transportCost, tax } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const purchaseID = generateId();
    let subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subTotal + (transportCost || 0) + (tax || 0);

    await conn.query(
      `INSERT INTO purchase (purchaseID, supplierID, supplierContactID, brokerID, brokerContactID,
       transporterID, transporterContactID, purchaseDate, subTotal, transportCost, tax, total)
       VALUES (?,?,?,?,?,?,?,NOW(),?,?,?,?)`,
      [purchaseID, supplierID || null, supplierContactID || null, brokerID || null,
       brokerContactID || null, transporterID || null, transporterContactID || null,
       subTotal, transportCost || 0, tax || 0, total]
    );

    for (const item of items) {
      await conn.query(
        'INSERT INTO purchasedetails (purchaseID, productID, quantity, unitPrice, total) VALUES (?,?,?,?,?)',
        [purchaseID, item.productID, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
    }

    await conn.commit();
    return success(res, { purchaseID }, 'Purchase created', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM purchasedetails WHERE purchaseID=?', [req.params.id]);
    const [result] = await db.query('DELETE FROM purchase WHERE purchaseID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Purchase not found', 404);
    return success(res, null, 'Purchase deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, remove };
