/*
 * Builds a small, deployable copy of the database for the online demo:
 *
 *   npm run db:build-demo
 *
 * 1. (Re)creates the database DEMO_DB_NAME (default "sbo_demo") from schema.sql and
 *    seed-reference.sql.
 * 2. Copies a slice of the catalogue from DB_NAME (your full "sbo" database, read only):
 *    up to PRODUCTS_PER_LINE photographed products per product line, without duplicate
 *    names, plus their brands, stock and running promotions — and every product the demo
 *    suppliers offer in DB_NAME (run npm run demo:suppliers locally first).
 * 3. Runs the demo supplier and transporter scripts against it, with the password given in
 *    DEMO_PASSWORD (required: the local default is public in scripts/README.md).
 * 4. Dumps it to ../sbo_demo.sql (repo root, not in git) with mysqldump.
 *
 * No customers, orders, reviews or admins are copied: create the admin after importing
 * (npm run make-admin). Set MYSQLDUMP to mysqldump's path if it isn't on your PATH.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');

const SOURCE = process.env.DB_NAME;
const DEMO = process.env.DEMO_DB_NAME || 'sbo_demo';
const PRODUCTS_PER_LINE = Number(process.env.PRODUCTS_PER_LINE) || 10;
const BACKEND = path.join(__dirname, '../..');
const OUT_FILE = path.join(BACKEND, '..', `${DEMO}.sql`);

const findMysqldump = () => {
  if (process.env.MYSQLDUMP) return process.env.MYSQLDUMP;
  const windows = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe';
  return fs.existsSync(windows) ? windows : 'mysqldump';
};

(async () => {
  if (DEMO === SOURCE) throw new Error('DEMO_DB_NAME must differ from DB_NAME');
  // The default demo password is published in scripts/README.md; the online accounts need their own.
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD === 'DemoSBO2026') {
    throw new Error('Set DEMO_PASSWORD to a new password for the online demo accounts (not the default one)');
  }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  const read = (file) => fs.readFileSync(path.join(BACKEND, 'database', file), 'utf8');

  console.log(`1/4 Creating ${DEMO} from schema.sql + seed-reference.sql`);
  await conn.query(`DROP DATABASE IF EXISTS \`${DEMO}\`; CREATE DATABASE \`${DEMO}\` CHARACTER SET utf8mb3; USE \`${DEMO}\`;`);
  await conn.query(read('schema.sql'));
  await conn.query(read('seed-reference.sql'));

  console.log(`2/4 Copying up to ${PRODUCTS_PER_LINE} products per product line from ${SOURCE}`);
  await conn.query(`
    CREATE TEMPORARY TABLE demo_products (productID varchar(15) PRIMARY KEY)
    SELECT productID FROM (
      SELECT p.productID,
             ROW_NUMBER() OVER (PARTITION BY pt.productLineID ORDER BY p.productID) AS rn
      FROM (
        -- one product per distinct name: the legacy catalogue repeats names across IDs
        SELECT p.productID, p.productTypeID,
               ROW_NUMBER() OVER (PARTITION BY TRIM(p.name) ORDER BY p.productID) AS nameRank
        FROM \`${SOURCE}\`.product p
        WHERE p.brokerImage IS NOT NULL AND p.sellUnitPrice > 0
      ) p
      JOIN \`${SOURCE}\`.producttype pt ON pt.productTypeID = p.productTypeID
      WHERE p.nameRank = 1
    ) ranked
    WHERE rn <= ?
    UNION
    -- whatever the demo suppliers offer locally, so demoSuppliers.js finds the same products
    SELECT productID FROM \`${SOURCE}\`.productsupplier WHERE supplierID LIKE 'DEMOSUP\\_%'`, [PRODUCTS_PER_LINE]);
  const copy = async (label, sql) => {
    const [result] = await conn.query(sql);
    console.log(`    ${label}: ${result.affectedRows}`);
  };
  await copy('brand', `INSERT INTO brand SELECT DISTINCT b.* FROM \`${SOURCE}\`.brand b
    JOIN \`${SOURCE}\`.product p ON p.brandID = b.brandID JOIN demo_products d ON d.productID = p.productID`);
  await copy('product', `INSERT INTO product SELECT p.* FROM \`${SOURCE}\`.product p JOIN demo_products d USING (productID)`);
  await copy('productimage', `INSERT INTO productimage SELECT i.* FROM \`${SOURCE}\`.productimage i JOIN demo_products d USING (productID)`);
  await copy('inventory', `INSERT INTO inventory SELECT i.* FROM \`${SOURCE}\`.inventory i JOIN demo_products d USING (productID)`);
  await copy('inventoryoptions', `INSERT INTO inventoryoptions SELECT i.* FROM \`${SOURCE}\`.inventoryoptions i JOIN demo_products d USING (productID)`);
  // Running promotions on the copied products, attributed to the demo's house contact.
  await copy('promotion', `INSERT INTO promotion (promotionID, brokerID, brokerContactID, startDate, endDate)
    SELECT DISTINCT pr.promotionID, bc.brokerID, bc.contactID, pr.startDate, pr.endDate
    FROM \`${SOURCE}\`.promotion pr
    JOIN \`${SOURCE}\`.promotiondetails pd ON pd.promotionID = pr.promotionID
    JOIN demo_products d ON d.productID = pd.productID
    JOIN (SELECT brokerID, contactID FROM brokercontact ORDER BY startedDate LIMIT 1) bc
    WHERE pr.endDate > NOW()`);
  await copy('promotiondetails', `INSERT INTO promotiondetails SELECT pd.* FROM \`${SOURCE}\`.promotiondetails pd
    JOIN demo_products d ON d.productID = pd.productID JOIN promotion pr ON pr.promotionID = pd.promotionID`);
  await conn.end();

  console.log('3/4 Adding the demo suppliers and transporters');
  const env = { ...process.env, DB_NAME: DEMO };
  for (const script of ['demoSuppliers.js', 'demoTransporters.js']) {
    const out = execFileSync(process.execPath, [path.join(BACKEND, 'scripts', script)], { env, encoding: 'utf8' });
    out.split('\n').filter((l) => l.startsWith('+')).forEach((l) => console.log(`    ${l}`));
  }

  console.log(`4/4 Dumping to ${OUT_FILE}`);
  execFileSync(findMysqldump(), [
    `--host=${process.env.DB_HOST}`, `--port=${process.env.DB_PORT}`, `--user=${process.env.DB_USER}`,
    '--single-transaction', '--hex-blob', '--no-tablespaces', '--set-gtid-purged=OFF',
    `--result-file=${OUT_FILE}`, DEMO,
  ], { env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD }, stdio: ['ignore', 'inherit', 'inherit'] });
  console.log(`Done: ${(fs.statSync(OUT_FILE).size / 1048576).toFixed(0)} MB`);
})().catch((err) => { console.error(err.message); process.exit(1); });
