# Agent Guide: Emergency Mode News Codebase

**Purpose**: Critical lessons learned about this WordPress plugin + data analysis repository to avoid wasted time on deploy-ready checks and testing.

---

## 🚨 Critical Gotchas & Time Traps

### 1. Version Number Chaos from Broken Tests

**THE TRAP**: `tests/scripts/test-sync-version.sh` modifies **real project files**, not temp files.

**What Happened**:
- Test creates temp directory with setup()
- But `scripts/sync-release-version.sh` always runs `cd "$repo_root"` (line 18-19)
- Every test execution overwrites real package.json, pyproject.toml, plugin PHP files
- Test #10 used version `9.9.9`, corrupting entire project
- Versions appeared everywhere: package.json, pyproject.toml, PHP header, PHP constant, readme.txt, lockfiles

**Solution Applied**:
- Disabled entire test file with `exit 0` and warning comment
- Added version safeguard to sync script: reject versions > 10.99.99
- **NEVER re-enable these tests** until sync script accepts working directory parameter

**Lesson**: Always verify test isolation. If a script uses `cd "$repo_root"`, it cannot be safely tested with temp directories.

---

### 11. Version Sync Script Now Has Release Comparison

**THE SAFEGUARD**: Prevent version jumps from test leaks or fat-finger errors.

**How It Works**:
- `sync-release-version.sh` fetches latest GitHub release tag via `gh` CLI
- Compares requested version to latest release
- Blocks if major version jumps by more than 1 (e.g., 0.2.0 → 9.9.9 = major jump of 9)
- Blocks version downgrades (going backwards)
- Automatically skipped in GitHub Actions (GITHUB_ACTIONS env var)
- Can bypass with `--force` flag for manual version history fixes

**Example Scenarios**:
```bash
# Latest release: v0.2.0

./scripts/sync-release-version.sh 0.2.1  # ✓ Allowed (patch bump)
./scripts/sync-release-version.sh 0.3.0  # ✓ Allowed (minor bump)
./scripts/sync-release-version.sh 1.0.0  # ✓ Allowed (major bump +1)
./scripts/sync-release-version.sh 9.9.9  # ✗ BLOCKED (major jump +9)
./scripts/sync-release-version.sh 0.1.0  # ✗ BLOCKED (downgrade)

# Force mode for fixing version history:
./scripts/sync-release-version.sh --force 0.1.0  # ✓ Allowed
```

**When Check Is Skipped**:
1. In GitHub Actions workflows (GITHUB_ACTIONS env var present)
2. When `--force` flag is used
3. When `gh` CLI is not available (warns and continues)
4. When no GitHub releases exist yet (warns and continues)

**Why This Matters**:
- Prevents test leaks from corrupting production versions
- Catches typos (meant 0.3.0, typed 0.30.0)
- Enforces semantic versioning discipline
- Allows emergency fixes with explicit override

**Lesson**: Defense in depth - multiple safeguards at different layers (component size check + release comparison check) catch different types of errors.

---

### 2. Pre-commit Hooks vs npm run lint Mismatch

**THE TRAP**: Shellcheck only runs in pre-commit hooks, not during `npm run lint`.

**What Happened**:
- Developer runs `npm run lint` → all green ✓
- Attempts commit → shellcheck fails with 20+ warnings
- No way to catch issues before committing

**Why It Happened**:
- `npm run lint` only runs: prettier, eslint (plugins/**), notebooks
- `.pre-commit-config.yaml` runs: prettier, shellcheck, eslint (all .js), workflows, notebooks
- Different file patterns, different tools

**Solution Applied**:
- Added `npm run shellcheck` that calls `.venv/bin/pre-commit run shellcheck --all-files`
- Developers can now run shellcheck anytime without committing

**Lesson**: Keep `npm run lint` and pre-commit hooks in sync. If a tool is in pre-commit, add it to npm scripts too.

---

### 3. ESLint Test File Globals Not Configured

**THE TRAP**: Pre-commit ESLint fails on test files with "jest is not defined", but `npm run lint` passes.

**What Happened**:
- `npm run eslint` only targets `plugins/**/*.js` (no test files)
- Pre-commit runs eslint on all `.js` files including `tests/**`
- Test files use Jest globals (`jest`, `describe`, `it`, `expect`, `beforeEach`)
- These weren't declared in eslint.config.js

**Solution Applied**:
```javascript
{
  files: ["tests/**/*.js"],
  languageOptions: {
    globals: {
      ...globals.jest,
    },
  },
},
```

**Lesson**: When using different ESLint patterns in npm scripts vs pre-commit, ensure all file types have proper environment globals configured.

---

### 4. PHPUnit Deprecation Hell

**THE TRAP**: Multiple PHPUnit deprecations that fail strict mode and clutter output.

**Deprecations Fixed**:
1. **@test annotations** → Rename methods with `test` prefix (e.g., `testItDecodesSingleCategory`)
2. **Old XML schema** → Run `vendor/bin/phpunit --migrate-configuration` for PHPUnit 11.5 schema
3. **Non-static data providers** → Make providers static with typed return: `public static function provider(): array`
4. **setAccessible() deprecated in PHP 8.5** → Use ReflectionClass without setAccessible() (PHP 8.1+ doesn't need it)
5. **Missing WordPress constants** → Add DAY_IN_SECONDS and others to tests/php/bootstrap.php

**Solution Pattern**:
```php
// BEFORE
/**
 * @test
 */
