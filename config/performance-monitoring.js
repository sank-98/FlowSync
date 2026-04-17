'use strict';

module.exports = {
  apm: {
    provider: process.env.APM_PROVIDER || 'google-cloud-trace',
    googleCloudTrace: {
      enabled: true,
      projectIdEnv: 'GOOGLE_CLOUD_PROJECT'
    },
    newRelic: {
      enabled: false,
      licenseKeyEnv: 'NEW_RELIC_LICENSE_KEY'
    },
    datadog: {
      enabled: false,
      apiKeyEnv: 'DATADOG_API_KEY'
    }
  },
  metrics: {
    responseTimeMs: { p50: true, p95: true, p99: true },
    errorRate: true,
    resourceUtilization: {
      cpu: true,
      memory: true,
      eventLoopLag: true
    },
    rum: {
      enabled: true,
      sampleRate: 0.1
    },
    syntheticMonitoring: {
      enabled: true,
      intervalSeconds: 60
    }
  }
};
