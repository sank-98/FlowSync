const { initializeCloudLogging } = require('../config/cloud-logging-config');

const cloudLoggerContext = initializeCloudLogging();

function withContext(context = {}) {
  return {
    ...context,
    environment: process.env.NODE_ENV || 'development',
  };
}

function logInfo(message, context) {
  cloudLoggerContext.logger.info(message, withContext(context));
}

function logWarning(message, context) {
  cloudLoggerContext.logger.warn(message, withContext(context));
}

function logError(message, error, context) {
  cloudLoggerContext.logger.error(message, {
    ...withContext(context),
    error: error ? { message: error.message, stack: error.stack } : undefined,
  });
}

function logDebug(message, context) {
  cloudLoggerContext.logger.debug(message, withContext(context));
}

function logAudit(action, context) {
  cloudLoggerContext.logger.info('audit', {
    ...withContext(context),
    audit: true,
    action,
  });
}

function logMetrics(metricName, value, context) {
  cloudLoggerContext.logger.info('metrics', {
    ...withContext(context),
    metricName,
    value,
    metric: true,
  });
}

function requestLoggingMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    logInfo('request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    });
  });

  next();
}

function isCloudLoggingEnabled() {
  return cloudLoggerContext.enabled;
}

module.exports = {
  logInfo,
  logWarning,
  logError,
  logDebug,
  logAudit,
  logMetrics,
  requestLoggingMiddleware,
  isCloudLoggingEnabled,
};
