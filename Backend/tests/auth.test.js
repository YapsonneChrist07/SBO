const jwt = require('jsonwebtoken');
const { api, db, createUser, uniqueName } = require('./helpers');

describe('registration', () => {
  test('a client signs up without a company', async () => {
    const { user } = await createUser();
    expect(user.role).toBe('client');
    expect(user.organizationID).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  test.each(['supplier', 'transporter'])('a %s signup creates and links the company', async (role) => {
    const { user } = await createUser({ role, companyName: 'Entreprise Test' });
    expect(user.role).toBe(role);
    expect(user.organizationName).toBe('Entreprise Test');

    const table = role === 'supplier' ? 'supplier' : 'transporter';
    const [[org]] = await db.query(`SELECT name, addressID FROM ${table} WHERE ${table}ID = ?`, [user.organizationID]);
    expect(org.name).toBe('Entreprise Test');
    // The company has its own address, separate from the person's.
    const [[contact]] = await db.query('SELECT addressID FROM contact WHERE contactID = ?', [user.contactID]);
    expect(org.addressID).not.toBe(contact.addressID);
  });

  test('a supplier signup without a company name is rejected and creates nothing', async () => {
    const username = uniqueName('nocomp');
    const res = await api.post('/api/auth/register').send({ firstName: 'A', lastName: 'B', username, password: 'secret123', role: 'supplier' });
    expect(res.status).toBe(422);
    const [rows] = await db.query('SELECT 1 FROM contact WHERE username = ?', [username]);
    expect(rows).toHaveLength(0);
  });

  test('an unknown role is rejected', async () => {
    const res = await api.post('/api/auth/register').send({ firstName: 'A', lastName: 'B', username: uniqueName('bad'), password: 'secret123', role: 'admin' });
    expect(res.status).toBe(422);
  });

  test('a duplicate username is rejected', async () => {
    const { username } = await createUser();
    const res = await api.post('/api/auth/register').send({ firstName: 'A', lastName: 'B', username, password: 'secret123' });
    expect(res.status).toBe(409);
  });
});

describe('login with a role', () => {
  test('wrong password is rejected without saying which part was wrong', async () => {
    const { username } = await createUser();
    const res = await api.post('/api/auth/login').send({ username, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('the role comes from the account: a role sent by the client is ignored', async () => {
    const client = await createUser();
    for (const role of ['supplier', 'transporter']) {
      const res = await api.post('/api/auth/login').send({ username: client.username, password: client.password, role });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('client');
    }
    for (const type of ['supplier', 'transporter']) {
      const partner = await createUser({ role: type });
      for (const role of ['client', 'supplier', 'transporter']) {
        const res = await api.post('/api/auth/login').send({ username: partner.username, password: partner.password, role });
        expect(res.status).toBe(200);
        expect(res.body.data.user).toMatchObject({ role: type, organizationID: partner.user.organizationID });
      }
    }
  });

  test('a pending partner logs straight into its own space', async () => {
    const { user } = await createUser({ role: 'supplier', approved: false });
    expect(user).toMatchObject({ role: 'supplier', organizationStatus: 'pending' });
  });

  test('a session whose role no longer matches the account is ended', async () => {
    const { user } = await createUser({ role: 'supplier' });
    // e.g. a "client" session a partner account opened before roles were detected
    const stale = jwt.sign({ contactID: user.contactID, username: user.username, role: 'client', organizationID: null }, process.env.JWT_SECRET);
    expect((await api.get('/api/auth/me').set({ Authorization: `Bearer ${stale}` })).status).toBe(401);
  });

  test('/auth/me reports the role and company of the session', async () => {
    const { auth, user } = await createUser({ role: 'transporter', companyName: 'Rapide' });
    const res = await api.get('/api/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'transporter', organizationID: user.organizationID, organizationName: 'Rapide' });
  });

  test('ending the company link invalidates the partner session', async () => {
    const { auth, user } = await createUser({ role: 'supplier' });
    await db.query('UPDATE suppliercontact SET endedDate = NOW() - INTERVAL 1 SECOND WHERE contactID = ?', [user.contactID]);
    expect((await api.get('/api/auth/me').set(auth)).status).toBe(401);
  });
});
