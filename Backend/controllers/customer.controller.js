const db = require('../config/db');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ' WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (c.firstName LIKE ? OR c.lastName LIKE ? OR c.username LIKE ? OR c.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM contact c${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT c.contactID, c.firstName, c.lastName, c.username, c.email, c.phone,
              ci.name AS cityName, (u.contactID IS NOT NULL) AS isAdmin,
              COUNT(DISTINCT s.sellID) AS orderCount, COALESCE(SUM(s.total), 0) AS totalSpent
       FROM contact c
       LEFT JOIN address a ON a.addressID = c.addressID
       LEFT JOIN city ci ON ci.cityID = a.cityID
       LEFT JOIN usercreator u ON u.contactID = c.contactID
       LEFT JOIN sell s ON s.clientContactID = c.contactID
       ${where}
       GROUP BY c.contactID
       ORDER BY c.lastName, c.firstName
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
      `SELECT c.contactID, c.firstName, c.lastName, c.username, c.email, c.phone, c.alternatePhone, c.nickName,
              a.lineOfAddress, a.postalCode, ci.name AS cityName, (u.contactID IS NOT NULL) AS isAdmin
       FROM contact c
       LEFT JOIN address a ON a.addressID = c.addressID
       LEFT JOIN city ci ON ci.cityID = a.cityID
       LEFT JOIN usercreator u ON u.contactID = c.contactID
       WHERE c.contactID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Client introuvable', 404);
    const [orders] = await db.query(
      'SELECT sellID, sellDate, total, CAST(completed AS UNSIGNED) AS completed FROM sell WHERE clientContactID = ? ORDER BY sellDate DESC',
      [req.params.id]
    );
    return success(res, { ...rows[0], orders });
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById };
