// Rebuilds the test database from scratch once per `npm test` run:
// database/schema.sql + database/seed-reference.sql + tests/fixtures.sql.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

module.exports = async () => {
  require('./env');
  const dbName = process.env.DB_NAME;
  // This drops the database — never let it point at anything but a test database.
  if (!/_test$/.test(dbName)) {
    throw new Error(`Refusing to run tests against "${dbName}": the test database name must end in "_test".`);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb3`);
    await conn.query(`USE \`${dbName}\``);
    await conn.query(read('database', 'schema.sql'));
    await conn.query(read('database', 'seed-reference.sql'));
    await conn.query(read('tests', 'fixtures.sql'));
  } finally {
    await conn.end();
  }
};
