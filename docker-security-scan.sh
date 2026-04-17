#!/usr/bin/env bash
set -euo pipefail
docker build -f Dockerfile.security -t flowsync:secure .
echo "Run your preferred scanner, e.g. trivy image flowsync:secure"
