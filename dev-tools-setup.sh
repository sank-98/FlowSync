#!/usr/bin/env bash
set -euo pipefail

echo "Installing FlowSync development tools"
npm ci

cat <<'TXT'
Recommended tools:
- Snyk CLI: npm i -g snyk
- SonarScanner CLI
- ESLint extension
- Prettier extension
- Docker + Trivy (optional)
TXT

mkdir -p .husky
chmod +x .husky/pre-commit 2>/dev/null || true

echo "Development tools setup complete"
