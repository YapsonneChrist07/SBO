const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM commercialagent WHERE 1=1`;
    const params = [];
    if (search) {
      query += ' AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY lastName, firstName';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM commercialagent WHERE commercialAgentID = ?',
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Commercial agent not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { firstName, lastName, nickName, phone, alternatePhone, email } = req.body;
  try {
    const commercialAgentID = generateId();
    await db.query(
      `INSERT INTO commercialagent (commercialAgentID, firstName, lastName, nickName, phone, alternatePhone, email)
       VALUES (?,?,?,?,?,?,?)`,
      [commercialAgentID, firstName, lastName, nickName || null,
       phone || null, alternatePhone || null, email || null]
    );
    return success(res, { commercialAgentID }, 'Commercial agent created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { firstName, lastName, nickName, phone, alternatePhone, email } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE commercialagent SET firstName=?, lastName=?, nickName=?, phone=?, alternatePhone=?, email=?
       WHERE commercialAgentID=?`,
      [firstName, lastName, nickName || null,
       phone || null, alternatePhone || null, email || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Commercial agent not found', 404);
    return success(res, null, 'Commercial agent updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM commercialagent WHERE commercialAgentID = ?', [req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Commercial agent not found', 404);
    return success(res, null, 'Commercial agent deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
