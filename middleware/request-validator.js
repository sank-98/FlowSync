const { body, validationResult } = require('express-validator');

const sqlPattern = /(union\s+select|drop\s+table|insert\s+into|delete\s+from|--|;)/i;

const validateRouteRequest = [
  body('fromZoneId').isString().trim().notEmpty(),
  body('destinationType').isString().trim().notEmpty(),
  body('preference').optional().isString().trim().isIn(['balanced', 'fastest', 'least_crowded', 'accessible']),
];

const validateChatRequest = [
  body('message').isString().trim().isLength({ min: 1, max: 500 }),
];

function rejectSuspiciousInput(req, res, next) {
  const payload = JSON.stringify(req.body || {});
  if (sqlPattern.test(payload)) {
    return res.status(400).json({ error: 'Potentially unsafe input detected' });
  }
  return next();
}

function validationErrorHandler(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return next();
}

module.exports = {
  validateRouteRequest,
  validateChatRequest,
  rejectSuspiciousInput,
  validationErrorHandler,
};
