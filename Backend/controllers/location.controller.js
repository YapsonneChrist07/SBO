const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, a.lineOfAddress, a.phone, a.email, c.name AS cityName
       FROM location l
       LEFT JOIN address a ON a.addressID = l.addressID
       LEFT JOIN city c ON c.cityID = a.cityID
       ORDER BY l.locationName`
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, a.lineOfAddress, a.phone, a.email, c.name AS cityName
       FROM location l
       LEFT JOIN address a ON a.addressID = l.addressID
       LEFT JOIN city c ON c.cityID = a.cityID
       WHERE l.locationID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Location not found', 404);
    const [stores] = await db.query(
      'SELECT storeID, storeName FROM store WHERE locationID = ?',
      [req.params.id]
    );
    return success(res, { ...rows[0], stores });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { locationName, locationDescription, addressID } = req.body;
  try {
    const locationID = generateId();
    await db.query(
      'INSERT INTO location (locationID, locationName, locationDescription, addressID) VALUES (?,?,?,?)',
      [locationID, locationName, locationDescription || null, addressID]
    );
    return success(res, { locationID }, 'Location created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { locationName, locationDescription, addressID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE location SET locationName=?, locationDescription=?, addressID=? WHERE locationID=?',
      [locationName, locationDescription || null, addressID, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Location not found', 404);
    return success(res, null, 'Location updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM location WHERE locationID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Location not found', 404);
    return success(res, null, 'Location deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
