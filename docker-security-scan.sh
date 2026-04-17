#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${1:-flowsync:security}"

echo "Building secure image: ${IMAGE_NAME}"
docker build -f Dockerfile.security -t "${IMAGE_NAME}" .

echo "Running Docker layer and vulnerability analysis"
if command -v trivy >/dev/null 2>&1; then
  trivy image --severity HIGH,CRITICAL "${IMAGE_NAME}"
else
  echo "trivy not installed; run: brew install trivy or apt install trivy"
fi
