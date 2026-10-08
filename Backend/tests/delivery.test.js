const { api, db, createUser } = require('./helpers');

let admin;
let shopper;
let carrierA;
let carrierB;
beforeAll(async () => {
  admin = await createUser({ admin: true });
  shopper = await createUser();
  carrierA = await createUser({ role: 'transporter' });
  carrierB = await createUser({ role: 'transporter' });
});

const placeOrder = async () =>
  (await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P1', quantity: 1 }, { productID: 'TEST_P2', quantity: 2 }], payment: { paymentMethodID: 'PM_2' } })).body.data.sellID;
const assign = (sellID, carrier, extra = {}) =>
  api.put(`/api/sells/${sellID}/shipment`).set(admin.auth).send({ transporterID: carrier.user.organizationID, ...extra });

describe('assigning a transporter', () => {
  test('only transporters with an active account are offered', async () => {
    const res = await api.get('/api/sells/shipment-transporters').set(admin.auth);
    const ids = res.body.data.map((t) => t.transporterID);
    expect(ids).toEqual(expect.arrayContaining([carrierA.user.organizationID, carrierB.user.organizationID]));
  });

  test('assign, reassign and unassign before pick-up', async () => {
    const sellID = await placeOrder();
    expect((await assign(sellID, carrierA, { expectedDaysDuration: 2 })).status).toBe(200);
    expect((await api.get(`/api/transporter-portal/shipments/${sellID}`).set(carrierA.auth)).status).toBe(200);

    expect((await assign(sellID, carrierB)).status).toBe(200);
    expect((await api.get(`/api/transporter-portal/shipments/${sellID}`).set(carrierA.auth)).status).toBe(404);
    expect((await api.get(`/api/transporter-portal/shipments/${sellID}`).set(carrierB.auth)).status).toBe(200);
    const [shipments] = await db.query('SELECT 1 FROM shipment WHERE sellID = ?', [sellID]);
    expect(shipments).toHaveLength(1);

    expect((await api.delete(`/api/sells/${sellID}/shipment`).set(admin.auth)).status).toBe(200);
    const [[sell]] = await db.query('SELECT transporterID FROM sell WHERE sellID = ?', [sellID]);
    expect(sell.transporterID).toBeNull();
  });

  test('a transporter whose account link ended cannot be assigned', async () => {
    const gone = await createUser({ role: 'transporter' });
    await db.query('UPDATE transportercontact SET endedDate = NOW() - INTERVAL 1 SECOND WHERE contactID = ?', [gone.user.contactID]);
    expect((await assign(await placeOrder(), gone)).status).toBe(400);
  });
});

describe('the delivery itself', () => {
  test('pick-up then delivery, in order, by the assigned transporter only', async () => {
    const sellID = await placeOrder();
    await assign(sellID, carrierA);
    const base = `/api/transporter-portal/shipments/${sellID}`;

    // What the transporter sees: where to go and what to carry, not what the customer paid.
    const detail = (await api.get(base).set(carrierA.auth)).body.data;
    expect(detail.items).toHaveLength(2);
    expect(detail.items[0]).not.toHaveProperty('unitPrice');
    expect(detail).not.toHaveProperty('total');

    expect((await api.post(`${base}/deliver`).set(carrierA.auth)).status).toBe(409);
    expect((await api.post(`${base}/pickup`).set(carrierB.auth)).status).toBe(404);
    expect((await api.post(`${base}/pickup`).set(carrierA.auth)).status).toBe(200);

    // Once picked up, the admin can no longer move it to someone else.
    expect((await assign(sellID, carrierB)).status).toBe(409);
    expect((await api.delete(`/api/sells/${sellID}/shipment`).set(admin.auth)).status).toBe(409);

    expect((await api.post(`${base}/deliver`).set(carrierA.auth)).status).toBe(200);
    expect((await api.post(`${base}/deliver`).set(carrierA.auth)).status).toBe(409);

    // Delivered completes the order, and the customer sees it.
    const mine = (await api.get(`/api/sells/${sellID}`).set(shopper.auth)).body.data;
    expect(mine.completed).toBe(1);
    expect(mine.shipment).toMatchObject({ status: 'delivered', transporterID: carrierA.user.organizationID });
    expect(mine.shipment.shipmentDate).toBeTruthy();
    expect(mine.shipment.receivedDate).toBeTruthy();
  });

  test('a completed order cannot be handed to a transporter', async () => {
    const sellID = await placeOrder();
    await api.patch(`/api/sells/${sellID}/status`).set(admin.auth).send({ completed: true });
    expect((await assign(sellID, carrierA)).status).toBe(409);
  });

  test('an order with a payment or shipment cannot be deleted', async () => {
    const sellID = await placeOrder();
    expect((await api.delete(`/api/sells/${sellID}`).set(admin.auth)).status).toBe(409);
    const [details] = await db.query('SELECT 1 FROM selldetails WHERE sellID = ?', [sellID]);
    expect(details).toHaveLength(2);
  });
});
