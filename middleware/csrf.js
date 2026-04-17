const crypto = require('crypto');
const securityConfig = require('../config/security-config');

function ensureCsrfToken(req, res, next) {
  if (!securityConfig.csrf.enabled) return next();
  const token = crypto.createHmac('sha256', securityConfig.csrf.secret).update(req.ip || 'unknown').digest('hex');
  res.setHeader('X-CSRF-Token', token);
  req.expectedCsrfToken = token;
  return next();
}

function validateCsrfToken(req, res, next) {
  if (!securityConfig.csrf.enabled) return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const token = req.headers[securityConfig.csrf.headerName] || req.body?._csrf;
  if (!token || token !== req.expectedCsrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  return next();
}

module.exports = { ensureCsrfToken, validateCsrfToken };
