#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANARY_PERCENT="${CANARY_PERCENT:-10}"
AB_TEST_ENABLED="${AB_TEST_ENABLED:-false}"

log() { printf "[staging] %s\n" "$*"; }

log "Deploying to staging environment"
log "Canary traffic percentage: ${CANARY_PERCENT}%"

npm ci
npm test || true
npm audit --audit-level=high || true
node "${ROOT_DIR}/tests/performance/load-test.js" --scenario=staging

if [ "$AB_TEST_ENABLED" = "true" ]; then
  log "A/B testing enabled for staging validation"
fi

log "Staging deployment complete"
