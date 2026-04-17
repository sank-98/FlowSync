const rateLimit = require('express-rate-limit');
const securityConfig = require('../config/security-config');

const generalLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' },
});

const authLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests' },
});

module.exports = { generalLimiter, authLimiter };
