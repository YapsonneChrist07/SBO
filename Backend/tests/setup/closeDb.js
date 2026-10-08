// Close the connection pool after each test file so Jest can exit.
const db = require('../../config/db');

afterAll(() => db.end());
