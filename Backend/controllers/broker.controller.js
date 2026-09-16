const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT b.brokerID, b.name, b.businessDescription, bt.name AS brokerTypeName
      FROM broker b LEFT JOIN brokertype bt ON bt.brokerTypeID = b.brokerTypeID WHERE 1=1`;
    const params = [];
    if (search) { query += ' AND b.name LIKE ?'; params.push(`%${search}%`); }
    query += ' ORDER BY b.name LIMIT ? OFFSET ?';
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
      `SELECT b.*, bt.name AS brokerTypeName FROM broker b
       LEFT JOIN brokertype bt ON bt.brokerTypeID = b.brokerTypeID WHERE b.brokerID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Broker not found', 404);
    const [contacts] = await db.query(
      `SELECT con.contactID, con.firstName, con.lastName, con.email, con.phone
       FROM brokercontact bc JOIN contact con ON con.contactID = bc.contactID WHERE bc.brokerID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], contacts });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { name, businessDescription, brokerTypeID, addressID } = req.body;
  try {
    const brokerID = generateId();
    await db.query(
      'INSERT INTO broker (brokerID, name, businessDescription, brokerTypeID, addressID) VALUES (?,?,?,?,?)',
      [brokerID, name, businessDescription || null, brokerTypeID || null, addressID || null]
    );
    return success(res, { brokerID }, 'Broker created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { name, businessDescription, brokerTypeID, addressID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE broker SET name=?, businessDescription=?, brokerTypeID=?, addressID=? WHERE brokerID=?',
      [name, businessDescription || null, brokerTypeID || null, addressID || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Broker not found', 404);
    return success(res, null, 'Broker updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM broker WHERE brokerID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Broker not found', 404);
    return success(res, null, 'Broker deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
