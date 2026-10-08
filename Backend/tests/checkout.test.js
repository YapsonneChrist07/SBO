const { api, db, createUser } = require('./helpers');

const pay = { paymentMethodID: 'PM_2' };

describe('checkout prices are decided by the server', () => {
  let shopper;
  beforeAll(async () => { shopper = await createUser(); });

  test('client-sent prices, fees, transporter and broker are ignored', async () => {
    const transporter = await createUser({ role: 'transporter' });
    const res = await api.post('/api/sells').set(shopper.auth).send({
      items: [{ productID: 'TEST_P1', quantity: 2, unitPrice: 0.01 }],
      transportCost: -100,
      tax: -5,
      transporterID: transporter.user.organizationID,
      brokerID: 'BRK_1',
      clientID: 'CLT_1',
      payment: pay,
    });
    expect(res.status).toBe(201);

    const [[sell]] = await db.query('SELECT * FROM sell WHERE sellID = ?', [res.body.data.sellID]);
    expect(sell).toMatchObject({ subTotal: 40, total: 40, transportCost: 0, tax: 0, transporterID: null, brokerID: null, clientID: null });
    const [[line]] = await db.query('SELECT unitPrice, total FROM selldetails WHERE sellID = ?', [res.body.data.sellID]);
    expect(line).toEqual({ unitPrice: 20, total: 40 });
    const [[payment]] = await db.query('SELECT paymentAmount FROM payment WHERE sellID = ?', [res.body.data.sellID]);
    expect(payment.paymentAmount).toBe(40);
  });

  test('an active promotion price is charged', async () => {
    const res = await api.post('/api/sells').set(shopper.auth).send({ items: [{ productID: 'TEST_P3', quantity: 3 }], payment: pay });
    expect(res.status).toBe(201);
    const [[sell]] = await db.query('SELECT total FROM sell WHERE sellID = ?', [res.body.data.sellID]);
    expect(sell.total).toBe(90); // 3 × 30 instead of 3 × 40
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
