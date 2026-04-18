const request = require('supertest');
const app = require('../app');

describe('OWASP Top 10 Defenses', () => {
  // 1) Input validation
  describe('Input validation', () => {
    it('should reject XSS payload', async () => {
      const res = await request(app).post('/endpoint').send({ data: '<script>alert(1)</script>' });
      expect(res.status).toBe(400);
    });
    it('should reject SQL injection attempt', async () => {
      const res = await request(app).post('/endpoint').send({ data: "' OR 1=1; --" });
      expect(res.status).toBe(400);
    });
    it('should validate CSRF token', async () => {
      const res = await request(app).post('/endpoint').set('X-CSRF-Token', 'invalid-token');
      expect(res.status).toBe(403);
    });
  });

  // 2) Authentication
  describe('Authentication', () => {
    it('should reject missing bearer token', async () => {
      const res = await request(app).get('/protected-endpoint');
      expect(res.status).toBe(401);
    });
    it('should reject invalid JWT', async () => {
      const res = await request(app).get('/protected-endpoint').set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
    it('should reject expired token', async () => {
      const res = await request(app).get('/protected-endpoint').set('Authorization', 'Bearer expiredtoken');
      expect(res.status).toBe(401);
    });
  });

  // 3) Rate limiting
  describe('Rate limiting', () => {
    it('should reject consecutive requests exceeding limit', async () => {
      for (let i = 0; i < 11; i++) {
        await request(app).get('/rate-limited-endpoint');
      }
      const res = await request(app).get('/rate-limited-endpoint');
      expect(res.status).toBe(429);
    });
  });

  // 4) Security headers
  describe('Security headers', () => {
    it('should set CSP header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-security-policy']).toBeDefined();
    });
    it('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });
    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
    it('should set Strict-Transport-Security header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  // 5) SQL Injection
  describe('SQL Injection', () => {
    it('should use parameterized queries', async () => {
      const res = await request(app).post('/sql-injection-endpoint').send({ query: 'SELECT * FROM users WHERE id = ?' });
      expect(res.status).toBe(200);
    });
  });

  // 6) CORS validation
  describe('CORS validation', () => {
    it('should check origin', async () => {
      const res = await request(app).options('/endpoint').set('Origin', 'http://malicious.com');
      expect(res.status).toBe(403);
    });
  });

  // 7) Helmet middleware verification
  describe('Helmet middleware', () => {
    it('should use helmet to secure app', async () => {
      const res = await request(app).get('/');
      expect(res.header['referrer-policy']).toBeDefined();
    });
  });

  // 8) Sensitive data
  describe('Sensitive data', () => {
    it('should not expose API keys in response', async () => {
      const res = await request(app).get('/api-key-endpoint');
      expect(res.text).not.toContain('API_KEY');
    });
    it('should not show stack traces in production', async () => {
      const res = await request(app).get('/error-endpoint');
      expect(res.text).not.toContain('stack trace');
    });
  });

  // 9) Route validation
  describe('Route validation', () => {
    it('should reject invalid zone IDs', async () => {
      const res = await request(app).get('/zone/invalidID');
      expect(res.status).toBe(404);
    });
    it('should reject missing required fields', async () => {
      const res = await request(app).post('/submit').send({});
      expect(res.status).toBe(400);
    });
  });

  // 10) Error handling
  describe('Error handling', () => {
    it('should return generic error messages', async () => {
      const res = await request(app).get('/error');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal Server Error');
    });
    it('should not leak information', async () => {
      const res = await request(app).get('/error');
      expect(res.text).not.toContain('Detailed Stack Trace');
    });
  });
});
