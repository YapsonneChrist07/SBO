const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.transporterID, t.name, t.businessDescription, tt.name AS transporterTypeName
      FROM transporter t LEFT JOIN transportertype tt ON tt.transporterTypeID = t.transporterTypeID WHERE 1=1`;
    const params = [];
    if (search) { query += ' AND t.name LIKE ?'; params.push(`%${search}%`); }
    query += ' ORDER BY t.name LIMIT ? OFFSET ?';
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
      `SELECT t.*, tt.name AS transporterTypeName FROM transporter t
       LEFT JOIN transportertype tt ON tt.transporterTypeID = t.transporterTypeID WHERE t.transporterID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Transporter not found', 404);
    const [contacts] = await db.query(
      `SELECT con.contactID, con.firstName, con.lastName, con.email, con.phone
       FROM transportercontact tc JOIN contact con ON con.contactID = tc.contactID WHERE tc.transporterID = ?`,
      [req.params.id]
    );
    const [costs] = await db.query(
      `SELECT tcp.*, tr.departureCountry, tr.destinationCountry, wl.weightMax
       FROM transportercostpertraject tcp
       JOIN traject tr ON tr.trajectID = tcp.trajectID
       JOIN weightlimit wl ON wl.weightLimitID = tcp.weightLimitID
       WHERE tcp.transporterID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], contacts, costPerTraject: costs });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { name, businessDescription, transporterTypeID, addressID } = req.body;
  try {
    const transporterID = generateId();
    await db.query(
      'INSERT INTO transporter (transporterID, name, businessDescription, transporterTypeID, addressID) VALUES (?,?,?,?,?)',
      [transporterID, name, businessDescription || null, transporterTypeID || null, addressID || null]
    );
    return success(res, { transporterID }, 'Transporter created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { name, businessDescription, transporterTypeID, addressID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE transporter SET name=?, businessDescription=?, transporterTypeID=?, addressID=? WHERE transporterID=?',
      [name, businessDescription || null, transporterTypeID || null, addressID || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Transporter not found', 404);
    return success(res, null, 'Transporter updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM transporter WHERE transporterID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Transporter not found', 404);
    return success(res, null, 'Transporter deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
