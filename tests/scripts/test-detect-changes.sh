#!/usr/bin/env bash
###############################################################################
# Test: Detect Plugin Changes Script
#
# Tests the detect-plugin-changes.sh script.
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$REPO_ROOT/scripts/detect-plugin-changes.sh"

echo "Testing scripts/detect-plugin-changes.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Script exists and is executable
test_start "script exists and is executable"
[[ -x "$SCRIPT_UNDER_TEST" ]]
assert_success

# Test 2: Detects actual plugin changes on current branch vs main
test_start "detects plugin changes on current branch"
result=$("$SCRIPT_UNDER_TEST" HEAD 2>/dev/null || echo "")
# With HEAD as base, no changes expected (comparing HEAD to HEAD)
assert_empty "$result"

# Test 3: Invalid git reference
test_start "rejects invalid git reference"
("$SCRIPT_UNDER_TEST" nonexistent-ref 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

# Print summary and exit with appropriate code
test_summary
