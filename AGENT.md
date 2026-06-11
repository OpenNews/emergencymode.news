# Agent Guide: Emergency Mode News Codebase

**Purpose**: Critical lessons learned about this WordPress plugin + data analysis repository to avoid wasted time on deploy-ready checks and testing.

---

## 🚨 Critical Gotchas & Time Traps

### 1. Version Number Chaos from Broken Tests

**THE TRAP**: `tests/scripts/test-sync-version.sh` modifies **real project files**, not temp files.

**What Happened**:
- Test creates temp directory with setup()
- But `scripts/sync-release-version.sh` always runs `cd "$repo_root"` (line 18-19)
- Every test execution overwrites real plugin PHP files
- Test #10 used version `9.9.9`, corrupting entire project
- Versions appeared in: PHP header, PHP constant, readme.txt, lockfiles

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
- `npm run lint` initially only ran: prettier, eslint (plugins/**), notebooks
- `.pre-commit-config.yaml` runs: prettier, shellcheck, eslint (all .js), workflows, notebooks
- Different file patterns, different tools

**Solution Applied**:
- Added `npm run shellcheck` that calls `.venv/bin/pre-commit run shellcheck --all-files`
- Updated `npm run lint` to include shellcheck: `format:check && eslint && shellcheck && notebooks:check-clean`
- Now developers can run shellcheck standalone OR as part of full lint check
- `npm run lint` and pre-commit hooks are now in sync

**Lesson**: Keep `npm run lint` and pre-commit hooks in sync. If a tool is in pre-commit, include it in the lint script too so developers and CI get consistent results.

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

**THE TRAP**: Version numbers scattered across multiple files per plugin, easy to get inconsistent.

**Files That Must Stay in Sync** (per plugin):
1. `plugins/{plugin-name}/{plugin-name}.php` → Header: `Version: X.Y.Z`
2. `plugins/{plugin-name}/{plugin-name}.php` → Constant: `{PLUGIN}_VERSION`
3. `plugins/{plugin-name}/readme.txt` → `Stable tag: X.Y.Z`

**Note**: package.json and pyproject.toml no longer have version fields (removed per multi-plugin release plan)

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
- Devcontainer features can be unmaintained, deprecated or moved to new registries
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

### 13. AI Agents Ignore Their Own Documentation (Including AGENT.md)

**THE TRAP**: Writing documentation about mistakes, then immediately repeating those exact mistakes.

**What Keeps Happening**:
- Lesson #1 documents: "Test #10 used version `9.9.9`, corrupting entire project" + "NEVER re-enable these tests"
- AI agent (me) then uses `9.9.9` to test version validation script
- Result: Corrupted package.json, pyproject.toml, plugin files again
- Pattern repeats despite explicit warnings in the same file being edited

**Why This Happens**:
- AI agents don't automatically re-read context files before taking actions
- We see "test version validation" and pick a test value without checking constraints
- Documentation exists but isn't consulted during code execution
- Same agent that wrote the warning violates it minutes later

**The Pattern**:
1. Document "NEVER do X" in AGENT.md
2. Later task requires testing related functionality
3. Agent does X without checking AGENT.md first
4. User: "Look at your damned agent.md"
5. Agent: "Oh right, I wrote that warning"

**Real Examples from This Codebase**:
- ❌ AGENT.md says "Test #10 used version `9.9.9`, corrupting entire project"
- ❌ Agent uses `9.9.9` to test version script
- ❌ AGENT.md says "reject versions > 10.99.99"
- ❌ Agent tests with `99.0.0` (would corrupt if safeguard failed)
- ❌ AGENT.md says "NEVER re-enable these tests"
- ❌ Agent considers how to test version sync script

**Better Process**:
```bash
# BEFORE testing ANY functionality:
1. grep -i "NEVER.*test" AGENT.md
2. grep -i "9.9.9\|99.0.0\|version.*corrupt" AGENT.md
3. Read "Critical Gotchas" section FIRST
4. Use safe test values that don't match forbidden patterns

# For version testing in this codebase:
✅ Use: 0.2.1, 0.3.0, 1.0.0 (safe increments from 0.2.0)
❌ NEVER: 9.9.9, 99.0.0 or anything > 10.99.99
```

**Safe Testing Patterns**:
```bash
# Check current version FIRST
grep '"version"' package.json
# Returns: "version": "0.2.0"

# Then test with valid increments:
./scripts/sync-release-version.sh 0.2.1  # ✅ Safe patch bump
./scripts/sync-release-version.sh 0.3.0  # ✅ Safe minor bump  
./scripts/sync-release-version.sh 1.0.0  # ✅ Safe major bump

# NOT THIS:
./scripts/sync-release-version.sh 9.9.9  # ❌ FORBIDDEN (documented in lesson #1)
./scripts/sync-release-version.sh 99.0.0 # ❌ DANGEROUS (tests safeguard failure mode)
```

**Red Flags That You're About to Violate Your Own Docs**:
- ❌ Using test values mentioned in "What Happened" sections
- ❌ Testing with values explicitly called "corrupting" or "forbidden"
- ❌ Not checking current state before choosing test inputs
- ❌ Assuming safeguards will prevent damage (they might not in edge cases)

**For This Codebase**:
- Current versions: Check plugin PHP files or git tags (e.g., `action-pack/v0.3.1`)
- Safe test versions: 0.2.1, 0.3.0, 1.0.0
- Forbidden versions: 9.9.9 (lesson #1), 99.0.0 (exceeds safeguard), anything > 10.99.99
- Version sync script: ALWAYS check current version first, use safe increments

**Lesson**: AI-generated documentation is useless if the AI doesn't consult it before acting. Before testing any functionality, grep AGENT.md for warnings about that functionality. "NEVER" means never - especially when testing the safeguards designed to prevent those scenarios. The irony of documenting mistakes then repeating them is not lost on anyone.

---

### 14. Audit Constraints Before Writing Code (ROOT CAUSE of Most AI Bugs)

**THE TRAP**: Writing code without first checking the execution environment's constraints, contracts and dependencies.

**The Pattern Across Multiple HIGH-Priority Bugs**:
1. **Uninitialized variable bug** (`$major` used before parsed) → Didn't check bash `set -u` constraint
2. **Exit code masking bug** (`|| echo`, `|| true`) → Didn't check CI's exit code contract
3. **Output during tests bug** (`echo` in bootstrap) → Didn't check `phpunit.xml` strictness constraint

**What I'm Missing**: A **pre-coding audit** of the execution environment:

```
BEFORE writing ANY code, check:
1. ✅ Config files - What strictness settings exist?
2. ✅ Contracts - What does the calling system expect?
3. ✅ Dependencies - What must exist before this runs?
4. ✅ Execution modes - What strict modes are enabled?
```

**Concrete Examples**:

| Code Addition | Should Check First | Would Prevent |
|---------------|-------------------|---------------|
| Use `$major` in calculation | Is variable initialized above? `set -u` enabled? | Lesson #14 bug |
| Add `\|\| echo 'msg'` | Will npm script be used in CI? Exit code contract? | Lesson #15 bug |
| Add `echo "debug"` | Check phpunit.xml for `beStrictAboutOutputDuringTests` | Lesson #16 bug |
| Call function `foo()` | Does function exist? Imported? Defined above? | Runtime errors |
| Write to `/tmp/file` | Check permissions, disk space, cleanup? | Deployment bugs |
| Use `command -v tool` | Is tool installed? In PATH? Fallback needed? | CI failures |

**The Audit Checklist**:

**1. Config Constraints** (files that enforce rules):
```bash
# Before adding code, grep for relevant configs:
grep -r "beStrictAbout\|failOn\|strict" *.xml     # PHPUnit strictness
head -5 scripts/*.sh                               # Check for set -euo pipefail
grep "scripts" package.json                        # Are these used in CI?
cat .github/workflows/*.yml                        # What runs in automation?
```

**2. Calling Contracts** (what parent systems expect):
```bash
# npm scripts used in CI?
grep -A5 "npm run" .github/workflows/*.yml
# → Exit codes MUST propagate (no || echo masking)

# Script called by automation?
grep "sync-release-version" .github/workflows/*.yml
# → Must validate inputs, have safety checks

# Test bootstrap file?
ls -la tests/*/bootstrap.*
# → No output allowed (check test config strictness)
```

**3. Dependency Prerequisites** (what must exist first):
```bash
# Before using $variable:
grep "variable=" script.sh | head -20  # Is it defined above?

# Before calling function():
grep "^function_name()" *.sh           # Is it defined?
grep "source.*helpers" *.sh            # Is it imported?

# Before using command:
which command || echo "not available"  # Is it installed?
```

**4. Execution Mode Strictness** (will crash on violations):
```bash
# Bash strict mode?
grep "set -" scripts/*.sh
# → set -u: uninitialized vars crash
# → set -e: any error crashes
# → set -o pipefail: pipeline failures crash

# PHPUnit strict mode?
grep "beStrict\|failOn" phpunit.xml
# → Output, risky tests, warnings all = failures

# ESLint/Prettier strict mode?
grep "error" eslint.config.js
# → console.log, formatting violations = errors
```

**Why This Matters**:
- 🎯 **Catches bugs BEFORE writing code** (not after review/CI)
- 🎯 **Works for any codebase** (universal pattern, not language-specific)
- 🎯 **Prevents entire classes of bugs** (not just individual fixes)
- 🎯 **Faster than trial-and-error** (5 min audit vs hours debugging)

**Red Flags That You Skipped The Audit**:
- ❌ Copilot review finds "uninitialized variable"
- ❌ CI passes locally, fails in GitHub Actions
- ❌ Tests pass, but marked as "risky"
- ❌ Script works in development, crashes in production
- ❌ Linter passes, pre-commit hook fails

**The Fix: Pre-Coding Audit Template**:
```bash
# Before adding code to FILE at LINE:

# 1. Check config constraints
grep -r "strict\|fail" *.xml *.json .github/

# 2. Check calling context
grep -r "FILE\|LINE" package.json .github/workflows/

# 3. Check dependencies exist
grep "variable\|function\|command" FILE | head -50

# 4. Check execution modes
head -20 FILE  # Look for set -euo pipefail, imports, settings

# 5. THEN write code that respects discovered constraints
```

**For This Codebase**:
- ✅ All bash scripts use `set -euo pipefail` → Variables MUST be initialized
- ✅ `phpunit.xml` has `beStrictAboutOutputDuringTests="true"` → Bootstrap MUST be silent
- ✅ npm scripts used in `.github/workflows/release.yml` → Exit codes MUST propagate
- ✅ Pre-commit runs different tools than `npm run lint` → Check BOTH before committing

**Lesson**: AI agents (me included) write code in isolation without checking the execution environment's constraints. A 5-minute pre-coding audit of configs, contracts, dependencies and strict modes prevents hours of debugging HIGH-priority bugs. **This is the root cause behind lessons #15, #16 and #17** - all would have been caught by checking configs first.

---

### 15. AI Agents Make Piecemeal Mistakes - Demand Full Context

**THE TRAP**: Accepting AI-generated code (from agents OR Copilot reviews) without understanding execution flow leads to runtime bugs.

**What Happened**:
- Added version safeguard to `sync-release-version.sh`
- Used variable `$major` in calculation: `major_jump=$((major - latest_major))`
- But `$major` wasn't initialized yet - it gets parsed later with `IFS='.' read -r major minor patch`
- With `set -u` (unset variable = error), script would crash on GitHub release check
- Copilot PR review caught this as HIGH priority
- But the bug was introduced by AI agent (me) making piecemeal changes without full context

**Why This Happens**:
- AI agents see code in chunks, not full execution flow
- We suggest changes that look correct in isolation
- We miss variable initialization order, execution paths, error handling
- Copilot reviews also work on small context windows
- Accepting either without testing creates bugs

**How to Prevent**:
1. **Never accept AI suggestions without reading the FULL function/script**
2. **Trace variable initialization order** - where is it defined vs used?
3. **Check for `set -u`, `set -e`, `set -o pipefail`** - strict mode will expose bugs
4. **Run the code locally with test inputs** - don't just merge suggestions
5. **If Copilot/agent makes a mistake once, they'll make it again** - add safeguards

**Red Flags for AI-Generated Code**:
- ❌ Using variables before they're defined
- ❌ Missing error handling (no `|| exit 1`, no `set -e`)
- ❌ Assuming functions/commands exist without checking
- ❌ Hard-coded paths that won't work in all contexts
- ❌ Missing input validation
- ❌ Copy-pasted patterns without understanding WHY they work

**Better Review Process**:
1. Read the ENTIRE script/function, not just the diff
2. Trace execution flow from top to bottom
3. Check all variables are initialized before use
4. Verify error modes are handled (`set -euo pipefail`)
5. Test with edge cases (empty input, missing files, etc.)

**For This Codebase**:
- All bash scripts use `set -euo pipefail` (strict mode)
- Uninitialized variables = instant crash
- AI suggestions that miss this = production bugs
- Always parse/validate inputs BEFORE using them in calculations

**Lesson**: AI agents (including me) generate code without full execution context. Treat ALL AI suggestions as potentially buggy until you've read the full code path and tested it. Piecemeal changes waste more time than they save.

---

### 16. Exit Code Masking Breaks CI/CD

**THE TRAP**: Using `|| echo 'message'` in npm scripts to make them "user-friendly" masks failures and breaks automation.

**What Happened**:
- Added npm script: `"shellcheck": ".venv/bin/pre-commit run shellcheck --all-files || echo 'Fix shellcheck warnings above'"`
- Also found: `"test:scripts": "for test in tests/*.sh; do $test || true; done"`
- Intent: show helpful message when shellcheck fails / keep running tests even if one fails
- Reality: `|| echo` and `|| true` always exit 0, so failures are masked
- Result: CI sees success even when commands fail

**Why This Breaks**:
```bash
# Pattern 1: Helpful message masks failure
command-that-fails || echo 'Helpful message'
# Exit code: 0 (success!) even though command failed

# Pattern 2: Continue-on-error masks failures
for test in tests/*.sh; do $test || true; done
# Exit code: 0 even if tests fail

# The || operator runs the right side when left fails,
# and the overall exit code is from the right side
```

**Impact**:
- ❌ CI/CD doesn't detect failures
- ❌ Pre-commit hooks appear to pass when they fail
- ❌ Bugs slip through automated checks
- ❌ Developers think tests passed when they didn't

**The Fix**:
```bash
# Option 1: Let exit code propagate (preferred for single commands)
"shellcheck": ".venv/bin/pre-commit run shellcheck --all-files"

# Option 2: Show message AND exit with failure code
"shellcheck": ".venv/bin/pre-commit run shellcheck --all-files || { echo 'Fix shellcheck warnings above'; exit 1; }"

# Option 3: Capture failures in loops, exit non-zero at end
"test:scripts": "status=0; for test in tests/*.sh; do $test || status=1; done; exit $status"

# Option 4: Only mask specific expected failures (if/then/else)
"test:php": "if command -v php >/dev/null; then phpunit; else echo 'PHP not available - skipping'; fi"
```

**When `|| echo` Is Acceptable**:
- ✅ Informational commands that can't fail: `echo 'Starting tests...' || true`
- ✅ Optional cleanup that shouldn't block: `rm -f /tmp/cache || true`
- ✅ **Never** acceptable for validation/testing commands

**Red Flags**:
- ❌ `|| echo` after linters (eslint, shellcheck, prettier --check)
- ❌ `|| echo` after test commands (jest, phpunit, pytest)
- ❌ `|| echo` after build commands (webpack, vite, tsc)
- ❌ `|| true` in test loops (masks individual test failures)
- ❌ Any `|| command` where the command always succeeds

**For This Codebase**:
- npm scripts are used in CI (release.yml workflow)
- Exit codes determine if release proceeds
- Masking failures = shipping bugs to production
- Pre-commit tools already provide good error messages

**Lesson**: Exit codes are how programs communicate success/failure to automation. Using `|| echo` to make scripts "friendly" breaks this contract and defeats automated quality checks. Trust the tool's native error messages—they're usually good enough.

---

### 17. Debug Output Conflicts With Strict Test Settings

**THE TRAP**: Adding helpful echo/print statements during development, then forgetting they conflict with strict quality settings.

**What Happened**:
- Added `echo "PHPUnit Bootstrap Complete\n";` to `tests/php/bootstrap.php`
- Intent: confirm bootstrap loaded successfully during development
- But phpunit.xml has `beStrictAboutOutputDuringTests="true"`
- Output during tests = risky/failing tests (depending on PHPUnit version)

**Why This Matters**:
```php
// bootstrap.php
echo "PHPUnit Bootstrap Complete\n";  // ❌ Violates beStrictAboutOutputDuringTests

// phpunit.xml
beStrictAboutOutputDuringTests="true"  // Enforces clean output
```

**Impact**:
- ⚠️ Tests may be marked as risky
- ⚠️ CI may reject test runs
- ⚠️ Debugging output clutters test output
- ⚠️ Silent failures as strictness settings are ignored

**Common Conflicts**:
- PHPUnit: `beStrictAboutOutputDuringTests="true"` + echo/print/var_dump
- Jest: `--silent` mode + console.log
- pytest: `-W error` + print statements
- ESLint: `no-console` rule + console.log
- Git hooks: pre-commit checks + echo in scripts that run during commit

**When Debug Output Is Acceptable**:
- ✅ Guard behind env var: `if (getenv('DEBUG')) { echo ...; }`
- ✅ Use proper logging: PHPUnit's `$this->expectOutputString()`
- ✅ Debug mode flags: `if ($debug_mode) { ... }`
- ✅ Removed before commit (caught by review)

**Better Alternatives**:
```php
// Instead of echo in bootstrap:
// 1. Trust PHPUnit's error messages (they're good)
// 2. Use PHPUnit's built-in verbosity: phpunit -v
// 3. Check coverage reports for what's loaded
// 4. Add assertions in tests to verify setup

// If you MUST debug:
if (getenv('PHPUNIT_DEBUG')) {
    error_log("Bootstrap loaded"); // Goes to stderr, not stdout
}
```

**Red Flags**:
- ❌ `echo`/`print` in test bootstrap files
- ❌ `console.log` in production code when linter forbids it
- ❌ `var_dump`/`print_r` anywhere in committed code
- ❌ Debug comments like `// TODO: remove before commit`

**For This Codebase**:
- `phpunit.xml` has `beStrictAboutOutputDuringTests="true"`
- `failOnRisky="true"` means any risky test = CI failure
- Bootstrap file should be silent
- PHPUnit provides enough output without our help

**Lesson**: Development conveniences (debug echos, helpful messages) often conflict with strict quality settings added later. When you add strictness flags to configs (beStrictAboutOutputDuringTests, no-console, failOnWarning), audit the codebase for conflicting patterns. Better: avoid debug output in committed code altogether.

---

### 18. Check for Errors Proactively, Don't Wait for CI to Fail

**THE TRAP**: Not running `get_errors()` or validation checks before committing, then discovering errors only when CI fails.

**What Happened**:
- CI failed with TOML parse error: `pyproject.toml` missing required `project.version` field
- Error message: "TOML parse error at line 1, column 1... `project.version` field is neither set nor present in `project.dynamic` list"
- AI agent (me) didn't check for errors proactively
- User had to point out: "errors. You should have found these."

**Why This Happens**:
- AI agents focus on implementing features without validating the full workspace
- `get_errors()` tool exists but isn't used proactively
- We assume code is correct until proven otherwise
- CI catches what should have been caught during development

**Impact**:
- ⏰ Wasted time waiting for CI to run
- 🔄 Extra commit to fix validation errors
- 😤 User frustration at preventable errors
- 📉 Reduced confidence in AI assistance

**Common Validation Errors to Catch Early**:
- **pyproject.toml**: Missing `project.version` when using `[project]` table
- **package.json**: Invalid semver, missing required fields
- **composer.json**: Schema validation failures
- **YAML files**: Indentation errors, invalid syntax
- **TypeScript/ESLint**: Type errors, linting violations
- **PHP**: Parse errors, undefined functions

**The Fix: Proactive Error Checking**:
```bash
# BEFORE making changes:
get_errors()  # Check current error state

# AFTER making changes:
get_errors()  # Validate changes didn't introduce errors
get_errors(["/path/to/changed/file"])  # Focus on specific files

# When working on config files:
get_errors()  # Always validate after editing pyproject.toml, package.json, etc.
```

**Red Flags That You Skipped Error Checking**:
- ❌ CI fails with validation errors on first run
- ❌ User reports errors you could have found
- ❌ Making changes to config files without validation
- ❌ "Should be fine" assumptions without verification

**For This Codebase**:
- `pyproject.toml` requires `project.version` field (even though it's meaningless for this project)
- Added comment: `version = "0.1.0" # Required by TOML spec but meaningless for this project`
- All package files have schema requirements
- Always check errors after editing configuration

**Better Workflow**:
1. **Start**: Run `get_errors()` to understand current state
2. **Change**: Make your edits
3. **Validate**: Run `get_errors()` to catch issues immediately
4. **Test**: Run relevant test suites
5. **Commit**: Trust but verify with pre-commit hooks

**Lesson**: Proactive error checking is part of the AI agent's responsibility. Don't make users discover validation errors that CI will catch—find them yourself with `get_errors()` before committing. This is especially critical for configuration files (pyproject.toml, package.json, composer.json, YAML configs) that have schema requirements.

---

### 19. Always Validate Git References Before Using Them

**THE TRAP**: Using Git references like `HEAD~1` without verifying they exist, causing workflow failures.

**What Happened**:
- Release workflow uses `HEAD~1` as fallback for force pushes or workflow_dispatch
- `HEAD~1` doesn't exist for:
  - First commit in repository (no parent)
  - Shallow clones with depth=1
  - Rewritten history
- `detect-plugin-changes.sh` would fail the entire release job with "fatal: bad revision 'HEAD~1'"

**Why This Happens**:
- Git references are not guaranteed to exist
- `HEAD~1` assumes there's at least one parent commit
- `github.event.before` can be all zeros (0000...) for force pushes
- Workflow logic assumes safe defaults without validation

**The Pattern to Use**:
```bash
# WRONG: Assume reference exists
base_ref="HEAD~1"
git diff "$base_ref"..HEAD  # Will fail if HEAD~1 doesn't exist

# RIGHT: Validate reference, use safe fallback
base_ref="HEAD~1"
if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  echo "::warning::Reference $base_ref does not exist, comparing against empty tree"
  base_ref="4b825dc642cb6eb9a060e54bf8d69288fbee4904"  # Git's empty tree SHA
fi
git diff "$base_ref"..HEAD  # Now safe
```

**Safe Fallbacks**:
- **Empty tree SHA**: `4b825dc642cb6eb9a060e54bf8d69288fbee4904`
  - Special Git object representing empty repository
  - Always exists, even in brand new repos
  - Perfect for "compare against nothing" scenarios
- **Alternative**: `git diff-tree --no-commit-id --name-only -r HEAD`
  - Shows all files in current commit
  - Works even for first commit
  - But doesn't show "changes" - shows "all files"

**For GitHub Actions**:
```yaml
# Check github.event.before for edge cases
base_ref="${{ github.event.before }}"
if [[ "$base_ref" =~ ^0+$ ]]; then
  base_ref="HEAD~1"
fi

# Validate before using
if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  base_ref="4b825dc642cb6eb9a060e54bf8d69288fbee4904"  # Empty tree
fi

# Now safe to use
git diff "$base_ref"..HEAD
```

**Other Risky References**:
- `origin/main` - Might not be fetched in shallow clone
- `main` - Might not exist if branch is named `master`
- `HEAD^` / `HEAD~1` - Fails for first commit
- Tag names - Might not exist in all repositories
- Branch names - Might have been deleted/renamed

**Lesson**: Never assume Git references exist. Always validate with `git rev-parse --verify` before using them in scripts or workflows. Use Git's empty tree SHA (`4b825dc642cb6eb9a060e54bf8d69288fbee4904`) as a universal safe fallback for comparison operations. This prevents workflow failures in edge cases like first commits, shallow clones, or rewritten history.

---

### 20. Version Rollback from Tag-Based Versioning Bug

**THE TRAP**: Using git tags as the source of truth for current version when tag naming scheme changes, causing version rollback.

**What Happened**:
- Plugin files had version 0.5.0
- PR #65 merged to main with [minor] in commit message
- Release workflow ran `generate-version-matrix.sh`
- Script looked for tags matching `action-pack/v*` format (new scheme)
- Found ZERO tags (old tags were `v0.5.0`, not `action-pack/v0.5.0`)
- Defaulted to 0.0.0, applied [minor] bump → 0.1.0
- Overwrote production files from 0.5.0 → 0.1.0
- Created release with downgraded version

**Root Cause**:
- `generate-version-matrix.sh` used git tags as single source of truth
- Function `get_latest_plugin_version()` returned "0.0.0" when no tags matched new pattern
- Never checked actual version in plugin files
- Assumed tags were always up-to-date and correct

**Why This Is Dangerous**:
- Tag naming schemes can change during refactoring
- Tags can be deleted or recreated
- Fresh clones might not fetch all tags
- Git history can be rewritten
- Plugin files are the actual deployed artifacts

**The Fix**:
```bash
# WRONG: Use tags as source of truth
get_latest_plugin_version() {
    latest_tag=$(git tag --list "${plugin_slug}/v[0-9]*" | head -n1)
    if [[ -z "$latest_tag" ]]; then
        echo "0.0.0"  # ❌ Assumes version starts at 0.0.0
    fi
}

# RIGHT: Use plugin file as source of truth
get_current_plugin_version() {
    local plugin_name="$1"
    # Read version from actual plugin file
    "$REPO_ROOT/scripts/get-plugin-version.sh" "$plugin_name"
}
```

**Test Coverage Required**:
```bash
# Test that version comes from file, not tags
test "reads version from action-pack plugin file"
output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "patch bump")
current_version=$(echo "$output" | jq -r '.plugin[0].current_version')
assert_equals "0.5.0" "$current_version"  # Not 0.0.0!

# Test version bump is applied to file version
test "applies minor bump to file version"
output=$("$SCRIPT_PATH" "emfn-action-pack-plugin" "[minor] new feature")
assert_equals "0.5.0" "$(echo "$output" | jq -r '.plugin[0].current_version')"
assert_equals "0.6.0" "$(echo "$output" | jq -r '.plugin[0].next_version')"
```

**Source of Truth Hierarchy**:
1. **Plugin file Version header** - What's actually deployed
2. **Git tags** - Historical markers, can drift or change
3. **Hardcoded defaults** - Last resort only

**For This Codebase**:
- Created `tests/scripts/test-generate-version-matrix.sh` with 13 tests
- Tests verify version reads from plugin file (0.5.0), not tags (0.0.0)
- Tests verify version bumps apply to file version, not default version
- Changed `generate-version-matrix.sh` to use `get-plugin-version.sh`

**Red Flags You're Making This Mistake**:
- ❌ Script defaults to "0.0.0" or "1.0.0" when tags don't exist
- ❌ Version detection relies solely on git tag patterns
- ❌ No validation against actual file versions
- ❌ Tag naming scheme refactoring breaks versioning
- ❌ Fresh clone + workflow run produces different version than expected

**Lesson**: The plugin file is the source of truth for current version, not git tags. Tags are historical markers that can become stale, be deleted, or not match current naming schemes. Always read the current version from the actual artifact being released (the plugin file), then calculate bumps from there. Test this behavior explicitly to prevent silent version rollbacks during deployment.

---

## 🛠️ Development Workflow Best Practices

### Before Committing

```bash
# Run all checks locally (same as pre-commit hooks)
npm run lint           # prettier, eslint, shellcheck, notebooks
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
grep -E 'version|Version' plugins/*/emfn-action-pack-plugin.php plugins/*/readme.txt
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
9. **Never skip `get_errors()` after editing config files** - CI will catch what you miss

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

**Last Updated**: June 11, 2026  
**Lessons Learned From**: Setting up complete test infrastructure, fixing pre-commit hooks, eliminating PHPUnit deprecations, debugging version number corruption, optimizing devcontainer setup, proactive error validation, Git reference validation in CI/CD workflows, preventing version rollback from tag-based versioning bugs
