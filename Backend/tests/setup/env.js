// Runs before each test file: point the app at the test database. dotenv never overrides
// variables that are already set, so config/db.js picks these up.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'sbo_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
