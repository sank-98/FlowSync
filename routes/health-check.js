const express = require('express');

function createHealthRouter(services = {}) {
  const router = express.Router();

  async function buildServiceHealth() {
    const checks = {
      storage: services.storageService?.healthCheck,
      logging: services.cloudLogger?.isCloudLoggingEnabled,
      tasks: services.tasksService?.healthCheck,
      monitoring: services.cloudMonitoring?.isCloudMonitoringEnabled,
      pubsub: services.pubSubService?.isEnabled,
    };

    const result = {
      checkedAt: new Date().toISOString(),
      services: {},
    };

    const entries = Object.entries(checks);
    for (const [name, checker] of entries) {
      if (!checker) {
        result.services[name] = { connected: false, error: 'service not configured' };
        continue;
      }

      try {
        const health = await checker.call(
          name === 'storage'
            ? services.storageService
            : name === 'tasks'
              ? services.tasksService
              : name === 'monitoring'
                ? services.cloudMonitoring
                : name === 'pubsub'
                  ? services.pubSubService
                  : services.cloudLogger
        );

        result.services[name] =
          typeof health === 'boolean'
            ? { connected: health }
            : health.connected === undefined
              ? { connected: true, details: health }
              : health;
      } catch (error) {
        result.services[name] = { connected: false, error: error.message };
      }
    }

    return result;
  }

  router.get('/', (_req, res) => {
    res.json({ status: 'healthy', service: 'flowsync', timestamp: new Date().toISOString() });
  });

  router.get('/services', async (_req, res) => {
    const details = await buildServiceHealth();
    const allConnected = Object.values(details.services).every((service) => service.connected === true);
    const timestamp = new Date().toISOString();
    res.status(allConnected ? 200 : 503).json({
      status: allConnected ? 'healthy' : 'degraded',
      timestamp,
      lastCheck: details.checkedAt,
      services: details.services,
      performance: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryRss: process.memoryUsage().rss,
      },
    });
  });

  return router;
}

module.exports = { createHealthRouter };
