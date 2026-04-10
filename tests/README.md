# tests/

Future home of automated tests for emergencymode.news plugins and infrastructure.

## Current Status

🚧 **Planning Phase** — See [TESTING_PLAN.md](TESTING_PLAN.md) for detailed implementation strategy.

## Quick Start (Future)

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:js          # JavaScript unit tests
npm run test:e2e         # End-to-end browser tests
npm run test:php         # PHP unit tests
npm run test:phpcs       # Coding standards
npm run test:scripts     # Bash script tests
npm run test:notebooks   # Notebook reproducibility
```

## Why Testing Matters for This Project

With Dependabot automatically creating PRs for dependency updates, automated testing enables:
- Safe auto-merge of routine updates
- Confidence in automated releases to main
- Quick validation that plugins work after WordPress core updates
- Protection against breaking changes in npm/pip dependencies

## Implementation Priority

See [TESTING_PLAN.md § Priority Implementation Order](TESTING_PLAN.md#priority-implementation-order) for phased rollout.
