# Testing Plan for emergencymode.news

## Overview

**Status: Core Infrastructure Implemented ✅**

Testing strategy for WordPress plugins, release automation, and data analysis notebooks. Core testing infrastructure is complete: PHP unit tests, JavaScript tests, shell script tests, and CI integration. E2E and notebook cleanup tests are planned for future implementation.

**Currently Implemented:**
- ✅ PHP unit tests (PHPUnit) for Action Pack payload decoding
- ✅ JavaScript unit tests (Jest) for payload encoding and risk rendering
- ✅ Shell script tests for version sync and build automation
- ✅ Pre-commit hooks (prettier, eslint, shellcheck, notebooks)
- ✅ Coverage reporting (Jest, PHPUnit with Xdebug)
- ✅ CI workflow for PRs and commits (lint + all tests)
- ✅ Release workflow with automated testing and version bumps

**Future Work:**
- ⏳ End-to-end browser tests (Playwright)
- ⏳ Notebook script-cleanup tests (strip/check validation)
- ⏳ WordPress integration tests with real database

## Directory Structure

**Current Implementation:**

```
tests/
├── TESTING_PLAN.md              # This file
├── README.md                    # Quick start guide
├── fixtures/                    # ✅ Test data
│   ├── location-test-data.json
│   ├── payload-test-cases.json
│   └── test-categories.csv
├── js/                          # ✅ JavaScript unit tests (Jest)
│   ├── README.md
│   ├── setup.js                 # Test environment configuration
│   ├── action-pack/
│   │   ├── payload-encoding.test.js
│   │   └── risk-rendering.test.js
│   └── lib/                     # Shared test utilities
│       ├── payload-encoding.js
│       └── risk-rendering.js
├── php/                         # ✅ PHP unit tests (PHPUnit)
│   ├── README.md
│   ├── bootstrap.php            # WordPress stubs and test setup
│   └── action-pack/
│       └── PayloadDecodingTest.php
└── scripts/                     # ✅ Shell script tests
    ├── README.md
    ├── test-helpers.sh          # Test framework functions
    ├── test-build-assets.sh     # Build script validation
    ├── test-sync-version.sh     # Version bump logic tests (20 tests)
    └── test-version-bump.sh     # Version bump integration tests
```

**Future Additions:**

```
tests/
├── e2e/                         # ⏳ End-to-end browser tests (Playwright)
│   ├── playwright.config.js
│   ├── action-pack/
│   │   ├── form-flow.spec.js
│   │   ├── geolocation.spec.js
│   │   ├── risk-display.spec.js
│   │   └── share-url.spec.js
│   └── fixtures/
│       └── test-csv-data/
└── notebooks/                   # ⏳ Notebook verification
    └── test-reproducibility.py
```

## Test Categories

### 1. PHP Unit Tests (PHPUnit) ✅ **IMPLEMENTED**

**Current Implementation:**

**PayloadDecodingTest.php** — 15 tests, 26 assertions
- ✅ Decodes single category at position zero
- ✅ Decodes multiple categories from single segment
- ✅ Decodes categories across multiple segments
- ✅ Handles malformed payloads gracefully
- ✅ Round-trip encoding/decoding validation
- ✅ Category order preservation by manualRank
- ✅ Base36 decoding validation
- ✅ Tests actual production plugin class (not test doubles)

**Setup:**
- WordPress function stubs in `bootstrap.php`
- PHPUnit 10.5 with strict mode (`phpunit.xml` schema 10.5, `composer.json` ^10.5)
- Xdebug 3.5.1 for coverage collection
- Test extends production class via inheritance for protected method access

**Future Expansion:**

The following tests are planned but not yet implemented:

**test-category-mapping.php** (future)
- Load `_tallCategories.csv` correctly
- Map answerID to category names
- Handle missing CSV entries
- Verify manualRank ordering
- Test CSV caching

**test-query-loop-filter.php** (future)
- Apply category filters to Query Loop blocks
- Verify `.emfn-action-pack` class detection
- Test multiple categories in query
- Handle blocks without the target class
- Test with various block attributes

**test-plugin-init.php** (future)
- Plugin activates without errors
- Constants defined correctly
- Scripts/styles enqueued on appropriate pages
- Localized data includes correct CSV URL
- Version constant matches header

### 2. JavaScript Unit Tests (Jest) ✅ **IMPLEMENTED**

**Current Implementation:**

**payload-encoding.test.js** — 13 tests
- ✅ Encodes single category to ap2 format
- ✅ Encodes multiple categories in rank order
- ✅ Splits into multiple segments when needed
- ✅ Handles empty category lists
- ✅ Preserves category order by manualRank
- ✅ Base36 encoding validation
- ✅ Round-trip with PHP decoder compatibility

