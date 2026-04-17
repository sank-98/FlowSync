const { performance } = require('perf_hooks');

function benchmark(fn) {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

module.exports = { benchmark };
