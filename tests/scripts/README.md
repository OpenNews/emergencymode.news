# Script Tests

Bash-based tests for build and release automation scripts.

## Test Status

**Total: 34 tests passing** (22 version-bump + 12 build-assets)

- ✅ [test-version-bump.sh](test-version-bump.sh) — 22/22 tests passing
- ✅ [test-build-assets.sh](test-build-assets.sh) — 12/12 tests passing
- ⚠️ [test-sync-version.sh](test-sync-version.sh) — Needs refactoring (see Known Issues)

## Running Tests

```bash
# Via npm (recommended)
npm run test:scripts

# Run individual test files directly
./tests/scripts/test-version-bump.sh
./tests/scripts/test-build-assets.sh

# Run all tests manually
for test in tests/scripts/test-*.sh; do
  [ "$(basename $test)" != "test-helpers.sh" ] && $test
done
```

## Test Framework

Tests use a custom bash testing framework defined in [test-helpers.sh](test-helpers.sh):

### Available Assertions

- `test_start(name)` — Start a new test
- `assert_success()` — Assert last command succeeded (exit 0)
- `assert_failure()` — Assert last command failed (non-zero exit)
- `assert_equals(expected, actual)` — Assert string equality
- `assert_contains(haystack, needle)` — Assert substring presence
- `assert_file_exists(path)` — Assert file exists
- `assert_file_not_exists(path)` — Assert file does not exist
- `test_summary()` — Print results and return exit code

### Example Test

```bash
#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh"

run_tests() {
  echo "Testing my-script.sh"
  
  test_start "handles valid input"
  my-script.sh --valid-arg
  assert_success
  
  test_start "rejects invalid input"
  my-script.sh --invalid-arg 2>/dev/null || true
  assert_failure
  
  test_start "produces expected output"
  result=$(my-script.sh --output)
  assert_equals "expected" "$result"
}

run_tests
test_summary
```

## Test Suites

### test-version-bump.sh (22 tests)

Tests the version bump logic used in GitHub Actions workflows ([.github/workflows/publish-plugin.yml](../../.github/workflows/publish-plugin.yml)).

**What it tests:**
- Initial version (1.0.0) when no tags exist
- Patch bumps (default) for bug fixes and updates
- Minor bumps with `[minor]` tag or `minor` keyword
- Major bumps with `[major]` tag or `major` keyword
- Version parsing with suffixes (-rc, -beta)
- Case-insensitive keyword detection
- Word boundary detection (ignores "minority", "majordomo")

**Implementation:** Extracts the version calculation logic from the workflow into a testable bash function.

### test-build-assets.sh (12 tests)

Tests [scripts/build-release-assets.sh](../../scripts/build-release-assets.sh) which creates plugin ZIP files for releases.

**What it tests:**
- Argument validation (version format, required args)
- Output directory creation
- ZIP file creation with correct naming
- ZIP content validation (plugin files included)
- Directory structure preservation
- Output directory cleaning
- Nested output path handling

**Implementation:** Creates temporary directories, runs build script, validates outputs, cleans up.

### test-sync-version.sh (Known Issues)

**Status:** ⚠️ Tests exist but have implementation issues

**Problem:** The sync-release-version.sh script has `cd "$repo_root"` hardcoded, which means it always operates on the actual repository files rather than test fixtures in temp directories. This makes isolated testing impossible.

**Needs:**
- Refactor sync-release-version.sh to accept a working directory parameter
- OR: Mock/stub the script for testing
- OR: Test via integration tests that accept modifying actual repo files

**Workaround:** Script is manually tested and works in production. Automated tests deferred until refactoring.

## Coverage

Bash script testing provides regression protection for:
- ✅ Version bump calculations matching GitHub Actions workflow behavior
- ✅ Build script ZIP creation and file inclusion
- ⚠️ Version synchronization across project files (manual testing only)

## CI Integration

These tests can run in CI without external dependencies:
- No database required
- No WordPress installation needed
- No network requests
- Fast execution (<10 seconds total)
- No cleanup required (temp directories auto-removed)

**Future:** Add to GitHub Actions workflow for PR validation.
