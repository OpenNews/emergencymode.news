#!/usr/bin/env bash
# Tests for version bump logic (used in GitHub Actions workflow)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/test-helpers.sh"

# Implement the version bump logic that's used in the workflow
calculate_version() {
  local LATEST="$1"
  local COMMIT_MSG="$2"
  
  if [[ -z "$LATEST" || "$LATEST" == "~EMPTY~" ]]; then
    echo "1.0.0"
    return 0
  fi
  
  # Parse version (strip everything after the digits to handle any suffixes)
  local version_stripped="${LATEST#v}"  # Remove v prefix
  local MAJOR MINOR PATCH
  MAJOR="${version_stripped%%.*}"
  version_stripped="${version_stripped#*.}"
  MINOR="${version_stripped%%.*}"
  PATCH="${version_stripped#*.}"
  PATCH="${PATCH%%[^0-9]*}"  # Strip any non-numeric suffix
  
  if ! [[ "$MAJOR" =~ ^[0-9]+$ && "$MINOR" =~ ^[0-9]+$ && "$PATCH" =~ ^[0-9]+$ ]]; then
    echo "ERROR" >&2
    return 1
  fi
  
  if echo "$COMMIT_MSG" | grep -qiE '\[major\]|(^|[^[:alnum:]_])major([^[:alnum:]_]|$)'; then
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
  elif echo "$COMMIT_MSG" | grep -qiE '\[minor\]|(^|[^[:alnum:]_])minor([^[:alnum:]_]|$)'; then
    MINOR=$((MINOR + 1))
    PATCH=0
  else
    PATCH=$((PATCH + 1))
  fi
  
  echo "${MAJOR}.${MINOR}.${PATCH}"
}

run_tests() {
  echo "Testing Version Bump Logic (GitHub Actions workflow)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Test: Starting from no tags
  test_start "initial version when no tags exist"
  version=$(calculate_version "~EMPTY~" "First commit")
  assert_equals "1.0.0" "$version"
  
  # Test: Patch bumps (default)
  test_start "patch bump for bug fix"
  version=$(calculate_version "v1.0.0" "Fix bug in data processing")
  assert_equals "1.0.1" "$version"
  
  test_start "patch bump for dependency update"
  version=$(calculate_version "v1.2.5" "Update dependencies")
  assert_equals "1.2.6" "$version"
  
  test_start "patch bump for refactor"
  version=$(calculate_version "v2.3.10" "Refactor utility functions")
  assert_equals "2.3.11" "$version"
  
  # Test: Minor bumps (explicit with [minor])
  test_start "minor bump with [minor] tag"
  version=$(calculate_version "v1.0.0" "[minor] Add new export feature")
  assert_equals "1.1.0" "$version"
  
  test_start "minor bump with 'minor' keyword"
  version=$(calculate_version "v1.5.9" "Add minor analytics tracking")
  assert_equals "1.6.0" "$version"
  
  test_start "minor bump with 'minor' in sentence"
  version=$(calculate_version "v2.3.5" "This is a minor update to the API")
  assert_equals "2.4.0" "$version"
  
  # Test: Major bumps (explicit with [major])
  test_start "major bump with [major] tag"
  version=$(calculate_version "v1.0.0" "[major] Breaking API changes")
  assert_equals "2.0.0" "$version"
  
  test_start "major bump with 'major' keyword"
  version=$(calculate_version "v1.9.15" "major refactor of data model")
  assert_equals "2.0.0" "$version"
  
  test_start "major bump with 'MAJOR:' prefix"
  version=$(calculate_version "v5.2.8" "MAJOR: Complete rewrite")
  assert_equals "6.0.0" "$version"
  
  # Test: Tags with suffixes
  test_start "handles version tags with suffixes (rc)"
  version=$(calculate_version "v1.2.3-rc1" "Fix bug")
  assert_equals "1.2.4" "$version"
  
  test_start "handles version tags with suffixes (beta)"
  version=$(calculate_version "v2.0.0-beta" "[minor] New feature")
  assert_equals "2.1.0" "$version"
  
  # Test: Edge cases
  test_start "patch resets when minor bumps"
  version=$(calculate_version "v1.5.9" "[minor] Feature")
  assert_equals "1.6.0" "$version"
  
  test_start "minor and patch reset when major bumps"
  version=$(calculate_version "v1.9.15" "[major] Breaking change")
  assert_equals "2.0.0" "$version"
  
  test_start "handles double-digit version numbers"
  version=$(calculate_version "v12.34.56" "Fix")
  assert_equals "12.34.57" "$version"
  
  test_start "handles version starting with zeros"
  version=$(calculate_version "v0.0.1" "Patch")
  assert_equals "0.0.2" "$version"
  
  test_start "minor bump from 0.x works correctly"
  version=$(calculate_version "v0.5.3" "[minor] Feature")
  assert_equals "0.6.0" "$version"
  
  test_start "major bump from 0.x works correctly"
  version=$(calculate_version "v0.9.5" "[major] Breaking change")
  assert_equals "1.0.0" "$version"
  
  # Test: Case insensitivity
  test_start "detects MINOR in uppercase"
  version=$(calculate_version "v1.0.0" "Add MINOR feature")
  assert_equals "1.1.0" "$version"
  
  test_start "detects Major in mixed case"
  version=$(calculate_version "v1.0.0" "Major refactor needed")
  assert_equals "2.0.0" "$version"
  
  # Test: Keyword must be a separate word (not part of another word)
  test_start "ignores 'minor' in 'minority'"
  version=$(calculate_version "v1.0.0" "Fix minority report bug")
  assert_equals "1.0.1" "$version"
  
  test_start "ignores 'major' in 'majordomo'"
  version=$(calculate_version "v1.0.0" "Update majordomo service")
  assert_equals "1.0.1" "$version"
}

# Run the tests
run_tests

# Print summary and exit with appropriate code
test_summary
