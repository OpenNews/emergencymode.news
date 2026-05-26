#!/usr/bin/env bash
# Bash test framework helpers

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CURRENT_TEST_NAME=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
# shellcheck disable=SC2034
YELLOW='\033[1;33m'  # Reserved for future use
NC='\033[0m' # No Color

# Start a test
test_start() {
  CURRENT_TEST_NAME="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
}

# Assert that a command succeeds
assert_success() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected: success (exit code 0)"
    echo "  Got: failure (exit code $exit_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Assert that a command fails
assert_failure() {
  if [[ $? -ne 0 ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected: failure (non-zero exit code)"
    echo "  Got: success (exit code 0)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Assert that two strings are equal
assert_equals() {
  local expected="$1"
  local actual="$2"
  
  if [[ "$expected" == "$actual" ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected: '$expected'"
    echo "  Got:      '$actual'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Assert that a string contains a substring
assert_contains() {
  local haystack="$1"
  local needle="$2"
  
  if [[ "$haystack" == *"$needle"* ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected to contain: '$needle'"
    echo "  In:                  '$haystack'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Assert that a file exists
assert_file_exists() {
  local file="$1"
  
  if [[ -f "$file" ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected file to exist: $file"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Assert that a file does not exist
assert_file_not_exists() {
  local file="$1"
  
  if [[ ! -f "$file" ]]; then
    echo -e "${GREEN}✓${NC} ${CURRENT_TEST_NAME}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} ${CURRENT_TEST_NAME}"
    echo "  Expected file to not exist: $file"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Print test summary
test_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Test Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Tests run:    $TESTS_RUN"
  echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
  
  if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    return 1
  else
    echo -e "Tests failed: $TESTS_FAILED"
    return 0
  fi
}
