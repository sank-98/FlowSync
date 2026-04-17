'use strict';

function buildMonitoringConfig() {
  return {
    provider: 'google-cloud-monitoring',
    dashboards: ['flowsync-overview', 'flowsync-latency', 'flowsync-errors'],
    metrics: [
      'custom.googleapis.com/flowsync/requests',
      'custom.googleapis.com/flowsync/errors',
      'custom.googleapis.com/flowsync/p95_latency'
    ],
    alertPolicies: [
      { name: 'HighErrorRate', threshold: 'error_rate > 1%' },
      { name: 'LatencyRegression', threshold: 'p95_latency_ms > 300' }
    ],
    sloSli: {
      availability: '99.9%',
      latency: '95% of requests < 250ms'
    },
    incidentResponse: {
      onCallChannel: '#incident-response',
      runbook: 'INCIDENT_RESPONSE_PLAN.md'
    }
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildMonitoringConfig(), null, 2));
}

module.exports = { buildMonitoringConfig };
