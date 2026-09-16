const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, supplierTypeID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT s.supplierID, s.name, s.businessDescription, st.name AS supplierTypeName
      FROM supplier s
      LEFT JOIN suppliertype st ON st.supplierTypeID = s.supplierTypeID
      WHERE 1=1`;
    const params = [];
    if (search) { query += ' AND s.name LIKE ?'; params.push(`%${search}%`); }
    if (supplierTypeID) { query += ' AND s.supplierTypeID = ?'; params.push(supplierTypeID); }
    query += ' ORDER BY s.name LIMIT ? OFFSET ?';
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
      `SELECT s.*, st.name AS supplierTypeName FROM supplier s
       LEFT JOIN suppliertype st ON st.supplierTypeID = s.supplierTypeID WHERE s.supplierID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Supplier not found', 404);
    const [contacts] = await db.query(
      `SELECT con.contactID, con.firstName, con.lastName, con.email, con.phone
       FROM suppliercontact sc JOIN contact con ON con.contactID = sc.contactID WHERE sc.supplierID = ?`,
      [req.params.id]
    );
    const [products] = await db.query(
      `SELECT p.productID, p.name, ps.supplierUnitPrice, ps.supplierProductCode
       FROM productsupplier ps JOIN product p ON p.productID = ps.productID WHERE ps.supplierID = ?`,
      [req.params.id]
    );
    const [avgReview] = await db.query('SELECT * FROM averagesupplierreview WHERE supplierID = ?', [req.params.id]);
    return success(res, { ...rows[0], contacts, products, averageReview: avgReview[0] || null });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { name, businessDescription, supplierTypeID, addressID } = req.body;
  try {
    const supplierID = generateId();
    await db.query(
      'INSERT INTO supplier (supplierID, name, businessDescription, supplierTypeID, addressID) VALUES (?,?,?,?,?)',
      [supplierID, name, businessDescription || null, supplierTypeID || null, addressID || null]
    );
    return success(res, { supplierID }, 'Supplier created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { name, businessDescription, supplierTypeID, addressID } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE supplier SET name=?, businessDescription=?, supplierTypeID=?, addressID=? WHERE supplierID=?',
      [name, businessDescription || null, supplierTypeID || null, addressID || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Supplier not found', 404);
    return success(res, null, 'Supplier updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM supplier WHERE supplierID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Supplier not found', 404);
    return success(res, null, 'Supplier deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

const addContact = async (req, res) => {
  const { contactID } = req.body;
  try {
    await db.query(
      'INSERT INTO suppliercontact (supplierID, contactID, startedDate) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE startedDate=NOW()',
      [req.params.id, contactID]
    );
    return success(res, null, 'Contact linked to supplier', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const getReviews = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.*, c.firstName, c.lastName FROM supplierreview sr
       LEFT JOIN contact c ON c.contactID = sr.contactID
       WHERE sr.supplierID = ? ORDER BY sr.evaluatedDate DESC`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove, addContact, getReviews };
