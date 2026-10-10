const { api, db, createUser, uniqueName } = require('./helpers');
const { priceForWeight, toEuros } = require('../utils/shipping');

const pay = { paymentMethodID: 'PM_2' };

describe('checkout prices are decided by the server', () => {
  let shopper;
  beforeAll(async () => { shopper = await createUser(); });

  test('client-sent prices, fees and broker are ignored', async () => {
    const res = await api.post('/api/sells').set(shopper.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 2, unitPrice: 0.01 }],
      transportCost: -100,
      tax: -5,
      transporterID: 'TEST_TRP',
      brokerID: 'BRK_1',
      clientID: 'CLT_1',
      payment: pay,
    });
    expect(res.status).toBe(201);

    const [[sell]] = await db.query('SELECT * FROM sell WHERE sellID = ?', [res.body.data.sellID]);
    // 2 × 0.5 kg → TEST_TRP's ≤1 kg rate, 3 €
    expect(sell).toMatchObject({ subTotal: 40, transportCost: 3, total: 43, tax: 0, transporterID: 'TEST_TRP', transporterContactID: 'TEST_TCNT', brokerID: null, clientID: null });
    const [[line]] = await db.query('SELECT unitPrice, total FROM selldetails WHERE sellID = ?', [res.body.data.sellID]);
    expect(line).toEqual({ unitPrice: 20, total: 40 });
    const [[payment]] = await db.query('SELECT paymentAmount FROM payment WHERE sellID = ?', [res.body.data.sellID]);
    expect(payment.paymentAmount).toBe(43);
  });

  test('an active promotion price is charged', async () => {
    const res = await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P3', quantity: 3 }], payment: pay, transporterID: 'TEST_TRP' });
    expect(res.status).toBe(201);
    const [[sell]] = await db.query('SELECT subTotal FROM sell WHERE sellID = ?', [res.body.data.sellID]);
    expect(sell.subTotal).toBe(90); // 3 × 30 instead of 3 × 40
  });

  test.each([[0], [-3], [1.5], ['abc']])('quantity %p is rejected', async (quantity) => {
    const res = await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P1', quantity }], payment: pay });
    expect(res.status).toBe(400);
  });

  test('an unknown product is rejected', async () => {
    const res = await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'NOPE', quantity: 1 }], payment: pay });
    expect(res.status).toBe(400);
  });

  test("someone else's saved card cannot be used", async () => {
    const other = await createUser();
    const [[cardType]] = await db.query('SELECT creditCardTypeID FROM creditcardtype LIMIT 1');
    const card = await api.post('/api/credit-cards').set(other.auth).send({
      creditCardNbr: '4111111111111111', creditCardTypeID: cardType.creditCardTypeID,
      fullName: 'Other Person', verificationCode: '123', expirationDate: '2030-12-31',
    });
    expect(card.status).toBe(201);

    const steal = await api.post('/api/sells').set(shopper.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 1 }],
      payment: { paymentMethodID: 'PM_1', creditCardID: card.body.data.creditCardID },
    });
    expect(steal.status).toBe(400);

    const own = await api.post('/api/sells').set(other.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 1 }],
      payment: { paymentMethodID: 'PM_1', creditCardID: card.body.data.creditCardID },
    });
    expect(own.status).toBe(201);
  });
});

