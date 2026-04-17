const request = require('supertest');
const { app } = require('../server');

describe('health and api basics', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('returns zones payload', async () => {
    const res = await request(app).get('/api/zones');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.zones)).toBe(true);
  });
});
