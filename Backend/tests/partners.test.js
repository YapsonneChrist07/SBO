const { api, db, createUser, storeByName } = require('./helpers');

let admin;
beforeAll(async () => { admin = await createUser({ admin: true }); });

const setStatus = (type, id, status, auth = admin.auth) =>
  api.patch(`/api/partners/${type}/${id}/status`).set(auth).send({ status });

describe.each(['supplier', 'transporter'])('%s sign-up review', (type) => {
  const portal = `/api/${type}-portal/summary`;

  test('a new sign-up is pending: it can log in but not use its space', async () => {
    const partner = await createUser({ role: type, approved: false });
    expect(partner.user.organizationStatus).toBe('pending');
    const me = await api.get('/api/auth/me').set(partner.auth);
    expect(me.body.data.organizationStatus).toBe('pending');
    const res = await api.get(portal).set(partner.auth);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/validation/);
  });

  test('the admin sees pending sign-ups first, with the contact person', async () => {
    const partner = await createUser({ role: type, approved: false, companyName: `En attente ${type}` });
    const list = (await api.get(`/api/partners?type=${type}`).set(admin.auth)).body.data;
    expect(list[0].status).toBe('pending');
    const row = list.find((p) => p.id === partner.user.organizationID);
    expect(row).toMatchObject({ name: `En attente ${type}`, status: 'pending', username: partner.username, email: `${partner.username}@example.com` });
    expect(row.signedUpDate).toBeTruthy();

    const summary = (await api.get('/api/partners/summary').set(admin.auth)).body.data;
    expect(summary[type].pending).toBeGreaterThanOrEqual(2);
  });

  test('approving opens the space at once, disabling closes it and blocks login, re-enabling restores it', async () => {
    const partner = await createUser({ role: type, approved: false });
    const id = partner.user.organizationID;

    expect((await setStatus(type, id, 'active')).body.message).toBe('Partenaire validé');
    expect((await api.get(portal).set(partner.auth)).status).toBe(200);

    expect((await setStatus(type, id, 'disabled')).status).toBe(200);
    expect((await api.get(portal).set(partner.auth)).status).toBe(403); // existing session cut off
    expect((await api.get('/api/auth/me').set(partner.auth)).status).toBe(401);
    const login = await api.post('/api/auth/login').send({ username: partner.username, password: partner.password, role: type });
    expect(login.status).toBe(403);
    expect(login.body.message).toMatch(/désactivé/);
    // Still free to shop as a client.
    expect((await api.post('/api/auth/login').send({ username: partner.username, password: partner.password, role: 'client' })).status).toBe(200);

    expect((await setStatus(type, id, 'active')).body.message).toBe('Partenaire réactivé');
    expect((await api.post('/api/auth/login').send({ username: partner.username, password: partner.password, role: type })).status).toBe(200);
  });

  test('a company cannot be put back to pending, and unknown ids are rejected', async () => {
    const partner = await createUser({ role: type });
    expect((await setStatus(type, partner.user.organizationID, 'pending')).status).toBe(422);
    expect((await setStatus(type, 'NOPE', 'active')).status).toBe(404);
  });

  test('only admins can review partners', async () => {
    const partner = await createUser({ role: type, approved: false });
    const shopper = await createUser();
    expect((await setStatus(type, partner.user.organizationID, 'active', shopper.auth)).status).toBe(403);
    expect((await setStatus(type, partner.user.organizationID, 'active', partner.auth)).status).toBe(403);
    expect((await api.get(`/api/partners?type=${type}`).set(shopper.auth)).status).toBe(403);
  });
});

describe('only approved partners can be given work', () => {
  test('purchase orders: pending or disabled suppliers are not offered and are refused', async () => {
    const supplier = await createUser({ role: 'supplier' });
    await api.put('/api/supplier-portal/products/TEST_P1').set(supplier.auth).send({ supplierUnitPrice: 5 });
    const shop = await storeByName('SBO Plateau');
    const order = () => api.post('/api/purchases').set(admin.auth).send({ supplierID: supplier.user.organizationID, storeID: shop.storeID, items: [{ productID: 'TEST_P1', quantity: 1 }] });

    await setStatus('supplier', supplier.user.organizationID, 'disabled');
    const options = (await api.get('/api/purchases/options').set(admin.auth)).body.data;
    expect(options.suppliers.map((s) => s.supplierID)).not.toContain(supplier.user.organizationID);
    expect((await order()).status).toBe(400);

    await setStatus('supplier', supplier.user.organizationID, 'active');
    expect((await order()).status).toBe(201);
  });

  test('deliveries and pick-ups: a pending transporter cannot be assigned', async () => {
    const carrier = await createUser({ role: 'transporter', approved: false });
    const shopper = await createUser();
    const sellID = (await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P4', quantity: 1 }], payment: { paymentMethodID: 'PM_2' } })).body.data.sellID;

    const available = (await api.get('/api/sells/shipment-transporters').set(admin.auth)).body.data;
    expect(available.map((t) => t.transporterID)).not.toContain(carrier.user.organizationID);
    expect((await api.put(`/api/sells/${sellID}/shipment`).set(admin.auth).send({ transporterID: carrier.user.organizationID })).status).toBe(400);

    const supplier = await createUser({ role: 'supplier' });
    await api.put('/api/supplier-portal/products/TEST_P2').set(supplier.auth).send({ supplierUnitPrice: 5 });
    const shop = await storeByName('SBO Plateau');
    const po = await api.post('/api/purchases').set(admin.auth).send({ supplierID: supplier.user.organizationID, storeID: shop.storeID, transporterID: carrier.user.organizationID, items: [{ productID: 'TEST_P2', quantity: 1 }] });
    expect(po.status).toBe(400);
  });

  test("a disabled supplier's name disappears from product pages", async () => {
    const supplier = await createUser({ role: 'supplier', companyName: 'Fournisseur Masqué' });
    await api.put('/api/supplier-portal/products/TEST_P4').set(supplier.auth).send({ supplierUnitPrice: 3 });
    const names = async () => (await api.get('/api/products/TEST_P4')).body.data.suppliers.map((s) => s.name);
    expect(await names()).toContain('Fournisseur Masqué');
    await setStatus('supplier', supplier.user.organizationID, 'disabled');
    expect(await names()).not.toContain('Fournisseur Masqué');
  });
});

test('sign-ups are stored as pending with the date', async () => {
  const partner = await createUser({ role: 'supplier', approved: false });
  const [[row]] = await db.query('SELECT status, statusChangedDate FROM supplier WHERE supplierID = ?', [partner.user.organizationID]);
  expect(row.status).toBe('pending');
  expect(row.statusChangedDate).toBeTruthy();
});
