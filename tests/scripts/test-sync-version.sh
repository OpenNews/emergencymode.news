#!/usr/bin/env bash
# Tests for release.yml version bump logic
#
# Tests the commit message parsing and version incrementing logic
# used in .github/workflows/release.yml to ensure [major], [minor],
# and default (patch) bumps work correctly.
#
# These tests use temporary git repositories and do NOT modify real project files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

TEMP_DIR=""

# Replicate the version bump logic from release.yml
calculate_next_version() {
  local latest_tag="$1"
  local commit_message="$2"
  
  # Parse current version using bash regex (no sed needed)
  local MAJOR MINOR PATCH
  if [[ "$latest_tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
  else
    echo "Error: Invalid tag format: $latest_tag" >&2
    return 1
  fi
  
  # Check commit message for version bump signals (same regex as release.yml)
  if echo "$commit_message" | grep -qiE '\[major\]|(^|[^[:alnum:]_])major([^[:alnum:]_]|$)'; then
    # Major bump: x.0.0
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
  elif echo "$commit_message" | grep -qiE '\[minor\]|(^|[^[:alnum:]_])minor([^[:alnum:]_]|$)'; then
    # Minor bump: x.y.0
    MINOR=$((MINOR + 1))
    PATCH=0
  else
    # Default: patch bump x.y.z
    PATCH=$((PATCH + 1))
  fi
  
  echo "v${MAJOR}.${MINOR}.${PATCH}"
}

setup() {
  TEMP_DIR="$(mktemp -d)"
  cd "$TEMP_DIR"
  
  # Initialize a git repository for tag testing
  git init -q
  git config user.name "Test User"
  git config user.email "test@example.com"
  
  # Create initial commit
  echo "test" > README.md
  git add README.md
  git commit -q -m "Initial commit"
}

teardown() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}

run_tests() {
  echo "Testing release.yml version bump logic"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Test 1: Patch bump (default, no keywords)
  test_start "patch bump: default when no version keyword in commit"
  result=$(calculate_next_version "v1.2.3" "Fix bug in feature")
  assert_equals "v1.2.4" "$result"
  
  # Test 2: Minor bump with [minor] tag
  test_start "minor bump: [minor] tag in commit message"
  result=$(calculate_next_version "v1.2.3" "Add new feature [minor]")
  assert_equals "v1.3.0" "$result"
  
  # Test 3: Major bump with [major] tag
  test_start "major bump: [major] tag in commit message"
  result=$(calculate_next_version "v1.2.3" "Breaking change [major]")
  assert_equals "v2.0.0" "$result"
  
  # Test 4: Minor keyword without brackets (word boundary)
  test_start "minor bump: 'minor' keyword with word boundaries"
  result=$(calculate_next_version "v1.2.3" "This is a minor update")
  assert_equals "v1.3.0" "$result"
  
  # Test 5: Major keyword without brackets (word boundary)
  test_start "major bump: 'major' keyword with word boundaries"
  result=$(calculate_next_version "v1.2.3" "A major refactoring")
  assert_equals "v2.0.0" "$result"
  
  # Test 6: Case insensitivity - [MINOR]
  test_start "minor bump: case insensitive [MINOR]"
  result=$(calculate_next_version "v1.2.3" "Feature update [MINOR]")
  assert_equals "v1.3.0" "$result"
  
  # Test 7: Case insensitivity - [MAJOR]
  test_start "major bump: case insensitive [MAJOR]"
  result=$(calculate_next_version "v1.2.3" "Breaking change [MAJOR]")
  assert_equals "v2.0.0" "$result"
  
  # Test 8: Word with 'minor' substring doesn't trigger (minority)
  test_start "patch bump: 'minority' doesn't trigger minor bump"
  result=$(calculate_next_version "v1.2.3" "Fix minority edge case")
  assert_equals "v1.2.4" "$result"
  
  # Test 9: Word with 'major' substring doesn't trigger (majorette)
  test_start "patch bump: 'majorette' doesn't trigger major bump"
  result=$(calculate_next_version "v1.2.3" "Update majorette config")
  assert_equals "v1.2.4" "$result"
  
  # Test 10: Multiple keywords - [major] takes precedence
  test_start "major bump: [major] takes precedence over [minor]"
  result=$(calculate_next_version "v1.2.3" "Breaking minor change [major] [minor]")
  assert_equals "v2.0.0" "$result"
  
  # Test 11: [skip ci] in message doesn't affect version bump
  test_start "patch bump: [skip ci] doesn't affect version logic"
  result=$(calculate_next_version "v1.2.3" "Fix typo [skip ci]")
  assert_equals "v1.2.4" "$result"
  
  # Test 12: [skip ci] with [minor]
  test_start "minor bump: [skip ci] combined with [minor]"
  result=$(calculate_next_version "v1.2.3" "Add feature [minor] [skip ci]")
  assert_equals "v1.3.0" "$result"
  
  # Test 13: Starting from 0.0.0
  test_start "patch bump: from 0.0.0"
  result=$(calculate_next_version "v0.0.0" "Initial release")
  assert_equals "v0.0.1" "$result"
  
  # Test 14: Starting from 0.1.0 with major bump
  test_start "major bump: from 0.1.0 to 1.0.0"
  result=$(calculate_next_version "v0.1.0" "Breaking change [major]")
  assert_equals "v1.0.0" "$result"
  
  # Test 15: Large version numbers
  test_start "minor bump: handles large version numbers"
  result=$(calculate_next_version "v10.25.99" "Feature [minor]")
  assert_equals "v10.26.0" "$result"
  
  # Test 16: Check skip ci detection (used in release.yml conditional)
  test_start "skip ci detection: finds [skip ci] in message"
  if echo "Fix typo [skip ci]" | grep -q "\[skip ci\]"; then
    assert_success
  else
    assert_failure
  fi
  
  # Test 17: Check skip ci detection (case insensitive, per release.yml)
  test_start "skip ci detection: case sensitivity check"
  if echo "Fix typo [skip ci]" | grep -qi "\[skip ci\]"; then
    assert_success
  else
    assert_failure
  fi
  
  # Test 18: Tag filtering (release.yml uses strict x.y.z format)
  test_start "tag filtering: strict semver format only"
  setup
  git tag v1.0.0
  git tag v1.0.1-beta
  git tag v1.0.2
  git tag v2.0.0-alpha
  
  # This mimics release.yml's tag filtering logic
  LATEST=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1)
  assert_equals "v1.0.2" "$LATEST"
  teardown
  
  # Test 19: No tags exist (workflow uses default 0.1.0)
  test_start "no tags: empty tag list"
  setup
  LATEST=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 || echo "")
  assert_equals "" "$LATEST"
  teardown
  
  # Test 20: Version with tag already exists (release.yml checks this)
  test_start "tag existence: detect duplicate tag"
  setup
  git tag v1.0.0
  if git rev-parse v1.0.0 >/dev/null 2>&1; then
    assert_success
  else
    assert_failure
  fi
  teardown
}

# Run the tests
run_tests

# Print summary and exit with appropriate code
test_summary
