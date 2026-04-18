/**
 * Centralized environment configuration for FlowSync.
 */

const DEFAULT_PORT = 8080;

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value, fallback = []) {
  if (!value) {
    return [...fallback];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  server: {
    port: toNumber(process.env.PORT, DEFAULT_PORT),
    trustProxy: toBoolean(process.env.TRUST_PROXY, false),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    corsOrigins: toList(process.env.CORS_ORIGIN, ['http://localhost:8080']),
    csrfEnabled: toBoolean(process.env.CSRF_ENABLED, true),
    csrfHeaderName: process.env.CSRF_HEADER_NAME || 'x-csrf-token',
    rateLimit: {
      windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toNumber(process.env.RATE_LIMIT_MAX, 100),
      authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
    },
  },
  cache: {
    dashboardTtlSeconds: toNumber(process.env.CACHE_DASHBOARD_TTL_SECONDS, 2),
    heatmapTtlSeconds: toNumber(process.env.CACHE_HEATMAP_TTL_SECONDS, 1),
    routeTtlSeconds: toNumber(process.env.CACHE_ROUTE_TTL_SECONDS, 30),
    anomalyTtlSeconds: toNumber(process.env.CACHE_ANOMALY_TTL_SECONDS, 3),
  },
  database: {
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
    firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || '',
  },
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '',
    region: process.env.GCP_REGION || 'us-central1',
    storageBucket:
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || process.env.GCS_BUCKET_NAME || '',
    cloudLoggingEnabled: toBoolean(process.env.CLOUD_LOGGING_ENABLED, false),
    cloudMonitoringEnabled: toBoolean(process.env.CLOUD_MONITORING_ENABLED, false),
    cloudPubSubEnabled: toBoolean(process.env.CLOUD_PUBSUB_ENABLED, false),
    cloudTasksEnabled: toBoolean(process.env.CLOUD_TASKS_ENABLED, false),
  },
  ai: {
    provider: 'google-gemini',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    maxTokens: toNumber(process.env.GEMINI_MAX_TOKENS, 2048),
    temperature: toNumber(process.env.GEMINI_TEMPERATURE, 0.3),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  features: {
    anomalyDetection: toBoolean(process.env.FEATURE_ANOMALY_DETECTION, true),
    aiChat: toBoolean(process.env.FEATURE_AI_CHAT, true),
    smartRouting: toBoolean(process.env.FEATURE_SMART_ROUTING, true),
    cloudSync: toBoolean(process.env.FEATURE_CLOUD_SYNC, false),
  },
  simulation: {
    updateIntervalMs: toNumber(process.env.SIM_UPDATE_INTERVAL_MS, 1500),
    historyLength: toNumber(process.env.SIM_HISTORY_LENGTH, 30),
    eventDecay: toNumber(process.env.SIM_EVENT_DECAY, 0.965),
  },
};

module.exports = Object.freeze(config);
