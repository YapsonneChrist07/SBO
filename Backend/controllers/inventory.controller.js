const db = require('../config/db');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { storeID, lowStock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT i.*, p.name AS productName, s.storeName
      FROM inventory i
      JOIN product p ON p.productID = i.productID
      JOIN store s ON s.storeID = i.storeID
      WHERE 1=1`;
    const params = [];
    if (storeID) { query += ' AND i.storeID = ?'; params.push(storeID); }
    if (lowStock === 'true') { query += ' AND i.quantityInStock <= i.minQuantity'; }
    query += ' ORDER BY p.name LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getByProduct = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, s.storeName, s.storeDescription FROM inventory i
       JOIN store s ON s.storeID = i.storeID WHERE i.productID = ?`,
      [req.params.productID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const upsert = async (req, res) => {
  const { productID, storeID, quantityInStock, quantityOnCommand, minQuantity } = req.body;
  try {
    await db.query(
      `INSERT INTO inventory (productID, storeID, quantityInStock, quantityOnCommand, minQuantity, lastUpdate)
       VALUES (?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE quantityInStock=VALUES(quantityInStock),
       quantityOnCommand=VALUES(quantityOnCommand), minQuantity=VALUES(minQuantity), lastUpdate=NOW()`,
      [productID, storeID, quantityInStock || 0, quantityOnCommand || 0, minQuantity || 0]
    );
    return success(res, null, 'Inventory updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const getOptions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT io.*, c.colorValue, l.lenghtValue, s.storeName
       FROM inventoryoptions io
       LEFT JOIN colorlookup c ON c.colorID = io.colorID
       LEFT JOIN lenghtlookup l ON l.lenghtID = io.lenghtID
       LEFT JOIN store s ON s.storeID = io.storeID
       WHERE io.productID = ?`,
      [req.params.productID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getByProduct, upsert, getOptions };
