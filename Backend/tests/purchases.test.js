const { api, createUser, storeByName, inventory } = require('./helpers');

let admin;
let supplier;
let plateau;
let bassam;
beforeAll(async () => {
  admin = await createUser({ admin: true });
  supplier = await createUser({ role: 'supplier' });
  plateau = await storeByName('SBO Plateau');
  bassam = await storeByName('SBO Bassam Plage');
  await api.put('/api/supplier-portal/products/TEST_P1').set(supplier.auth).send({ supplierUnitPrice: 12 });
  await api.put('/api/supplier-portal/products/TEST_P2').set(supplier.auth).send({ supplierUnitPrice: 30 });
  await api.put(`/api/supplier-portal/products/TEST_P1/locations/${plateau.locationID}`).set(supplier.auth).send({ supplierAreaUnitPrice: 14 });
});

const order = (body) => api.post('/api/purchases').set(admin.auth).send({ supplierID: supplier.user.organizationID, ...body });

describe('creating a purchase order', () => {
  test('the supplier offer lists the per-shop price for that shop', async () => {
    const res = await api.get(`/api/purchases/supplier-offer/${supplier.user.organizationID}?storeID=${plateau.storeID}`).set(admin.auth);
    const p1 = res.body.data.find((o) => o.productID === 'TEST_P1');
    expect(p1).toMatchObject({ supplierUnitPrice: 12, shopPrice: 14, unitPrice: 14 });
  });

  test('totals are computed on the server from the offer (shop price wins, explicit price overrides)', async () => {
    const res = await order({
      storeID: plateau.storeID,
      items: [{ productID: 'TEST_P1', quantity: 5, unitPrice: '' }, { productID: 'TEST_P2', quantity: 2, unitPrice: 25 }],
      transportCost: 10,
      tax: 0,
    });
    expect(res.status).toBe(201);
    const detail = (await api.get(`/api/purchases/${res.body.data.purchaseID}`).set(admin.auth)).body.data;
    expect(detail).toMatchObject({ subTotal: 5 * 14 + 2 * 25, total: 5 * 14 + 2 * 25 + 10, receivedDate: null, storeID: plateau.storeID });
  });

  test.each([
    ['no items', { items: [] }, 422],
    ['zero quantity', { items: [{ productID: 'TEST_P1', quantity: 0 }] }, 422],
    ['product not offered by the supplier', { items: [{ productID: 'TEST_P4', quantity: 1 }] }, 400],
    ['same product twice', { items: [{ productID: 'TEST_P1', quantity: 1 }, { productID: 'TEST_P1', quantity: 2 }] }, 400],
  ])('rejects %s', async (_, body, status) => {
    expect((await order({ storeID: plateau.storeID, ...body })).status).toBe(status);
  });

  test('rejects an unknown shop', async () => {
    expect((await order({ storeID: 'NOPE', items: [{ productID: 'TEST_P1', quantity: 1 }] })).status).toBe(400);
  });
});

describe('stock follows the order lifecycle', () => {
  test('ordered → "on order", received → in stock, once only', async () => {
    const before = await inventory('TEST_P2', bassam.storeID);
    const res = await order({ storeID: bassam.storeID, items: [{ productID: 'TEST_P2', quantity: 6 }] });
    const id = res.body.data.purchaseID;
    expect(await inventory('TEST_P2', bassam.storeID)).toEqual({ stock: before.stock, onOrder: before.onOrder + 6 });

    expect((await api.post(`/api/purchases/${id}/receive`).set(admin.auth)).status).toBe(200);
    expect(await inventory('TEST_P2', bassam.storeID)).toEqual({ stock: before.stock + 6, onOrder: before.onOrder });

    expect((await api.post(`/api/purchases/${id}/receive`).set(admin.auth)).status).toBe(409);
    expect((await api.delete(`/api/purchases/${id}`).set(admin.auth)).status).toBe(409);
    expect(await inventory('TEST_P2', bassam.storeID)).toEqual({ stock: before.stock + 6, onOrder: before.onOrder });
  });

  test('cancelling a pending order releases the "on order" quantity', async () => {
    const before = await inventory('TEST_P1', bassam.storeID);
    const res = await order({ storeID: bassam.storeID, items: [{ productID: 'TEST_P1', quantity: 4 }] });
    expect((await api.delete(`/api/purchases/${res.body.data.purchaseID}`).set(admin.auth)).status).toBe(200);
    expect(await inventory('TEST_P1', bassam.storeID)).toEqual(before);
  });

  test('the supplier sees the order, its shop and its status', async () => {
    const res = await order({ storeID: plateau.storeID, items: [{ productID: 'TEST_P1', quantity: 1 }] });
    const id = res.body.data.purchaseID;
    const list = (await api.get('/api/supplier-portal/purchases').set(supplier.auth)).body.data.rows;
    expect(list.find((p) => p.purchaseID === id)).toMatchObject({ storeName: 'SBO Plateau', receivedDate: null });

    const otherSupplier = await createUser({ role: 'supplier' });
    expect((await api.get(`/api/supplier-portal/purchases/${id}`).set(otherSupplier.auth)).status).toBe(404);
  });
});
