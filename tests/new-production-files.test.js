const jwt = require('jsonwebtoken');
const { authGuard, requireRole } = require('../middleware/auth-guard');
const inputSanitizer = require('../middleware/input-sanitizer');
const errorHandler = require('../middleware/error-handler');
const config = require('../config');

describe('new production security/config files', () => {
  describe('authGuard', () => {
    test('rejects missing authorization header', () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('accepts valid bearer token and injects user', () => {
      process.env.JWT_SECRET = 'test-secret';
      const token = jwt.sign({ sub: 'user-1', email: 'u@example.com', roles: ['admin'] }, 'test-secret', {
        expiresIn: '1h',
      });

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      authGuard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe('user-1');
      expect(req.user.roles).toEqual(['admin']);
    });

    test('requireRole enforces role authorization', () => {
      const req = { user: { roles: ['viewer'] } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      requireRole(['admin'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('inputSanitizer', () => {
    test('sanitizes nested payload values', () => {
      const req = {
        body: {
          message: '<script>alert("x")</script><b>hello</b>',
          nested: ['<img src=x onerror=alert(1)>'],
        },
        query: { q: '<svg onload=alert(1)>' },
        params: { id: '<script>1</script>' },
      };

      inputSanitizer(req, {}, () => {});

      expect(req.body.message).not.toContain('<script>');
      expect(req.body.message).toContain('hello');
      expect(req.body.nested[0]).not.toContain('onerror');
      expect(req.query.q).not.toContain('onload');
      expect(req.params.id).not.toContain('<script>');
    });
  });

  describe('errorHandler', () => {
    test('hides internal error detail in production mode', () => {
      process.env.NODE_ENV = 'production';
      const req = { path: '/api/test', method: 'GET', id: 'req-1' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      errorHandler(new Error('database password leaked'), req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'An error occurred processing your request' })
      );
    });
  });

  describe('config index', () => {
    test('exports expected top-level configuration sections', () => {
      expect(config).toEqual(
        expect.objectContaining({
          server: expect.any(Object),
          security: expect.any(Object),
          cache: expect.any(Object),
          database: expect.any(Object),
          googleCloud: expect.any(Object),
          ai: expect.any(Object),
          logging: expect.any(Object),
          features: expect.any(Object),
          simulation: expect.any(Object),
        })
      );
    });
  });
});
