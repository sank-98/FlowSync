module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/load.test.js'],
  collectCoverageFrom: ['server.js', 'middleware/**/*.js', 'services/**/*.js', 'public/*.js'],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  // Baseline thresholds aligned to current repository coverage; can be raised incrementally.
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  reporters: ['default'],
};
