const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

// Admin: hand a customer order (sell) to a transporter. Creates/updates the order's
// shipment row, which the transporter then moves through
// 'assigned' → 'in_transit' → 'delivered' from their own space.

// Transporters that can take a delivery: at least one active contact to attribute it to.
const getAvailableTransporters = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.transporterID, TRIM(t.name) AS name, tt.name AS typeName
       FROM transporter t
       LEFT JOIN transportertype tt ON tt.transporterTypeID = t.transporterTypeID
       WHERE EXISTS (SELECT 1 FROM transportercontact tc
                     WHERE tc.transporterID = t.transporterID AND (tc.endedDate IS NULL OR tc.endedDate > NOW()))
       ORDER BY t.name`
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const assign = async (req, res) => {
  const { id: sellID } = req.params;
  const { transporterID } = req.body;
  const expectedDaysDuration = req.body.expectedDaysDuration === '' || req.body.expectedDaysDuration == null
    ? null : Number(req.body.expectedDaysDuration);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query(
      `SELECT sellID, clientID, clientContactID, subTotal, tax, transportCost, total, CAST(completed AS UNSIGNED) AS completed
       FROM sell WHERE sellID = ? FOR UPDATE`,
      [sellID]
    );
    if (!order) { await conn.rollback(); return error(res, 'Commande introuvable', 404); }
    if (order.completed) { await conn.rollback(); return error(res, 'Cette commande est déjà terminée', 409); }

    const [[shipment]] = await conn.query('SELECT shipmentID, status FROM shipment WHERE sellID = ?', [sellID]);
    if (shipment && shipment.status !== 'assigned') {
      await conn.rollback();
      return error(res, 'Le transporteur a déjà pris en charge cette commande', 409);
    }

    const [[contact]] = await conn.query(
      `SELECT contactID FROM transportercontact
       WHERE transporterID = ? AND (endedDate IS NULL OR endedDate > NOW())
       ORDER BY startedDate DESC LIMIT 1`,
      [transporterID]
    );
    if (!contact) { await conn.rollback(); return error(res, 'Ce transporteur n’a aucun contact actif', 400); }

    const [[house]] = await conn.query('SELECT brokerID, contactID FROM brokercontact ORDER BY startedDate LIMIT 1');
    if (!house) { await conn.rollback(); return error(res, 'No broker configured', 500); }

    if (shipment) {
      await conn.query(
        `UPDATE shipment SET transporterID = ?, transporterContactID = ?, expectedDaysDuration = ?
         WHERE shipmentID = ?`,
        [transporterID, contact.contactID, expectedDaysDuration, shipment.shipmentID]
      );
    } else {
      await conn.query(
        `INSERT INTO shipment (shipmentID, sellID, brokerID, brokerContactID, transporterID, transporterContactID,
                               clientID, clientContactID, expectedDaysDuration, status,
                               transportCost, subTotal, tax, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned', ?, ?, ?, ?)`,
        [generateId(), sellID, house.brokerID, house.contactID, transporterID, contact.contactID,
         order.clientID, order.clientContactID, expectedDaysDuration,
         order.transportCost, order.subTotal, order.tax, order.total]
      );
    }
    await conn.query(
      'UPDATE sell SET transporterID = ?, transporterContactID = ? WHERE sellID = ?',
      [transporterID, contact.contactID, sellID]
    );
    await conn.commit();
    return success(res, null, 'Transporteur assigné');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

// Take the order back from the transporter — only before they've picked it up.
const unassign = async (req, res) => {
  const { id: sellID } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[shipment]] = await conn.query('SELECT shipmentID, status FROM shipment WHERE sellID = ? FOR UPDATE', [sellID]);
    if (!shipment) { await conn.rollback(); return error(res, 'Aucun transporteur assigné', 404); }
    if (shipment.status !== 'assigned') {
      await conn.rollback();
      return error(res, 'Le transporteur a déjà pris en charge cette commande', 409);
    }
    await conn.query('DELETE FROM shipment WHERE shipmentID = ?', [shipment.shipmentID]);
    await conn.query('UPDATE sell SET transporterID = NULL, transporterContactID = NULL WHERE sellID = ?', [sellID]);
    await conn.commit();
    return success(res, null, 'Transporteur retiré');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

module.exports = { getAvailableTransporters, assign, unassign };
