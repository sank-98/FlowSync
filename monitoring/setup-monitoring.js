function setupMonitoring() {
  return {
    enabled: process.env.MONITORING_ENABLED === 'true',
    projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
  };
}

module.exports = { setupMonitoring };
