const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { supplierID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT d.deliveryID, d.deliveryDate, d.total, s.name AS supplierName, t.name AS transporterName
      FROM delivery d
      LEFT JOIN supplier s ON s.supplierID = d.supplierID
      LEFT JOIN transporter t ON t.transporterID = d.transporterID
      WHERE 1=1`;
    const params = [];
    if (supplierID) { query += ' AND d.supplierID = ?'; params.push(supplierID); }
    query += ' ORDER BY d.deliveryDate DESC LIMIT ? OFFSET ?';
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
      `SELECT d.*, s.name AS supplierName, t.name AS transporterName
       FROM delivery d
       LEFT JOIN supplier s ON s.supplierID = d.supplierID
       LEFT JOIN transporter t ON t.transporterID = d.transporterID
       WHERE d.deliveryID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Delivery not found', 404);
    const [details] = await db.query(
      `SELECT dd.*, p.name AS productName FROM deliverydetails dd
       JOIN product p ON p.productID = dd.productID WHERE dd.deliveryID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { purchaseID, supplierID, supplierContactID, brokerID, brokerContactID,
          transporterID, transporterContactID, items, transportCost, tax } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const deliveryID = generateId();
    let subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subTotal + (transportCost || 0) + (tax || 0);

    await conn.query(
      `INSERT INTO delivery (deliveryID, purchaseID, supplierID, supplierContactID, brokerID, brokerContactID,
       transporterID, transporterContactID, deliveryDate, subTotal, transportCost, tax, total)
       VALUES (?,?,?,?,?,?,?,?,NOW(),?,?,?,?)`,
      [deliveryID, purchaseID || null, supplierID || null, supplierContactID || null,
       brokerID || null, brokerContactID || null, transporterID || null, transporterContactID || null,
       subTotal, transportCost || 0, tax || 0, total]
    );

    for (const item of items) {
      await conn.query(
        'INSERT INTO deliverydetails (deliveryID, productID, quantity, unitPrice, total) VALUES (?,?,?,?,?)',
        [deliveryID, item.productID, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
    }

    await conn.commit();
    return success(res, { deliveryID }, 'Delivery created', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getById, create };