describe('order visibility', () => {
  test("a shopper cannot read another shopper's order", async () => {
    const a = await createUser();
    const b = await createUser();
    const order = await api.post('/api/sells').set(a.auth).send({ items: [{ productID: 'TEST_P4', quantity: 1 }], payment: pay });
    expect((await api.get(`/api/sells/${order.body.data.sellID}`).set(b.auth)).status).toBe(404);
    expect((await api.get(`/api/sells/${order.body.data.sellID}`).set(a.auth)).status).toBe(200);
  });

  test("a shopper's order list only contains their own orders, even when asking for others", async () => {
    const a = await createUser();
    const b = await createUser();
    await api.post('/api/sells').set(a.auth).send({ items: [{ productID: 'TEST_P4', quantity: 1 }], payment: pay });
    const res = await api.get(`/api/sells?clientContactID=${a.user.contactID}`).set(b.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toHaveLength(0);
  });
});

describe('delivery fee', () => {
  let shopper;
  beforeAll(async () => { shopper = await createUser(); });
  const quote = (items, extra = {}) => api.post('/api/sells/shipping-options').set(shopper.auth).send({ items, ...extra });
  const testCarrier = (res) => res.body.data.options.find((o) => o.transporterID === 'TEST_TRP');

  test('the quote uses the weight of the cart and the route to the shopper’s country', async () => {
    const res = await quote([{ productID: 'TEST_P2', quantity: 1 }, { productID: 'TEST_P4', quantity: 2 }]);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ weight: 1.9, country: "Côte d'Ivoire" });
    // 1.9 kg: no ≤1.5 kg bracket for this carrier, so its ≤2 kg rate
    expect(testCarrier(res)).toEqual({ transporterID: 'TEST_TRP', name: 'Livreur Test', cost: 4, costFCFA: 2623.828 });
  });

  test('a cart heavier than the largest bracket is sent in several parcels', async () => {
    const res = await quote([{ productID: 'TEST_P3', quantity: 12 }]); // 24 kg = 10 + 10 + 4
    expect(testCarrier(res).cost).toBe(30);
  });

  test('a transporter that is not offered for the address is refused at checkout', async () => {
    const other = await createUser({ role: 'transporter' }); // approved, but no tariffs
    const res = await api.post('/api/sells').set(shopper.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 1 }], payment: pay, transporterID: other.user.organizationID,
    });
    expect(res.status).toBe(400);
  });

  test('only approved transporters are offered, and the cheapest is used by default', async () => {
    const cheap = await createUser({ role: 'transporter', companyName: 'Moins Cher' });
    const id = cheap.user.organizationID;
    await db.query("INSERT INTO transportercostpertraject (trajectID, weightLimitID, transporterID, transportCost) VALUES ('TRJ_3', 'WL_20', ?, 655.957)", [id]);
    try {
      expect((await quote([{ productID: 'TEST_P1', quantity: 1 }])).body.data.options[0]).toMatchObject({ transporterID: id, cost: 1 });
      const order = await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P1', quantity: 1 }], payment: pay });
      const [[sell]] = await db.query('SELECT transporterID, transportCost, total FROM sell WHERE sellID = ?', [order.body.data.sellID]);
      expect(sell).toEqual({ transporterID: id, transportCost: 1, total: 21 });

      await db.query("UPDATE transporter SET status = 'disabled' WHERE transporterID = ?", [id]);
      const options = (await quote([{ productID: 'TEST_P1', quantity: 1 }])).body.data.options;
      expect(options.map((o) => o.transporterID)).not.toContain(id);
    } finally {
      await db.query('DELETE FROM transportercostpertraject WHERE transporterID = ?', [id]);
    }
  });

  test('an address no transporter serves cannot be ordered to', async () => {
    // A region in a country without any route (CNTY_228 has no name, so no traject).
    const regionID = uniqueName('R').slice(0, 15);
    const cityID = uniqueName('C').slice(0, 15);
    await db.query("INSERT INTO region (regionID, countryID, name) VALUES (?, 'CNTY_228', 'Nulle part')", [regionID]);
    await db.query("INSERT INTO city (cityID, regionID, name) VALUES (?, ?, 'Ville sans livreur')", [cityID, regionID]);

    const res = await quote([{ productID: 'TEST_P1', quantity: 1 }], { cityID });
    expect(res.body.data.options).toEqual([]);
    const order = await api.post('/api/sells').set(shopper.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 1 }], payment: pay, address: { cityID },
    });
    expect(order.status).toBe(400);
    expect(order.body.message).toMatch(/Aucun transporteur/);
  });

  test('bracket arithmetic and conversion to euros', () => {
    const rates = [{ weightMax: 0.5, transportCost: 100 }, { weightMax: 2, transportCost: 300 }, { weightMax: 10, transportCost: 1000 }];
    expect(priceForWeight(rates, 0)).toBe(100);
    expect(priceForWeight(rates, 0.5)).toBe(100);
    expect(priceForWeight(rates, 0.6)).toBe(300);
    expect(priceForWeight(rates, 10)).toBe(1000);
    expect(priceForWeight(rates, 20)).toBe(2000);
    expect(priceForWeight(rates, 20.2)).toBe(2100);
    expect(toEuros(655.957)).toBe(1);
    expect(toEuros(1600)).toBe(2.44);
  });
});
