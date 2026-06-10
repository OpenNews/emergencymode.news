#!/usr/bin/env bash
# Tests for scripts/build-release-assets.sh
# Note: build script expects relative paths, not absolute paths

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_SCRIPT="$REPO_ROOT/scripts/build-release-assets.sh"

run_tests() {
  echo "Testing scripts/build-release-assets.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Test 1: Missing arguments
  test_start "rejects missing arguments"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  # Test 2: Missing output directory argument
  test_start "rejects missing output directory argument"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" "1.0.0" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  # Test 3: Invalid version format (too few parts)
  test_start "rejects invalid version format (1.0)"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" "1.0" "dist" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  # Test 4: Invalid version format (with letters)
  test_start "rejects version with letters"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" "1.0.0-beta" "dist" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  # Test 5: Valid build creates output directory
  test_start "creates output directory"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "1.0.0" "$test_dir" >/dev/null 2>&1)
  [[ -d "$REPO_ROOT/$test_dir" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 6: Valid build creates ZIP file
  test_start "creates plugin ZIP file"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "1.2.3" "$test_dir" >/dev/null 2>&1)
  assert_file_exists "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-1.2.3.zip"
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 7: ZIP contains plugin files
  test_start "ZIP contains plugin PHP file"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "2.0.0" "$test_dir" >/dev/null 2>&1)
  
  # Extract and check contents
  local extract_dir="$REPO_ROOT/$test_dir/extract"
  mkdir -p "$extract_dir"
  unzip -q "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-2.0.0.zip" -d "$extract_dir"
  [[ -f "$extract_dir/emfn-action-pack-plugin/emfn-action-pack-plugin.php" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 8: ZIP preserves directory structure
  test_start "ZIP preserves directory structure"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "2.1.0" "$test_dir" >/dev/null 2>&1)
  
  local extract_dir="$REPO_ROOT/$test_dir/extract"
  mkdir -p "$extract_dir"
  unzip -q "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-2.1.0.zip" -d "$extract_dir"
  [[ -d "$extract_dir/emfn-action-pack-plugin/assets" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 9: Cleans existing output directory
  test_start "cleans existing output directory"
  local test_dir="test-dist-$$"
  mkdir -p "$REPO_ROOT/$test_dir"
  echo "old file" > "$REPO_ROOT/$test_dir/old.txt"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" "3.0.0" "$test_dir" >/dev/null 2>&1)
  [[ ! -f "$REPO_ROOT/$test_dir/old.txt" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 10: Version in filename matches argument
  test_start "version in filename matches argument"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "5.6.7" "$test_dir" >/dev/null 2>&1)
  [[ -f "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-5.6.7.zip" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 11: ZIP is not empty
  test_start "ZIP file is not empty"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" "1.0.0" "$test_dir" >/dev/null 2>&1)
  
  # Check that ZIP has content (size > 1000 bytes)
  local size
  size=$(stat -c%s "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-1.0.0.zip" 2>/dev/null)
  [[ $size -gt 1000 ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 12: Can use nested output path
  test_start "creates nested output directories"
  local test_dir="test-build-$$/output/nested"
  (cd "$REPO_ROOT" && rm -rf "test-build-$$" && "$BUILD_SCRIPT" "1.0.0" "$test_dir" >/dev/null 2>&1)
  [[ -d "$REPO_ROOT/$test_dir" ]]
  assert_success
  rm -rf "$REPO_ROOT/test-build-$$"
  
  # Test 13: --plugin flag builds single plugin
  test_start "--plugin flag builds only specified plugin"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" --plugin emfn-action-pack-plugin "1.0.0" "$test_dir" >/dev/null 2>&1)
  assert_file_exists "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-1.0.0.zip"
  [[ ! -f "$REPO_ROOT/$test_dir/emfn-site-styles-plugin-1.0.0.zip" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 14: --plugin flag with site-styles plugin
  test_start "--plugin flag works with site-styles plugin"
  local test_dir="test-dist-$$"
  (cd "$REPO_ROOT" && rm -rf "$test_dir" && "$BUILD_SCRIPT" --plugin emfn-site-styles-plugin "2.0.0" "$test_dir" >/dev/null 2>&1)
  assert_file_exists "$REPO_ROOT/$test_dir/emfn-site-styles-plugin-2.0.0.zip"
  [[ ! -f "$REPO_ROOT/$test_dir/emfn-action-pack-plugin-2.0.0.zip" ]]
  assert_success
  rm -rf "${REPO_ROOT:?}/$test_dir"
  
  # Test 15: --plugin flag rejects invalid plugin
  test_start "--plugin flag rejects invalid plugin name"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" --plugin nonexistent-plugin "1.0.0" "dist" 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
  
  # Test 16: --plugin flag requires plugin name argument
  test_start "--plugin flag requires plugin name"
  (cd "$REPO_ROOT" && "$BUILD_SCRIPT" --plugin 2>/dev/null) && exit_code=$? || exit_code=$?
  [[ $exit_code -ne 0 ]]
  assert_success
}

# Run the tests
run_tests

# Print summary and exit with appropriate code
test_summary
