#!/usr/bin/env bash
###############################################################################
# Test: Get Plugin Version Script
#
# Tests the get-plugin-version.sh script.
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$REPO_ROOT/scripts/get-plugin-version.sh"

echo "Testing scripts/get-plugin-version.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Extract action-pack version
test_start "extracts action-pack version"
result=$("$SCRIPT_UNDER_TEST" emfn-action-pack-plugin 2>/dev/null)
assert_matches "$result" "^[0-9]+\.[0-9]+\.[0-9]+$"

# Test 2: Extract site-styles version
test_start "extracts site-styles version"
result=$("$SCRIPT_UNDER_TEST" emfn-site-styles-plugin 2>/dev/null)
assert_matches "$result" "^[0-9]+\.[0-9]+\.[0-9]+$"

# Test 3: Invalid plugin name
test_start "rejects invalid plugin name"
("$SCRIPT_UNDER_TEST" nonexistent-plugin 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

# Test 4: Missing argument
test_start "rejects missing argument"
("$SCRIPT_UNDER_TEST" 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

# Print summary and exit with appropriate code
test_summary
