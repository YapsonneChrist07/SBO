const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, clientTypeID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT c.clientID, c.name, c.businessDescription, ct.name AS clientTypeName,
             a.lineOfAddress, a.email, a.phone
      FROM client c
      LEFT JOIN clienttype ct ON ct.clientTypeID = c.clientTypeID
      LEFT JOIN address a ON a.addressID = c.addressID
      WHERE 1=1`;
    const params = [];
    if (search) { query += ' AND c.name LIKE ?'; params.push(`%${search}%`); }
    if (clientTypeID) { query += ' AND c.clientTypeID = ?'; params.push(clientTypeID); }
    query += ' ORDER BY c.name LIMIT ? OFFSET ?';
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
      `SELECT c.*, ct.name AS clientTypeName FROM client c
       LEFT JOIN clienttype ct ON ct.clientTypeID = c.clientTypeID WHERE c.clientID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Client not found', 404);
    const [contacts] = await db.query(
      `SELECT con.contactID, con.firstName, con.lastName, con.email, con.phone, cc.startedDate
       FROM clientcontact cc JOIN contact con ON con.contactID = cc.contactID
       WHERE cc.clientID = ?`,
      [req.params.id]
    );
    const [sells] = await db.query(
      'SELECT sellID, sellDate, total, completed FROM sell WHERE clientID = ? ORDER BY sellDate DESC LIMIT 10',
      [req.params.id]
    );
    return success(res, { ...rows[0], contacts, recentSells: sells });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { name, businessDescription, clientTypeID, addressID } = req.body;
  try {
    const clientID = generateId();
    await db.query(
      'INSERT INTO client (clientID, name, businessDescription, clientTypeID, addressID) VALUES (?,?,?,?,?)',
      [clientID, name, businessDescription || null, clientTypeID || null, addressID || null]
    );
    return success(res, { clientID }, 'Client created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { name, businessDescription, clientTypeID, addressID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE client SET name=?, businessDescription=?, clientTypeID=?, addressID=? WHERE clientID=?',
      [name, businessDescription || null, clientTypeID || null, addressID || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Client not found', 404);
    return success(res, null, 'Client updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM client WHERE clientID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Client not found', 404);
    return success(res, null, 'Client deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

const addContact = async (req, res) => {
  const { contactID } = req.body;
  try {
    await db.query(
      'INSERT INTO clientcontact (clientID, contactID, startedDate) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE startedDate=NOW()',
      [req.params.id, contactID]
    );
    return success(res, null, 'Contact linked to client', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove, addContact };
