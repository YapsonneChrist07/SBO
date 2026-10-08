/*
 * Fictional demo suppliers, so the supplier space and purchase orders have data to show
 * before real suppliers join. See scripts/README.md.
 *
 *   npm run demo:suppliers               create them (no-op if they already exist)
 *   npm run demo:suppliers -- --disable  end their account links: they can't log in and
 *                                        can't be picked for new purchase orders
 *   npm run demo:suppliers -- --enable   undo --disable
 *   npm run demo:suppliers -- --remove   delete everything this script created
 *
 * Every row it creates has an ID starting with "DEMO", which is how --remove finds them.
 */
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const DEMO_PASSWORD = 'DemoSBO2026';
const DEMO_CITY = 'CITY_1'; // Grand-Bassam

// Each supplier offers the first products (by ID) of the listed product lines, at a
// wholesale price of `ratio` × SBO's selling price.
const SUPPLIERS = [
  {
    key: 'WAX',
    name: 'Atelier Wax (démo)',
    description: 'Tissus wax et pagnes tissés, vendus au mètre ou en coupons. Fournisseur fictif de démonstration.',
    contact: { firstName: 'Awa', lastName: 'Démo', username: 'demo_wax' },
    productLines: { PL_0000042: 3, PL_0000043: 3 },
    // The first products of these lines have placeholder names in the legacy data
    // ("alpharami"…), so only pick genuinely wax/pagne-named fabrics.
    nameLike: ['%wax%', '%pagne%'],
    ratio: 0.6,
    codePrefix: 'AWX',
    // Plateau is the farthest shop from the workshop: +8% delivered there.
    shopSurcharge: { storeName: 'SBO Plateau', factor: 1.08, products: 3 },
    orders: [
      { daysAgo: 28, store: 'SBO Grand-Bassam Centre', items: [[0, 20], [1, 15], [3, 10]], transportCost: 15, received: true },
      { daysAgo: 2, store: 'SBO Plateau', items: [[2, 12], [4, 8]], transportCost: 20, received: false },
    ],
    reviews: [
      { daysAgo: 25, rating: 5, message: 'Tissus conformes à l’échantillon, livraison dans les délais.' },
      { daysAgo: 60, rating: 4, message: 'Bonne qualité, un coupon manquant rapidement remplacé.' },
    ],
  },
  {
    key: 'BIJ',
    name: 'Bijoux du Lagon (démo)',
    description: 'Bracelets, colliers et boucles d’oreilles en perles et laiton. Fournisseur fictif de démonstration.',
    contact: { firstName: 'Koffi', lastName: 'Démo', username: 'demo_bijoux' },
    productLines: { PL_0000008: 2, PL_0000010: 2, PL_0000006: 2 },
    ratio: 0.55,
    codePrefix: 'BDL',
    shopSurcharge: { storeName: 'SBO Plateau', factor: 1.05, products: 2 },
    orders: [
      { daysAgo: 35, store: 'SBO Bassam Plage', items: [[0, 30], [2, 25], [4, 40]], transportCost: 10, received: true },
      { daysAgo: 12, store: 'SBO Plateau', items: [[1, 20], [3, 15]], transportCost: 12, received: true },
      { daysAgo: 1, store: 'SBO Grand-Bassam Centre', items: [[0, 15], [5, 20]], transportCost: 0, received: false },
    ],
    reviews: [
      { daysAgo: 10, rating: 4, message: 'Finitions soignées. Emballage à améliorer pour le transport.' },
    ],
  },
  {
    key: 'KAR',
    name: 'Coopérative Karité (démo)',
    description: 'Beurre de karité, savons et soins naturels produits par une coopérative de femmes. Fournisseur fictif de démonstration.',
    contact: { firstName: 'Mariam', lastName: 'Démo', username: 'demo_karite' },
    productLines: { PL_0000002: 4, PL_0000047: 2 },
    ratio: 0.65,
    codePrefix: 'CKD',
    orders: [
      { daysAgo: 21, store: 'SBO Grand-Bassam Centre', items: [[0, 24], [1, 24], [4, 12]], transportCost: 8, received: true },
    ],
    reviews: [
      { daysAgo: 18, rating: 5, message: 'Produits très appréciés des clients, réassort rapide.' },
      { daysAgo: 45, rating: 4, message: 'Bon rapport qualité-prix.' },
      { daysAgo: 90, rating: 3, message: 'Première livraison avec quelques pots abîmés.' },
    ],
  },
  {
    key: 'ART',
    name: 'Artisans d’Art (démo)',
    description: 'Sculptures, masques et objets de décoration faits main. Fournisseur fictif de démonstration.',
    contact: { firstName: 'Yao', lastName: 'Démo', username: 'demo_art' },
    productLines: { PL_0000020: 4, PL_0000017: 2 },
    ratio: 0.6,
    codePrefix: 'ADA',
    orders: [],
    reviews: [], // left empty on purpose, to show the "no reviews / no orders yet" states
  },
];

