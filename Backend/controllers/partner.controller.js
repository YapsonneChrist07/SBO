const db = require('../config/db');
const { success, error } = require('../utils/response');

// Admin: review supplier and transporter companies (approve sign-ups, disable, re-enable).

const TYPES = {
  supplier: {
    table: 'supplier', link: 'suppliercontact', id: 'supplierID',
    activity: `(SELECT COUNT(*) FROM productsupplier x WHERE x.supplierID = o.supplierID) AS productCount,
               (SELECT COUNT(*) FROM purchase x WHERE x.supplierID = o.supplierID) AS purchaseCount`,
  },
  transporter: {
    table: 'transporter', link: 'transportercontact', id: 'transporterID',
    activity: `(SELECT COUNT(*) FROM shipment x WHERE x.transporterID = o.transporterID) AS deliveryCount,
               (SELECT COUNT(*) FROM purchase x WHERE x.transporterID = o.transporterID) AS pickupCount,
               (SELECT COUNT(*) FROM transportercostpertraject x WHERE x.transporterID = o.transporterID) AS rateCount`,
  },
};
const STATUSES = ['pending', 'active', 'disabled'];

const getSummary = async (req, res) => {
  try {
    const summary = {};
    for (const [type, t] of Object.entries(TYPES)) {
      const [rows] = await db.query(`SELECT status, COUNT(*) AS n FROM ${t.table} GROUP BY status`);
      summary[type] = Object.fromEntries(STATUSES.map((s) => [s, Number(rows.find((r) => r.status === s)?.n || 0)]));
    }
    return success(res, summary);
  } catch (err) {
    return error(res, err.message);
  }
};

const getAll = async (req, res) => {
  const t = TYPES[req.query.type];
  if (!t) return error(res, 'type must be supplier or transporter', 400);
  const { status, search } = req.query;
  let where = ' WHERE 1=1';
  const params = [];
  if (STATUSES.includes(status)) { where += ' AND o.status = ?'; params.push(status); }
  if (search) { where += ' AND o.name LIKE ?'; params.push(`%${search}%`); }
  try {
    const [rows] = await db.query(
      `SELECT o.${t.id} AS id, TRIM(o.name) AS name, o.businessDescription, o.status, o.statusChangedDate,
              (SELECT MIN(l.startedDate) FROM ${t.link} l WHERE l.${t.id} = o.${t.id}) AS signedUpDate,
              c.firstName, c.lastName, c.username, c.email, c.phone,
              ${t.activity}
       FROM ${t.table} o
       LEFT JOIN contact c ON c.contactID = (
         SELECT l.contactID FROM ${t.link} l WHERE l.${t.id} = o.${t.id}
         ORDER BY (l.endedDate IS NULL) DESC, l.startedDate DESC LIMIT 1
       )
       ${where}
       ORDER BY FIELD(o.status, 'pending', 'active', 'disabled'), o.name`,
      params
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

// pending → active (approve) or disabled (reject); active ↔ disabled.
const setStatus = async (req, res) => {
  const t = TYPES[req.params.type];
  if (!t) return error(res, 'Type de partenaire inconnu', 404);
  const { status } = req.body;
  try {
    const [[current]] = await db.query(`SELECT status FROM ${t.table} WHERE ${t.id} = ?`, [req.params.id]);
    if (!current) return error(res, 'Partenaire introuvable', 404);
    if (current.status === status) return success(res, null, 'Aucun changement');
    await db.query(
      `UPDATE ${t.table} SET status = ?, statusChangedDate = NOW() WHERE ${t.id} = ?`,
      [status, req.params.id]
    );
    const messages = { active: current.status === 'pending' ? 'Partenaire validé' : 'Partenaire réactivé', disabled: 'Partenaire désactivé' };
    return success(res, null, messages[status]);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getSummary, getAll, setStatus };
