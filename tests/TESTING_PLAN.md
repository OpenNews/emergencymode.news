# Testing Plan for emergencymode.news

## Overview

Comprehensive testing strategy for WordPress plugins, release automation, and data analysis notebooks. Focus on preventing regressions during Dependabot updates and ensuring reliable releases.

## Directory Structure

```
tests/
├── TESTING_PLAN.md              # This file
├── php/                         # PHP unit and integration tests
│   ├── bootstrap.php            # WordPress test environment setup
│   ├── phpunit.xml              # PHPUnit configuration
│   ├── action-pack/
│   │   ├── test-plugin-init.php
│   │   ├── test-payload-encoding.php
│   │   ├── test-payload-decoding.php
│   │   ├── test-category-mapping.php
│   │   └── test-query-loop-filter.php
│   └── rich-search/
│       └── test-plugin-init.php
├── js/                          # JavaScript unit tests
│   ├── jest.config.js
│   ├── action-pack/
│   │   ├── payload-encoding.test.js
│   │   ├── csv-parsing.test.js
│   │   ├── geolocation.test.js
│   │   └── risk-display.test.js
│   └── test-helpers/
│       ├── mock-csv-data.js
│       └── mock-session-storage.js
├── e2e/                         # End-to-end browser tests
│   ├── playwright.config.js
│   ├── action-pack/
│   │   ├── form-flow.spec.js
│   │   ├── geolocation.spec.js
│   │   ├── risk-display.spec.js
│   │   └── share-url.spec.js
│   └── fixtures/
│       └── test-csv-data/
├── scripts/                     # Script testing
│   ├── test-sync-version.sh
│   ├── test-build-assets.sh
│   └── fixtures/
└── notebooks/                   # Notebook verification
    └── test-reproducibility.py
```

## Test Categories

### 1. PHP Unit Tests (PHPUnit)

**Setup Requirements:**
- WordPress test library via `@wordpress/env` or SVN checkout
- PHPUnit 9.x (compatible with PHP 8.0+)
- MySQL/MariaDB test database

**Action Pack Plugin Tests:**

**test-payload-encoding.php**
- Verify `ap2.` prefix generation
- Test base36 encoding with various category combinations
- Validate segment splitting for >31 bits
- Test empty/null category handling
- Verify category ordering by `manualRank`

**test-payload-decoding.php**
- Decode various `ap2.` payloads correctly
- Handle malformed payloads gracefully
- Test single and multi-segment payloads
- Verify unknown categories are skipped
- Test version prefix handling (ap2, future ap3, etc.)

**test-category-mapping.php**
- Load `_tallCategories.csv` correctly
- Map answerID to category names
- Handle missing CSV entries
- Verify manualRank ordering
- Test CSV caching

**test-query-loop-filter.php**
- Apply category filters to Query Loop blocks
- Verify `.emfn-action-pack` class detection
- Test multiple categories in query
- Handle blocks without the target class
- Test with various block attributes

**test-plugin-init.php**
- Plugin activates without errors
- Constants defined correctly
- Scripts/styles enqueued on appropriate pages
- Localized data includes correct CSV URL
- Version constant matches header

**Rich Search Plugin Tests:**

**test-plugin-init.php**
- Plugin activates without errors
- No conflicts with Action Pack plugin
- Future: stub tests for planned features

### 2. JavaScript Unit Tests (Jest)

**Setup Requirements:**
- Jest 29.x
- jsdom for DOM simulation
- Mock CSV fetch responses

**payload-encoding.test.js**
```javascript
describe('Action Pack Payload Encoding', () => {
  test('encodes single category to ap2 format')
  test('encodes multiple categories in rank order')
  test('splits into multiple segments when needed')
  test('handles empty category list')
  test('preserves category order by manualRank')
})
```

**csv-parsing.test.js**
```javascript
describe('CSV Data Parsing', () => {
  test('parses _tallCategories.csv correctly')
  test('parses state CSV files for risk data')
  test('handles missing columns gracefully')
  test('caches parsed results')
})
```

**geolocation.test.js**
```javascript
describe('Geolocation Resolution', () => {
  test('extracts lat/lng from Google Places')
  test('calls FCC API with coordinates')
  test('parses county FIPS from FCC response')
  test('handles API errors gracefully')
  test('respects rate limits')
})
```

