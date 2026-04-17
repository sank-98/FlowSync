const { MetricServiceClient } = require('@google-cloud/monitoring');

const metricPrefix = 'custom.googleapis.com/crowdflow';

const cloudMonitoringConfig = {
  enabled: process.env.CLOUD_MONITORING_ENABLED === 'true',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '',
  metricTypes: {
    density: `${metricPrefix}/density`,
    routingLatency: `${metricPrefix}/routing_latency`,
    apiLatency: `${metricPrefix}/api_latency`,
    errorRate: `${metricPrefix}/error_rate`,
    cacheHitRate: `${metricPrefix}/cache_hit_rate`,
    zonesInCritical: `${metricPrefix}/zones_in_critical`,
    queryLatency: `${metricPrefix}/query_latency`,
  },
};

function createCloudMonitoringClient() {
  return new MetricServiceClient();
}

module.exports = { cloudMonitoringConfig, createCloudMonitoringClient };
