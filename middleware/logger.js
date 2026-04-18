const { logger } = require('../config/logging-config');

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'authorization', 'apiKey', 'apikey'];

function sanitizeContext(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeContext(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((item) => lower.includes(item))) {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = sanitizeContext(value[key]);
      }
      return acc;
    }, {});
  }

  return value;
}

function logInfo(message, context) {
  logger.info(message, sanitizeContext(context));
}

function logWarn(message, context) {
  logger.warn(message, sanitizeContext(context));
}

function logError(message, context) {
  logger.error(message, sanitizeContext(context));
}

module.exports = {
  logInfo,
  logWarn,
  logError,
  sanitizeContext,
};
