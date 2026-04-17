const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const securityConfig = require('../config/security-config');
const { logger } = require('../config/logging-config');
const { generalLimiter, authLimiter } = require('./rate-limiter');
const { ensureCsrfToken, validateCsrfToken } = require('./csrf');
const { rejectSuspiciousInput } = require('./request-validator');

function enforceHttps(req, res, next) {
  if (!securityConfig.enforceHttps) return next();
  const proto = req.headers['x-forwarded-proto'];
  if (req.secure || proto === 'https') return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
}

function sanitizeObject(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeObject(v)]));
  }
  return value;
}

function sanitizeInput(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  next();
}

function securityLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('api_request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
}

function applySecurity(app) {
  app.disable('x-powered-by');
  app.use(enforceHttps);
  app.use(
    helmet({
      hsts: true,
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: securityConfig.csp.scriptSrc,
          styleSrc: securityConfig.csp.styleSrc,
          fontSrc: securityConfig.csp.fontSrc,
          imgSrc: securityConfig.csp.imgSrc,
          connectSrc: securityConfig.csp.connectSrc,
        },
      },
    })
  );
  app.use(cors({ origin: securityConfig.cors.origin }));
  app.use(compression());
  app.use(generalLimiter);
  app.use(ensureCsrfToken);
  app.use(validateCsrfToken);
  app.use(sanitizeInput);
  app.use(rejectSuspiciousInput);
  app.use(securityLogger);
  app.use('/api/ai-chat', authLimiter);
}

module.exports = { applySecurity };