const round2 = (n) => Math.round(n * 100) / 100;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const ids = (s) => ({
  supplier: `DEMOSUP_${s.key}`,
  contact: `DEMOCNT_${s.key}`,
  contactAddress: `DEMOADR_${s.key}`,
  supplierAddress: `DEMOADR_${s.key}_S`,
});

async function seed(conn) {
  const [[existing]] = await conn.query("SELECT COUNT(*) AS n FROM supplier WHERE supplierID LIKE 'DEMOSUP\\_%'");
  if (existing.n) {
    console.log('Demo suppliers already exist — nothing to do. Use --remove first to recreate them.');
    return;
  }

  // SBO's house broker and its contact: demo orders are placed by it and reviews written by it.
  const [[house]] = await conn.query('SELECT brokerID, contactID FROM brokercontact ORDER BY startedDate LIMIT 1');
  if (!house) throw new Error('No house broker (brokercontact) in the database — import the reference data first.');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [stores] = await conn.query('SELECT storeID, storeName, locationID FROM store');
  const storeByName = Object.fromEntries(stores.map((s) => [s.storeName, s]));

  for (const s of SUPPLIERS) {
    const id = ids(s);
    const email = `${s.contact.username.replace('_', '.')}@example.com`;

    await conn.query('INSERT INTO address (addressID, cityID, email) VALUES (?, ?, ?)', [id.contactAddress, DEMO_CITY, email]);
    await conn.query('INSERT INTO address (addressID, cityID, email) VALUES (?, ?, ?)', [id.supplierAddress, DEMO_CITY, email]);
    await conn.query(
      `INSERT INTO contact (contactID, addressID, firstName, lastName, username, password, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id.contact, id.contactAddress, s.contact.firstName, s.contact.lastName, s.contact.username, hash, email]
    );
    await conn.query(
      'INSERT INTO supplier (supplierID, addressID, name, businessDescription) VALUES (?, ?, ?, ?)',
      [id.supplier, id.supplierAddress, s.name, s.description]
    );
    await conn.query(
      'INSERT INTO suppliercontact (supplierID, contactID, startedDate) VALUES (?, ?, ?)',
      [id.supplier, id.contact, daysAgo(120)]
    );

    // Catalogue: deterministic picks so re-seeding gives the same products.
    const products = [];
    const seenNames = new Set();
    for (const [productLineID, count] of Object.entries(s.productLines)) {
      const nameFilter = s.nameLike ? ` AND (${s.nameLike.map(() => 'p.name LIKE ?').join(' OR ')})` : '';
      const [rows] = await conn.query(
        `SELECT p.productID, p.sellUnitPrice, TRIM(p.name) AS name
         FROM product p JOIN producttype pt ON pt.productTypeID = p.productTypeID
         WHERE pt.productLineID = ? AND p.sellUnitPrice > 0${nameFilter}
         ORDER BY p.productID`,
        [productLineID, ...(s.nameLike || [])]
      );
      // The legacy catalogue repeats some names across product IDs; offer each name once.
      const picked = rows.filter((r) => !seenNames.has(r.name) && seenNames.add(r.name)).slice(0, count);
      if (picked.length < count) throw new Error(`Not enough products in ${productLineID} for ${s.name}`);
      products.push(...picked);
    }
    for (const [i, p] of products.entries()) {
      p.price = round2(p.sellUnitPrice * s.ratio);
      await conn.query(
        'INSERT INTO productsupplier (productID, supplierID, supplierProductCode, supplierUnitPrice) VALUES (?, ?, ?, ?)',
        [p.productID, id.supplier, `${s.codePrefix}-${String(i + 1).padStart(3, '0')}`, p.price]
      );
    }
    if (s.shopSurcharge) {
      const store = storeByName[s.shopSurcharge.storeName];
      for (const p of products.slice(0, s.shopSurcharge.products)) {
        await conn.query(
          'INSERT INTO productsupplierlocation (productID, supplierID, locationID, supplierAreaUnitPrice) VALUES (?, ?, ?, ?)',
          [p.productID, id.supplier, store.locationID, round2(p.price * s.shopSurcharge.factor)]
        );
      }
    }

    // Purchase orders. Received ones are history (already part of today's stock, so stock
    // is left alone); pending ones count as "on order" exactly like an order made in the app.
    for (const [n, order] of s.orders.entries()) {
      const store = storeByName[order.store];
      const purchaseID = `DEMOPO_${s.key}_${n + 1}`;
      const lines = order.items.map(([index, quantity]) => {
        const p = products[index];
        const shopPrice = s.shopSurcharge && store.storeName === s.shopSurcharge.storeName && index < s.shopSurcharge.products
          ? round2(p.price * s.shopSurcharge.factor) : p.price;
        return { productID: p.productID, quantity, unitPrice: shopPrice, total: round2(quantity * shopPrice) };
      });
      const subTotal = round2(lines.reduce((sum, l) => sum + l.total, 0));
      const date = daysAgo(order.daysAgo);
      await conn.query(
        `INSERT INTO purchase (purchaseID, brokerID, brokerContactID, transporterID, transporterContactID,
                               supplierID, supplierContactID, storeID, purchaseDate, receivedDate,
                               subTotal, transportCost, tax, total)
         VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        // No transporter here: demoTransporters.js assigns the demo transporters to these orders.
        [purchaseID, house.brokerID, house.contactID,
         id.supplier, id.contact, store.storeID, date, order.received ? daysAgo(Math.max(order.daysAgo - 3, 0)) : null,
         subTotal, order.transportCost, round2(subTotal + order.transportCost)]
      );
      for (const l of lines) {
        await conn.query(
          'INSERT INTO purchasedetails (purchaseID, productID, quantity, unitPrice, total) VALUES (?, ?, ?, ?, ?)',
          [purchaseID, l.productID, l.quantity, l.unitPrice, l.total]
        );
        if (!order.received) {
          await conn.query(
            `INSERT INTO inventory (productID, storeID, quantityInStock, quantityOnCommand, minQuantity, lastUpdate)
             VALUES (?, ?, 0, ?, 0, NOW())
             ON DUPLICATE KEY UPDATE quantityOnCommand = COALESCE(quantityOnCommand, 0) + VALUES(quantityOnCommand)`,
            [l.productID, store.storeID, l.quantity]
          );
        }
      }
    }

    for (const [n, review] of s.reviews.entries()) {
      await conn.query(
        `INSERT INTO supplierreview (supplierReviewID, supplierID, contactID, ratingValue, evaluatedDate, reviewMessage)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`DEMOREV_${s.key}_${n + 1}`, id.supplier, house.contactID, review.rating, daysAgo(review.daysAgo), review.message]
      );
    }

    console.log(`+ ${s.name}: ${products.length} produits, ${s.orders.length} commandes, ${s.reviews.length} avis — login ${s.contact.username}`);
  }
}

async function remove(conn) {
  // Pending demo orders still count as "on order" in the inventory: release them first.
  await conn.query(
    `UPDATE inventory i
     JOIN purchasedetails pd ON pd.productID = i.productID
     JOIN purchase pu ON pu.purchaseID = pd.purchaseID AND pu.storeID = i.storeID
     SET i.quantityOnCommand = GREATEST(COALESCE(i.quantityOnCommand, 0) - pd.quantity, 0)
     WHERE pu.supplierID LIKE 'DEMOSUP\\_%' AND pu.receivedDate IS NULL`
  );
  const steps = [
    ["purchasedetails", "DELETE pd FROM purchasedetails pd JOIN purchase pu ON pu.purchaseID = pd.purchaseID WHERE pu.supplierID LIKE 'DEMOSUP\\_%'"],
    ["purchase", "DELETE FROM purchase WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["supplierreview", "DELETE FROM supplierreview WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["productsupplierlocation", "DELETE FROM productsupplierlocation WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["productsupplier", "DELETE FROM productsupplier WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["suppliercontact", "DELETE FROM suppliercontact WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["supplier", "DELETE FROM supplier WHERE supplierID LIKE 'DEMOSUP\\_%'"],
    ["passwordreset", "DELETE FROM passwordreset WHERE contactID LIKE 'DEMOCNT\\_%'"],
    ["contact", "DELETE FROM contact WHERE contactID LIKE 'DEMOCNT\\_%'"],
    ["address", "DELETE FROM address WHERE addressID LIKE 'DEMOADR\\_%'"],
  ];
  for (const [label, sql] of steps) {
    const [result] = await conn.query(sql);
    console.log(`- ${label}: ${result.affectedRows}`);
  }
}

async function setActive(conn, active) {
  const [result] = await conn.query(
    `UPDATE suppliercontact SET endedDate = ${active ? 'NULL' : 'NOW()'} WHERE supplierID LIKE 'DEMOSUP\\_%'`
  );
  console.log(`${active ? 'Enabled' : 'Disabled'} ${result.affectedRows} demo supplier account link(s).`);
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
