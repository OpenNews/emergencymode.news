# Agent Guide: Emergency Mode News

**Purpose**: Stop making the same mistakes every PR cycle. Think like code review.

---

## 🚨 READ THIS FIRST - Mandatory Session Start

**Before starting ANY work on this codebase**, complete this checklist:

```bash
# 1. Read this entire file
cat AGENT.md

# 2. Check current state
git status
git branch
npm run lint
npm run test:all

# 3. Understand what's in flight
cat .github/workflows/release.yml | head -50
ls -la tests/scripts/
grep -r "TODO\|FIXME" scripts/

# 4. Know the constraints
head -5 scripts/*.sh              # All have set -euo pipefail?
cat tests/scripts/test-helpers.sh # What test functions exist?
grep "beStrict\|failOn" phpunit.xml
```

**If you skip this**, you will:
- Call undefined functions (test_fail)
- Use uninitialized variables ($major)
- Mask exit codes (|| echo)
- Hardcode values that drift (0.5.0)
- Violate documented warnings (using 9.9.9)

**This is not optional.** Every HIGH priority bug in PR reviews came from skipping this audit.

**Also saved in**: `/memories/repo/start-here.md` (loaded automatically at session start)

---

## 🎯 The Core Problem: Small-Fix Rabbit Holes

**What keeps happening**: AI agents (me) solve individual problems in isolation without understanding the broader deployment context:
- Fix a bug in a script → don't check if it's called by CI workflows
- Add helpful error messages → don't realize they mask exit codes that automation depends on
- Write tests that pass locally → don't check if they violate strict mode settings in production
- Make code "user-friendly" → break the contracts that CI/CD systems expect

**The consequence**: Code works locally, passes local tests, but **fails in the actual release pipeline**:
- Scripts used in `.github/workflows/release.yml` must propagate exit codes (no `|| echo`)
- npm scripts in `package.json` run in CI - error handling matters for automation
- Test output strictness (`beStrictAboutOutputDuringTests`) fails builds even if tests pass
- Git operations in workflows need validated refs or they crash on first commits
- Version bumps in automated releases need to read from source of truth (files, not tags)

**The fix**: Before making ANY change, ask **"Where does this code run and what does the calling system expect?"**

Think holistically about the **full release process**:
1. Local development → pre-commit hooks → commit
2. Push to main → CI workflows → automated tests
3. Release workflow → version detection → build → tag → GitHub release
4. Any failure in this chain blocks deployment

**What "full context" means**:
- Read `.github/workflows/*.yml` to see how scripts are called in automation
- Check `package.json` to see if npm scripts are used in CI
- Look at strict mode settings (`set -euo pipefail`, `beStrictAbout*`, `failOn*`)
- Understand error propagation requirements (exit codes, output constraints)
- Think about edge cases automation will hit (empty refs, missing tags, first commit)

**Examples of holistic thinking**:
- ❌ "Add `|| echo 'message'` to make this script friendly" → ✅ "Is this script used in CI? Exit codes must propagate"
- ❌ "Use git tags to get current version" → ✅ "Tags can drift, plugin files are source of truth for releases"
- ❌ "Add debug output to help developers" → ✅ "Check phpunit.xml for output strictness first"
- ❌ "Use `HEAD~1` to get previous commit" → ✅ "First commit has no parent, workflow needs fallback"

**Stop fixing symptoms, understand the system**: Every bug caught in code review is a symptom of not auditing constraints before writing code.

---

## 🧠 Chronic AI Behavioral Patterns

**These mistakes repeat across PR cycles** - awareness is the first step to prevention:

### 1. Not Re-Reading Context Before Acting
**Pattern**: Document "NEVER use 9.9.9" in AGENT.md → immediately use 9.9.9 to test version validation
**Why**: AI doesn't naturally consult existing documentation/context before taking action
**Fix**: Before testing ANY functionality, grep for warnings about it: `grep -i "version\|9.9.9\|NEVER" AGENT.md`

### 2. Accepting AI-Generated Code Without Validation
**Pattern**: Copilot suggests using `$major` in calculation → I accept → script crashes because `$major` isn't initialized yet
**Why**: AI (including me) generates code in small chunks without tracing full execution flow
**Fix**: Read the ENTIRE function/script, not just the diff. Trace variable initialization order. Test with edge cases.

### 3. Git Assumptions That Work Locally But Fail in CI
**Pattern**: Use `HEAD~1` for previous commit → works in active dev → fails in CI on first commit (no parent)
**Pattern**: Use git tags to detect version → works after manual tagging → fails in fresh clone with different tag naming scheme
**Why**: Local environment has history, tags, and state that fresh clones/CI don't have
**Fix**: Validate refs exist (`git rev-parse --verify`), use fallbacks (empty tree SHA), prefer files over git state

### 4. Source of Truth Confusion
**Pattern**: Read version from git tags → tag naming changes → returns "0.0.0" → downgrades production version
**Hierarchy**: Files (actual artifacts) > Git tags (historical markers) > Defaults (last resort)
**Why**: Tags can be deleted, renamed, or drift from reality. Files are what actually deploy.
**Fix**: Always read from the artifact that will be released (plugin PHP file, package.json), not from git history

