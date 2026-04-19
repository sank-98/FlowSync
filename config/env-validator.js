const { logWarn } = require('../middleware/logger');

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return;
  }

  // Log warning instead of throwing error - secrets will be injected via Cloud Run Secret Manager
  const requiredVariables = ['JWT_SECRET', 'CSRF_SECRET'];
  const missing = requiredVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logWarn(`Missing environment variables: ${missing.join(', ')}. These will be injected via Cloud Run Secret Manager.`);
  }

  if (!process.env.CORS_ORIGIN) {
    logWarn('CORS_ORIGIN is not set in production; default origin may block expected clients');
  }
}

module.exports = {
  validateEnvironment,
};
