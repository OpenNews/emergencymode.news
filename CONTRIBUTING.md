# Contributing to Emergency Mode News

This guide covers the development workflow, code quality standards and testing practices for the EMFN codebase.

| badge | status |
| --- | --- |
| Releases on `main` | [![Release](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml) |
| `.devcontainer` healthcheck | [![Dev Container](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml) |
| Tests on `staging` | [![CI](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml/badge.svg?branch=staging)](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml) |
| Tests on `main` | [![CI](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml) |
| CodeQL on `main` | [![CodeQL](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql) |
| CodeQL on `staging` | [![CodeQL](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql/badge.svg?branch=staging)](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql) |
| Dependabot on `main` | [![Dependabot Updates](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates) |
| Dependabot on `staging` | [![Dependabot Updates](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates/badge.svg?branch=staging)](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates) |

## Quick Start

### Development Environment Setup

**Branch workflow**: We prefer working directly on `staging` and opening PRs from `staging` to `main`, or opening separate feature branch PRs to `main`. If only one developer is working at a time, working directly on `staging` may suffice.

**Recommended**: Use the VS Code devcontainer for a consistent, fully-configured environment.

```bash
# Container automatically runs .devcontainer/setup.sh which:
# - Installs pinned uv version (0.5.10) with SHA256 verification
# - Installs shellcheck and GitHub CLI
# - Configures Python, Node.js, PHP environments

# After container starts, install dependencies:
npm install
composer install --prefer-dist --no-progress
uv sync
```

**Manual setup** (if not using devcontainer):

```bash
# Install dependencies
npm install                                  # Node.js packages
composer install --prefer-dist --no-progress  # PHP packages
pip install uv                               # Python package manager
uv sync                                      # Python packages

# Install pre-commit hooks
uv tool install pre-commit
pre-commit install
```

### Verify Setup

```bash
npm run lint        # Run all linters
npm run test:all    # Run all tests
```

## Devcontainer

### What It Is

The devcontainer provides a **consistent, reproducible development environment** that matches the CI/CD environment. It's a Docker container configured specifically for EMFN development with all required tools, language runtimes and VS Code extensions pre-installed.

**Why use it:**
- **Consistency**: Same environment for all developers and CI/CD
- **Fast setup**: One-click environment without manual tool installation
- **Isolation**: Project dependencies don't conflict with your system
- **Matching CI**: Same Debian/Python/Node/PHP versions as GitHub Actions
- **Pre-configured**: Editor settings, extensions and linters work immediately

### How to Use It

**VS Code:**
1. Install [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this repository in VS Code
3. Click "Reopen in Container" when prompted (or use Command Palette → "Dev Containers: Reopen in Container")
4. Container builds and opens with everything configured

**GitHub Codespaces:**
- Click "Code" → "Codespaces" → "Create codespace on staging/main"
- Same devcontainer configuration runs in the cloud

**First-time setup after container starts:**
```bash
npm install
composer install --prefer-dist --no-progress
uv sync
pre-commit install
```

### What's Inside

**Base image**: `mcr.microsoft.com/devcontainers/python:3.13`
- Debian GNU/Linux 13 (trixie)
- Python 3.13 with pip and venv
- Git, curl, wget, standard Unix tools

**Installed Features** (via `.devcontainer/devcontainer.json`):
- **Node.js LTS**: JavaScript runtime and npm package manager
- **PHP 8.3 with Composer**: PHP runtime and dependency manager

**Post-create setup** (`.devcontainer/setup.sh`):

The setup script runs automatically after container creation and installs:

1. **Pinned uv version (0.5.10)**:
   - Downloads from GitHub releases with architecture-specific SHA256 verification
   - Supports x86_64 and aarch64 architectures
   - Installs to `~/.local/bin` for user-space isolation
   - Deterministic: same version across all environments
   - If uv is already installed at correct version, skips download

2. **Shellcheck**: Bash script linter
   - Required for `npm run shellcheck` and pre-commit hooks
   - Installed via apt if not present

3. **GitHub CLI (`gh`)**: GitHub API and workflow tools
   - Used in release scripts and automation
   - Installed via apt if not present

**VS Code Extensions** (auto-installed via `devcontainer.json`):

**Python:**
- `ms-python.python` - Python language support
- `ms-python.autopep8` - Python formatting
- `ms-toolsai.jupyter` - Jupyter notebook support
- `ms-toolsai.jupyter-keymap` - Jupyter keyboard shortcuts
- `ms-toolsai.jupyter-renderers` - Rich output rendering
- `ms-toolsai.vscode-jupyter-cell-tags` - Cell tagging
- `ms-toolsai.vscode-jupyter-slideshow` - Slideshow mode

**PHP:**
- `devsense.phptools-vscode` - PHP IntelliSense
- `devsense.intelli-php-vscode` - Advanced PHP features
- `devsense.composer-php-vscode` - Composer integration
- `devsense.profiler-php-vscode` - PHP profiling

**JavaScript/Formatting:**
- `esbenp.prettier-vscode` - Prettier formatter
- `dbaeumer.vscode-eslint` - ESLint linter
- `orta.vscode-jest` - Jest test runner

**Infrastructure:**
- `redhat.vscode-yaml` - YAML language support (for workflows)
- `github.vscode-pull-request-github` - GitHub PR integration

**Environment variables**:
- `$BROWSER` - Command to open URLs in host's default browser (useful for test reports, documentation)
- Python interpreter path set to `.venv/bin/python`

### Configuration Files

**`.devcontainer/devcontainer.json`**:
- Defines base image and features
- Lists VS Code extensions to install
- Sets post-create command to run setup script
- Configures VS Code settings (Python interpreter path)

**`.devcontainer/setup.sh`**:
- Bash script with `set -e` (fail fast)
- Idempotent: safe to run multiple times
- Architecture-aware (x86_64/aarch64)
- SHA256 verification for security
- Graceful handling of already-installed tools

### Customization

**Personal extensions**: Use VS Code's extension sync or install manually. They persist across container rebuilds.

**Local modifications**: Edit `.devcontainer/devcontainer.json` locally (gitignored changes won't commit).

**Rebuild container**: Command Palette → "Dev Containers: Rebuild Container" after changing configuration.

### Troubleshooting

**Container won't start:**
- Check Docker is running
- Try "Dev Containers: Rebuild Container Without Cache"
- Check Docker has enough disk space

**Setup script fails:**
- Check internet connectivity for downloads
- Verify GitHub releases are accessible
- Check architecture is supported (x86_64 or aarch64)

**Extensions not loading:**
- Rebuild container to refresh extension installation
- Check extension marketplace is accessible

**Wrong Python interpreter:**
- VS Code should auto-detect `.venv/bin/python`
- Manually select: Command Palette → "Python: Select Interpreter"

**Tools not in PATH:**
- Reload terminal window or start new terminal
- Check `~/.local/bin` is in PATH for uv

### Manual Setup Alternative

If not using devcontainer, see the **Manual setup** section at the top of this document. You'll need to install:
- Node.js LTS
- PHP 8.3 with Composer
- Python 3.13 with pip
- uv (Python package manager)
- shellcheck
- GitHub CLI (optional, for release workflows)

The devcontainer ensures these versions match CI/CD exactly.

## Code Quality Configuration

### Editor Configuration

| File/Tool | Purpose | Key Configuration |
|-----------|---------|-------------------|
| `.editorconfig` | Cross-editor consistency | 2 spaces, LF line endings, UTF-8, etc |
| `.vscode/settings.json` | VS Code workspace preferences | Prettier as default formatter, format on save enabled, etc |
| `.prettierrc` | Formatting | (Prettier configuration) 2 spaces, 100 chars, semicolons, etc |
| `.prettierignore` | Files excluded from formatting | Build outputs, Markdown, WordPress core files, etc |
| `eslint.config.js` | Linting | (ESLint for JavaScript) JS validation, JSDoc comments, TypeScript parsing |
| `shellcheck` | Bash script linting | Via pre-commit hook |
| `phpunit.xml` | PHPUnit strict mode | Fail on warnings, fail on risky tests, strict modes, etc |

## Development Workflow

### Before Committing

Pre-commit hooks automatically run on `git commit`:

1. **Prettier formatting** - Auto-formats HTML, CSS, JS, JSON, YAML, Markdown
2. **Shellcheck** - Lints bash scripts with `-x` flag (follow sourced files)
3. **ESLint** - Auto-fixes JavaScript issues
4. **YAML schema validation** - Validates GitHub workflow files against schema
5. **Notebook output stripping** - Removes execution state from notebooks
6. **Notebook cleanliness check** - Fails if notebooks still have output

**Manual pre-commit run**:
```bash
pre-commit run --all-files
```

### Running Linters

```bash
# All checks
npm run lint

# Individual checks
npm run format:check           # Verify Prettier formatting
npm run format                 # Auto-fix Prettier formatting
npm run eslint                 # Lint JavaScript
npm run eslint:fix             # Auto-fix JavaScript issues
npm run shellcheck             # Lint shell scripts
npm run notebooks:check-clean  # Verify notebooks are clean
```

### Running Tests

```bash
# All tests
npm run test:all

# By type
npm run test:js           # Jest (JavaScript)
npm run test:php          # PHPUnit (PHP)
npm run test:scripts      # Shell script tests

# With coverage
npm run test:js:coverage      # Coverage in terminal
npm run test:php:coverage     # HTML report in coverage/php/

# Watch mode (Jest)
npm run test:js:watch
```

**Viewing Coverage Reports:**

After running `npm run test:php:coverage`, open the HTML report in your browser:

```bash
# Devcontainer (uses host's default browser)
"$BROWSER" coverage/php/index.html

# Manual open
open coverage/php/index.html      # macOS
xdg-open coverage/php/index.html  # Linux
start coverage/php/index.html     # Windows
```

The report provides line-by-line coverage highlighting, function/class percentages and clickable navigation.

**Test Infrastructure**:
- **JavaScript**: Jest with JSDom, test files in `tests/js/**/*.test.js`
- **PHP**: PHPUnit with WordPress stubs, test files in `tests/php/**/*Test.php`
- **Shell**: Custom bash framework in `tests/scripts/test-helpers.sh`

**Test Fixtures**:
- `tests/fixtures/payload-test-cases.json` - Action Pack encoding/decoding
- `tests/fixtures/location-test-data.json` - Geolocation resolution
- `tests/fixtures/test-categories.csv` - Category mapping

See [AGENT_LESSONS.md](AGENT_LESSONS.md) for common testing gotchas and troubleshooting.

### Notebook Workflow

```bash
uv sync              # Sync Python dependencies
uv run jupyter lab   # Start Jupyter Lab
```

**After editing notebooks**:
```bash
npm run notebooks:strip       # Remove execution outputs
npm run notebooks:check-clean # Verify no outputs remain
```

Notebooks automatically run `uv sync` and environment verification via `shared_setup.py` in early cells.

## Dependency Management

### Python (Notebooks)

Python dependencies are managed with `uv` and defined in `pyproject.toml` using compatible release constraints (`~=`), allowing patch and minor version updates while keeping major versions stable.

**Setup:**
```bash
# From repo root
uv sync
```

**Within notebooks:**
- Cell 2 runs `uv sync` to keep the environment in sync with `uv.lock`
- Cell 3 (using `shared_setup.py`) verifies the environment is healthy; output will recommend next steps if issues are detected
- Each notebook's output will guide you through any upgrades needed

See [notebooks/README.md](notebooks/README.md) for details on the shared setup utilities.

### JavaScript / npm

Plugin dependencies and dev tools are managed via `npm` with Dependabot automation for regular updates.

```bash
npm install
```

### GitHub Actions & Dependabot

Dependency automation is configured in [.github/dependabot.yml](.github/dependabot.yml):

| Ecosystem | Frequency | Notes |
|-----------|-----------|-------|
| `npm` | Weekly | Plugin production dependencies + dev tools |
| `github-actions` | Weekly | Workflow & CI/CD tool updates (if available) |
| `pip` | Disabled | Python deps manually maintained (notebooks are rarely used) |

## Data Analysis Notebooks

The `notebooks/` directory contains Python workflows that generate and validate NRI risks at use in the Action Pack plugin.

**Current notebooks:**

- `US_disaster_risk_analysis.ipynb` — Downloads FEMA NRI data and generates per-state CSVs for all 50 US states plus DC
- `CA-MX_disaster_risk_analysis.ipynb` — Stub, exploring Canada and Mexico data; does not currently generate runtime output

**Setup:**
Each notebook runs `uv sync` on startup to ensure dependencies are in sync, then verifies the environment is healthy via `shared_setup.py`.

**Output location:**
- `plugins/emfn-action-pack-plugin/assets/data/` (51 US state + DC CSVs)
- `notebooks/cache/` (cached FEMA source downloads)

**Managing dependencies:**
See the [Dependency Management](#dependency-management) section above, or refer to [notebooks/README.md](notebooks/README.md) for detailed dependency management instructions.

The notebooks are managed with `uv` and are not deployed to WordPress—they support data generation and validation only.

## Coding Standards

### General

- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix custom functions, classes, hooks with `emfn_` to reduce conflicts
- Use phpDoc comments for WordPress plugin headers and function documentation
- JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`

### Version Management

**Please do not manually edit version numbers** - the automated release workflow handles this.

All version references are synced automatically on merge to `main` via `scripts/sync-release-version.sh`.

**Version sync safeguards**:
- Validates semver format (X.Y.Z)
- Rejects unrealistic version components (> 10.99.99)
- Checks against latest GitHub release (blocks major version jumps > 1)
- Prevents version downgrades
- Can bypass checks with `--force` flag (emergency fixes only)

**Manual version sync** (emergency fixes only):
```bash
./scripts/sync-release-version.sh 1.2.3
./scripts/sync-release-version.sh --force 1.2.3  # Bypass GitHub check
```

You can probably craft new releases and mess with version numbers via GitHub.com's release-authoring mechanism. But it'll probably throw errors and be a big headache so please don't. 

## Pull Request Guidelines

### Before Opening a PR

1. Run `npm run lint` and fix all issues
1. Run `npm run test:all` and ensure all tests pass
1. Verify pre-commit hooks are installed and passing
1. Check that notebooks are clean (no execution outputs)
1. If you're comfortable with it, ask an AI Agent to do a pre-Review check on everything, and run all checks and tests it thinks should be run (remind it to look at its history of self-invested problems in AGENT_LESSONS.md)

### CI Checks

All PRs must pass these checks before merging:

1. **Lint checks**: Prettier, ESLint, shellcheck, notebook cleanliness
1. **JavaScript tests**: Jest
1. **PHP tests**: PHPUnit
1. **Shell script tests**: Bash test framework
1. **Dependency Review** (on PRs to `main`): Scans for dependency vulnerabilities and license issues
   - Fails on low severity vulnerabilities or higher
   - Denies AGPL-3.0 and SSPL-1.0 licenses
   - Allows GPL/LGPL (common in WordPress ecosystem)
   - Comments on PR with findings

It'll probably reject your commits if any of these are failing, but it won't say which.

**Additional security scanning**:

- **CodeQL Analysis**: Runs on pushes to `main`, PRs to `main`, and weekly (Tuesdays 6am UTC)
  - Analyzes GitHub Actions workflows for security issues
  - Requires `ENABLE_CODEQL_ADVANCED` repository variable to be set to `'true'`
  - Results appear in GitHub Security tab

### Code Review

**GitHub Copilot Reviews**: This repository is configured to automatically request Copilot code reviews on PRs to `staging` when they're marked as ready for review.

**Using Copilot for review**:
- Copilot will analyze your changes and provide feedback on potential issues, code quality, and best practices
- Review Copilot's comments and address any concerns before merging
- You can manually request a Copilot review at any time using the GitHub UI

**Human review**: While Copilot provides automated feedback, human review is still valuable for:
- Architecture and design decisions
- Business logic validation
- WordPress-specific patterns and practices
- User experience considerations

### Commit Messages

Use conventional commits format (preferred):
```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add test coverage
chore: update dependencies
```

Commit message prefixes affect version bumping:
- `[major]` or `major:` → Major version bump (1.0.0 → 2.0.0)
- `[minor]` or `minor:` → Minor version bump (1.0.0 → 1.1.0)
- `[patch]` or `patch:` → Patch version bump (1.0.0 → 1.0.1) -- the default
- `[pre]` → Marks release as pre-release with `-pre` suffix (e.g., 1.0.1-pre) 

## Release Process

Releases are fully automated on merge to `main`. See [README.md](README.md#automated-release-workflow) for details.

### GitHub Workflows Comparison

| Aspect | `ci.yml` | `release.yml` |
|--------|----------|---------------|
| **Triggers** | PRs + pushes to `main`/`staging` | Pushes to `main` only |
| **Permissions** | Read-only | Write (`contents: write` via `RELEASE_TOKEN`) |
| **Purpose** | Validate changes before merge | Create versioned releases |
| **Actions** | Lint + test | Lint + test + detect plugin changes + version bump (maj, min, pre, patch) + build + release |
| **Outputs** | GitHub Checks status | GitHub Release with ZIPs |
| **Blocks merge** | Yes (must pass) | No (runs after merge) |
| **Safe for auto-merge** | Yes | N/A (only runs on main) |

**Required secrets**: `RELEASE_TOKEN` with `contents: write` permission to bypass branch protection when committing version changes. This is set at the org level for OpenNews. If we move orgs, it will need to be set up again.

**Developer workflow**:
1. Work on `staging` or open a PR against `staging`
2. CI runs automatically
3. Merge PR (after approval + passing CI)
4. Release workflow automatically:
   - Runs lint and tests
   - Detects changed plugins
   - Bumps version based on commit messages
   - Syncs version across all files
   - Builds plugin ZIPs
   - Creates GitHub release with ZIPs

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Getting Help

- **WordPress plugin development**: Use `@EMFNAgent` (see `.github/agents/README.md`)
- **Repository structure**: See [README.md](README.md)
- **Testing strategy**: See [tests/TESTING_PLAN.md](tests/TESTING_PLAN.md)