**risk-rendering.test.js** — 9 tests
- ✅ Parses county FIPS from location data
- ✅ Filters hazards by risk threshold
- ✅ Renders hazard labels correctly
- ✅ Handles missing risk data gracefully
- ✅ Maps FEMA hazard codes to labels

**Setup:**
- Jest 29.7.0 with jsdom environment
- Shared test utilities in `tests/js/lib/`
- Test fixtures with realistic payload cases
- Coverage tracking enabled

**Future Expansion:**

**csv-parsing.test.js** (future)
```javascript
describe('CSV Data Parsing', () => {
  test('parses _tallCategories.csv correctly')
  test('parses state CSV files for risk data')
  test('handles missing columns gracefully')
  test('caches parsed results')
})
```

**geolocation.test.js** (future)
```javascript
describe('Geolocation Resolution', () => {
  test('extracts lat/lng from Google Places')
  test('calls FCC API with coordinates')
  test('parses county FIPS from FCC response')
  test('handles API errors gracefully')
  test('respects rate limits')
})
```

### 3. Shell Script Tests ✅ **IMPLEMENTED**

**Current Implementation:**

**test-helpers.sh** — Test framework
- ✅ Assertion functions (assert_success, assert_failure, assert_equals, assert_contains)
- ✅ Test result tracking and reporting
- ✅ Colored output for pass/fail

**test-build-assets.sh** — Build validation
- ✅ Verifies plugin ZIP creation
- ✅ Validates ZIP contains required files
- ✅ Checks ZIP excludes development files
- ✅ All shellcheck warnings fixed

**test-sync-version.sh** — Version bump logic
- ✅ Tests major/minor/patch version increment detection (20 tests)
- ✅ Validates commit message keyword matching
- ✅ Tests skip ci detection and tag filtering
- ✅ Uses temporary git repositories (safe for CI)
- ✅ Bash regex parsing (no sed dependencies)

**test-version-bump.sh** — Version bump integration
- ✅ Tests version bump workflow integration
- ✅ Validates semantic versioning rules

**Running Script Tests:**
```bash
npm run test:scripts  # Runs all enabled script tests
```

### 4. End-to-End Tests (Playwright) ⏳ **PLANNED**

**Setup Requirements:**
- Playwright
- Local WordPress test instance with plugins
- Test Gravity Form configured
- Mock Google Places API (or real key for integration tests)

**form-flow.spec.js** (future)
```javascript
test('complete form submission flow', async ({ page }) => {
  // Navigate to form
  // Select answers from .hashable fieldsets
  // Verify encoded payload in hidden input
  // Submit form
  // Verify redirect with actionPack parameter
})
```

**geolocation.spec.js** (future)
```javascript
test('geolocation and risk display', async ({ page }) => {
  // Enter address in autocomplete
  // Wait for Places API response
  // Verify FCC API call
  // Check risk data displayed
  // Verify sessionStorage updates
})
```

**share-url.spec.js** (future)
```javascript
test('actionPack URL parameter decoding', async ({ page }) => {
  // Visit page with ?actionPack=ap2.xyz
  // Verify Query Loop filtered correctly
  // Check console.debug output
  // Verify category names decoded
})
```

### 5. Notebook Script-Cleanup Tests ⏳ **PLANNED**

**Purpose:** Verify that notebook cleanup scripts work correctly to keep notebooks version-control friendly by stripping outputs before commits.

**Active Notebook:** The workspace contains data analysis notebooks (US/CA-MX disaster risk analysis) that include their own validation logic. No notebook execution testing is needed at this time.

**Scripts to Test:**
- `scripts/strip-notebook-outputs.sh` — Removes cell outputs and execution counts from notebooks
- `scripts/check-notebooks-clean.sh` — Validates notebooks have no outputs (pre-commit check)

**test-notebook-scripts.sh** (future)
```bash
#!/usr/bin/env bash
# Tests for notebook cleanup scripts

test_strip_removes_outputs() {
  # Create temp notebook with outputs
  # Run strip-notebook-outputs.sh
  # Verify outputs removed
  # Verify execution_count set to null
  # Verify cell structure preserved
}

test_strip_handles_no_outputs() {
  # Create clean notebook
  # Run strip script
  # Verify notebook unchanged
}

test_check_detects_dirty_notebooks() {
  # Create notebook with outputs
  # Run check-notebooks-clean.sh
  # Verify exits with error
}

test_check_passes_clean_notebooks() {
  # Create clean notebook
  # Run check-notebooks-clean.sh
  # Verify exits successfully
}

test_jq_dependency_check() {
  # Temporarily hide jq from PATH
  # Run scripts
  # Verify helpful error messages
}

test_multiple_notebooks() {
  # Create directory with mix of clean/dirty notebooks
  # Test batch processing
  # Verify correct notebooks flagged
}
```

