const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { active } = req.query;
    let query = `
      SELECT p.promotionID, p.startDate, p.endDate, b.name AS brokerName,
             COUNT(pd.productID) AS productCount
      FROM promotion p
      LEFT JOIN broker b ON b.brokerID = p.brokerID
      LEFT JOIN promotiondetails pd ON pd.promotionID = p.promotionID
      WHERE 1=1`;
    const params = [];
    if (active === 'true') { query += ' AND NOW() BETWEEN p.startDate AND p.endDate'; }
    query += ' GROUP BY p.promotionID ORDER BY p.startDate DESC';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM promotion WHERE promotionID = ?', [req.params.id]);
    if (!rows.length) return error(res, 'Promotion not found', 404);
    const [details] = await db.query(
      `SELECT pd.*, p.name AS productName, p.sellUnitPrice
       FROM promotiondetails pd JOIN product p ON p.productID = pd.productID
       WHERE pd.promotionID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { brokerID, brokerContactID, startDate, endDate, items } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const promotionID = generateId();
    await conn.query(
      'INSERT INTO promotion (promotionID, brokerID, brokerContactID, startDate, endDate) VALUES (?,?,?,?,?)',
      [promotionID, brokerID || null, brokerContactID || null, startDate, endDate]
    );
    for (const item of items) {
      await conn.query(
        'INSERT INTO promotiondetails (promotionID, productID, rebate, currentPrice, previousPrice) VALUES (?,?,?,?,?)',
        [promotionID, item.productID, item.rebate || 0, item.currentPrice, item.previousPrice]
      );
    }
    await conn.commit();
    return success(res, { promotionID }, 'Promotion created', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM promotiondetails WHERE promotionID=?', [req.params.id]);
    const [result] = await db.query('DELETE FROM promotion WHERE promotionID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Promotion not found', 404);
    return success(res, null, 'Promotion deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, remove };
