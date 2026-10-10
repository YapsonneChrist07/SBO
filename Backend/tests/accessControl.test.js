// Who may call what. Every row here was (or would be) a real hole: several of these
// routes used to accept any logged-in user.
const jwt = require('jsonwebtoken');
const { api, createUser } = require('./helpers');

const ADMIN_ONLY = [
  ['get', '/api/partners?type=supplier'],
  ['get', '/api/partners/summary'],
  ['patch', '/api/partners/supplier/X/status'],
  ['get', '/api/suppliers'],
  ['put', '/api/suppliers/X'],
  ['delete', '/api/suppliers/X'],
  ['get', '/api/purchases'],
  ['post', '/api/purchases'],
  ['post', '/api/purchases/X/receive'],
  ['delete', '/api/purchases/X'],
  ['get', '/api/transporters'],
  ['post', '/api/transporters'],
  ['get', '/api/shipments'],
  ['post', '/api/shipments'],
  ['get', '/api/deliveries'],
  ['get', '/api/transports'],
  ['get', '/api/clients'],
  ['get', '/api/inventory'],
  ['get', '/api/sells/shipment-transporters'],
  ['put', '/api/sells/X/shipment'],
  ['delete', '/api/sells/X/shipment'],
  ['patch', '/api/sells/X/status'],
  ['delete', '/api/sells/X'],
];

let client;
let supplier;
let transporter;
let admin;
beforeAll(async () => {
  [client, supplier, transporter, admin] = await Promise.all([
    createUser(),
    createUser({ role: 'supplier' }),
    createUser({ role: 'transporter' }),
    createUser({ admin: true }),
  ]);
});

describe.each(ADMIN_ONLY)('%s %s is admin-only', (method, path) => {
  test('anonymous → 401', async () => {
    expect((await api[method](path).send({})).status).toBe(401);
  });
  test('client, supplier and transporter → 403', async () => {
    for (const user of [client, supplier, transporter]) {
      expect((await api[method](path).set(user.auth).send({})).status).toBe(403);
    }
  });
  test('admin gets past the check', async () => {
    expect([401, 403]).not.toContain((await api[method](path).set(admin.auth).send({})).status);
  });
});

describe('partner spaces only open to their own role', () => {
  test('supplier space', async () => {
    expect((await api.get('/api/supplier-portal/summary')).status).toBe(401);
    for (const user of [client, transporter, admin]) {
      expect((await api.get('/api/supplier-portal/summary').set(user.auth)).status).toBe(403);
    }
    expect((await api.get('/api/supplier-portal/summary').set(supplier.auth)).status).toBe(200);
  });

  test('transporter space', async () => {
    expect((await api.get('/api/transporter-portal/summary')).status).toBe(401);
    for (const user of [client, supplier, admin]) {
      expect((await api.get('/api/transporter-portal/summary').set(user.auth)).status).toBe(403);
    }
    expect((await api.get('/api/transporter-portal/summary').set(transporter.auth)).status).toBe(200);
  });

  test('a supplier account with a client session has no supplier access', async () => {
    const token = jwt.sign({ contactID: supplier.user.contactID, username: supplier.username, role: 'client', organizationID: null }, process.env.JWT_SECRET);
    const auth = { Authorization: `Bearer ${token}` };
    expect((await api.get('/api/supplier-portal/summary').set(auth)).status).toBe(403);
  });
});

describe('public product data', () => {
  test("a product page never exposes suppliers' wholesale prices", async () => {
    await api.put('/api/supplier-portal/products/TEST_P1').set(supplier.auth).send({ supplierUnitPrice: 7, supplierProductCode: 'SECRET' });
    const res = await api.get('/api/products/TEST_P1');
    expect(res.status).toBe(200);
    expect(res.body.data.suppliers.length).toBeGreaterThan(0);
    for (const s of res.body.data.suppliers) {
      expect(Object.keys(s).sort()).toEqual(['name', 'supplierID']);
    }
  });
});
