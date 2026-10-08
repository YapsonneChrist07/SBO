// The other test files run with rate limiting off; this one switches it on.
process.env.RATE_LIMIT_IN_TESTS = '1';
const { api, createUser } = require('./helpers');

afterAll(() => { delete process.env.RATE_LIMIT_IN_TESTS; });

describe('login', () => {
  test('successful logins never count towards the limit', async () => {
    process.env.RATE_LIMIT_IN_TESTS = '0'; // creating the account goes through /register
    const { username, password } = await createUser();
    process.env.RATE_LIMIT_IN_TESTS = '1';
    for (let i = 0; i < 15; i += 1) {
      expect((await api.post('/api/auth/login').send({ username, password })).status).toBe(200);
    }
  });

  test('after 10 failed attempts, further attempts are blocked — even with the right password', async () => {
    process.env.RATE_LIMIT_IN_TESTS = '0';
    const { username, password } = await createUser();
    process.env.RATE_LIMIT_IN_TESTS = '1';
    for (let i = 0; i < 10; i += 1) {
      expect((await api.post('/api/auth/login').send({ username, password: 'wrong' })).status).toBe(401);
    }
    const blocked = await api.post('/api/auth/login').send({ username, password });
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.headers).toHaveProperty('ratelimit');
  });
});

test('forgot-password allows 5 requests per hour', async () => {
  for (let i = 0; i < 5; i += 1) {
    expect((await api.post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })).status).toBe(200);
  }
  expect((await api.post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })).status).toBe(429);
});

test('register allows 10 sign-ups per hour', async () => {
  const signUp = (i) => api.post('/api/auth/register').send({ firstName: 'R', lastName: 'L', username: `rl${Date.now()}${i}`, password: 'secret123' });
  for (let i = 0; i < 10; i += 1) expect((await signUp(i)).status).toBe(201);
  expect((await signUp(10)).status).toBe(429);
});
