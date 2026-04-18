/**
 * Input Sanitizer Middleware
 * Sanitizes request input recursively to reduce XSS/injection risk.
 */

const xss = require('xss');

let domPurify;

function getDomPurify() {
  if (domPurify !== undefined) {
    return domPurify;
  }

  try {
    domPurify = require('isomorphic-dompurify');
  } catch (error) {
    domPurify = null;
  }

  return domPurify;
}

function sanitizeValue(value) {
  if (typeof value === 'string') {
    const purifier = getDomPurify();
    const cleaned =
      purifier && typeof purifier.sanitize === 'function'
        ? purifier.sanitize(value, { ALLOWED_TAGS: [] })
        : value;

    return xss(cleaned, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = sanitizeValue(value[key]);
      return sanitized;
    }, {});
  }

  return value;
}

function inputSanitizer(req, _res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
}

module.exports = inputSanitizer;
module.exports.sanitizeValue = sanitizeValue;
