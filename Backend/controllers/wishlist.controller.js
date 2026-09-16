const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { clientID, status } = req.query;
    let query = `
      SELECT w.wishListID, w.wishListName, w.status, w.total, w.createdDate, w.targetEndDate,
             c.name AS clientName
      FROM wishlist w LEFT JOIN client c ON c.clientID = w.clientID WHERE 1=1`;
    const params = [];
    if (clientID) { query += ' AND w.clientID = ?'; params.push(clientID); }
    if (status) { query += ' AND w.status = ?'; params.push(status); }
    query += ' ORDER BY w.createdDate DESC';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT w.*, c.name AS clientName FROM wishlist w
       LEFT JOIN client c ON c.clientID = w.clientID WHERE w.wishListID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Wishlist not found', 404);
    const [details] = await db.query(
      `SELECT wd.*, p.name AS productName FROM wishlistdetails wd
       JOIN product p ON p.productID = wd.productID WHERE wd.wishListID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { wishListName, wishListDescription, clientID, clientContactID, brokerID,
          brokerContactID, targetEndDate } = req.body;
  try {
    const wishListID = generateId();
    await db.query(
      `INSERT INTO wishlist (wishListID, wishListName, wishListDescription, clientID, clientContactID,
       brokerID, brokerContactID, createdDate, targetEndDate, status, subTotal, total, transportCost, tax)
       VALUES (?,?,?,?,?,?,?,NOW(),?,'OPEN',0,0,0,0)`,
      [wishListID, wishListName, wishListDescription || null, clientID || null, clientContactID || null,
       brokerID || null, brokerContactID || null, targetEndDate || null]
    );
    return success(res, { wishListID }, 'Wishlist created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const addItem = async (req, res) => {
  const { productID, quantity, lenghtID, giverFirstName, giverLastName, giverEmail, comments } = req.body;
  try {
    const [product] = await db.query('SELECT sellUnitPrice FROM product WHERE productID = ?', [productID]);
    if (!product.length) return error(res, 'Product not found', 404);
    const unitPrice = product[0].sellUnitPrice;
    await db.query(
      `INSERT INTO wishlistdetails (wishListID, productID, lenghtID, quantity, unitPrice, unitTax, total,
       giverFirstName, giverLastName, giverEmail, isPaid, comments)
       VALUES (?,?,?,?,?,0,?,?,?,?,'N',?)
       ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), total=VALUES(total)`,
      [req.params.id, productID, lenghtID || null, quantity, unitPrice, unitPrice * quantity,
       giverFirstName || null, giverLastName || null, giverEmail || null, comments || null]
    );
    return success(res, null, 'Item added to wishlist');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM wishlistdetails WHERE wishListID=?', [req.params.id]);
    const [result] = await db.query('DELETE FROM wishlist WHERE wishListID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Wishlist not found', 404);
    return success(res, null, 'Wishlist deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, addItem, remove };
