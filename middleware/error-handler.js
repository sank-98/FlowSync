const { logError } = require('./logger');

/**
 * Centralized Error Handler Middleware
 * Returns consistent error responses and avoids leaking internal details in production.
 */

function errorHandler(err, req, res, _next) {
  logError('Unhandled request error', {
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.user && req.user.id ? req.user.id : 'anonymous',
    statusCode: err.statusCode || err.status || 500,
  });

  const statusCode = err.statusCode || err.status || 500;

  const errorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Failed',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An error occurred processing your request'
        : err.message,
    requestId: req.id || 'unknown',
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  return res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
