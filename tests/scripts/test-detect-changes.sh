#!/usr/bin/env bash
###############################################################################
# Test: Detect Plugin Changes Script
#
# Tests the detect-plugin-changes.sh script.
###############################################################################

set -euo pipefail

# shellcheck source=tests/scripts/test-helpers.sh
source "$(dirname "$0")/test-helpers.sh"

SCRIPT_UNDER_TEST="$REPO_ROOT/scripts/detect-plugin-changes.sh"

test_no_changes() {
  section "Test: No plugin changes"
  
  # Compare main to itself (no changes)
  result=$("$SCRIPT_UNDER_TEST" origin/main || true)
  
  assert_empty "$result" "Should return empty string when no changes"
  pass "No changes detected correctly"
}

test_single_plugin_change() {
  section "Test: Single plugin changed"
  
  # Create a temporary git environment
  temp_dir=$(mktemp -d)
  cd "$temp_dir"
  git init
  git config user.name "Test"
  git config user.email "test@example.com"
  
  # Create initial state
  mkdir -p plugins/emfn-action-pack-plugin
  echo "initial" > plugins/emfn-action-pack-plugin/test.txt
  git add .
  git commit -m "Initial commit"
  git branch -M main
  
  # Create a change in action-pack
  echo "changed" > plugins/emfn-action-pack-plugin/test.txt
  git add .
  git commit -m "Change action-pack"
  
  # Test detection
  result=$("$SCRIPT_UNDER_TEST" main)
  
  assert_equals "$result" "emfn-action-pack-plugin" "Should detect action-pack change"
  pass "Single plugin change detected correctly"
  
  # Cleanup
  cd "$REPO_ROOT"
  rm -rf "$temp_dir"
}

test_multiple_plugin_changes() {
  section "Test: Multiple plugins changed"
  
  # Create a temporary git environment
  temp_dir=$(mktemp -d)
  cd "$temp_dir"
  git init
  git config user.name "Test"
  git config user.email "test@example.com"
  
  # Create initial state
  mkdir -p plugins/emfn-action-pack-plugin plugins/emfn-site-styles-plugin
  echo "initial" > plugins/emfn-action-pack-plugin/test.txt
  echo "initial" > plugins/emfn-site-styles-plugin/test.txt
  git add .
  git commit -m "Initial commit"
  git branch -M main
  
  # Create changes in both plugins
  echo "changed" > plugins/emfn-action-pack-plugin/test.txt
  echo "changed" > plugins/emfn-site-styles-plugin/test.txt
  git add .
  git commit -m "Change both plugins"
  
  # Test detection (output should be sorted)
  result=$("$SCRIPT_UNDER_TEST" main)
  
  # Should contain both plugins (space-separated, sorted)
  assert_contains "$result" "emfn-action-pack-plugin" "Should detect action-pack"
  assert_contains "$result" "emfn-site-styles-plugin" "Should detect site-styles"
  pass "Multiple plugin changes detected correctly"
  
  # Cleanup
  cd "$REPO_ROOT"
  rm -rf "$temp_dir"
}

test_invalid_ref() {
  section "Test: Invalid git reference"
  
  # Should exit with error for invalid ref
  if "$SCRIPT_UNDER_TEST" nonexistent-ref 2>/dev/null; then
    fail "Should fail with invalid git reference"
  else
    pass "Correctly rejects invalid git reference"
  fi
}

# Run tests
run_tests \
  test_no_changes \
  test_single_plugin_change \
  test_multiple_plugin_changes \
  test_invalid_ref