**risk-display.test.js**
```javascript
describe('Risk Display Logic', () => {
  test('matches FIPS to CSV row')
  test('renders high-risk hazards')
  test('filters by risk threshold')
  test('handles missing FIPS data')
  test('updates DOM with risk information')
})
```

### 3. End-to-End Tests (Playwright)

**Setup Requirements:**
- Playwright
- Local WordPress test instance with plugins
- Test Gravity Form configured
- Mock Google Places API (or real key for integration tests)

**form-flow.spec.js**
```javascript
test('complete form submission flow', async ({ page }) => {
  // Navigate to form
  // Select answers from .hashable fieldsets
  // Verify encoded payload in hidden input
  // Submit form
  // Verify redirect with actionPack parameter
})
```

**geolocation.spec.js**
```javascript
test('geolocation and risk display', async ({ page }) => {
  // Enter address in autocomplete
  // Wait for Places API response
  // Verify FCC API call
  // Check risk data displayed
  // Verify sessionStorage updates
})
```

**share-url.spec.js**
```javascript
test('actionPack URL parameter decoding', async ({ page }) => {
  // Visit page with ?actionPack=ap2.xyz
  // Verify Query Loop filtered correctly
  // Check console.debug output
  // Verify category names decoded
})
```

### 4. Script Tests

**test-sync-version.sh**
```bash
#!/usr/bin/env bash
# Test sync-release-version.sh in isolated environment
test_sync_package_json() {
  # Create temp package.json
  # Run sync script
  # Verify version updated
  # Check JSON formatting preserved
}

test_sync_pyproject_toml() {
  # Create temp pyproject.toml
  # Run sync script
  # Verify version updated
}

test_sync_plugin_headers() {
  # Create temp plugin file
  # Run sync script
  # Verify both Version header and constant updated
}

test_sync_readme_stable_tag() {
  # Create temp readme.txt
  # Run sync script
  # Verify Stable tag updated
  # Verify changelog entry added
}

test_changelog_deduplication() {
  # Run sync twice with same version
  # Verify changelog not duplicated
}
```

**test-build-assets.sh**
```bash
#!/usr/bin/env bash
# Test build-release-assets.sh
test_build_plugin_zip() {
  # Run build script
  # Verify ZIP created
  # Check ZIP contents include all plugin files
  # Verify no .git, node_modules, etc.
}

test_version_in_filename() {
  # Build with specific version
  # Verify filename includes version
}
```

### 5. Notebook Reproducibility Tests

**test-reproducibility.py**
```python
"""Verify notebooks can run without errors and produce expected outputs."""
import papermill as pm
import pandas as pd
from pathlib import Path

def test_us_disaster_risk_analysis():
    """Run US_disaster_risk_analysis.ipynb and verify outputs."""
    pm.execute_notebook(
        'notebooks/US_disaster_risk_analysis.ipynb',
        '/tmp/output.ipynb',
        kernel_name='python3'
    )
    # Verify expected CSV files created
    # Check data integrity

def test_csv_column_schema():
    """Verify generated CSVs match expected schema."""
    for state_file in Path('plugins/emfn-action-pack-plugin/assets/data').glob('*.csv'):
        if state_file.name.startswith('_'):
            continue
        df = pd.read_csv(state_file)
        # Verify required columns exist
        # Check data types
```

## WordPress Coding Standards

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

## CI/CD Integration

### GitHub Actions Workflow (.github/workflows/test.yml)

```yaml
name: Tests

on:
  pull_request:
  push:
    branches: [main, staging]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run format:check
      - run: npm run notebooks:check-clean

  phpcs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: php-actions/composer@v6
        with:
          php_version: "8.0"
      - run: composer require --dev squizlabs/php_codesniffer wp-coding-standards/wpcs
      - run: vendor/bin/phpcs

  php-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.0'
          extensions: mysqli
      - run: bash tests/scripts/setup-wp-tests.sh wordpress_test root root localhost latest
      - run: composer install
      - run: vendor/bin/phpunit

  js-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:js

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run wp-env start
      - run: npm run test:e2e

  script-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash tests/scripts/test-sync-version.sh
      - run: bash tests/scripts/test-build-assets.sh

  notebook-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install -e . papermill pytest
      - run: pytest tests/notebooks/
```

