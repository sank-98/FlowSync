module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/load.test.js'],
  collectCoverageFrom: ['server.js', 'middleware/**/*.js', 'services/**/*.js', 'public/*.js'],
};
