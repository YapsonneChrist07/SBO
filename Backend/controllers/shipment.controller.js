const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { clientID, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT sh.shipmentID, sh.shipmentDate, sh.receivedDate, sh.status, sh.total,
             c.name AS clientName, t.name AS transporterName
      FROM shipment sh
      LEFT JOIN client c ON c.clientID = sh.clientID
      LEFT JOIN transporter t ON t.transporterID = sh.transporterID
      WHERE 1=1`;
    const params = [];
    if (clientID) { query += ' AND sh.clientID = ?'; params.push(clientID); }
    if (status) { query += ' AND sh.status = ?'; params.push(status); }
    query += ' ORDER BY sh.shipmentDate DESC LIMIT ? OFFSET ?';
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
      `SELECT sh.*, c.name AS clientName, t.name AS transporterName, b.name AS brokerName
       FROM shipment sh
       LEFT JOIN client c ON c.clientID = sh.clientID
       LEFT JOIN transporter t ON t.transporterID = sh.transporterID
       LEFT JOIN broker b ON b.brokerID = sh.brokerID
       WHERE sh.shipmentID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Shipment not found', 404);
    const [details] = await db.query(
      `SELECT sd.*, p.name AS productName FROM shipmentdetails sd
       JOIN product p ON p.productID = sd.productID WHERE sd.shipmentID = ?`,
      [req.params.id]
    );
    return success(res, { ...rows[0], details });
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { sellID, transportID, brokerID, brokerContactID, transporterID, transporterContactID,
          clientID, clientContactID, expectedDaysDuration, items, transportCost, tax } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const shipmentID = generateId();
    let subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subTotal + (transportCost || 0) + (tax || 0);

    await conn.query(
      `INSERT INTO shipment (shipmentID, sellID, transportID, brokerID, brokerContactID,
       transporterID, transporterContactID, clientID, clientContactID, shipmentDate,
       expectedDaysDuration, status, subTotal, transportCost, tax, total)
       VALUES (?,?,?,?,?,?,?,?,?,NOW(),?,'PENDING',?,?,?,?)`,
      [shipmentID, sellID || null, transportID || null, brokerID || null, brokerContactID || null,
       transporterID || null, transporterContactID || null, clientID || null, clientContactID || null,
       expectedDaysDuration || null, subTotal, transportCost || 0, tax || 0, total]
    );

    for (const item of items) {
      await conn.query(
        'INSERT INTO shipmentdetails (shipmentID, productID, lenghtID, quantity, unitPrice, total) VALUES (?,?,?,?,?,?)',
        [shipmentID, item.productID, item.lenghtID || null, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
    }

    await conn.commit();
    return success(res, { shipmentID }, 'Shipment created', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const updateStatus = async (req, res) => {
  const { status, receivedDate } = req.body;
  const allowed = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
  if (!allowed.includes(status)) return error(res, `Status must be one of: ${allowed.join(', ')}`, 400);
  try {
    const [result] = await db.query(
      'UPDATE shipment SET status=?, receivedDate=? WHERE shipmentID=?',
      [status, receivedDate || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Shipment not found', 404);
    return success(res, null, 'Shipment status updated');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, create, updateStatus };
