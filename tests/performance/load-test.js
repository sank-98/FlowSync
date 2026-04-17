'use strict';

const scenarios = {
  users100: { vus: 100, duration: '1m', rampUp: '20s' },
  users500: { vus: 500, duration: '2m', rampUp: '30s' },
  users1000: { vus: 1000, duration: '3m', rampUp: '45s' },
  spike: { vus: 1200, duration: '45s', rampUp: '10s' },
  endurance: { vus: 200, duration: '15m', rampUp: '2m' }
};

function parseArgs() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find((arg) => arg.startsWith('--scenario='));
  const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'users100';
  return { scenario };
}

function runScenario(name) {
  const selected = scenarios[name] || scenarios.users100;
  const report = {
    tool: 'k6-or-artillery-compatible-plan',
    scenario: name,
    config: selected,
    stressTesting: ['users500', 'users1000', 'spike'],
    enduranceTesting: ['endurance'],
    analysis: {
      p95TargetMs: 250,
      errorRateTargetPercent: 1,
      throughputTargetRps: 300
    }
  };

  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  const { scenario } = parseArgs();
  runScenario(scenario);
}

module.exports = { scenarios, runScenario };
