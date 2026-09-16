const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getByContact = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cc.creditCardID, cc.creditCardNbr, cc.fullName, cc.expirationDate,
              cc.deactivated, cct.typeName
       FROM creditcard cc
       LEFT JOIN creditcardtype cct ON cct.creditCardTypeID = cc.creditCardTypeID
       WHERE cc.contactID = ?`,
      [req.params.contactID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cc.*, cct.typeName FROM creditcard cc
       LEFT JOIN creditcardtype cct ON cct.creditCardTypeID = cc.creditCardTypeID
       WHERE cc.creditCardID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Credit card not found', 404);
    if (rows[0].contactID !== req.user.contactID) return error(res, 'Forbidden', 403);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { creditCardNbr, creditCardTypeID, billingAddressID, fullName, verificationCode, expirationDate } = req.body;
  try {
    const creditCardID = generateId();
    await db.query(
      `INSERT INTO creditcard (creditCardID, creditCardNbr, contactID, creditCardTypeID,
       billingAddressID, fullName, verificationCode, expirationDate, deactivated)
       VALUES (?,?,?,?,?,?,?,?,'N')`,
      [creditCardID, creditCardNbr, req.user.contactID, creditCardTypeID,
       billingAddressID || null, fullName || null, verificationCode || null, expirationDate || null]
    );
    return success(res, { creditCardID }, 'Credit card added', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const deactivate = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT contactID FROM creditcard WHERE creditCardID = ?', [req.params.id]);
    if (!rows.length) return error(res, 'Credit card not found', 404);
    if (rows[0].contactID !== req.user.contactID) return error(res, 'Forbidden', 403);
    await db.query("UPDATE creditcard SET deactivated='Y' WHERE creditCardID=?", [req.params.id]);
    return success(res, null, 'Credit card deactivated');
  } catch (err) {
    return error(res, err.message);
  }
};

const getTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM creditcardtype');
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getByContact, getById, create, deactivate, getTypes };
