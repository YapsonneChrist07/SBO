const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getByContact = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mm.*, mo.name AS operatorName, mo.country AS operatorCountry
       FROM mobilemoney mm
       LEFT JOIN mobileoperator mo ON mo.mobileOperatorID = mm.mobileOperatorID
       WHERE mm.contactID = ?`,
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
      `SELECT mm.*, mo.name AS operatorName FROM mobilemoney mm
       LEFT JOIN mobileoperator mo ON mo.mobileOperatorID = mm.mobileOperatorID
       WHERE mm.mobileMoneyID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Mobile money account not found', 404);
    if (rows[0].contactID !== req.user.contactID) return error(res, 'Forbidden', 403);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { mobilePhoneNbr, mobileOperatorID } = req.body;
  try {
    const mobileMoneyID = generateId();
    await db.query(
      `INSERT INTO mobilemoney (mobileMoneyID, mobilePhoneNbr, contactID, mobileOperatorID, deactivated)
       VALUES (?,?,?,?,'N')`,
      [mobileMoneyID, mobilePhoneNbr, req.user.contactID, mobileOperatorID || null]
    );
    return success(res, { mobileMoneyID }, 'Mobile money account added', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return error(res, 'Phone number already registered', 409);
    return error(res, err.message);
  }
};

const deactivate = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT contactID FROM mobilemoney WHERE mobileMoneyID = ?', [req.params.id]);
    if (!rows.length) return error(res, 'Mobile money account not found', 404);
    if (rows[0].contactID !== req.user.contactID) return error(res, 'Forbidden', 403);
    await db.query("UPDATE mobilemoney SET deactivated='Y' WHERE mobileMoneyID=?", [req.params.id]);
    return success(res, null, 'Mobile money account deactivated');
  } catch (err) {
    return error(res, err.message);
  }
};

const getOperators = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mobileoperator ORDER BY name');
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getByContact, getById, create, deactivate, getOperators };
