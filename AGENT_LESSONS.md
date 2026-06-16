# Agent Guide: Emergency Mode News

**Purpose**: Stop making the same mistakes every PR cycle. Think like code review.

**Note**: `/memories/repo/start-here.md` forces this into session context automatically. You'll see it.

---

## 🚨 READ THIS FIRST - Mandatory Session Start

**Before starting ANY work on this codebase**, complete this checklist:

```bash
# 1. Read this entire file
cat AGENT_LESSONS.md

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
**Pattern**: Document "NEVER use 9.9.9" in AGENT_LESSONS.md → immediately use 9.9.9 to test version validation
**Why**: AI doesn't naturally consult existing documentation/context before taking action
**Fix**: Before testing ANY functionality, grep for warnings about it: `grep -i "version\|9.9.9\|NEVER" AGENT_LESSONS.md`

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

### 7. Creating Lists Then Immediately Forgetting Them
**Pattern**: Present 14-item prioritized plan to user → user asks about item #5 → cannot find item #5 → user must copy/paste it back → repeat for items #6, #7, etc.
**Why**: Long assistant messages get truncated in conversation history, but the AI doesn't realize its own output was truncated and cannot access it
**Fix**: 
- DO NOT FORGET key lists as we work through sub-items
- When creating multi-item plans, save them to session memory IMMEDIATELY: `memory create /memories/session/current-plan.md`
- When user references "the prior list" or "item #N", check session memory FIRST before asking user to repeat
- If you presented a numbered plan and cannot find it in transcript, acknowledge the limitation and ask user to confirm what item N was about (don't waste time searching unsuccessfully)
- For large plans (>10 items), break into phases rather than one giant list that will be truncated

### 8. Implementing the REQUEST Without Understanding the PROBLEM
**Pattern**: Create GitHub Actions workflow to build devcontainer → successfully writes workflow file → fails in CI with "unauthorized: unauthenticated" because missing `packages: write` permission
**Why**: Focused on technical implementation (workflow syntax) without thinking through execution requirements (what permissions does pushing to GHCR need?)
**Fix**: Before implementing ANY infrastructure code, ask:
- What external services does this interact with? (GHCR, npm registry, AWS, etc.)
- What permissions/credentials does it need? (GitHub token scopes, API keys, etc.)
- What resources does it access? (write to registry, create releases, modify repo, etc.)
- What could make authentication/authorization fail? (missing scopes, token expiry, IP restrictions, etc.)

**Examples**:
- ❌ "Create workflow to push Docker image" → ✅ "Workflow needs `packages: write` to push to GHCR"
- ❌ "Add npm publish step" → ✅ "Needs NPM_TOKEN secret with publish scope"
- ❌ "Create GitHub release" → ✅ "Needs `contents: write` permission"
- ❌ "Deploy to S3" → ✅ "Needs AWS credentials with s3:PutObject permission"

**The distinction**: REQUEST = "build this thing", PROBLEM = "this thing needs X, Y, Z to actually work in production"

### 9. Duplicating Functionality Instead of Reading What Already Exists
**Pattern**: Add full test suite to devcontainer.yml workflow → workflow hangs on tests → realize ci.yml already runs the full test suite
**Why**: Focused on making ONE file "complete" without mapping the overall system architecture
**Fix**: Before adding ANY functionality, grep for it across the codebase:
```bash
# What workflows already exist?
ls .github/workflows/*.yml

# What does each workflow do?
for f in .github/workflows/*.yml; do
  echo "=== $f ==="
  grep -A2 "^name:" "$f"
  grep -A5 "run:" "$f" | head -20
done

# Does something similar already exist?
grep -r "npm test\|composer test\|pytest" .github/workflows/
```

**Ask before implementing**: "What is this file's UNIQUE purpose vs other files?"
- ci.yml runs full tests on every commit → devcontainer.yml should NOT duplicate this
- devcontainer.yml tests the CONTAINER works → not the code quality
- release.yml bumps versions → scripts/*.sh should NOT also bump versions independently

**Examples of duplication waste**:
- ❌ "Make devcontainer.yml run full test suite" → ✅ "ci.yml already does this, devcontainer.yml should only test container tools"
- ❌ "Add version validation to multiple scripts" → ✅ "One script does validation, others call it"
- ❌ "Install dependencies in both Dockerfile and setup.sh" → ✅ "Pick one authoritative place"

**The meta-pattern**: Solving symptoms (file has errors) instead of understanding goals (what should this file uniquely accomplish?)

### 10. Generating "To-Do" Lists Without Tracking State
**Pattern**: Say "needs timeout fix" → implement timeout → regenerate list saying "needs timeout fix" → user points out it's already done → waste time
**Why**: AI doesn't maintain state of what's ALREADY DONE vs what STILL NEEDS doing when generating feedback
**Fix**: Before generating ANY list of issues/todos:
```bash
# Check CURRENT state first
git diff --cached     # What's staged?
git diff             # What's modified?
cat file.yml | grep "timeout-minutes"  # Is this specific fix already in?
```

**When generating "anticipated feedback" or "remaining issues"**:
- Read the CURRENT file state first
- Mark items as ✅ DONE or ❌ TODO based on actual code
- Don't copy/paste old lists - regenerate from current reality

**Examples of this waste**:
- ❌ "List says: Add timeout" → Timeout already on line 25 → "Why is that in the list?" → waste 3 turns
- ❌ "Still needs error handling fix" → Already removed 10 lines ago → user frustrated
- ❌ "Todo: remove duplication" → Duplication was removed in previous edit → circular discussion

**The impact**: User has to point out that the work is ALREADY DONE, burning their time and patience on meta-discussion instead of forward progress.

**The meta-lesson**: Check actual state before generating lists. Your mental model of "what needs fixing" lags behind the actual code.

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
4. Update `/memories/repo/start-here.md` if the mistake is critical enough to highlight in session startup

**Make it concrete**: Include the actual mistake (what was written), why it failed, and the correct pattern.

**Keep it abstract**: Focus on the class of mistake (exit code masking) not the specific instance (line 47 of script.sh).

**Both files work together**: Repo memory nags at session start → you read this comprehensive guide → you audit before coding → you avoid bugs.

---

## 📝 How to Write New Rules (Template)

**Ask first**: Is this a one-time bug or a repeating pattern across multiple PRs?
- **One-time bug** → Fix it, add a comment in the code, move on (don't document here)
- **Repeating pattern** → Document it using the template below

**Template for "Chronic AI Behavioral Patterns"**:

```markdown
### N. [Category Name - What Gets Done Wrong]
**Pattern**: [Concrete example of the mistake] → [What happens/fails]
**Why**: [Root cause - usually an AI limitation or assumption]
**Fix**: [Actionable step to prevent it, with command examples]
```

**Template for "Before Writing Any Code" constraints**:

```markdown
**[What to check]** ([why it matters]):
```bash
# ❌ WRONG - [what breaks]
[bad code example]

# ✅ RIGHT - [correct approach]
[good code example]
```
```

**Good rule characteristics**:
- ✅ **Timeless**: Describes a class of problem, not tied to specific code
- ✅ **Actionable**: Tells you what to DO (grep this, check that) not just what went wrong
- ✅ **Abstract + Concrete**: General pattern + specific example to illustrate
- ✅ **Root cause aware**: Explains WHY the mistake happens (AI behavior, environment assumption)
- ✅ **Teaches thinking**: Shows the thought process, not just the fix

**Bad rule characteristics**:
- ❌ **Bug report**: "In PR #66 line 47 had a typo" → This is too specific, will become irrelevant
- ❌ **Code-specific**: "generate-version-matrix.sh line 89 should use $major after line 85" → Brittle, breaks when code changes
- ❌ **Symptom-focused**: "Test failed" → Doesn't explain why or how to prevent
- ❌ **One-time event**: "Forgot to update README" → If it only happened once, it's not a pattern

**Decision tree for new entries**:

```
Is it repeating across multiple PRs/sessions?
├─ NO → Don't add to AGENT_LESSONS.md (one-time bug)
└─ YES → Is it about AI behavior or a technical constraint?
    ├─ AI behavior → Add to "Chronic AI Behavioral Patterns"
    │   └─ Ask: Does it represent a CLASS of thinking error?
    │       ├─ YES → Write it abstractly (e.g., "source of truth confusion")
    │       └─ NO → Too specific, skip it
    └─ Technical constraint → Add to "Before Writing Any Code"
        └─ Ask: Will this apply to future code or just current code?
            ├─ Future → Document the pattern (e.g., "exit codes are contracts")
            └─ Current only → Add inline comment to the code instead
```

**Example transformation** (bug report → good rule):

❌ **Too specific**: "In test-generate-version-matrix.sh, I used assert_equals twice after one test_start which made the test count show 17 passed but only 13 run"

✅ **Good rule**: 
```markdown
**Test frameworks have rules** (read helpers before writing tests):
# ❌ WRONG - multiple assertions skew test counts
test_start "test name"
assert_equals "foo" "$bar"
assert_equals "baz" "$qux"  # Each assert increments counters

# ✅ RIGHT - one assertion per test_start
test_start "test name"
assert_equals "foo" "$bar"

test_start "another test"
assert_equals "baz" "$qux"
```

**Keep it lean**: If 3 PRs have similar mistakes, abstract them into ONE pattern. Don't list all 3 separately.

---

**Last Updated**: June 11, 2026
