/*
 * Fictional demo transporters, so the transporter space has data to show before real
 * transporters join. See scripts/README.md.
 *
 *   npm run demo:transporters               create them (no-op if they already exist)
 *   npm run demo:transporters -- --disable  end their account links: they can't log in and
 *                                           can't be assigned new deliveries
 *   npm run demo:transporters -- --enable   undo --disable
 *   npm run demo:transporters -- --remove   delete everything this script created
 *
 * Every row it creates has an ID starting with "DEMO". It never touches real customer
 * orders: deliveries are assigned to them from the admin order page.
 */
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Local default; the online demo is built with its own secret DEMO_PASSWORD (see DEPLOYMENT.md).
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoSBO2026';
const DEMO_CITY = 'CITY_1'; // Grand-Bassam
const DOMESTIC_TRAJECT = 'TRJ_3'; // Côte d'Ivoire → Côte d'Ivoire
const REFERENCE_TRANSPORTER = 'TPR_1'; // legacy carrier whose international tariff Cargo is based on

const TRANSPORTERS = [
  {
    key: 'EXP',
    name: 'Bassam Express (démo)',
    description: 'Livraison à moto et en tricycle à Grand-Bassam et Abidjan, sous 24 à 48 h. Transporteur fictif de démonstration.',
    typeID: null,
    contact: { firstName: 'Ibrahim', lastName: 'Démo', username: 'demo_express' },
    // Domestic only: a base fee plus a per-kg rate, rounded to 50 FCFA.
    tariff: { kind: 'domestic', base: 1000, perKg: 400 },
    // Demo-supplier purchase orders this transporter picks up.
    pickups: ['DEMOPO_BIJ_1', 'DEMOPO_BIJ_2', 'DEMOPO_BIJ_3'],
  },
  {
    key: 'CAR',
    name: 'Trans-Côtière Cargo (démo)',
    description: 'Fret routier et groupage vers l’Afrique de l’Ouest et l’international. Transporteur fictif de démonstration.',
    typeID: 'TPRT_1',
    contact: { firstName: 'Adjoua', lastName: 'Démo', username: 'demo_cargo' },
    tariff: { kind: 'copy', factor: 0.95 },
    pickups: ['DEMOPO_WAX_1', 'DEMOPO_WAX_2', 'DEMOPO_KAR_1'],
  },
];

const round50 = (n) => Math.round(n / 50) * 50;
const ids = (t) => ({
  transporter: `DEMOTRP_${t.key}`,
  contact: `DEMOTCNT_${t.key}`,
  contactAddress: `DEMOTADR_${t.key}`,
  transporterAddress: `DEMOTADR_${t.key}_O`,
});