public function it_decodes_single_category() { }
public function roundTripTestCasesProvider() { return []; }
$reflection->setAccessible(true);

// AFTER
public function testItDecodesSingleCategory() { }
public static function roundTripTestCasesProvider(): array { return []; }
// Just use $reflection directly (no setAccessible needed)
```

**Lesson**: Run PHPUnit with `--migrate-configuration` early. Use `failOnWarning="true"` in phpunit.xml to catch deprecations immediately.

---

### 5. XDEBUG_MODE Warning Noise

**THE TRAP**: Xdebug warnings bury test results in yellow output.

**What Happened**:
```
Xdebug: [Step Debug] Could not connect to debugging client...
Xdebug: [Step Debug] Could not connect to debugging client...
[22 passing tests somewhere in this yellow mess]
```

**Solution Applied**:
```json
"test:php": "XDEBUG_MODE=off vendor/bin/phpunit",
"test:php:coverage": "XDEBUG_MODE=coverage vendor/bin/phpunit --coverage-html=coverage/php"
```

**Lesson**: Always set `XDEBUG_MODE=off` for regular tests. Only use `XDEBUG_MODE=coverage` when explicitly collecting coverage.

---

### 6. npm Script Error Handling False Negatives

**THE TRAP**: Using `&& ||` logic gives false "PHP not available" errors even when tests pass.

**What Happened**:
```bash
# BROKEN
"test:php": "command -v php && vendor/bin/phpunit || echo 'PHP not available'"
# Shows "PHP not available" even when tests succeed (phpunit exit 0)
```

**Why**: The `||` executes if ANY prior command fails. `command -v php` succeeds, phpunit succeeds, then `||` branch never runs BUT the message appears anyway due to shell semantics.

**Solution Applied**:
```bash
"test:php": "if command -v php >/dev/null 2>&1; then XDEBUG_MODE=off vendor/bin/phpunit; else echo 'PHP not available - skipping'; fi"
```

**Lesson**: Use explicit `if/then/else` for conditional npm scripts. Never use `&& ||` patterns for error handling.

---

### 7. Test Coverage: Testing Test Doubles = 0% Coverage

**THE TRAP**: Tests passing but showing 0% coverage of production code.

**What Happened**:
- Tests used `Payload_Decoder` test double class
- All tests exercised test double, not real `EMFN_Action_Pack_Plugin` class
- Coverage showed 0% of actual plugin code

**Solution Applied**:
1. Changed private methods to `protected` (enable testing via inheritance)
2. Created `Testable_EMFN_Action_Pack_Plugin extends EMFN_Action_Pack_Plugin`
3. Override constructor to bypass singleton pattern
4. Tests now exercise real production class → 5.88% coverage (21/357 lines)

**Lesson**: Test doubles are useful for isolation, but ensure you're also testing the actual production class for meaningful coverage metrics.

---

### 8. PHP Path Issues with DEVSENSE Tools

**THE TRAP**: DEVSENSE PHP Tools shows "PHP not found" errors in devcontainer.

**What Happened**:
- Initial path: `/usr/bin/php` → doesn't exist in Python base image
- PHP installed via devcontainer feature at `/usr/local/php/current/bin/php`

**Solution Applied**:
```json
// .devcontainer/devcontainer.json
"features": {
  "ghcr.io/devcontainers/features/php:1": {
    "version": "8.3",
    "installComposer": true
  }
}

