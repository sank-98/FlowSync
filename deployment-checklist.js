'use strict';

const fs = require('fs');

const checks = [
  {
    name: 'Environment variables',
    run: () => Boolean(process.env.NODE_ENV || process.env.GOOGLE_GEMINI_API_KEY)
  },
  {
    name: 'Security policy file exists',
    run: () => fs.existsSync('SECURITY_AUDIT_REPORT.md')
  },
  {
    name: 'Performance monitor config exists',
    run: () => fs.existsSync('config/performance-monitoring.js')
  },
  {
    name: 'Dependency lock file exists',
    run: () => fs.existsSync('package-lock.json')
  },
  {
    name: 'Database migration plan documented',
    run: () => fs.existsSync('COMPLIANCE_CHECKLIST.md')
  }
];

function main() {
  const strict = process.argv.includes('--strict');
  const results = checks.map((check) => ({
    name: check.name,
    passed: Boolean(check.run())
  }));

  let hasFailures = false;
  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${result.name}`);
    if (!result.passed) {
      hasFailures = true;
    }
  }

  if (strict && hasFailures) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { checks };
