const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { clientID, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.transactionID, t.transactionDate, t.total, t.status, t.result,
             t.creditCardNbr, t.mobilePhoneNbr, t.sellID,
             c.firstName, c.lastName
      FROM transaction t
      LEFT JOIN contact c ON c.contactID = t.clientContactID
      WHERE 1=1`;
    const params = [];
    if (clientID) { query += ' AND t.clientID = ?'; params.push(clientID); }
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    query += ' ORDER BY t.transactionDate DESC LIMIT ? OFFSET ?';
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
      `SELECT t.*, c.firstName, c.lastName, c.email
       FROM transaction t
       LEFT JOIN contact c ON c.contactID = t.clientContactID
       WHERE t.transactionID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Transaction not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { clientID, clientContactID, sellID, creditCardNbr, mobilePhoneNbr,
          phoneCountryCode, total, message } = req.body;
  try {
    const transactionID = generateId();
    await db.query(
      `INSERT INTO transaction (transactionID, clientID, clientContactID, sellID,
       transactionDate, creditCardNbr, mobilePhoneNbr, phoneCountryCode,
       total, message, status, result)
       VALUES (?,?,?,?,NOW(),?,?,?,?,?,'PENDING','PENDING')`,
      [transactionID, clientID || null, clientContactID || null, sellID || null,
       creditCardNbr || null, mobilePhoneNbr || null, phoneCountryCode || null,
       total || 0, message || null]
    );
    return success(res, { transactionID }, 'Transaction created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const updateStatus = async (req, res) => {
  const { status, result, signature } = req.body;
  const allowedStatus = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  if (!allowedStatus.includes(status)) return error(res, `Status must be one of: ${allowedStatus.join(', ')}`, 400);
  try {
    const [dbResult] = await db.query(
      'UPDATE transaction SET status=?, result=?, signature=? WHERE transactionID=?',
      [status, result || null, signature || null, req.params.id]
    );
    if (!dbResult.affectedRows) return error(res, 'Transaction not found', 404);
    return success(res, null, 'Transaction status updated');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, updateStatus };