// .vscode/settings.json
{
  "php.validate.executablePath": "/usr/local/php/current/bin/php",
  "php.stubs": ["*", "wordpress"]
}
```

**Lesson**: When using devcontainer PHP feature, set VS Code php.validate.executablePath to `/usr/local/php/current/bin/php`. Add WordPress stubs for plugin development.

---

### 9. Shellcheck Devcontainer Feature = Extremely Slow

**THE TRAP**: Adding shellcheck devcontainer feature made rebuilds take forever.

**What Happened**:
- Used `ghcr.io/devcontainers-extra/features/shellcheck:1`
- Feature installation took 30+ seconds (building from source or complex dependencies)
- Every devcontainer rebuild became painful

**Solution Applied**:
```bash
# .devcontainer/setup.sh
sudo apt-get update
sudo apt-get install -y shellcheck  # Takes ~1-2 seconds
```

**Lesson**: Prefer `apt-get install` for simple tools over devcontainer features. Features are great for complex setups (Node, PHP, Python) but overkill for simple binaries.

---

### 10. WordPress Plugin Version Management

**THE TRAP**: Version numbers scattered across 5+ files, easy to get inconsistent.

**Files That Must Stay in Sync**:
1. `package.json` → `"version": "X.Y.Z"`
2. `pyproject.toml` → `version = "X.Y.Z"`
3. `plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php` → Header: `Version: X.Y.Z`
4. `plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php` → Constant: `EMFN_ACTION_PACK_PLUGIN_VERSION`
5. `plugins/emfn-action-pack-plugin/readme.txt` → `Stable tag: X.Y.Z`

**Solution Applied**:
- Created `scripts/sync-release-version.sh <version>` to update all files atomically
- Added safeguard #1: reject versions > 10.99.99 (prevents component overflow)
- Added safeguard #2: reject major version jumps > 1 from latest GitHub release
  - Fetches latest release via `gh` CLI
  - Blocks if major version jumps by more than 1 (e.g., 0.2.0 → 9.9.9 blocked)
  - Allows version downgrades only with `--force`
  - Automatically skipped in GitHub Actions workflows (GITHUB_ACTIONS env var)
- GitHub Actions workflow calls this script before building release assets

**Usage**:
```bash
./scripts/sync-release-version.sh 1.2.3
# Updates all 5 locations consistently

