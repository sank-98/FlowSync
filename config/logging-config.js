'use strict';

module.exports = {
  logger: 'winston',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  format: {
    structured: true,
    timestamp: true,
    json: true,
    redact: ['authorization', 'cookie', 'x-api-key']
  },
  transports: {
    console: true,
    cloudLogging: {
      enabled: true,
      provider: 'google-cloud-logging'
    }
  },
  tracking: {
    errors: true,
    performance: true,
    audit: true
  }
};
