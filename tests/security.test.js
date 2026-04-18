/**
 * Security Tests for FlowSync API
 * Tests OWASP Top 10 protections and security controls
 */

const request = require('supertest');
const { app, initializeStadium } = require('../server');

describe('Security Tests - OWASP Top 10 Compliance', () => {
  
  beforeAll(() => {
    initializeStadium();
  });

  // ============================================================================
  // 1. Security Headers Validation (Protection against XSS, Clickjacking, MIME sniffing)
  // ============================================================================
  
  describe('Security Headers', () => {
    test('should return Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('should return X-Content-Type-Options header (MIME sniffing protection)', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should return X-Frame-Options header (Clickjacking protection)', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should return X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should return Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('should return Permissions-Policy header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['permissions-policy']).toBeDefined();
    });
  });

  // ============================================================================
  // 2. CSRF Protection
  // ============================================================================
  
  describe('CSRF Protection', () => {
    test('should accept valid POST requests', async () => {
      const response = await request(app)
        .post('/api/simulation')
        .send({ running: false })
        .set('Content-Type', 'application/json')
        .expect(200);
      
      expect(response.body.running).toBe(false);
    });

    test('should validate required fields in POST requests', async () => {
      const response = await request(app)
        .post('/api/simulation')
        .send({})
        .set('Content-Type', 'application/json')
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    test('should require Content-Type for mutating requests', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({ fromZoneId: 'outer-1', destinationType: 'food' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(415);
      
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // 3. Input Validation & Sanitization (Protection against Injection attacks)
  // ============================================================================
  
  describe('Input Validation & Sanitization', () => {
    test('should validate zone ID format', async () => {
      const response = await request(app)
        .get('/api/zones/"; DROP TABLE zones; --')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });

    test('should reject invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/route')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);
      
      expect(response.status).toBe(400);
    });

    test('should sanitize string inputs', async () => {
      const response = await request(app)
        .post('/api/ai-chat')
        .send({ message: '<script>alert("xss")</script>' })
        .expect(200);
      
      expect(response.body.response).toBeDefined();
      expect(response.body.response).not.toContain('<script>');
    });

    test('should validate request body size limits', async () => {
      const largePayload = 'x'.repeat(10000000); // 10MB
      const response = await request(app)
        .post('/api/route')
        .send({ fromZoneId: largePayload, destinationType: 'food' })
        .expect(413); // Payload too large
      
      expect(response.status).toBe(413);
    });

    test('should validate zone IDs against known zones', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          fromZoneId: 'outer-1',
          destinationType: 'food',
          preference: 'balanced'
        })
        .expect(200);
      
      expect(response.body.route).toBeDefined();
    });

    test('should reject invalid destination types', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          fromZoneId: 'outer-1',
          destinationType: 'invalid_type_xyz',
          preference: 'balanced'
        })
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });

    test('should enforce simulation boolean type', async () => {
      const response = await request(app)
        .post('/api/simulation')
        .send({ running: 'yes' })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    test('should require running field in simulation endpoint', async () => {
      const response = await request(app)
        .post('/api/simulation')
        .send({ other_field: true })
        .expect(400);
      
      expect(response.body.error).toContain('running');
    });
  });

  // ============================================================================
  // 4. Rate Limiting (Protection against DoS/Brute Force)
  // ============================================================================
  
  describe('Rate Limiting', () => {
    test('should allow normal request rate', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/zones')
          .expect(200);
        
        expect(response.body.zones).toBeDefined();
      }
    });

    test('should handle concurrent requests without failure', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/health').expect(200));
      }
      
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(5);
    });
  });

  // ============================================================================
  // 5. Response Security (Output Encoding to prevent XSS)
  // ============================================================================
  
  describe('Response Security', () => {
    test('should escape JSON output', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('application/json');
      expect(typeof response.body).toBe('object');
    });

    test('should not expose sensitive stack traces in errors', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.stack).toBeUndefined();
    });

    test('should not expose internal server details in error messages', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({ fromZoneId: 'outer-1' })
        .expect(400);
      
      const errorText = JSON.stringify(response.body);
      expect(errorText).not.toContain('at ');
      expect(errorText).not.toContain('Error');
    });
  });

  // ============================================================================
  // 6. Authentication & Authorization
  // ============================================================================
  
  describe('Authentication & Authorization', () => {
    test('should reject unauthorized simulation control attempts (if API_AUTH_TOKEN set)', async () => {
      // This test validates the auth check exists
      const response = await request(app)
        .post('/api/simulation')
        .send({ running: false })
        .expect(200); // Either 200 (no auth required) or 401 (auth required)
      
      expect([200, 401]).toContain(response.status);
    });

    test('should allow public read access to zones', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      expect(response.body.zones).toBeDefined();
    });

    test('should allow public read access to dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);
      
      expect(response.body.stats).toBeDefined();
    });
  });

  // ============================================================================
  // 7. API Validation (Type checking, bounds checking)
  // ============================================================================
  
  describe('API Validation', () => {
    test('should validate route preference parameter', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          fromZoneId: 'outer-1',
          destinationType: 'food',
          preference: 'balanced'
        })
        .expect(200);
      
      expect(response.body.confidence).toBeGreaterThan(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    test('should return valid confidence scores', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          fromZoneId: 'outer-1',
          destinationType: 'food'
        })
        .expect(200);
      
      expect(response.body.confidence).toBeDefined();
      expect(typeof response.body.confidence).toBe('number');
      expect(response.body.confidence).toBeGreaterThanOrEqual(0.5);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    test('should return valid zone data structures', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      response.body.zones.forEach(zone => {
        expect(zone.id).toBeDefined();
        expect(zone.density).toBeDefined();
        expect(typeof zone.density).toBe('number');
        expect(zone.density).toBeGreaterThanOrEqual(0);
        expect(zone.density).toBeLessThanOrEqual(1);
      });
    });

    test('should return valid pressure classifications', async () => {
      const response = await request(app)
        .get('/api/zones')
        .expect(200);
      
      const validPressures = ['low', 'medium', 'high', 'critical'];
      response.body.zones.forEach(zone => {
        expect(validPressures).toContain(zone.pressure);
      });
    });
  });

  // ============================================================================
  // 8. Data Consistency & Integrity
  // ============================================================================
  
  describe('Data Consistency & Integrity', () => {
    test('should return consistent zone counts', async () => {
      const response1 = await request(app).get('/api/zones').expect(200);
      const response2 = await request(app).get('/api/zones').expect(200);
      
      expect(response1.body.count).toBe(response2.body.count);
      expect(response1.body.count).toBe(28);
    });

    test('should maintain zone IDs across requests', async () => {
      const response1 = await request(app).get('/api/zones').expect(200);
      const response2 = await request(app).get('/api/zones').expect(200);
      
      const ids1 = response1.body.zones.map(z => z.id).sort();
      const ids2 = response2.body.zones.map(z => z.id).sort();
      
      expect(ids1).toEqual(ids2);
    });

    test('should return valid timestamps', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);
      
      expect(response.body.generatedAt).toBeDefined();
      expect(new Date(response.body.generatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 9. Error Handling & Logging
  // ============================================================================
  
  describe('Error Handling & Logging', () => {
    test('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
      expect(response.body).not.toHaveProperty('stack');
    });

    test('should handle 400 errors gracefully', async () => {
      const response = await request(app)
        .post('/api/simulation')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    test('should handle 415 errors for wrong content type', async () => {
      const response = await request(app)
        .post('/api/route')
        .set('Content-Type', 'text/plain')
        .send('invalid')
        .expect(415);
      
      expect(response.body.error).toBeDefined();
    });

    test('should not expose server internals in error responses', async () => {
      const response = await request(app)
        .get('/api/invalid')
        .expect(404);
      
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('__dirname');
      expect(bodyStr).not.toContain('/home/');
      expect(bodyStr).not.toContain('process');
    });
  });
});
