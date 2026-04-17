const { cloudMonitoringConfig, createCloudMonitoringClient } = require('../config/cloud-monitoring-config');

const monitoringClient = cloudMonitoringConfig.enabled ? createCloudMonitoringClient() : null;

function buildProjectPath() {
  const projectId = cloudMonitoringConfig.projectId;
  if (!projectId) return null;
  return `projects/${projectId}`;
}

async function createTimeSeries(metricType, value, labels = {}) {
  if (!monitoringClient) return false;
  const name = buildProjectPath();
  if (!name) return false;

  const point = {
    interval: {
      endTime: {
        seconds: Math.floor(Date.now() / 1000),
      },
    },
    value: {
      doubleValue: Number(value),
    },
  };

  await monitoringClient.createTimeSeries({
    name,
    timeSeries: [
      {
        metric: { type: metricType, labels },
        resource: { type: 'global', labels: { project_id: cloudMonitoringConfig.projectId } },
        points: [point],
      },
    ],
  });

  return true;
}

function recordMetric(metricName, value, labels = {}) {
  return createTimeSeries(metricName, value, labels);
}

function recordAPILatency(route, latencyMs) {
  return recordMetric(cloudMonitoringConfig.metricTypes.apiLatency, latencyMs, { route });
}

function recordDensityMetrics(zoneId, density) {
  return recordMetric(cloudMonitoringConfig.metricTypes.density, density, { zone_id: String(zoneId) });
}

function recordErrorRate(path, rate) {
  return recordMetric(cloudMonitoringConfig.metricTypes.errorRate, rate, { path });
}

function recordQueryMetrics(queryName, latencyMs) {
  return recordMetric(cloudMonitoringConfig.metricTypes.queryLatency, latencyMs, { query: queryName });
}

function recordCacheMetrics(cacheName, hitRate) {
  return recordMetric(cloudMonitoringConfig.metricTypes.cacheHitRate, hitRate, { cache: cacheName });
}

function isCloudMonitoringEnabled() {
  return Boolean(monitoringClient);
}

module.exports = {
  recordMetric,
  recordAPILatency,
  recordDensityMetrics,
  recordErrorRate,
  recordQueryMetrics,
  recordCacheMetrics,
  isCloudMonitoringEnabled,
};