## Package.json Scripts

Add to [package.json](../package.json):

```json
{
  "scripts": {
    "test": "npm run test:js && npm run test:e2e",
    "test:js": "jest",
    "test:js:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:php": "phpunit",
    "test:phpcs": "phpcs",
    "test:scripts": "bash tests/scripts/test-all.sh",
    "test:notebooks": "pytest tests/notebooks/",
    "wp-env": "wp-env"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@wordpress/env": "^8.0.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

## pyproject.toml Updates

Add to [pyproject.toml](../pyproject.toml):

```toml
[dependency-groups]
dev = [
    "pre-commit",
    "pytest",
    "papermill",  # For notebook testing
    "black",      # Code formatting
    "ruff",       # Linting
]

[tool.pytest.ini_options]
testpaths = ["tests/notebooks"]
python_files = ["test_*.py"]

[tool.ruff]
line-length = 100
target-version = "py313"
```

## Priority Implementation Order

### Phase 1: Foundation (Week 1)
1. ✅ Add PHPCS configuration
2. ✅ Set up Jest for JavaScript testing
3. ✅ Create script tests for sync and build
4. ✅ Add test workflow to CI

### Phase 2: Core Validation (Week 2)
1. ✅ PHP unit tests for payload encode/decode
2. ✅ JS unit tests for category mapping
3. ✅ Script integration tests
4. ✅ Notebook reproducibility checks

### Phase 3: Integration (Week 3)
1. ✅ Set up @wordpress/env for PHP integration tests
2. ✅ E2E tests for form flow
3. ✅ E2E tests for share URLs
4. ✅ Add coverage reporting

### Phase 4: Continuous Improvement (Ongoing)
1. ✅ Monitor test flakiness
2. ✅ Add visual regression tests for risk display
3. ✅ Performance benchmarks
4. ✅ Accessibility testing

## Test Data Management

### Fixtures Location
- CSV test data: `tests/e2e/fixtures/test-csv-data/`
- Mock API responses: `tests/js/test-helpers/mock-api-responses.json`
- Sample WordPress content: `tests/php/fixtures/test-content.xml`

### Data Generation
- Use real FEMA NRI data subset for realistic testing
- Anonymize any user-submitted form data
- Version control small fixtures, gitignore large datasets

## Success Metrics

- **Code Coverage:** Target 80%+ for critical paths
- **CI Duration:** Keep under 10 minutes total
- **Test Reliability:** <1% flake rate
- **Dependabot PRs:** Auto-merge when tests pass
- **Release Confidence:** Zero manual QA needed for automated releases

## Open Questions

1. Should E2E tests mock Google Places API or use real keys in CI?
2. How to test FCC API without hitting actual endpoint (rate limits)?
3. Test against multiple WordPress versions (6.3, 6.4, 6.5+)?
4. Visual regression testing for risk display UI?
5. Load testing for CSV parsing with many requests?

## Agentic AI Implementation Estimate

### Overview

Estimated effort to implement this testing plan using agentic AI assistants (GitHub Copilot, Cursor, Claude, etc.) with minimal human intervention.

### Size Metrics

| Category | Files | LOC | Complexity |
|----------|-------|-----|------------|
| Test Infrastructure | 8 | ~800 | Medium |
| PHP Tests | 6 | ~1,200 | Medium |
| JavaScript Tests | 5 | ~1,000 | Medium |
| E2E Tests | 4 | ~800 | High |
| Script Tests | 3 | ~600 | Low |
| Notebook Tests | 2 | ~400 | Low |
| CI/CD Config | 3 | ~300 | Medium |
| **Total** | **31** | **~5,100** | **Mixed** |

### Effort Breakdown by Phase

#### Phase 1: Foundation (Infrastructure Setup)
**Human Time:** 4-6 hours  
**AI Assistance Level:** 70%

**Tasks:**
- Create directory structure → **AI: 95%** (straightforward scaffolding)
- PHPCS config (`.phpcs.xml.dist`) → **AI: 90%** (standard template)
- Jest config (`jest.config.js`) → **AI: 90%** (standard setup)
- Playwright config → **AI: 85%** (needs WordPress env specifics)
- Test workflow (`.github/workflows/test.yml`) → **AI: 80%** (needs workflow chaining review)
- `package.json` test scripts → **AI: 95%** (simple additions)
- `pyproject.toml` updates → **AI: 95%** (simple additions)

**Bottlenecks:**
- @wordpress/env configuration for local WordPress instance
- Determining which APIs to mock vs hit directly
- Setting up test database credentials

**AI Prompting Strategy:**
```
"Create a complete PHPUnit bootstrap file for WordPress plugin testing 
using the latest WordPress test library, targeting WP 6.3+ and PHP 8.0+.
Include database setup and plugin activation helpers."
```

#### Phase 2: Core Validation Tests
**Human Time:** 8-12 hours  
**AI Assistance Level:** 75%

**PHP Unit Tests (6 files, ~1,200 LOC):**
- Payload encoding/decoding → **AI: 80%** (well-defined algorithm)
- Category mapping → **AI: 85%** (CSV parsing + logic)
- Query Loop filtering → **AI: 60%** (needs WordPress block context)
- Plugin initialization → **AI: 90%** (standard boilerplate)

**JavaScript Unit Tests (5 files, ~1,000 LOC):**
- Payload encoding → **AI: 85%** (can reference PHP version)
- CSV parsing → **AI: 90%** (straightforward data parsing)
- Geolocation logic → **AI: 75%** (mock API responses needed)
- Risk display → **AI: 70%** (DOM manipulation testing)

**Script Tests (3 files, ~600 LOC):**
- Version sync validation → **AI: 85%** (file I/O + regex testing)
- Build asset validation → **AI: 90%** (ZIP creation + verification)

**Bottlenecks:**
- Understanding `ap2.` payload format internals (needs code reading)
- WordPress Query Loop block structure (documentation lookup)
- Session storage behavior across form pages

**AI Prompting Strategy:**
```
"Write PHPUnit tests for a WordPress plugin function that decodes base36 
payloads with the format 'ap2.{segments}' where each segment represents 
31 bits of category flags. Here's the decode function: [paste code]. 
Test cases: single segment, multiple segments, malformed input, empty input."
```

#### Phase 3: Integration & E2E Tests
**Human Time:** 10-16 hours  
**AI Assistance Level:** 60%

**E2E Tests (4 files, ~800 LOC):**
- Form flow → **AI: 65%** (needs Gravity Forms structure knowledge)
- Geolocation → **AI: 55%** (Google Places API integration complex)
- Share URL → **AI: 70%** (URL parameter testing straightforward)
- Risk display → **AI: 60%** (needs visual/behavioral assertions)

**WordPress Environment:**
- Setting up test site → **AI: 40%** (manual WordPress/plugin config)
- Gravity Forms test form → **AI: 30%** (requires commercial plugin)
- Test content/categories → **AI: 50%** (needs domain knowledge)

**Bottlenecks:**
- Gravity Forms license for test environment
- Google Places API key and quota management
- FCC API rate limiting in CI
- Flaky geolocation tests (external API dependencies)

**AI Prompting Strategy:**
```
"Write a Playwright test that navigates to a Gravity Forms page, 
fills in fields within 'fieldset.hashable', waits for the hidden 
.hashMarker input to populate with an 'ap2.' value, submits the form, 
and verifies the redirect URL contains an actionPack parameter."
```

#### Phase 4: Notebook Testing
**Human Time:** 3-5 hours  
**AI Assistance Level:** 80%

**Tasks:**
- Papermill execution tests → **AI: 85%** (standard pattern)
- CSV schema validation → **AI: 90%** (pandas + schema checking)
- Output reproducibility → **AI: 75%** (needs sampling strategy)

**Bottlenecks:**
- Large dataset handling in CI (cache/download strategy)
- FEMA API rate limits
- Notebook runtime in CI (can be slow)

### Total Estimated Effort

| Phase | Human Hours | AI Contribution | Calendar Time |
|-------|-------------|-----------------|---------------|
| Phase 1: Foundation | 4-6 | 70% | 1-2 days |
| Phase 2: Core Tests | 8-12 | 75% | 2-3 days |
| Phase 3: E2E Tests | 10-16 | 60% | 3-5 days |
| Phase 4: Notebooks | 3-5 | 80% | 1 day |
| **Total** | **25-39 hours** | **71% avg** | **7-11 days** |

**With dedicated focus:** 1-1.5 weeks  
**With part-time effort:** 2-3 weeks

### Cost Efficiency Analysis

**Traditional Development:**
- Senior engineer: ~60-80 hours @ $100-150/hr = **$6,000-12,000**
- Junior engineer: ~100-120 hours @ $50-75/hr = **$5,000-9,000**

**AI-Assisted Development:**
- Engineer time: ~25-39 hours @ $100-150/hr = **$2,500-5,850**
- AI services: Copilot/Cursor monthly: **~$20-40**
- **Total: $2,520-5,890**

**Savings: 55-65%** in direct costs, **60-70%** in calendar time

### AI Tool Recommendations

**Best for This Project:**

1. **GitHub Copilot + Workspace** (⭐⭐⭐⭐⭐)
   - Excellent at test boilerplate
   - GitHub integration simplifies PR workflow
   - Good WordPress/PHP context

2. **Cursor Composer** (⭐⭐⭐⭐⭐)
   - Multi-file refactoring strong
   - Can read existing plugin code for context
   - Fast iteration on test failures

3. **Claude Code + MCP** (⭐⭐⭐⭐)
   - Best at understanding complex logic
   - Can reason about test coverage gaps
   - Slower but higher quality for tricky tests

4. **Windsurf** (⭐⭐⭐⭐)
   - Good for E2E test generation
   - Understands web flows well
   - Strong at debugging flaky tests

**Recommended Workflow:**
- **Infrastructure setup:** Cursor Composer (multi-file creation)
- **Unit tests:** GitHub Copilot (inline generation)
- **E2E tests:** Claude (reasoning about flows)
- **Debugging:** Cursor + Claude (error analysis)

### Human Review Checkpoints

**Critical Review Points (Cannot Skip):**

1. **WordPress test environment setup** → Verify plugins load correctly
2. **API mocking strategy** → Confirm no live API calls in CI
3. **Test data fixtures** → Ensure realistic but privacy-safe
4. **Flaky test mitigation** → Add proper waits/retries
5. **CI pipeline integration** → Verify all tests run in sequence
6. **Coverage thresholds** → Set realistic targets (don't aim for 100%)
7. **Performance** → Keep CI under 10 minutes

**Can Delegate to AI (With Spot Checks):**
- Test boilerplate and setup functions
- Mock data generation
- Standard assertion patterns
- Documentation and comments
- Test data fixtures (synthetic)

### Risk Mitigation

**High-Risk Areas:**

1. **External API Dependencies** (Google Places, FCC)
   - Mitigation: Mock by default, integration tests optional
   - AI can generate comprehensive mocks from API docs

2. **WordPress Version Compatibility**
   - Mitigation: Test against 6.3, 6.4, latest
   - AI can generate version matrix in CI

3. **Gravity Forms Commercial Dependency**
   - Mitigation: Mock form structure in E2E tests
   - AI can scaffold form HTML from screenshots

4. **Flaky E2E Tests**
   - Mitigation: Aggressive waits, retry logic
   - AI good at adding wait conditions

### Success Criteria

**Phase Complete When:**
- ✅ All tests pass locally and in CI
- ✅ Code coverage >70% on critical paths
- ✅ CI runtime <10 minutes
- ✅ Zero false positives in last 10 runs
- ✅ Dependabot PRs can auto-merge with green tests
- ✅ Documentation updated with test commands

### Parallel Work Opportunities

**Can Be Done Concurrently:**
- PHP unit tests + JS unit tests (separate contexts)
- Script tests + notebook tests (no dependencies)
- Infrastructure setup + test planning
- CI workflow + local test development

**Must Be Sequential:**
- Foundation → Core tests → E2E tests
- Mock setup → Integration tests
- Local passing → CI integration

### Recommended Sprint Plan

**Week 1:**
- Day 1-2: Infrastructure + PHPCS + Jest/Playwright config
- Day 3-4: PHP unit tests (payload encode/decode)
- Day 5: JS unit tests (CSV parsing, payload logic)

**Week 2:**
- Day 1-2: Script tests + notebook tests
- Day 3-4: E2E test scaffolding + WordPress env
- Day 5: CI integration + fix failures

**Buffer:** 1-3 days for debugging, flaky test fixes, documentation

## References

- [WordPress Plugin Unit Tests](https://make.wordpress.org/cli/handbook/plugin-unit-tests/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)
