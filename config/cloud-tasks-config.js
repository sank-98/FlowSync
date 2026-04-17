const cloudTasksConfig = {
  enabled: process.env.CLOUD_TASKS_ENABLED === 'true',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '',
  location: process.env.CLOUD_TASKS_LOCATION || 'us-central1',
  queueName: process.env.CLOUD_TASKS_QUEUE_NAME || 'flowsync-default',
  timeoutSeconds: Number(process.env.CLOUD_TASKS_TIMEOUT_SECONDS || 30),
  retryConfig: {
    maxAttempts: Number(process.env.CLOUD_TASKS_MAX_ATTEMPTS || 5),
    maxRetryDurationSeconds: Number(process.env.CLOUD_TASKS_MAX_RETRY_DURATION_SECONDS || 3600),
    minBackoffSeconds: Number(process.env.CLOUD_TASKS_MIN_BACKOFF_SECONDS || 1),
    maxBackoffSeconds: Number(process.env.CLOUD_TASKS_MAX_BACKOFF_SECONDS || 60),
    maxDoublings: Number(process.env.CLOUD_TASKS_MAX_DOUBLINGS || 5),
  },
  rateLimits: {
    maxDispatchesPerSecond: Number(process.env.CLOUD_TASKS_MAX_DISPATCHES_PER_SECOND || 20),
    maxConcurrentDispatches: Number(process.env.CLOUD_TASKS_MAX_CONCURRENT_DISPATCHES || 50),
  },
  queueNames: {
    default: process.env.CLOUD_TASKS_QUEUE_NAME || 'flowsync-default',
    routeHistory: process.env.CLOUD_TASKS_ROUTE_HISTORY_QUEUE || 'flowsync-route-history',
    anomalyReports: process.env.CLOUD_TASKS_ANOMALY_QUEUE || 'flowsync-anomaly-reports',
    cleanup: process.env.CLOUD_TASKS_CLEANUP_QUEUE || 'flowsync-cleanup',
    exports: process.env.CLOUD_TASKS_EXPORT_QUEUE || 'flowsync-exports',
    notifications: process.env.CLOUD_TASKS_NOTIFICATION_QUEUE || 'flowsync-notifications',
  },
};

module.exports = cloudTasksConfig;
