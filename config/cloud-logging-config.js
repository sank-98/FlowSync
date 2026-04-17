const { Writable } = require('stream');
const winston = require('winston');
const { Logging } = require('@google-cloud/logging');

const cloudLoggingConfig = {
  enabled: process.env.CLOUD_LOGGING_ENABLED === 'true',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '',
  logName: process.env.CLOUD_LOG_NAME || 'flowsync-app',
};

function createCloudLoggingStream(loggingClient, logName) {
  const log = loggingClient.log(logName);

  return new Writable({
    objectMode: true,
    write(chunk, _encoding, callback) {
      const severity = String(chunk.level || 'info').toUpperCase();
      const metadata = {
        resource: { type: 'global' },
        severity,
      };
      const entry = log.entry(metadata, chunk);
      log.write(entry).then(() => callback()).catch(callback);
    },
  });
}

function initializeCloudLogging() {
  const loggingClient = cloudLoggingConfig.enabled
    ? new Logging({ projectId: cloudLoggingConfig.projectId || undefined })
    : null;

  const transports = [new winston.transports.Console()];

  if (loggingClient) {
    transports.push(
      new winston.transports.Stream({
        stream: createCloudLoggingStream(loggingClient, cloudLoggingConfig.logName),
      })
    );
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.timestamp(), winston.format.json()),
    defaultMeta: { service: 'flowsync' },
    transports,
  });

  return { logger, loggingClient, enabled: Boolean(loggingClient) };
}

module.exports = { cloudLoggingConfig, initializeCloudLogging };
