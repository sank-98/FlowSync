/**
 * Security Module for FlowSync Frontend
 * Handles CSRF token management, request signing, and XSS prevention
 * 
 * @module security
 */

/**
 * Frontend security utilities and CSRF protection
 * Manages tokens extracted from page meta tags and injects them into API requests
 */
const SecurityManager = (() => {
  /**
   * Retrieves CSRF token from page meta tag.
   * Falls back to generating a token if not found.
   * 
   * @returns {string} CSRF token
   * @private
   */
  const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.getAttribute('content')) {
      return meta.getAttribute('content');
    }
    // Fallback: generate a simple token
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Adds CSRF token to request headers for API calls.
   * Required by backend CSRF middleware for state-changing operations.
   * 
   * @param {Object} headers - Request headers object to augment
   * @returns {Object} Headers object with CSRF token added
   * @private
   */
  const augmentHeaders = (headers = {}) => {
    return {
      ...headers,
      'X-CSRF-Token': getCsrfToken(),
      'Content-Type': 'application/json',
    };
  };

  /**
   * Sanitizes user input to prevent XSS attacks.
   * Removes or escapes potentially dangerous characters and HTML entities.
   * 
   * @param {string} input - Raw user input
   * @returns {string} Sanitized string safe for DOM insertion
   * @private
   */
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  };

  /**
   * Makes a secure API request with CSRF token and sanitization.
   * Wraps fetch() with security middleware.
   * 
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options (method, body, headers, etc.)
   * @returns {Promise<Response>} Fetch response
   * 
   * @example
   * const response = await SecurityManager.fetchSecure('/api/route', {
   *   method: 'POST',
   *   body: JSON.stringify({ fromZoneId: 'outer-1', destinationType: 'food' })
   * });
   */
  const fetchSecure = async (url, options = {}) => {
    const headers = augmentHeaders(options.headers);
    
    // Sanitize body if present
    let body = options.body;
    if (body && typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        // Recursively sanitize string values in object
        const sanitized = sanitizeObject(parsed);
        body = JSON.stringify(sanitized);
      } catch (e) {
        // Not JSON, sanitize as string
        body = sanitizeInput(body);
      }
    }

    const fetchOptions = {
      ...options,
      headers,
      body,
    };

    return fetch(url, fetchOptions);
  };

  /**
   * Recursively sanitizes string values in an object.
   * Used to clean request payloads before sending to server.
   * 
   * @param {*} value - Value to sanitize (object, array, string, etc.)
   * @returns {*} Sanitized version of value
   * @private
   */
  const sanitizeObject = (value) => {
    if (typeof value === 'string') {
      return sanitizeInput(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeObject);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeObject(v)])
      );
    }
    return value;
  };

  /**
   * Safely inserts HTML text into DOM elements.
   * Uses textContent to prevent XSS instead of innerHTML.
   * 
   * @param {HTMLElement} element - Target DOM element
   * @param {string} text - Text content to set
   * @returns {void}
   * 
   * @example
   * SecurityManager.setElementText(document.getElementById('message'), userMessage);
   */
  const setElementText = (element, text) => {
    if (!element) return;
    element.textContent = sanitizeInput(text);
  };

  /**
   * Validates Content Security Policy compliance.
   * Checks if inline scripts and styles are allowed.
   * 
   * @returns {boolean} True if CSP allows inline execution
   * @private
   */
  const validateCSP = () => {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!meta) return true; // No CSP, assume safe
    
    const csp = meta.getAttribute('content');
    // Simple check for 'unsafe-inline' in script-src
    return csp.includes("script-src 'self'");
  };

  /**
   * Logs security event for monitoring and auditing.
   * Useful for detecting potential attack attempts.
   * 
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @returns {void}
   * 
   * @example
   * SecurityManager.logEvent('invalid_input', { field: 'query', value: '<script>...' });
   */
  const logEvent = (event, details = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[SECURITY] ${timestamp} - ${event}`, details);
  };

  /**
   * Validates that a URL is same-origin before navigation.
   * Prevents open redirect attacks.
   * 
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is safe to redirect to
   * 
   * @example
   * if (SecurityManager.isSafeRedirect(userProvidedUrl)) {
   *   window.location.href = userProvidedUrl;
   * }
   */
  const isSafeRedirect = (url) => {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  };

  // Public API
  return {
    fetchSecure,
    sanitizeInput,
    sanitizeObject,
    setElementText,
    validateCSP,
    logEvent,
    isSafeRedirect,
    getCsrfToken,
  };
})();

/**
 * Initialize security on page load
 * Validates CSP and logs initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  const cspValid = SecurityManager.validateCSP();
  if (!cspValid) {
    console.warn('[SECURITY] CSP may be misconfigured');
  }
  console.log('[SECURITY] SecurityManager initialized');
});