**Implementation Notes:**
- Scripts use `jq` for JSON manipulation — tests should verify graceful handling when `jq` is missing
- Notebooks are JSON files — tests can create minimal valid notebook structures for testing
- Pre-commit hook integration relies on these scripts — reliability is critical
- Tests should use temp directories to avoid modifying actual notebooks

## Test Data Management

### Fixtures Location ✅ **IMPLEMENTED**
- CSV test data: `tests/fixtures/test-categories.csv`
- Mock API responses: `tests/fixtures/location-test-data.json`
- Payload test cases: `tests/fixtures/payload-test-cases.json`

### Data Generation
- Use real FEMA NRI data subset for realistic testing
- Anonymize any user-submitted form data
- Version control small fixtures, gitignore large datasets

## Future Work ⏳ **FUTURE**

### WordPress Coding Standards

**Setup Requirements:**
- PHP_CodeSniffer
- WordPress Coding Standards ruleset

**Configuration (.phpcs.xml.dist):**
```xml
<?xml version="1.0"?>
<ruleset name="EMFN">
    <description>WordPress coding standards for EMFN plugins</description>
    
    <file>./plugins/</file>
    
    <exclude-pattern>*/node_modules/*</exclude-pattern>
    <exclude-pattern>*/vendor/*</exclude-pattern>
    
    <rule ref="WordPress-Core"/>
    <rule ref="WordPress-Docs"/>
    
    <config name="minimum_supported_wp_version" value="6.3"/>
    <config name="testVersion" value="8.0-"/>
</ruleset>
```

### Package.json Scripts**

**Future Additions (when E2E tests implemented):**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@wordpress/env": "^8.0.0"
  }
}
```

### pyproject.toml Updates

**Future Additions (if needed for notebook script testing):**
```toml
[dependency-groups]
dev = [
    "pre-commit>=4.0.1",
    "pytest>=8.0.0",      # Optional: for Python test framework
]

[tool.pytest.ini_options]
testpaths = ["tests/notebooks"]
python_files = ["test_*.py"]
```

**Note:** Notebook script-cleanup tests are planned as bash tests, similar to existing script tests. Python dependencies above are optional and only needed if implementing Python-based test utilities.

## Success Metrics

**Quality Targets:**

- **Code Coverage:** 80%+ for critical paths (payload encoding/decoding, risk data processing, version management)
- **CI Duration:** Under 10 minutes for full test suite
- **Test Reliability:** Zero flaky tests; 100% consistent pass/fail behavior
- **Dependency Updates:** Automated PR merges when tests pass (Dependabot integration)
- **Release Safety:** All tests must pass before version bumps and releases

**Coverage Priorities:**

1. **Core Business Logic** (highest priority)
   - Payload encoding/decoding algorithms
   - Risk data filtering and display
   - Category mapping and ranking

2. **Integration Points** (medium priority)
   - CSV data parsing and caching
   - WordPress Query Loop filtering
   - Form submission and URL parameter handling

3. **Infrastructure** (baseline requirement)
   - Version sync scripts
   - Build and release automation
   - Plugin initialization and asset loading

## Open Questions

**For Future E2E/Integration Tests:**
1. Should E2E tests mock Google Places API or use real keys in CI?
    * [TF] mock, no live keys; Gravity Forms is is the way
2. How to test FCC API without hitting actual endpoint (rate limits)?
    * [TF] worth mocking; it's not complex
3. Test against multiple WordPress versions (6.3, 6.4, 6.5+)?
    * [TF] NO! Just 7.0 and forward
4. Visual regression testing for risk display UI?
    * [TF] Worthwhile
5. Load testing for CSV parsing with many requests?
    * [TF] No, this traffic is not a concern.

## Future Development Guidance

### Implementation Checkpoints

When implementing future test categories (E2E, notebook scripts):

1. **WordPress test environment setup** → Verify plugins load correctly
2. **API mocking strategy** → Confirm no live API calls in CI
3. **Test data fixtures** → Ensure realistic but privacy-safe
4. **Flaky test mitigation** → Add proper waits/retries
5. **CI pipeline integration** → Verify all tests run in sequence
6. **Coverage thresholds** → Set realistic targets (don't aim for 100%)
7. **Performance** → Keep CI under 10 minutes

### Risk Mitigation

**High-Risk Areas for Future E2E/Integration Tests:**

1. **External API Dependencies** (Google Places, FCC)
   - Mitigation: Mock by default, integration tests optional

2. **WordPress Version Compatibility**
   - Mitigation: Test against multiple versions (6.3, 6.4, latest)

3. **Gravity Forms Commercial Dependency**
   - Mitigation: Mock form structure in E2E tests

4. **Flaky E2E Tests**
   - Mitigation: Use explicit waits, retry logic, and stable selectors