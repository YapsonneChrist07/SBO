const db = require('../config/db');
const { success, error } = require('../utils/response');

// Everything here is scoped to req.organizationID (set by authorizeOrganization('transporter')).

const SHIPMENT_STATUSES = ['assigned', 'in_transit', 'delivered'];

const getSummary = async (req, res) => {
  const transporterID = req.organizationID;
  try {
    const [statusRows] = await db.query(
      'SELECT status, COUNT(*) AS n FROM shipment WHERE transporterID = ? GROUP BY status',
      [transporterID]
    );
    const shipments = Object.fromEntries(SHIPMENT_STATUSES.map((s) => [s, 0]));
    for (const r of statusRows) shipments[r.status] = Number(r.n);

    const [[pickups]] = await db.query(
      `SELECT SUM(receivedDate IS NULL) AS pending, SUM(receivedDate IS NOT NULL) AS done
       FROM purchase WHERE transporterID = ?`,
      [transporterID]
    );
    const [[tariffs]] = await db.query(
      `SELECT COUNT(*) AS rateCount, COUNT(DISTINCT t.zoneID) AS zoneCount
       FROM transportercostpertraject c JOIN traject t ON t.trajectID = c.trajectID
       WHERE c.transporterID = ?`,
      [transporterID]
    );
    return success(res, {
      shipments,
      pickupsPending: Number(pickups.pending || 0),
      pickupsDone: Number(pickups.done || 0),
      rateCount: Number(tariffs.rateCount),
      zoneCount: Number(tariffs.zoneCount),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

// ---- Customer deliveries (shipment rows for web orders) ----

const getShipments = async (req, res) => {
  const { status } = req.query;
  let where = ' WHERE sh.transporterID = ?';
  const params = [req.organizationID];
  if (SHIPMENT_STATUSES.includes(status)) { where += ' AND sh.status = ?'; params.push(status); }
  try {
    const [rows] = await db.query(
      `SELECT sh.shipmentID, sh.sellID, sh.status, sh.shipmentDate, sh.receivedDate, sh.expectedDaysDuration,
              s.sellDate, ct.firstName, ct.lastName, ci.name AS cityName,
              (SELECT COALESCE(SUM(sd.quantity), 0) FROM selldetails sd WHERE sd.sellID = sh.sellID) AS itemCount
       FROM shipment sh
       JOIN sell s ON s.sellID = sh.sellID
       LEFT JOIN contact ct ON ct.contactID = sh.clientContactID
       LEFT JOIN address a ON a.addressID = ct.addressID
       LEFT JOIN city ci ON ci.cityID = a.cityID
       ${where}
       ORDER BY FIELD(sh.status, 'in_transit', 'assigned', 'delivered'), s.sellDate DESC`,
      params
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const loadShipment = async (sellID, transporterID) => {
  const [[shipment]] = await db.query(
    `SELECT sh.shipmentID, sh.sellID, sh.status, sh.shipmentDate, sh.receivedDate, sh.expectedDaysDuration,
            s.sellDate,
            ct.firstName, ct.lastName, ct.phone AS contactPhone, ct.email,
            a.lineOfAddress, a.postalCode, a.phone AS addressPhone, ci.name AS cityName
     FROM shipment sh
     JOIN sell s ON s.sellID = sh.sellID
     LEFT JOIN contact ct ON ct.contactID = sh.clientContactID
     LEFT JOIN address a ON a.addressID = ct.addressID
     LEFT JOIN city ci ON ci.cityID = a.cityID
     WHERE sh.sellID = ? AND sh.transporterID = ?`,
    [sellID, transporterID]
  );
  return shipment;
};

// The transporter sees what to carry and where, not what the customer paid.
const getShipment = async (req, res) => {
  try {
    const shipment = await loadShipment(req.params.sellID, req.organizationID);
    if (!shipment) return error(res, 'Livraison introuvable', 404);
    const [items] = await db.query(
      `SELECT sd.productID, sd.quantity, TRIM(p.name) AS productName, p.weight, l.lenghtValue
       FROM selldetails sd
       JOIN product p ON p.productID = sd.productID
       LEFT JOIN lenghtlookup l ON l.lenghtID = sd.lenghtID
       WHERE sd.sellID = ?
       ORDER BY p.name`,
      [req.params.sellID]
    );
    return success(res, { ...shipment, items });
  } catch (err) {
    return error(res, err.message);
  }
};

// assigned → in_transit (picked up), in_transit → delivered. Delivering also completes the order.
const advanceShipment = (from, to) => async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[shipment]] = await conn.query(
      'SELECT shipmentID, status FROM shipment WHERE sellID = ? AND transporterID = ? FOR UPDATE',
      [req.params.sellID, req.organizationID]
    );
    if (!shipment) { await conn.rollback(); return error(res, 'Livraison introuvable', 404); }
    if (shipment.status !== from) {
      await conn.rollback();
      return error(res, `Action impossible : la livraison est au statut « ${shipment.status} »`, 409);
    }
    const dateColumn = to === 'in_transit' ? 'shipmentDate' : 'receivedDate';
    await conn.query(`UPDATE shipment SET status = ?, ${dateColumn} = NOW() WHERE shipmentID = ?`, [to, shipment.shipmentID]);
    if (to === 'delivered') {
      await conn.query('UPDATE sell SET completed = 1 WHERE sellID = ?', [req.params.sellID]);
    }
    await conn.commit();
    return success(res, null, to === 'delivered' ? 'Livraison confirmée' : 'Prise en charge confirmée');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

// ---- Supplier pick-ups (purchase orders assigned to this transporter) ----

const getPickups = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pu.purchaseID, pu.purchaseDate, pu.receivedDate, TRIM(s.name) AS supplierName, st.storeName,
              (SELECT COALESCE(SUM(pd.quantity), 0) FROM purchasedetails pd WHERE pd.purchaseID = pu.purchaseID) AS itemCount
       FROM purchase pu
       JOIN supplier s ON s.supplierID = pu.supplierID
       LEFT JOIN store st ON st.storeID = pu.storeID
       WHERE pu.transporterID = ?
       ORDER BY (pu.receivedDate IS NULL) DESC, pu.purchaseDate DESC`,
      [req.organizationID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getPickup = async (req, res) => {
  try {
    const [[pickup]] = await db.query(
      `SELECT pu.purchaseID, pu.purchaseDate, pu.receivedDate,
              TRIM(s.name) AS supplierName,
              CONCAT(sc.firstName, ' ', sc.lastName) AS supplierContactName, sc.phone AS supplierPhone, sc.email AS supplierEmail,
              sa.lineOfAddress AS supplierAddress, sci.name AS supplierCity,
              st.storeName, la.lineOfAddress AS storeAddress, lci.name AS storeCity, la.phone AS storePhone
       FROM purchase pu
       JOIN supplier s ON s.supplierID = pu.supplierID
       LEFT JOIN contact sc ON sc.contactID = pu.supplierContactID
       LEFT JOIN address sa ON sa.addressID = s.addressID
       LEFT JOIN city sci ON sci.cityID = sa.cityID
       LEFT JOIN store st ON st.storeID = pu.storeID
       LEFT JOIN location l ON l.locationID = st.locationID
       LEFT JOIN address la ON la.addressID = l.addressID
       LEFT JOIN city lci ON lci.cityID = la.cityID
       WHERE pu.purchaseID = ? AND pu.transporterID = ?`,
      [req.params.id, req.organizationID]
    );
    if (!pickup) return error(res, 'Enlèvement introuvable', 404);
    const [items] = await db.query(
      `SELECT pd.productID, pd.quantity, TRIM(p.name) AS productName, p.weight
       FROM purchasedetails pd JOIN product p ON p.productID = pd.productID
       WHERE pd.purchaseID = ? ORDER BY p.name`,
      [req.params.id]
    );
    return success(res, { ...pickup, items });
  } catch (err) {
    return error(res, err.message);
  }
};

// ---- Tariffs: cost per route (traject = destination country, grouped in zones) and weight bracket ----

const getTariffZones = async (req, res) => {
  try {
    const [zones] = await db.query(
      `SELECT z.zoneID, z.name, COUNT(t.trajectID) AS destinationCount,
              (SELECT COUNT(*) FROM transportercostpertraject c JOIN traject t2 ON t2.trajectID = c.trajectID
               WHERE t2.zoneID = z.zoneID AND c.transporterID = ?) AS rateCount
       FROM zone z
       LEFT JOIN traject t ON t.zoneID = z.zoneID
       GROUP BY z.zoneID, z.name
       HAVING destinationCount > 0
       ORDER BY z.zoneID`,
      [req.organizationID]
    );
    const [[{ bracketCount }]] = await db.query('SELECT COUNT(*) AS bracketCount FROM weightlimit');
    return success(res, { zones, bracketCount: Number(bracketCount) });
  } catch (err) {
    return error(res, err.message);
  }
};

// One zone's grid: its destinations, the weight brackets, and this transporter's costs.
const getZoneTariffs = async (req, res) => {
  const { zoneID } = req.params;
  try {
    const [destinations] = await db.query(
      'SELECT trajectID, TRIM(destinationCountry) AS country FROM traject WHERE zoneID = ? ORDER BY TRIM(destinationCountry)',
      [zoneID]
    );
    if (!destinations.length) return error(res, 'Zone introuvable', 404);
    const [brackets] = await db.query('SELECT weightLimitID, weightMax FROM weightlimit ORDER BY weightMax');
    const [rates] = await db.query(
      `SELECT c.trajectID, c.weightLimitID, c.transportCost
       FROM transportercostpertraject c JOIN traject t ON t.trajectID = c.trajectID
       WHERE t.zoneID = ? AND c.transporterID = ?`,
      [zoneID, req.organizationID]
    );
    return success(res, { zoneID, destinations, brackets, rates });
  } catch (err) {
    return error(res, err.message);
  }
};

// Save costs for one bracket on one destination, or on every destination of the zone.
// transportCost null/'' removes the rate (the route isn't served at that weight).
const saveTariffs = async (req, res) => {
  const { zoneID, trajectID, rates } = req.body;
  const conn = await db.getConnection();
  try {
    const [trajects] = trajectID
      ? await conn.query('SELECT trajectID FROM traject WHERE trajectID = ? AND zoneID = ?', [trajectID, zoneID])
      : await conn.query('SELECT trajectID FROM traject WHERE zoneID = ?', [zoneID]);
    if (!trajects.length) return error(res, 'Destination introuvable', 404);
    const [brackets] = await conn.query('SELECT weightLimitID FROM weightlimit WHERE weightLimitID IN (?)', [rates.map((r) => r.weightLimitID)]);
    if (brackets.length !== new Set(rates.map((r) => r.weightLimitID)).size) return error(res, 'Tranche de poids inconnue', 400);

    await conn.beginTransaction();
    let saved = 0;
    for (const { trajectID: t } of trajects) {
      for (const rate of rates) {
        if (rate.transportCost === null || rate.transportCost === '') {
          await conn.query(
            'DELETE FROM transportercostpertraject WHERE trajectID = ? AND weightLimitID = ? AND transporterID = ?',
            [t, rate.weightLimitID, req.organizationID]
          );
        } else {
          await conn.query(
            `INSERT INTO transportercostpertraject (trajectID, weightLimitID, transporterID, transportCost)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE transportCost = VALUES(transportCost)`,
            [t, rate.weightLimitID, req.organizationID, Number(rate.transportCost)]
          );
        }
        saved += 1;
      }
    }
    await conn.commit();
    return success(res, { saved }, 'Tarifs enregistrés');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

module.exports = {
  getSummary, getShipments, getShipment,
  pickUpShipment: advanceShipment('assigned', 'in_transit'),
  deliverShipment: advanceShipment('in_transit', 'delivered'),
  getPickups, getPickup, getTariffZones, getZoneTariffs, saveTariffs,
};
