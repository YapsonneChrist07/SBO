const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { cityID } = req.query;
    let query = `
      SELECT a.*, c.name AS cityName, r.name AS regionName, co.name AS countryName
      FROM address a
      LEFT JOIN city c ON c.cityID = a.cityID
      LEFT JOIN region r ON r.regionID = c.regionID
      LEFT JOIN country co ON co.countryID = r.countryID
      WHERE 1=1`;
    const params = [];
    if (cityID) { query += ' AND a.cityID = ?'; params.push(cityID); }
    query += ' ORDER BY a.addressID';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, c.name AS cityName, r.name AS regionName, co.name AS countryName
       FROM address a
       LEFT JOIN city c ON c.cityID = a.cityID
       LEFT JOIN region r ON r.regionID = c.regionID
       LEFT JOIN country co ON co.countryID = r.countryID
       WHERE a.addressID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Address not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { lineOfAddress, cityID, postalCode, phone, alternatePhone, email } = req.body;
  try {
    const addressID = generateId();
    await db.query(
      `INSERT INTO address (addressID, lineOfAddress, cityID, postalCode, phone, alternatePhone, email)
       VALUES (?,?,?,?,?,?,?)`,
      [addressID, lineOfAddress || null, cityID, postalCode || null,
       phone || null, alternatePhone || null, email || null]
    );
    return success(res, { addressID }, 'Address created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { lineOfAddress, cityID, postalCode, phone, alternatePhone, email } = req.body;
  try {
    const [[owner]] = await db.query('SELECT addressID FROM contact WHERE contactID = ?', [req.user.contactID]);
    if (!owner || owner.addressID !== req.params.id) return error(res, 'Forbidden', 403);

    const [result] = await db.query(
      `UPDATE address SET lineOfAddress=?, cityID=?, postalCode=?, phone=?, alternatePhone=?, email=?
       WHERE addressID=?`,
      [lineOfAddress || null, cityID, postalCode || null,
       phone || null, alternatePhone || null, email || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Address not found', 404);
    return success(res, null, 'Address updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM address WHERE addressID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Address not found', 404);
    return success(res, null, 'Address deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
