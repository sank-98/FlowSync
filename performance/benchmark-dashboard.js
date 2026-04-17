'use strict';

const history = [
  { timestamp: '2026-01-01T00:00:00Z', p95LatencyMs: 210, errorRatePct: 0.4, costUsd: 120 },
  { timestamp: '2026-02-01T00:00:00Z', p95LatencyMs: 195, errorRatePct: 0.3, costUsd: 118 },
  { timestamp: '2026-03-01T00:00:00Z', p95LatencyMs: 188, errorRatePct: 0.25, costUsd: 119 }
];

function trendAnalysis(data) {
  if (data.length < 2) return { direction: 'stable', delta: 0 };
  const first = data[0].p95LatencyMs;
  const last = data[data.length - 1].p95LatencyMs;
  const delta = Number((((last - first) / first) * 100).toFixed(2));
  return { direction: delta <= 0 ? 'improving' : 'degrading', delta };
}

function createReport() {
  const trend = trendAnalysis(history);
  return {
    generatedAt: new Date().toISOString(),
    trend,
    recommendations: trend.direction === 'degrading'
      ? ['scale API tier', 'review expensive route calculations']
      : ['maintain current caching strategy'],
    comparison: history,
    performanceAlerts: trend.delta > 20 ? ['p95 latency degraded > 20%'] : [],
    costAnalysis: {
      avgMonthlyCostUsd: Number((history.reduce((sum, item) => sum + item.costUsd, 0) / history.length).toFixed(2))
    }
  };
}

if (require.main === module) {
  const report = createReport();
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--baseline-check') && report.trend.direction === 'degrading' && report.trend.delta > 20) {
    process.exitCode = 1;
  }
}

module.exports = { history, trendAnalysis, createReport };
