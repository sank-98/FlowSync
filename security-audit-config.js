'use strict';

module.exports = {
  npmAudit: {
    enabled: true,
    command: 'npm audit --audit-level=high',
    failOnSeverity: 'high',
    allowlist: []
  },
  owaspDependencyCheck: {
    enabled: true,
    format: 'JSON',
    failBuildOnCVSS: 7.0,
    suppressionFile: './config/owasp-suppressions.xml'
  },
  retireJs: {
    enabled: true,
    path: '.',
    outputFormat: 'json',
    severityThreshold: 'high'
  },
  eslintSecurity: {
    enabled: true,
    configExtends: ['plugin:security/recommended'],
    targetFiles: ['server.js', 'public/**/*.js', 'routes/**/*.js', 'config/**/*.js']
  },
  deprecatedPackagesSafetyNet: {
    enabled: true,
    command: 'npm outdated --json',
    failOnCriticalDeprecated: true
  }
};
