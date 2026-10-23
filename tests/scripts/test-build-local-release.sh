#!/usr/bin/env bash
# Tests for scripts/build-local-release.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_SCRIPT="$REPO_ROOT/scripts/build-local-release.sh"

OUT_DIR="$(mktemp -d)"
trap 'rm -rf "$OUT_DIR"' EXIT
export RELEASE_DIR="$OUT_DIR"

# What a merge to main would release: the release workflow's own matrix script
next_version() {
  "$REPO_ROOT/scripts/generate-version-matrix.sh" "$1" "$2" |
    sed -E 's/.*"next_version":"([^"]+)".*/\1/'
}

echo "Testing scripts/build-local-release.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_start "rejects missing plugin name"
("$BUILD_SCRIPT" 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

test_start "rejects unknown plugin"
("$BUILD_SCRIPT" emfn-nope-plugin 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

test_start "rejects an unknown bump type"
("$BUILD_SCRIPT" emfn-site-styles-plugin 0.4.1 2>/dev/null) && exit_code=$? || exit_code=$?
[[ $exit_code -ne 0 ]]
assert_success

for plugin in emfn-site-styles-plugin emfn-action-pack-plugin; do
  php_file="plugins/$plugin/$plugin.php"
  constant="$(echo "$plugin" | tr '[:lower:]-' '[:upper:]_')_VERSION"
  before_php="$(cat "$REPO_ROOT/$php_file")"
  before_readme="$(cat "$REPO_ROOT/plugins/$plugin/readme.txt")"
  expected="$(next_version "$plugin" "").alpha"

  "$BUILD_SCRIPT" "$plugin" 2>/dev/null
  zip_file="$OUT_DIR/$plugin-$expected.zip"

  test_start "$plugin: builds the next merge version + .alpha ($expected)"
  assert_file_exists "$zip_file"

  test_start "$plugin: ZIP has the plugin folder at the top level"
  first_entry="$(unzip -Z1 "$zip_file" | awk 'NR == 1')"
  assert_equals "$plugin/" "$first_entry"

  zipped_php="$(unzip -p "$zip_file" "$plugin/$plugin.php")"

  test_start "$plugin: sets the Version header"
  assert_contains "$zipped_php" "* Version:           $expected"

  test_start "$plugin: sets $constant"
  assert_contains "$zipped_php" "define( '$constant', '$expected' );"

  test_start "$plugin: sets readme Stable tag"
  assert_contains "$(unzip -p "$zip_file" "$plugin/readme.txt")" "Stable tag:         $expected"

  test_start "$plugin: leaves the repo's plugin files unchanged"
  [[ "$before_php" == "$(cat "$REPO_ROOT/$php_file")" && "$before_readme" == "$(cat "$REPO_ROOT/plugins/$plugin/readme.txt")" ]]
  assert_success
done

for bump in minor major; do
  expected="$(next_version emfn-site-styles-plugin "[$bump]").alpha"
  test_start "$bump bump matches a [$bump] merge ($expected)"
  "$BUILD_SCRIPT" emfn-site-styles-plugin "$bump" 2>/dev/null
  assert_file_exists "$OUT_DIR/emfn-site-styles-plugin-$expected.zip"
done

test_start "rebuilding replaces the ZIP instead of adding another"
patch_zip="$OUT_DIR/emfn-site-styles-plugin-$(next_version emfn-site-styles-plugin "").alpha.zip"
before_count="$(find "$OUT_DIR" -name 'emfn-site-styles-plugin-*.zip' | wc -l | tr -d ' ')"
"$BUILD_SCRIPT" emfn-site-styles-plugin 2>/dev/null
after_count="$(find "$OUT_DIR" -name 'emfn-site-styles-plugin-*.zip' | wc -l | tr -d ' ')"
[[ -f "$patch_zip" && "$before_count" == "$after_count" ]]
assert_success

test_summary