### 5. Local Success ≠ Deployment Success  
**Pattern**: Tests pass locally with helpful `|| echo` messages → CI sees exit code 0 even on failures → bugs ship to production
**Why**: Local is forgiving (manual inspection), automation is strict (exit codes are the ONLY signal)
**Fix**: Think about **who/what consumes this code**. Humans can read messages. CI only sees exit codes.

### 6. Missing Defense in Depth
**Pattern**: Add ONE safeguard (reject versions >10.99.99) → call it done → miss that tags can still cause version rollback
**Why**: Single safeguards catch single error types. Different failure modes need different safeguards.
**Fix**: Multiple layers: component size check + release comparison check + file-based source of truth

**The meta-lesson**: AI agents solve problems sequentially and forget context between turns. You must actively fight this by re-reading context, validating assumptions, and thinking about failure modes beyond the immediate fix.

---

## 🎯 Before Writing Any Code

**Audit the execution environment** (5 minutes prevents hours of debugging):

```bash
# 1. Check strict mode constraints
head -5 script.sh              # set -euo pipefail?
grep "beStrict\|failOn" *.xml  # PHPUnit strictness?
grep "error" eslint.config.js  # Linter strictness?

# 2. Check calling contracts
grep -r "script-name" .github/workflows/  # Used in CI? Exit codes matter?
grep "script-name" package.json           # npm script? Error handling?

# 3. Check existing patterns
cat test-helpers.sh            # Available functions?
ls tests/scripts/test-*.sh     # Existing test patterns?
grep "function_name" *.sh      # Already defined?
```

**Variables must be initialized before use** (bash `set -u` crashes on unset variables):
```bash
# ❌ WRONG - breaks with set -u
major_jump=$((major - latest_major))  # $major not initialized yet
IFS='.' read -r major minor patch <<< "$version"

# ✅ RIGHT - initialize first
IFS='.' read -r major minor patch <<< "$version"
major_jump=$((major - latest_major))
```

**Exit codes are contracts** (don't mask them):
```bash
# ❌ WRONG - masks failure, CI sees success
command || echo "helpful message"

# ✅ RIGHT - preserve exit code
command  # Let it fail naturally
# OR: command || { echo "message"; exit 1; }
```

**Test frameworks have rules** (read helpers before writing tests):
```bash
# ❌ WRONG - test_fail() doesn't exist, multiple assertions
test_start "test name"
assert_equals "foo" "$bar"
assert_equals "baz" "$qux"  # Skews test counts

# ✅ RIGHT - one assertion per test_start
test_start "test name"
assert_equals "foo" "$bar"

test_start "another test"
assert_equals "baz" "$qux"
```

**Hardcoded values drift** (use dynamic detection):
```bash
# ❌ WRONG - will break when version changes
assert_equals "0.5.0" "$current_version"

# ✅ RIGHT - read from source of truth
EXPECTED=$("$GET_VERSION_SCRIPT" "plugin-name")
assert_equals "$EXPECTED" "$current_version"
```

---

## 🚨 This Codebase Specifics

### Testing
- All bash scripts use `set -euo pipefail` - uninitialized vars crash
- Test framework pattern: `test_start "name"` → exactly ONE `assert_*`
- Error testing: `(cmd 2>/dev/null) && exit_code=$? || exit_code=$?; [[ $exit_code -ne 0 ]]; assert_success`

### Versions
- Source of truth: plugin PHP file Version header (not git tags)
- Never manually edit versions - use `scripts/sync-release-version.sh X.Y.Z`
- Safeguards: rejects >10.99.99, checks against latest GitHub release
- Multi-plugin: Independent versioning, separate tags (`action-pack/vX.Y.Z`, `site-styles/vX.Y.Z`)

### WordPress Plugins
- Singleton pattern via `get_instance()`
- Version synced across: PHP header, PHP constant, readme.txt
- Action Pack: Quiz logic, SASS builds, Newspack constraints
- Site Styles: Global CSS, no child theme pattern

### Development
```bash
npm run lint      # prettier + eslint + shellcheck + notebooks
npm run test:all  # js + php + shell tests
pre-commit install  # Auto-run checks
```

---

## 📋 Quick Checks

Before committing:
- [ ] Read test-helpers.sh if writing tests
- [ ] Check for `set -u` if using variables
- [ ] Verify exit codes propagate if script used in CI/npm
- [ ] Use dynamic values, not hardcoded expectations
- [ ] Run `npm run lint && npm run test:all`
- [ ] Check `get_errors()` after editing configs

---

## 🔄 Updating This Document

**When code review catches a new pattern** (or you catch yourself making a mistake):

1. Add to **"Chronic AI Behavioral Patterns"** section if it's a repeating behavioral issue
2. Add to **"Before Writing Any Code"** section if it's a technical constraint
3. Add to **"Quick Checks"** checklist if it's a pre-commit validation
4. Update `/memories/repo/start-here.md` if it changes session startup requirements

**Make it concrete**: Include the actual mistake (what was written), why it failed, and the correct pattern.

**Keep it abstract**: Focus on the class of mistake (exit code masking) not the specific instance (line 47 of script.sh).

---

**Last Updated**: June 11, 2026
