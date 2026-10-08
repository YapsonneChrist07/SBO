// CORS_ORIGIN is read when the app is loaded; Jest gives each test file a fresh module registry.
process.env.CORS_ORIGIN = 'https://sbo.example, https://admin.sbo.example';
const { api } = require('./helpers');

afterAll(() => { delete process.env.CORS_ORIGIN; });

test.each(['https://sbo.example', 'https://admin.sbo.example'])('the configured site %s may call the API', async (origin) => {
  const res = await api.get('/').set('Origin', origin);
  expect(res.headers['access-control-allow-origin']).toBe(origin);
});

test('any other site gets no CORS permission', async () => {
  const res = await api.get('/').set('Origin', 'https://evil.example');
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
});
