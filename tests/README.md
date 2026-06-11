# tests/

Automated tests for emergencymode.news plugins and infrastructure.

## Current Status

✅ **Core Testing Implemented** — See [TESTING_PLAN.md](TESTING_PLAN.md) for detailed documentation.

**Implemented:**
- ✅ PHP unit tests (PHPUnit) - 15 tests covering payload decoding
- ✅ JavaScript unit tests (Jest) - 22 tests covering encoding and risk rendering
- ✅ Shell script tests - 43 tests covering build and version scripts
- ✅ CI integration - All tests run on PRs and commits
- ✅ Pre-commit hooks - Linting and formatting checks

**Planned:**
- ⏳ End-to-end browser tests (Playwright)
- ⏳ Notebook cleanup validation

## Quick Start

```bash
# Run all tests
npm test                 # Runs JS + shell script tests
npm run test:all         # Includes PHP tests

# Run specific test suites
npm run test:js          # JavaScript unit tests (Jest)
npm run test:php         # PHP unit tests (PHPUnit)
npm run test:scripts     # Bash script tests

# Linting
npm run lint             # Run all linting checks
npm run shellcheck       # Shell script linting
npm run eslint           # JavaScript linting
```

## Why Testing Matters for This Project

With Dependabot automatically creating PRs for dependency updates, automated testing enables:
- Safe auto-merge of routine updates
- Confidence in automated releases to main
- Quick validation that plugins work after WordPress core updates
- Protection against breaking changes in npm/pip dependencies

## Implementation Priority

See [TESTING_PLAN.md § Priority Implementation Order](TESTING_PLAN.md#priority-implementation-order) for phased rollout.
