#!/usr/bin/env bash
###############################################################################
# Test: Get Plugin Version Script
#
# Tests the get-plugin-version.sh script.
###############################################################################

set -euo pipefail

# shellcheck source=tests/scripts/test-helpers.sh
source "$(dirname "$0")/test-helpers.sh"

SCRIPT_UNDER_TEST="$REPO_ROOT/scripts/get-plugin-version.sh"

test_action_pack_version() {
  section "Test: Extract action-pack version"
  
  result=$("$SCRIPT_UNDER_TEST" emfn-action-pack-plugin)
  
  # Should return a semver version
  assert_matches "$result" "^[0-9]+\.[0-9]+\.[0-9]+$" "Should return semver version"
  pass "Action pack version extracted: $result"
}

test_site_styles_version() {
  section "Test: Extract site-styles version"
  
  result=$("$SCRIPT_UNDER_TEST" emfn-site-styles-plugin)
  
  # Should return a semver version
  assert_matches "$result" "^[0-9]+\.[0-9]+\.[0-9]+$" "Should return semver version"
  pass "Site styles version extracted: $result"
}

test_invalid_plugin() {
  section "Test: Invalid plugin name"
  
  # Should exit with error for nonexistent plugin
  if "$SCRIPT_UNDER_TEST" nonexistent-plugin 2>/dev/null; then
    fail "Should fail with nonexistent plugin"
  else
    pass "Correctly rejects invalid plugin name"
  fi
}

test_missing_argument() {
  section "Test: Missing argument"
  
  # Should exit with error when no argument provided
  if "$SCRIPT_UNDER_TEST" 2>/dev/null; then
    fail "Should fail with missing argument"
  else
    pass "Correctly rejects missing argument"
  fi
}

# Run tests
run_tests \
  test_action_pack_version \
  test_site_styles_version \
  test_invalid_plugin \
  test_missing_argument
