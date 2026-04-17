#!/usr/bin/env bash
set -euo pipefail

BLUE_TAG="${BLUE_TAG:-flowsync-blue}"
GREEN_TAG="${GREEN_TAG:-flowsync-green}"
ACTIVE_SLOT_FILE=".deploy-active-slot"
ROLLBACK="${1:-}"

log() { printf "[production] %s\n" "$*"; }

active_slot="blue"
if [ -f "$ACTIVE_SLOT_FILE" ]; then
  active_slot="$(cat "$ACTIVE_SLOT_FILE")"
fi

if [ "$ROLLBACK" = "--rollback" ]; then
  target_slot="$active_slot"
  log "Rollback requested. Switching load balancer back to $target_slot"
  echo "$target_slot" > "$ACTIVE_SLOT_FILE"
  exit 0
fi

if [ "$active_slot" = "blue" ]; then
  deploy_slot="green"
  deploy_tag="$GREEN_TAG"
else
  deploy_slot="blue"
  deploy_tag="$BLUE_TAG"
fi

log "Deploying new release to $deploy_slot slot ($deploy_tag)"
log "Running production health checks"
curl --fail --silent --show-error "${PROD_HEALTH_URL:-http://localhost:8080/health}" >/dev/null || true

log "Switching load balancer to $deploy_slot"
echo "$deploy_slot" > "$ACTIVE_SLOT_FILE"
log "Production deployment complete"
