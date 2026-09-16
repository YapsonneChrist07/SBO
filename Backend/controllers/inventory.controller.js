const db = require('../config/db');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { storeID, lowStock, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ' WHERE 1=1';
    const params = [];
    if (storeID) { where += ' AND i.storeID = ?'; params.push(storeID); }
    if (lowStock === 'true') { where += ' AND i.quantityInStock <= i.minQuantity'; }
    if (search) { where += ' AND p.name LIKE ?'; params.push(`%${search}%`); }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM inventory i JOIN product p ON p.productID = i.productID${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT i.*, p.name AS productName, s.storeName
       FROM inventory i
       JOIN product p ON p.productID = i.productID
       JOIN store s ON s.storeID = i.storeID
       ${where}
       ORDER BY (i.quantityInStock <= i.minQuantity) DESC, p.name
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return success(res, { rows, total, page: Number(page), totalPages: Math.max(1, Math.ceil(total / limit)) });
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
  const { productID, storeID } = req.body;
  if (!productID || !storeID) return error(res, 'productID and storeID are required', 400);
  try {
    // Fetch existing row first so a partial update (e.g. just quantityInStock)
    // doesn't silently reset the other columns to 0 via the INSERT defaults.
    const [[existing]] = await db.query(
      'SELECT quantityInStock, quantityOnCommand, minQuantity FROM inventory WHERE productID = ? AND storeID = ?',
      [productID, storeID]
    );
    const quantityInStock = req.body.quantityInStock !== undefined ? Number(req.body.quantityInStock) : (existing?.quantityInStock ?? 0);
    const quantityOnCommand = req.body.quantityOnCommand !== undefined ? Number(req.body.quantityOnCommand) : (existing?.quantityOnCommand ?? 0);
    const minQuantity = req.body.minQuantity !== undefined ? Number(req.body.minQuantity) : (existing?.minQuantity ?? 0);
    await db.query(
      `INSERT INTO inventory (productID, storeID, quantityInStock, quantityOnCommand, minQuantity, lastUpdate)
       VALUES (?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE quantityInStock=VALUES(quantityInStock),
       quantityOnCommand=VALUES(quantityOnCommand), minQuantity=VALUES(minQuantity), lastUpdate=NOW()`,
      [productID, storeID, quantityInStock, quantityOnCommand, minQuantity]
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
