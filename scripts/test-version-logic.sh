#!/bin/bash
# Test script to prove commit-message-driven version bumping works correctly

set -o pipefail

echo "=== Testing Version Bump Logic ==="
echo ""

run_test() {
  local LATEST="$1"
  local COMMIT_MSG="$2"
  local EXPECTED="$3"
  
  # Implement the same logic as the workflow
  if [[ -z "$LATEST" || "$LATEST" == "~EMPTY~" ]]; then
    VERSION="1.0.0"
    BUMP_TYPE="initial"
  else
    # Parse version (strip everything after the digits to handle any suffixes)
    MAJOR=$(echo "$LATEST" | sed 's/v\([0-9]*\)\..*/\1/')
    MINOR=$(echo "$LATEST" | sed 's/v[0-9]*\.\([0-9]*\)\..*/\1/')
    PATCH=$(echo "$LATEST" | sed 's/v[0-9]*\.[0-9]*\.\([0-9]*\).*/\1/')
    
    if ! [[ "$MAJOR" =~ ^[0-9]+$ && "$MINOR" =~ ^[0-9]+$ && "$PATCH" =~ ^[0-9]+$ ]]; then
      printf "✗ FAIL: %8s + '%-40s' → Invalid version tag format\n" "$LATEST" "${COMMIT_MSG:0:40}"
      return 1
    fi
    
    if echo "$COMMIT_MSG" | grep -qiE '\[major\]|(^|[^[:alnum:]_])major([^[:alnum:]_]|$)'; then
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      BUMP_TYPE="major"
    elif echo "$COMMIT_MSG" | grep -qiE '\[minor\]|(^|[^[:alnum:]_])minor([^[:alnum:]_]|$)'; then
      MINOR=$((MINOR + 1))
      PATCH=0
      BUMP_TYPE="minor"
    else
      PATCH=$((PATCH + 1))
      BUMP_TYPE="patch"
    fi
    
    VERSION="${MAJOR}.${MINOR}.${PATCH}"
  fi
  
  # Check if it matches expected
  if [[ "$VERSION" == "$EXPECTED" ]]; then
    printf "✓ PASS [%-7s]: %8s + '%-40s' → v%s\n" "$BUMP_TYPE" "$LATEST" "${COMMIT_MSG:0:40}" "$VERSION"
    return 0
  else
    printf "✗ FAIL: %8s + '%-40s' → Expected v%s, got v%s\n" "$LATEST" "${COMMIT_MSG:0:40}" "$EXPECTED" "$VERSION"
    return 1
  fi
}

failed=0
passed=0

# Test: Starting from no tags
if run_test "~EMPTY~" "First commit" "1.0.0"; then ((passed++)); else ((failed++)); fi

# Test: Patch bumps (default)
if run_test "v1.0.0" "Fix bug in data processing" "1.0.1"; then ((passed++)); else ((failed++)); fi
if run_test "v1.2.5" "Update dependencies" "1.2.6"; then ((passed++)); else ((failed++)); fi
if run_test "v2.3.10" "Refactor utility functions" "2.3.11"; then ((passed++)); else ((failed++)); fi

# Test: Minor bumps (explicit)
if run_test "v1.0.0" "[minor] Add new export feature" "1.1.0"; then ((passed++)); else ((failed++)); fi
if run_test "v1.5.9" "Add minor analytics tracking" "1.6.0"; then ((passed++)); else ((failed++)); fi
if run_test "v2.3.5" "This is a minor update to the API" "2.4.0"; then ((passed++)); else ((failed++)); fi

# Test: Major bumps (explicit)
if run_test "v1.0.0" "[major] Breaking API changes" "2.0.0"; then ((passed++)); else ((failed++)); fi
if run_test "v1.9.15" "major refactor of data model" "2.0.0"; then ((passed++)); else ((failed++)); fi
if run_test "v5.2.8" "MAJOR: Complete rewrite" "6.0.0"; then ((passed++)); else ((failed++)); fi

# Test: Tags with suffixes (ensure they parse correctly)
if run_test "v1.2.3-rc1" "Fix bug" "1.2.4"; then ((passed++)); else ((failed++)); fi
if run_test "v2.0.0-beta" "[minor] New feature" "2.1.0"; then ((passed++)); else ((failed++)); fi

echo ""
echo "=== Results ==="
echo "Passed: $passed"
echo "Failed: $failed"

if [[ $failed -gt 0 ]]; then
  exit 1
fi

echo ""
echo "✓ All tests passed! Version bump logic is correct."
