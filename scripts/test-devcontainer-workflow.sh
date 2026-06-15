#!/bin/bash
# Test the devcontainer workflow locally before pushing
# This simulates what GitHub Actions will run

set -e

echo "=== Testing devcontainer workflow locally ==="
echo ""
echo "Current environment:"
echo "  - In devcontainer: $(if [ -f /.dockerenv ]; then echo "YES"; else echo "NO (warning: should run inside devcontainer)"; fi)"
echo "  - CI variable: ${CI:-not set}"
echo ""

echo "=== Running workflow's runCmd commands ==="
echo ""

# These are the exact commands from .github/workflows/devcontainer.yml
uv --version
shellcheck --version
gh --version
node --version
npm --version
php --version
composer --version
python3 --version

echo ""
echo "Smoke test: verifying dependencies can be installed..."
npm ci
composer install --no-interaction --no-progress

echo ""
echo "=== ✓ Devcontainer is healthy ==="
echo ""
echo "This is what will run on GitHub Actions."
echo "If this passes, the workflow should pass."
