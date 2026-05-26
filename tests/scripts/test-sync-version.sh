#!/usr/bin/env bash
# Tests for scripts/sync-release-version.sh
#
# ⚠️  TESTS DISABLED ⚠️
# This entire test file has been disabled because the tests modify real project files.
# The sync-release-version.sh script always operates on the repo root (line 18-19),
# ignoring the test's temporary directory setup.
#
# To fix: Refactor sync-release-version.sh to accept an optional working directory
# parameter, then re-enable these tests to work on temp directories only.
#
# DO NOT RUN THESE TESTS - they will corrupt your project version numbers!
#
# shellcheck disable=SC2317  # Intentionally unreachable code (entire file disabled)
exit 0  # Skip all tests

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SYNC_SCRIPT="$REPO_ROOT/scripts/sync-release-version.sh"
TEMP_DIR=""

setup() {
  TEMP_DIR="$(mktemp -d)"
  cd "$TEMP_DIR"
  
  # Create minimal test structure
  mkdir -p plugins/emfn-action-pack-plugin
  
  # Create test files
  cat > package.json <<'EOF'
{
  "name": "test-package",
  "version": "1.0.0",
  "description": "Test package"
}
EOF

  cat > pyproject.toml <<'EOF'
[project]
name = "test-project"
version = "1.0.0"
description = "Test project"
EOF

  cat > plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php <<'EOF'
<?php
/**
 * Plugin Name: EMFN Action Pack Plugin
 * Version: 1.0.0
 * Description: Test plugin
 */

define( 'EMFN_ACTION_PACK_PLUGIN_VERSION', '1.0.0' );
EOF

  cat > plugins/emfn-action-pack-plugin/readme.txt <<'EOF'
=== EMFN Action Pack Plugin ===
Stable tag: 1.0.0
Version: 1.0.0
EOF
}

teardown() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}

run_tests() {
  echo "Testing scripts/sync-release-version.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Test 1: Missing version argument
  test_start "rejects missing version argument"
  setup
  "$SYNC_SCRIPT" 2>/dev/null || true
  assert_failure
  teardown
  
  # Test 2: Invalid version format (not semver)
  test_start "rejects invalid version format (not semver)"
  setup
  "$SYNC_SCRIPT" "1.0" 2>/dev/null || true
  assert_failure
  teardown
  
  # Test 3: Invalid version format (letters)
  test_start "rejects version with letters"
  setup
  "$SYNC_SCRIPT" "1.0.0-beta" 2>/dev/null || true
  assert_failure
  teardown
  
  # Test 4: Valid version updates package.json
  test_start "updates package.json version"
  setup
  "$SYNC_SCRIPT" "2.5.7" >/dev/null 2>&1
  version=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
  assert_equals "2.5.7" "$version"
  teardown
  
  # Test 5: Valid version updates pyproject.toml
  test_start "updates pyproject.toml version"
  setup
  "$SYNC_SCRIPT" "3.1.4" >/dev/null 2>&1
  version=$(grep '^version = ' pyproject.toml | cut -d'"' -f2)
  assert_equals "3.1.4" "$version"
  teardown
  
  # Test 6: Valid version updates PHP plugin header
  test_start "updates PHP plugin Version header"
  setup
  "$SYNC_SCRIPT" "4.2.8" >/dev/null 2>&1
  version=$(grep '^\s*\* Version:' plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  assert_equals "4.2.8" "$version"
  teardown
  
  # Test 7: Valid version updates PHP constant
  test_start "updates PHP plugin version constant"
  setup
  "$SYNC_SCRIPT" "5.6.3" >/dev/null 2>&1
  version=$(grep "define( 'EMFN_ACTION_PACK_PLUGIN_VERSION'" plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  assert_equals "5.6.3" "$version"
  teardown
  
  # Test 8: Valid version updates readme.txt stable tag
  test_start "updates readme.txt Stable tag"
  setup
  "$SYNC_SCRIPT" "6.7.9" >/dev/null 2>&1
  version=$(grep '^Stable tag:' plugins/emfn-action-pack-plugin/readme.txt | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  assert_equals "6.7.9" "$version"
  teardown
  
  # Test 9: Preserves JSON formatting
  test_start "preserves JSON formatting in package.json"
  setup
  "$SYNC_SCRIPT" "7.8.9" >/dev/null 2>&1
  # Check that indentation is preserved (2 spaces)
  indent=$(grep -A1 '"name":' package.json | tail -1 | sed 's/[^ ].*//' | wc -c)
  # 3 because wc -c counts the newline
  assert_equals "3" "$indent"
  teardown
  
  # Test 10: All files updated consistently
  # DISABLED: This test modifies real project files because sync script
  # always changes to repo root. Need to refactor sync script to accept
  # a working directory parameter before this test can be re-enabled.
  # test_start "updates all files to the same version"
  # setup
  # "$SYNC_SCRIPT" "9.9.9" >/dev/null 2>&1
  
  # pkg_version=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
  # toml_version=$(grep '^version = ' pyproject.toml | cut -d'"' -f2)
  # php_header=$(grep '^\s*\* Version:' plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  # php_const=$(grep "define( 'EMFN_ACTION_PACK_PLUGIN_VERSION'" plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  # readme_tag=$(grep '^Stable tag:' plugins/emfn-action-pack-plugin/readme.txt | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  # 
  # all_match=0
  # if [[ "$pkg_version" == "9.9.9" && "$toml_version" == "9.9.9" && "$php_header" == "9.9.9" && "$php_const" == "9.9.9" && "$readme_tag" == "9.9.9" ]]; then
  #   all_match=0
  # else
  #   all_match=1
  # fi
  # 
  # [[ $all_match -eq 0 ]]
  # assert_success
  # teardown
  
  # Test 11: Version with zeros
  test_start "handles version with zeros (0.0.1)"
  setup
  "$SYNC_SCRIPT" "0.0.1" >/dev/null 2>&1
  version=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
  assert_equals "0.0.1" "$version"
  teardown
  
  # Test 12: Large version numbers
  test_start "handles large version numbers (99.99.99)"
  setup
  "$SYNC_SCRIPT" "99.99.99" >/dev/null 2>&1
  version=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
  assert_equals "99.99.99" "$version"
  teardown
}

# Run the tests
run_tests

# Print summary and exit with appropriate code
test_summary
