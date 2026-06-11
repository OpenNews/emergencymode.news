# Script Tests

Bash-based tests for build and release automation scripts.

## Test Status

**Total: 65 tests passing**

- ✅ [test-build-assets.sh](test-build-assets.sh) — 18/18 tests passing
- ✅ [test-detect-changes.sh](test-detect-changes.sh) — 3/3 tests passing
- ✅ [test-get-plugin-version.sh](test-get-plugin-version.sh) — 4/4 tests passing
- ✅ [test-sync-version.sh](test-sync-version.sh) — 20/20 tests passing
- ✅ [test-version-bump.sh](test-version-bump.sh) — 22/22 tests passing

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
- `assert_matches(actual, pattern)` — Assert regex pattern match
- `assert_empty(actual)` — Assert string is empty
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

Tests the version bump logic used in GitHub Actions release workflow.

**What it tests:**
- Initial version (1.0.0) when no tags exist
- Patch bumps (default) for bug fixes and updates
- Minor bumps with `[minor]` tag or `minor` keyword
- Major bumps with `[major]` tag or `major` keyword
- Version parsing with suffixes (-rc, -beta)
- Case-insensitive keyword detection
- Word boundary detection (ignores "minority", "majordomo")

**Implementation:** Extracts version calculation logic from workflow into testable bash function.

### test-build-assets.sh (18 tests)

Tests [scripts/build-release-assets.sh](../../scripts/build-release-assets.sh) which creates plugin ZIP files for releases.

**What it tests:**
- Argument validation (version format, required args)
- Output directory creation
- ZIP file creation with correct naming
- ZIP content validation (plugin files included)
- Directory structure preservation
- Output directory cleaning
- `--plugin` flag for single-plugin builds
- Plugin name validation

**Implementation:** Creates temporary directories, runs build script, validates outputs, cleans up.

### test-sync-version.sh (20 tests)

Tests [scripts/sync-release-version.sh](../../scripts/sync-release-version.sh) which updates version numbers across plugin files.

**What it tests:**
- Version updates in plugin PHP files
- Version updates in readme.txt
- Constant updates (EMFN_ACTION_PACK_PLUGIN_VERSION, etc.)
- `--plugin` flag for single-plugin updates
- Major/minor/patch version handling
- Skip CI tag detection

**Implementation:** Uses temporary git repositories for isolated testing.

### test-detect-changes.sh (3 tests)

Tests [scripts/detect-plugin-changes.sh](../../scripts/detect-plugin-changes.sh) which detects which plugins have changed.

**What it tests:**
- Script exists and is executable
- Detects plugin changes between git refs
- Rejects invalid git references

**Implementation:** Tests against HEAD to ensure test reliability in all environments.

### test-get-plugin-version.sh (4 tests)

Tests [scripts/get-plugin-version.sh](../../scripts/get-plugin-version.sh) which extracts version from plugin files.

**What it tests:**
- Extracts version from action-pack plugin
- Extracts version from site-styles plugin
- Rejects invalid plugin names
- Requires plugin name argument

**Implementation:** Reads actual plugin files to verify version extraction.

## Coverage

Bash script testing provides regression protection for:
- ✅ Version bump calculations matching GitHub Actions workflow behavior
- ✅ Build script ZIP creation and file inclusion
- ✅ Version synchronization across project files
- ✅ Plugin change detection
- ✅ Version extraction from plugin headers

## CI Integration

These tests run in CI on every PR and commit:
- No database required
- No WordPress installation needed
- No network requests
- Fast execution (<15 seconds total)
- Integrated in `.github/workflows/ci.yml`