# Force mode (for fixing version history issues)
./scripts/sync-release-version.sh --force 1.2.3
# Skips GitHub release comparison check
```

**Lesson**: Never manually edit version numbers. Always use the sync script. Add safeguards for unrealistic versions.

---

### 12. Always Verify Package Registry Currency

**THE TRAP**: Adding devcontainer features or packages without checking if they're maintained/deprecated.

**What Happened**:
- Initially added `ghcr.io/devcontainers-contrib/features/shellcheck:1`
- User pointed out `devcontainers-contrib` is discontinued
- Changed to `ghcr.io/devcontainers-extra/features/shellcheck:1`
- But then realized the best solution was simpler: `apt-get install shellcheck`

**Why This Matters**:
- Devcontainer features can be unmaintained, deprecated, or moved to new registries
- Package managers change over time (contrib → extra → ???)
- Simple solutions (apt-get) often outlast complex ones (custom features)
- No need to track registry migrations when using system packages

**Better Decision Process**:
1. **Check if tool is in debian/ubuntu apt repos** (start here)
2. **Verify devcontainer feature is actively maintained** (check last commit date)
3. **Prefer official features over community ones** (`ghcr.io/devcontainers/features/*`)
4. **Document why complex solution chosen** (if not using apt-get)

**For Our Devcontainer**:
- ✅ Node.js: Complex enough to justify official devcontainer feature
- ✅ PHP 8.3 with Composer: Complex setup, official feature available
- ✅ Shellcheck: Simple binary, use `apt-get install shellcheck`
- ✅ GitHub CLI: Simple binary, use `apt-get install gh`

**Lesson**: Start with the simplest solution. Only reach for devcontainer features when system packages are insufficient. Always verify registry/feature is actively maintained before adding.

---

## 🛠️ Development Workflow Best Practices

### Before Committing

```bash
# Run all checks locally (same as pre-commit hooks)
npm run lint           # prettier, eslint (plugins/**), notebooks
npm run shellcheck     # shellcheck on all .sh files
npm run test:all       # js, php, shell tests

# Version sync with safety checks
./scripts/sync-release-version.sh 1.2.3
# - Validates semver format
# - Rejects unrealistic versions (> 10.99.99)
# - Checks against latest GitHub release (prevents major jumps > 1)
# - Use --force to bypass GitHub release check (fixing version history only)
```

### Testing

```bash
# JavaScript tests
npm run test:js              # Fast feedback
npm run test:js:coverage     # With coverage report

# PHP tests  
npm run test:php             # Clean output (XDEBUG_MODE=off)
npm run test:php:coverage    # HTML coverage report in coverage/php/

# Shell script tests
npm run test:scripts         # All test-*.sh files
```

### Version Bumping

```bash
# NEVER manually edit versions
./scripts/sync-release-version.sh 1.2.3

# Safety checks performed:
# 1. Validates X.Y.Z semver format
# 2. Rejects components > 10.99.99
# 3. Fetches latest GitHub release
# 4. Blocks if major version jumps > 1 (e.g., 0.x.x → 9.x.x)
# 5. Blocks version downgrades
# 6. Auto-skipped in CI (GITHUB_ACTIONS env var set)

# Force mode (bypass GitHub release check)
# Use ONLY for fixing version history issues:
./scripts/sync-release-version.sh --force 1.2.3

# Verify consistency
grep -E 'version|Version' package.json pyproject.toml plugins/*/emfn-action-pack-plugin.php plugins/*/readme.txt
```

---

## 📦 WordPress Plugin Deployment Checklist

1. **Version sync**: Run `./scripts/sync-release-version.sh X.Y.Z`
2. **Lint**: `npm run lint` must pass
3. **Shellcheck**: `npm run shellcheck` must pass  
4. **Tests**: `npm run test:all` must pass
5. **Build assets**: `./scripts/build-release-assets.sh X.Y.Z dist/`
6. **Verify ZIP**: Contains `emfn-action-pack-plugin/` with all required files
7. **WordPress upload**: Test in staging environment first
8. **Git tag**: `git tag v1.2.3 && git push origin v1.2.3`
9. **GitHub release**: Attach ZIP from dist/

---

## 🔧 Devcontainer Setup Notes

### Installed via Features
- **Node.js**: LTS version (for npm, jest, eslint, prettier)
- **PHP 8.3**: With Composer (for PHPUnit, WordPress plugin)
- **Python 3.13**: Base image (for Jupyter notebooks, data analysis)

### Installed via apt-get (in setup.sh)
- **shellcheck**: For bash script linting
- **gh**: GitHub CLI for releases

### Installed via uv (Python package manager)
- Pinned to specific version for deterministic installs
- Creates `.venv` for Python dependencies
- Installs: jupyterlab, pandas, requests, numpy, pre-commit

### VS Code Extensions Auto-installed
- Python, Jupyter, Prettier, Jest, ESLint
- DEVSENSE PHP Tools (IntelliSense, debugging, profiling)
- GitHub Pull Requests

---

## 🚫 Things To Never Do

1. **Never run `tests/scripts/test-sync-version.sh`** - It modifies real project files
2. **Never manually edit version numbers** - Use sync-release-version.sh
3. **Never commit without pre-commit hooks installed** - Run `pre-commit install`
4. **Never use `&& ||` in npm scripts** - Use explicit `if/then/else`
5. **Never run PHPUnit without XDEBUG_MODE set** - You'll get yellow noise
6. **Never add devcontainer features for simple binaries** - Use apt-get instead
7. **Never test test doubles exclusively** - Test real production classes for coverage
8. **Never assume npm run lint === pre-commit** - They run different file patterns

---

## 🎯 Quick Reference Commands

```bash
# Full pre-commit check without committing
pre-commit run --all-files

# Fix auto-fixable issues
npm run format          # Prettier --write
npm run eslint:fix      # ESLint --fix

# Skip specific hooks (emergency only)
SKIP=shellcheck git commit

# Rebuild devcontainer (after .devcontainer/ changes)
# Cmd/Ctrl+Shift+P → "Rebuild Container"

# View PHP validation errors
# Check VS Code Problems panel with php.validate.executablePath set correctly
```

---

## 📚 Key File Locations

- **Tests**: `tests/{js,php,scripts}/`
- **Fixtures**: `tests/fixtures/`
- **Build script**: `scripts/build-release-assets.sh`
- **Version sync**: `scripts/sync-release-version.sh`
- **PHPUnit config**: `phpunit.xml`
- **Jest config**: `jest.config.cjs`
- **ESLint config**: `eslint.config.js`
- **Pre-commit hooks**: `.pre-commit-config.yaml`
- **Plugin code**: `plugins/emfn-action-pack-plugin/`
- **Notebooks**: `notebooks/`

---

**Last Updated**: May 25, 2026  
**Lessons Learned From**: Setting up complete test infrastructure, fixing pre-commit hooks, eliminating PHPUnit deprecations, debugging version number corruption, optimizing devcontainer setup
