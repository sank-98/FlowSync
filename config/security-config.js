const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  trustProxy: process.env.TRUST_PROXY === 'true',
  enforceHttps: process.env.ENFORCE_HTTPS === 'true',
  csrf: {
    enabled: process.env.CSRF_ENABLED !== 'false',
    headerName: process.env.CSRF_HEADER_NAME || 'x-csrf-token',
    secret: process.env.CSRF_SECRET || 'flowsync-dev-csrf-secret',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toNumber(process.env.RATE_LIMIT_MAX, 100),
    authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },
  request: {
    maxJsonSize: process.env.MAX_JSON_SIZE || '200kb',
    maxUrlEncodedSize: process.env.MAX_URLENCODED_SIZE || '200kb',
  },
  csp: {
    scriptSrc: ["'self'", 'https://fonts.googleapis.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
  },
};
