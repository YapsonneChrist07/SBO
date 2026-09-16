const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { transporterID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT tr.transportID, tr.departureDate, tr.arrivalDate, tr.transportTotalCost,
             t.name AS transporterName,
             ao.lineOfAddress AS originAddress,
             ad.lineOfAddress AS destinationAddress
      FROM transport tr
      LEFT JOIN transporter t ON t.transporterID = tr.transporterID
      LEFT JOIN address ao ON ao.addressID = tr.originAddressID
      LEFT JOIN address ad ON ad.addressID = tr.destinationAddressID
      WHERE 1=1`;
    const params = [];
    if (transporterID) { query += ' AND tr.transporterID = ?'; params.push(transporterID); }
    query += ' ORDER BY tr.departureDate DESC LIMIT ? OFFSET ?';
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
      `SELECT tr.*, t.name AS transporterName,
              ao.lineOfAddress AS originAddress, co.name AS originCity,
              ad.lineOfAddress AS destinationAddress, cd.name AS destinationCity
       FROM transport tr
       LEFT JOIN transporter t ON t.transporterID = tr.transporterID
       LEFT JOIN address ao ON ao.addressID = tr.originAddressID
       LEFT JOIN city co ON co.cityID = ao.cityID
       LEFT JOIN address ad ON ad.addressID = tr.destinationAddressID
       LEFT JOIN city cd ON cd.cityID = ad.cityID
       WHERE tr.transportID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Transport not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { originAddressID, destinationAddressID, transporterID, departureDate, arrivalDate, transportTotalCost } = req.body;
  try {
    const transportID = generateId();
    await db.query(
      `INSERT INTO transport (transportID, originAddressID, destinationAddressID,
       transporterID, departureDate, arrivalDate, transportTotalCost)
       VALUES (?,?,?,?,?,?,?)`,
      [transportID, originAddressID, destinationAddressID, transporterID || null,
       departureDate || null, arrivalDate || null, transportTotalCost || 0]
    );
    return success(res, { transportID }, 'Transport created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { originAddressID, destinationAddressID, transporterID, departureDate, arrivalDate, transportTotalCost } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE transport SET originAddressID=?, destinationAddressID=?, transporterID=?,
       departureDate=?, arrivalDate=?, transportTotalCost=? WHERE transportID=?`,
      [originAddressID, destinationAddressID, transporterID || null,
       departureDate || null, arrivalDate || null, transportTotalCost || 0, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Transport not found', 404);
    return success(res, null, 'Transport updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM transport WHERE transportID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Transport not found', 404);
    return success(res, null, 'Transport deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
