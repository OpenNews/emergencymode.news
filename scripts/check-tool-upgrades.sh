#!/bin/bash
# Check for available upgrades to TypeScript, ESLint, and related tooling
# These packages are not automatically updated by Dependabot to avoid conflicts
# Run this script periodically or before starting major refactoring

set -e

echo "Checking available upgrades for TypeScript/ESLint tooling..."
echo ""

# List of packages to check
PACKAGES=(
  "typescript"
  "@typescript-eslint/eslint-plugin"
  "@typescript-eslint/parser"
  "@eslint/js"
  "eslint"
  "eslint-plugin-jsdoc"
)

# Check current vs available versions
for package in "${PACKAGES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Package: $package"
  
  # Get current version from package.json
  current=$(grep "\"$package\"" package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  
  if [ -z "$current" ]; then
    echo "  Not found in package.json"
    continue
  fi
  
  # Get latest version from npm
  latest=$(npm view "$package" version 2>/dev/null || echo "error")
  
  if [ "$latest" = "error" ]; then
    echo "  Error fetching latest version"
    continue
  fi
  
  echo "  Current: $current"
  echo "  Latest:  $latest"
  
  if [ "$current" != "$latest" ]; then
    echo "  ⚠️  Upgrade available"
  else
    echo "  ✓ Up to date"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To update specific packages, use:"
echo "  npm install --save-dev <package>@latest"
echo ""
echo "To update all tooling at once (if compatible):"
echo "  npm install --save-dev typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser @eslint/js eslint eslint-plugin-jsdoc@latest"
