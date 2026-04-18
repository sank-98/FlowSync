const request = require('supertest');
const { app, initializeStadium } = require('../server');

describe('OWASP-aligned security hardening', () => {
  let fromZoneId;

  beforeAll(async () => {
    initializeStadium();
    const zonesRes = await request(app).get('/api/zones');
    fromZoneId = zonesRes.body.zones[0].id;
  });

  describe('Input validation and sanitization', () => {
    it('rejects suspicious SQL-like payloads', async () => {
      const res = await request(app)
        .post('/api/route')
        .send({ fromZoneId: `${fromZoneId}; DROP TABLE zones;`, destinationType: 'food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unsafe|validation/i);
    });

    it('returns validation error for missing required route fields', async () => {
      const res = await request(app).post('/api/route').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('accepts valid route payload and returns route data', async () => {
      const res = await request(app)
        .post('/api/route')
        .send({ fromZoneId, destinationType: 'food', preference: 'balanced' });

      expect(res.status).toBe(200);
      expect(res.body.route).toBeDefined();
    });
  });

  describe('Security headers', () => {
    it('sets strict security headers', async () => {
      const res = await request(app).get('/');

      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('Rate limiting and CORS', () => {
    it('returns rate limit headers for API traffic', async () => {
      const res = await request(app).get('/api/zones');
      expect(res.headers['ratelimit-policy']).toBeDefined();
    });

    it('blocks disallowed CORS origins', async () => {
      const res = await request(app).options('/api/zones').set('Origin', 'http://malicious.com');
      expect(res.status).toBe(403);
    });
  });

  describe('Safe error surface', () => {
    it('returns 404 for unknown endpoints without stack details', async () => {
      const res = await request(app).get('/definitely-not-a-real-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Endpoint not found');
      expect(JSON.stringify(res.body)).not.toMatch(/stack|trace/i);
    });

    it('rejects invalid zone identifiers', async () => {
      const res = await request(app).get('/api/zones/not-a-real-zone');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Zone not found');
    });
  });
});
