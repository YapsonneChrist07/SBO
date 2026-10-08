const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const generateId = require('../utils/generateId');

const api = request(app);
let counter = 0;
const uniqueName = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

// Register a user (optionally as a supplier/transporter company) and log in with that role.
// Partner sign-ups start 'pending'; they are approved here unless approved: false.
async function createUser({ role = 'client', admin = false, companyName, approved = true } = {}) {
  const username = uniqueName(role.slice(0, 3));
  const password = 'secret123';
  const body = { firstName: 'Test', lastName: role, username, password, email: `${username}@example.com` };
  if (role !== 'client') Object.assign(body, { role, companyName: companyName || `Société ${username}` });

  const reg = await api.post('/api/auth/register').send(body);
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${reg.body.message}`);
  if (admin) {
    await db.query("INSERT INTO usercreator (userCreatorID, contactID, adminEntity) VALUES (?, ?, 'brokerAdmin')", [generateId(), reg.body.data.contactID]);
  }
  if (role !== 'client' && approved) {
    const [link, id] = role === 'supplier' ? ['suppliercontact', 'supplierID'] : ['transportercontact', 'transporterID'];
    await db.query(`UPDATE ${role} SET status = 'active' WHERE ${id} = (SELECT ${id} FROM ${link} WHERE contactID = ?)`, [reg.body.data.contactID]);
  }
  const res = await api.post('/api/auth/login').send({ username, password, role });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.body.message}`);
  const { token, user } = res.body.data;
  return { token, user, username, password, auth: { Authorization: `Bearer ${token}` } };
}

const storeByName = async (name) => (await db.query('SELECT storeID, locationID FROM store WHERE storeName = ?', [name]))[0][0];
const inventory = async (productID, storeID) =>
  (await db.query('SELECT quantityInStock AS stock, quantityOnCommand AS onOrder FROM inventory WHERE productID = ? AND storeID = ?', [productID, storeID]))[0][0];

module.exports = { api, db, createUser, uniqueName, storeByName, inventory };
