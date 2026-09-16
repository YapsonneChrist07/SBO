const db = require('../config/db');
const { success, error } = require('../utils/response');

const getByProduct = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT spp.*, p.name AS productName
       FROM sellpricepolicy spp
       JOIN product p ON p.productID = spp.productID
       WHERE spp.productID = ?
       ORDER BY spp.minQuantityForFullRebate`,
      [req.params.productID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT spp.*, p.name AS productName
       FROM sellpricepolicy spp
       JOIN product p ON p.productID = spp.productID
       ORDER BY p.name, spp.minQuantityForFullRebate`
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const upsert = async (req, res) => {
  const { productID, minQuantityForFullRebate, maxQuantityForFullRebate, sellUnitPrice } = req.body;
  try {
    await db.query(
      `INSERT INTO sellpricepolicy (productID, minQuantityForFullRebate, maxQuantityForFullRebate, sellUnitPrice)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE maxQuantityForFullRebate=VALUES(maxQuantityForFullRebate),
       sellUnitPrice=VALUES(sellUnitPrice)`,
      [productID, minQuantityForFullRebate, maxQuantityForFullRebate || null, sellUnitPrice]
    );
    return success(res, null, 'Price policy saved');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  const { productID, minQuantity } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM sellpricepolicy WHERE productID=? AND minQuantityForFullRebate=?',
      [productID, minQuantity]
    );
    if (!result.affectedRows) return error(res, 'Price policy not found', 404);
    return success(res, null, 'Price policy deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getByProduct, upsert, remove };
