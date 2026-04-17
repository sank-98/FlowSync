function recordMetric(name, value) {
  return { name, value, timestamp: new Date().toISOString() };
}

module.exports = { recordMetric };
