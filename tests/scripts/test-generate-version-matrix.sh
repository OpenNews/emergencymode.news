#!/usr/bin/env bash
# Tests for scripts/generate-version-matrix.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

SCRIPT_PATH="$REPO_ROOT/scripts/generate-version-matrix.sh"

run_tests() {
  echo "Testing scripts/generate-version-matrix.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Test: Script reads current version from plugin file, not git tags
  test_start "reads version from action-pack plugin file"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "patch bump")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "0.5.0" "$current_version"
  
  test_start "reads version from site-styles plugin file"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "patch bump")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "0.1.0" "$current_version"
  
  # Test: Patch bump from current file version
  test_start "applies patch bump to file version (action-pack)"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "fix: bug fix")
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "0.5.1" "$next_version"
  
  test_start "applies patch bump to file version (site-styles)"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "fix: bug fix")
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "0.1.1" "$next_version"
  
  # Test: Minor bump from current file version
  test_start "applies minor bump to file version"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "[minor] new feature")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "0.5.0" "$current_version"
  assert_equals "0.6.0" "$next_version"
  
  # Test: Major bump from current file version
  test_start "applies major bump to file version"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "[major] breaking change")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "0.5.0" "$current_version"
  assert_equals "1.0.0" "$next_version"
  
  # Test: Multiple plugins
  test_start "handles multiple plugins correctly"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin emfn-site-styles-plugin" "[minor] update both")
  plugin_count=$(echo "$output" | jq '.plugin | length')
  assert_equals "2" "$plugin_count"
  
  action_pack_version=$(echo "$output" | jq -r '.plugin[] | select(.name=="emfn-action-pack-plugin") | .next_version')
  site_styles_version=$(echo "$output" | jq -r '.plugin[] | select(.name=="emfn-site-styles-plugin") | .next_version')
  assert_equals "0.6.0" "$action_pack_version"
  assert_equals "0.2.0" "$site_styles_version"
  
  # Test: Tag format is correct
  test_start "generates correct tag format"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "fix: something")
  tag=$(echo "$output" | jq -r '.plugin[0].tag')
  assert_equals "action-pack/v0.5.1" "$tag"
  
  test_start "generates correct site-styles tag format"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "fix: something")
  tag=$(echo "$output" | jq -r '.plugin[0].tag')
  assert_equals "site-styles/v0.1.1" "$tag"
  
  # Test: Plugin slug mapping
  test_start "maps action-pack plugin name to slug"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "test")
  slug=$(echo "$output" | jq -r '.plugin[0].slug')
  assert_equals "action-pack" "$slug"
  
  test_start "maps site-styles plugin name to slug"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "test")
  slug=$(echo "$output" | jq -r '.plugin[0].slug')
  assert_equals "site-styles" "$slug"
  
  # Test: Error handling
  test_start "rejects invalid plugin name"
  if output=$("$SCRIPT_PATH" "invalid-plugin" "test" 2>&1); then
    test_fail "Should have rejected invalid plugin name"
  else
    assert_contains "$output" "Unknown plugin"
  fi
  
  test_start "requires commit message argument"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" 2>&1 || true)
  assert_contains "$output" "Usage:"
  
  test_summary
}

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required for these tests" >&2
  exit 1
fi

run_tests
