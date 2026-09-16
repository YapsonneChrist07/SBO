const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, l.locationName, a.lineOfAddress, a.postalCode, a.phone, c.name AS cityName
       FROM store s
       LEFT JOIN location l ON l.locationID = s.locationID
       LEFT JOIN address a ON a.addressID = l.addressID
       LEFT JOIN city c ON c.cityID = a.cityID`
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, l.locationName, l.locationDescription,
              a.lineOfAddress, a.postalCode, a.phone, c.name AS cityName
       FROM store s
       LEFT JOIN location l ON l.locationID = s.locationID
       LEFT JOIN address a ON a.addressID = l.addressID
       LEFT JOIN city c ON c.cityID = a.cityID
       WHERE s.storeID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Store not found', 404);
    const [[inv]] = await db.query(
      'SELECT COUNT(*) AS productCount, SUM(quantityInStock) AS totalStock FROM inventory WHERE storeID = ?',
      [req.params.id]
    );
    return success(res, { ...rows[0], inventory: inv });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { storeName, storeDescription, locationID } = req.body;
  try {
    const storeID = generateId();
    await db.query(
      'INSERT INTO store (storeID, storeName, storeDescription, locationID) VALUES (?,?,?,?)',
      [storeID, storeName, storeDescription || null, locationID || null]
    );
    return success(res, { storeID }, 'Store created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { storeName, storeDescription, locationID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE store SET storeName=?, storeDescription=?, locationID=? WHERE storeID=?',
      [storeName, storeDescription || null, locationID || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Store not found', 404);
    return success(res, null, 'Store updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM store WHERE storeID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Store not found', 404);
    return success(res, null, 'Store deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
