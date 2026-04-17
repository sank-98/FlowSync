#!/usr/bin/env bash
set -euo pipefail
npm run lint
npm test
bash scripts/deploy-production.sh
