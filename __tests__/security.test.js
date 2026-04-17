const request = require('supertest');

describe('Security hardening middleware', () => {
  let app;
  let initializeStadium;

  beforeAll(() => {
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.API_AUTH_TOKEN = 'test-token';
    process.env.ENABLE_HTTPS_REDIRECT = 'false';
    jest.resetModules();
    const server = require('../server');
    app = server.app;
    initializeStadium = server.initializeStadium;
    initializeStadium();
  });

  test('sets core security headers', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('blocks cross-site mutating requests (CSRF protection)', async () => {
    const response = await request(app)
      .post('/api/ai-chat')
      .set('Origin', 'https://evil.example.com')
      .send({ message: 'route help' });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/CSRF/);
  });

  test('validates route destination type', async () => {
    const response = await request(app).post('/api/route').send({
      fromZoneId: 'outer-1',
      destinationType: 'bad-destination',
      preference: 'balanced',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid destinationType');
  });

  test('requires API token for protected control endpoint', async () => {
    const response = await request(app).post('/api/reset').send({});
    expect(response.status).toBe(401);
  });

  test('enforces rate limiting', async () => {
    for (let index = 0; index < 10; index += 1) {
      await request(app).get('/api/dashboard');
    }
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(429);
  });
});
