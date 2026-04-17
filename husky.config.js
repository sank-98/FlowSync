'use strict';

module.exports = {
  hooks: {
    'pre-commit': '.husky/pre-commit'
  },
  options: {
    allowBypassWithEnv: 'HUSKY_BYPASS',
    onError: 'stop-and-report'
  }
};