async function seed(conn) {
  const [[existing]] = await conn.query("SELECT COUNT(*) AS n FROM transporter WHERE transporterID LIKE 'DEMOTRP\\_%'");
  if (existing.n) {
    console.log('Demo transporters already exist — nothing to do. Use --remove first to recreate them.');
    return;
  }
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const t of TRANSPORTERS) {
    const id = ids(t);
    const email = `${t.contact.username.replace('_', '.')}@example.com`;
    await conn.query('INSERT INTO address (addressID, cityID, email) VALUES (?, ?, ?)', [id.contactAddress, DEMO_CITY, email]);
    await conn.query('INSERT INTO address (addressID, cityID, email) VALUES (?, ?, ?)', [id.transporterAddress, DEMO_CITY, email]);
    await conn.query(
      `INSERT INTO contact (contactID, addressID, firstName, lastName, username, password, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id.contact, id.contactAddress, t.contact.firstName, t.contact.lastName, t.contact.username, hash, email]
    );
    await conn.query(
      'INSERT INTO transporter (transporterID, addressID, transporterTypeID, name, businessDescription) VALUES (?, ?, ?, ?, ?)',
      [id.transporter, id.transporterAddress, t.typeID, t.name, t.description]
    );
    await conn.query(
      'INSERT INTO transportercontact (transporterID, contactID, startedDate) VALUES (?, ?, NOW() - INTERVAL 90 DAY)',
      [id.transporter, id.contact]
    );

    let rateCount = 0;
    if (t.tariff.kind === 'domestic') {
      const [brackets] = await conn.query('SELECT weightLimitID, weightMax FROM weightlimit');
      for (const b of brackets) {
        await conn.query(
          'INSERT INTO transportercostpertraject (trajectID, weightLimitID, transporterID, transportCost) VALUES (?, ?, ?, ?)',
          [DOMESTIC_TRAJECT, b.weightLimitID, id.transporter, round50(t.tariff.base + t.tariff.perKg * b.weightMax)]
        );
        rateCount += 1;
      }
    } else {
      const [result] = await conn.query(
        `INSERT INTO transportercostpertraject (trajectID, weightLimitID, transporterID, transportCost)
         SELECT trajectID, weightLimitID, ?, ROUND(transportCost * ? / 50) * 50
         FROM transportercostpertraject WHERE transporterID = ?`,
        [id.transporter, t.tariff.factor, REFERENCE_TRANSPORTER]
      );
      rateCount = result.affectedRows;
      // Databases built from schema.sql don't have the legacy carrier: generate a tariff per
      // zone instead (base fee + price per kg, same order of magnitude as the legacy rates).
      if (!rateCount) {
        const [generated] = await conn.query(
          `INSERT INTO transportercostpertraject (trajectID, weightLimitID, transporterID, transportCost)
           SELECT t.trajectID, w.weightLimitID, ?,
                  ROUND((ELT(t.zoneID, 1000, 1400, 1500, 2000, 2800, 5000)
                       + ELT(t.zoneID, 2500, 3500, 4000, 5000, 5500, 10000) * w.weightMax) * ? / 50) * 50
           FROM traject t CROSS JOIN weightlimit w
           WHERE t.zoneID BETWEEN 1 AND 6`,
          [id.transporter, t.tariff.factor]
        );
        rateCount = generated.affectedRows;
      }
    }

    // Only demo purchase orders (from demoSuppliers.js), if they exist.
    const [assigned] = await conn.query(
      'UPDATE purchase SET transporterID = ?, transporterContactID = ? WHERE purchaseID IN (?)',
      [id.transporter, id.contact, t.pickups]
    );

    console.log(`+ ${t.name}: ${rateCount} tarifs, ${assigned.affectedRows} enlèvements — login ${t.contact.username}`);
  }
}

async function remove(conn) {
  const steps = [
    // Demo deliveries an admin assigned from the order page: give the orders back.
    ["shipments released", "DELETE FROM shipment WHERE transporterID LIKE 'DEMOTRP\\_%' AND status = 'assigned'"],
    ["sell (unassigned)", "UPDATE sell s LEFT JOIN shipment sh ON sh.sellID = s.sellID SET s.transporterID = NULL, s.transporterContactID = NULL WHERE s.transporterID LIKE 'DEMOTRP\\_%' AND sh.shipmentID IS NULL"],
    ["purchase (unassigned)", "UPDATE purchase SET transporterID = NULL, transporterContactID = NULL WHERE transporterID LIKE 'DEMOTRP\\_%'"],
    ["tariffs", "DELETE FROM transportercostpertraject WHERE transporterID LIKE 'DEMOTRP\\_%'"],
  ];
  for (const [label, sql] of steps) {
    const [result] = await conn.query(sql);
    console.log(`- ${label}: ${result.affectedRows}`);
  }
  // Deliveries already picked up or delivered are real history on real orders.
  const [[{ kept }]] = await conn.query("SELECT COUNT(*) AS kept FROM shipment WHERE transporterID LIKE 'DEMOTRP\\_%'");
  if (kept) {
    throw new Error(`${kept} delivery(ies) by demo transporters are in progress or done on customer orders. ` +
      'Use --disable instead, so that order history keeps its transporter.');
  }
  for (const [label, sql] of [
    ['transportercontact', "DELETE FROM transportercontact WHERE transporterID LIKE 'DEMOTRP\\_%'"],
    ['transporter', "DELETE FROM transporter WHERE transporterID LIKE 'DEMOTRP\\_%'"],
    ['passwordreset', "DELETE FROM passwordreset WHERE contactID LIKE 'DEMOTCNT\\_%'"],
    ['contact', "DELETE FROM contact WHERE contactID LIKE 'DEMOTCNT\\_%'"],
    ['address', "DELETE FROM address WHERE addressID LIKE 'DEMOTADR\\_%'"],
  ]) {
    const [result] = await conn.query(sql);
    console.log(`- ${label}: ${result.affectedRows}`);
  }
}

async function setActive(conn, active) {
  const [result] = await conn.query(
    `UPDATE transportercontact SET endedDate = ${active ? 'NULL' : 'NOW()'} WHERE transporterID LIKE 'DEMOTRP\\_%'`
  );
  console.log(`${active ? 'Enabled' : 'Disabled'} ${result.affectedRows} demo transporter account link(s).`);
}

(async () => {
  const mode = process.argv[2] || '--seed';
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (mode === '--seed') await seed(conn);
    else if (mode === '--remove') await remove(conn);
    else if (mode === '--disable') await setActive(conn, false);
    else if (mode === '--enable') await setActive(conn, true);
    else throw new Error(`Unknown option ${mode} (use --disable, --enable or --remove)`);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('Failed, nothing was changed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await db.end();
  }
})();
