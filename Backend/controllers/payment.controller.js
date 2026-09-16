const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { sellID, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.paymentID, p.paymentDate, p.paymentAmount, pm.paymentMethodName, p.sellID
      FROM payment p JOIN paymentmethod pm ON pm.paymentMethodID = p.paymentMethodID WHERE 1=1`;
    const params = [];
    if (sellID) { query += ' AND p.sellID = ?'; params.push(sellID); }
    query += ' ORDER BY p.paymentDate DESC LIMIT ? OFFSET ?';
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
      `SELECT p.*, pm.paymentMethodName FROM payment p
       JOIN paymentmethod pm ON pm.paymentMethodID = p.paymentMethodID WHERE p.paymentID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Payment not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { sellID, paymentMethodID, paymentAmount, creditCardID, mobileMoneyID, transactionID } = req.body;
  try {
    const paymentID = generateId();
    await db.query(
      `INSERT INTO payment (paymentID, paymentMethodID, sellID, paymentDate, paymentAmount,
       creditCardID, mobileMoneyID, transactionID)
       VALUES (?,?,?,NOW(),?,?,?,?)`,
      [paymentID, paymentMethodID, sellID || null, paymentAmount,
       creditCardID || null, mobileMoneyID || null, transactionID || null]
    );
    return success(res, { paymentID }, 'Payment recorded', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const getMethods = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM paymentmethod');
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, getMethods };
