#!/usr/bin/env bash
# Tests for scripts/generate-version-matrix.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

SCRIPT_PATH="$REPO_ROOT/scripts/generate-version-matrix.sh"
GET_VERSION_PATH="$REPO_ROOT/scripts/get-plugin-version.sh"

run_tests() {
  echo "Testing scripts/generate-version-matrix.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Get current versions from plugin files (for dynamic test expectations)
  ACTION_PACK_VERSION=$("$GET_VERSION_PATH" "emfn-action-pack-plugin")
  SITE_STYLES_VERSION=$("$GET_VERSION_PATH" "emfn-site-styles-plugin")
  
  # Parse action-pack version for bump tests
  IFS='.' read -r AP_MAJOR AP_MINOR AP_PATCH <<< "$ACTION_PACK_VERSION"
  AP_NEXT_PATCH="${AP_MAJOR}.${AP_MINOR}.$((AP_PATCH + 1))"
  AP_NEXT_MINOR="${AP_MAJOR}.$((AP_MINOR + 1)).0"
  AP_NEXT_MAJOR="$((AP_MAJOR + 1)).0.0"
  
  # Parse site-styles version for bump tests
  IFS='.' read -r SS_MAJOR SS_MINOR SS_PATCH <<< "$SITE_STYLES_VERSION"
  SS_NEXT_PATCH="${SS_MAJOR}.${SS_MINOR}.$((SS_PATCH + 1))"
  
  # Test: Script reads current version from plugin file, not git tags
  test_start "reads version from action-pack plugin file"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "patch bump")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "$ACTION_PACK_VERSION" "$current_version"
  
  test_start "reads version from site-styles plugin file"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "patch bump")
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "$SITE_STYLES_VERSION" "$current_version"
  
  # Test: Patch bump from current file version
  test_start "applies patch bump to file version (action-pack)"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "fix: bug fix")
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "$AP_NEXT_PATCH" "$next_version"
  
  test_start "applies patch bump to file version (site-styles)"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "fix: bug fix")
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "$SS_NEXT_PATCH" "$next_version"
  
  # Test: Minor bump from current file version
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "[minor] new feature")
  
  test_start "minor bump preserves current version in output"
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "$ACTION_PACK_VERSION" "$current_version"
  
  test_start "applies minor bump to file version"
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "$AP_NEXT_MINOR" "$next_version"
  
  # Test: Major bump from current file version
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "[major] breaking change")
  
  test_start "major bump preserves current version in output"
  current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
  assert_equals "$ACTION_PACK_VERSION" "$current_version"
  
  test_start "applies major bump to file version"
  next_version=$(echo "$output" | jq -r '.plugin[0].next_version')
  assert_equals "$AP_NEXT_MAJOR" "$next_version"
  
  # Test: Multiple plugins
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin emfn-site-styles-plugin" "[minor] update both")
  
  test_start "handles multiple plugins - plugin count"
  plugin_count=$(echo "$output" | jq '.plugin | length')
  assert_equals "2" "$plugin_count"
  
  test_start "handles multiple plugins - action-pack version"
  action_pack_version=$(echo "$output" | jq -r '.plugin[] | select(.name=="emfn-action-pack-plugin") | .next_version')
  assert_equals "$AP_NEXT_MINOR" "$action_pack_version"
  
  test_start "handles multiple plugins - site-styles version"
  site_styles_version=$(echo "$output" | jq -r '.plugin[] | select(.name=="emfn-site-styles-plugin") | .next_version')
  SS_NEXT_MINOR="${SS_MAJOR}.$((SS_MINOR + 1)).0"
  assert_equals "$SS_NEXT_MINOR" "$site_styles_version"
  
  # Test: Tag format is correct
  test_start "generates correct tag format"
  output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "fix: something")
  tag=$(echo "$output" | jq -r '.plugin[0].tag')
  assert_equals "action-pack/v${AP_NEXT_PATCH}" "$tag"
  
  test_start "generates correct site-styles tag format"
  output=$("$SCRIPT_PATH" "emfn-site-styles-plugin" "fix: something")
  tag=$(echo "$output" | jq -r '.plugin[0].tag')
  assert_equals "site-styles/v${SS_NEXT_PATCH}" "$tag"
  
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
  ("$SCRIPT_PATH" "invalid-plugin" "test" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  test_start "requires commit message argument"
  ("$SCRIPT_PATH" "emfn-action-pack-plugin" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  test_summary
}

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required for these tests" >&2
  exit 1
fi

run_tests
