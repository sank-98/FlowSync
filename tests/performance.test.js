const { benchmark } = require('../performance/benchmark-dashboard');

describe('performance benchmark', () => {
  it('benchmarks a simple operation', () => {
    const result = benchmark(() => Array.from({ length: 1000 }).reduce((a, _b, i) => a + i, 0));
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
