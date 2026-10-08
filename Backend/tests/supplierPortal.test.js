const { api, db, createUser, storeByName } = require('./helpers');

describe('supplier catalogue', () => {
  let supplier;
  let other;
  beforeAll(async () => {
    supplier = await createUser({ role: 'supplier' });
    other = await createUser({ role: 'supplier' });
  });

  test('add, update and list an offered product', async () => {
    const add = await api.put('/api/supplier-portal/products/TEST_P2').set(supplier.auth).send({ supplierUnitPrice: 30, supplierProductCode: 'A-1' });
    expect(add.status).toBe(201);
    const update = await api.put('/api/supplier-portal/products/TEST_P2').set(supplier.auth).send({ supplierUnitPrice: 28, supplierProductCode: 'A-2' });
    expect(update.status).toBe(200);

    const list = await api.get('/api/supplier-portal/products').set(supplier.auth);
    expect(list.body.data.rows).toEqual([expect.objectContaining({ productID: 'TEST_P2', supplierUnitPrice: 28, supplierProductCode: 'A-2', shopPriceCount: 0 })]);
  });

  test.each([
    [{ supplierUnitPrice: -1 }],
    [{ supplierUnitPrice: 'abc' }],
    [{ supplierUnitPrice: 5, supplierProductCode: 'X'.repeat(16) }],
  ])('invalid offer %p is rejected', async (body) => {
    expect((await api.put('/api/supplier-portal/products/TEST_P2').set(supplier.auth).send(body)).status).toBe(422);
  });

  test('catalogue search flags products already offered', async () => {
    const res = await api.get('/api/supplier-portal/catalog?search=Produit test').set(supplier.auth);
    const byId = Object.fromEntries(res.body.data.map((p) => [p.productID, p.alreadySupplied]));
    expect(byId).toMatchObject({ TEST_P2: true, TEST_P1: false });
  });

  test('per-shop price: only for offered products and existing shops', async () => {
    const shop = await storeByName('SBO Plateau');
    expect((await api.put(`/api/supplier-portal/products/TEST_P2/locations/${shop.locationID}`).set(supplier.auth).send({ supplierAreaUnitPrice: 25 })).status).toBe(200);
    expect((await api.put(`/api/supplier-portal/products/TEST_P4/locations/${shop.locationID}`).set(supplier.auth).send({ supplierAreaUnitPrice: 5 })).status).toBe(404);
    expect((await api.put('/api/supplier-portal/products/TEST_P2/locations/NOPE').set(supplier.auth).send({ supplierAreaUnitPrice: 5 })).status).toBe(404);

    const detail = await api.get('/api/supplier-portal/products/TEST_P2').set(supplier.auth);
    expect(detail.body.data.locations).toHaveLength(3);
    expect(detail.body.data.locations.find((l) => l.locationID === shop.locationID).supplierAreaUnitPrice).toBe(25);
  });

  test("another supplier can neither see nor change this supplier's offer", async () => {
    expect((await api.get('/api/supplier-portal/products/TEST_P2').set(other.auth)).status).toBe(404);
    expect((await api.get('/api/supplier-portal/products').set(other.auth)).body.data.total).toBe(0);
    expect((await api.delete('/api/supplier-portal/products/TEST_P2').set(other.auth)).status).toBe(404);
    // Offering the same product creates the other supplier's own row, it doesn't overwrite.
    await api.put('/api/supplier-portal/products/TEST_P2').set(other.auth).send({ supplierUnitPrice: 99 });
    const mine = await api.get('/api/supplier-portal/products/TEST_P2').set(supplier.auth);
    expect(mine.body.data.supplierUnitPrice).toBe(28);
  });

  test('removing a product also removes its per-shop prices', async () => {
    expect((await api.delete('/api/supplier-portal/products/TEST_P2').set(supplier.auth)).status).toBe(200);
    const [rows] = await db.query('SELECT 1 FROM productsupplierlocation WHERE supplierID = ?', [supplier.user.organizationID]);
    expect(rows).toHaveLength(0);
  });

  test('access stops as soon as the company link ends', async () => {
    await db.query('UPDATE suppliercontact SET endedDate = NOW() - INTERVAL 1 SECOND WHERE contactID = ?', [other.user.contactID]);
    expect((await api.get('/api/supplier-portal/summary').set(other.auth)).status).toBe(403);
  });
});
