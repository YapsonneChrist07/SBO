const { api, db, createUser } = require('./helpers');

let carrierA;
let carrierB;
let zone1;
beforeAll(async () => {
  carrierA = await createUser({ role: 'transporter' });
  carrierB = await createUser({ role: 'transporter' });
  zone1 = (await api.get('/api/transporter-portal/tariffs/1').set(carrierA.auth)).body.data;
});

const save = (carrier, body) => api.put('/api/transporter-portal/tariffs').set(carrier.auth).send({ zoneID: '1', ...body });
const ratesOf = async (carrier) => (await api.get('/api/transporter-portal/tariffs/1').set(carrier.auth)).body.data.rates;

test('zone 1 lists its destinations and the weight brackets', () => {
  expect(zone1.destinations.length).toBeGreaterThan(0);
  expect(zone1.brackets.length).toBeGreaterThan(0);
  expect(zone1.destinations.some((d) => d.country.includes('Ivoire'))).toBe(true);
});

test('a zone-wide price is saved for every destination of the zone', async () => {
  const [b] = zone1.brackets;
  const res = await save(carrierA, { rates: [{ weightLimitID: b.weightLimitID, transportCost: 1000 }] });
  expect(res.status).toBe(200);
  expect(res.body.data.saved).toBe(zone1.destinations.length);
  const rates = await ratesOf(carrierA);
  expect(rates).toHaveLength(zone1.destinations.length);
  expect(rates.every((r) => r.transportCost === 1000)).toBe(true);
});

test("two transporters' prices for the same route never overwrite each other", async () => {
  const [b] = zone1.brackets;
  await save(carrierA, { rates: [{ weightLimitID: b.weightLimitID, transportCost: 1000 }] });
  await save(carrierB, { rates: [{ weightLimitID: b.weightLimitID, transportCost: 777 }] });
  expect((await ratesOf(carrierA)).every((r) => r.transportCost === 1000)).toBe(true);
  expect((await ratesOf(carrierB)).every((r) => r.transportCost === 777)).toBe(true);
});

test('one country can be overridden, and a price removed', async () => {
  const [b1, b2] = zone1.brackets;
  const country = zone1.destinations[0];
  await save(carrierA, { rates: [{ weightLimitID: b1.weightLimitID, transportCost: 1000 }, { weightLimitID: b2.weightLimitID, transportCost: 1500 }] });
  await save(carrierA, { trajectID: country.trajectID, rates: [{ weightLimitID: b1.weightLimitID, transportCost: 500 }, { weightLimitID: b2.weightLimitID, transportCost: null }] });

  const rates = await ratesOf(carrierA);
  const forCountry = rates.filter((r) => r.trajectID === country.trajectID);
  expect(forCountry).toEqual([expect.objectContaining({ weightLimitID: b1.weightLimitID, transportCost: 500 })]);
  expect(rates.filter((r) => r.trajectID !== country.trajectID && r.weightLimitID === b1.weightLimitID).every((r) => r.transportCost === 1000)).toBe(true);
});

test.each([
  ['a negative price', { rates: [{ weightLimitID: 'X', transportCost: -1 }] }, 422],
  ['no rates', { rates: [] }, 422],
])('rejects %s', async (_, body, status) => {
  expect((await save(carrierA, body)).status).toBe(status);
});

test('rejects a destination from another zone and an unknown weight bracket', async () => {
  const [b] = zone1.brackets;
  expect((await save(carrierA, { zoneID: '2', trajectID: zone1.destinations[0].trajectID, rates: [{ weightLimitID: b.weightLimitID, transportCost: 1 }] })).status).toBe(404);
  expect((await save(carrierA, { rates: [{ weightLimitID: 'NOPE', transportCost: 1 }] })).status).toBe(400);
});

test('tariffs are only ever written for the logged-in transporter', async () => {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM transportercostpertraject WHERE transporterID NOT IN (?)', [[carrierA.user.organizationID, carrierB.user.organizationID]]);
  expect(n).toBe(0);
});
