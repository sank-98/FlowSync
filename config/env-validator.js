const { logWarn } = require('../middleware/logger');

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return;
  }

  const requiredVariables = ['JWT_SECRET', 'CSRF_SECRET'];
  const missing = requiredVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }

  if (!process.env.CORS_ORIGIN) {
    logWarn('CORS_ORIGIN is not set in production; default origin may block expected clients');
  }
}

module.exports = {
  validateEnvironment,
};
