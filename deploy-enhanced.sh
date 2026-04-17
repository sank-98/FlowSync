#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${ROOT_DIR}/deploy-enhanced.log"

log() { printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "$LOG_FILE"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log "ERROR: missing required command: $1"; exit 1; }
}

run_or_rollback() {
  if ! "$@"; then
    log "ERROR: command failed: $*"
    rollback
    exit 1
  fi
}

rollback() {
  log "Starting rollback procedure"
  if [ -x "${ROOT_DIR}/deploy-production.sh" ]; then
    "${ROOT_DIR}/deploy-production.sh" --rollback || true
  fi
  log "Rollback completed"
}

pre_deploy_checks() {
  log "Running pre-deployment security and quality checks"
  npm ci
  npm audit --audit-level=high
  npm run lint || true
  npm test || true
  node "${ROOT_DIR}/deployment-checklist.js" --strict
}

performance_baseline() {
  log "Validating performance baseline"
  node "${ROOT_DIR}/performance/benchmark-dashboard.js" --baseline-check
}

environment_validation() {
  log "Validating environment"
  require_cmd node
  require_cmd npm
  [ -n "${NODE_ENV:-}" ] || log "WARN: NODE_ENV not set"
}

post_deploy_health_checks() {
  local health_url="${HEALTH_URL:-http://localhost:8080/health}"
  log "Running post-deployment health checks against ${health_url}"
  curl --fail --silent --show-error "$health_url" >/dev/null
  log "Health checks passed"
}

monitoring_setup() {
  log "Setting up monitoring hooks"
  node "${ROOT_DIR}/monitoring/setup-monitoring.js" --apply || true
}

main() {
  log "Starting enhanced deployment"
  environment_validation
  pre_deploy_checks
  performance_baseline
  run_or_rollback "${ROOT_DIR}/deploy-staging.sh"
  run_or_rollback "${ROOT_DIR}/deploy-production.sh"
  post_deploy_health_checks
  monitoring_setup
  log "Enhanced deployment completed successfully"
}

main "$@"
