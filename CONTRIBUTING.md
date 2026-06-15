# Contributing to Emergency Mode News

This guide covers the development workflow, code quality standards and testing practices for the EMFN codebase.

| badge | status |
| --- | --- |
| Tests on `main` & `staging` | [![CI](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml) |
| Dev Container | [![Dev Container](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml) |

**Before making changes**: Read [AGENT.md](AGENT.md) for lessons learned about creating release-ready code. It documents common pitfalls that cause code to work locally but fail in CI/CD.

## Quick Start

### Development Environment Setup

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

**`.editorconfig`** - Cross-editor consistency (2 spaces, LF line endings, UTF-8, max line length 80-120)

**`.vscode/settings.json`** - VS Code workspace preferences:
- Prettier as default formatter
- Format on save enabled
- ESLint enabled for linting (not formatting)
- Line rulers at 100 and 120 characters
- Language-specific formatter settings

### Formatting

**`.prettierrc`** - Prettier configuration:
- Print width: 100 characters
- Tab width: 2 spaces (spaces, not tabs)
- Semicolons required
- Double quotes
- Trailing commas (ES5)
- Arrow function parens: avoid
- LF line endings

**`.prettierignore`** - Files excluded from formatting:
- Build outputs (`dist/`, `build/`, `vendor/`, `node_modules/`)
- Markdown files (for now)
- Minified files (`*.min.js`, `*.min.css`)
- WordPress core files

### Linting

**`eslint.config.js`** - ESLint for JavaScript:
- Plugin JavaScript validation
- JSDoc comment linting
- TypeScript-aware parsing (for type checking)

**`shellcheck`** - Bash script linting via pre-commit hook

**PHPUnit strict mode** - Configured in `phpunit.xml`:
- Fail on warnings
- Fail on risky tests
- Strict about output during tests
- Strict about todo-annotated tests

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
npm run format:check      # Verify Prettier formatting
npm run format            # Auto-fix Prettier formatting
npm run eslint            # Lint JavaScript
npm run eslint:fix        # Auto-fix JavaScript issues
npm run shellcheck        # Lint shell scripts
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

See [AGENT.md](AGENT.md) for common testing gotchas and troubleshooting.

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

## Coding Standards

### General

- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix custom functions, classes, hooks with `emfn_` to reduce conflicts
- Use phpDoc comments for WordPress plugin headers and function documentation
- JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`

### Code Samples in Documentation

- Use 2 spaces for indentation (not tabs), even for PHP code samples
- Keep comments concise and actionable
- Only use Oxford commas when essential for clarity

### Version Management

**Never manually edit version numbers** - the automated release workflow handles this.

All version references are synced automatically on merge to `main` via `scripts/sync-release-version.sh`:
- Plugin PHP headers (`Version:` field)
- Plugin PHP constants (`EMFN_*_PLUGIN_VERSION`)
- Plugin `readme.txt` stable tags
- Plugin `readme.txt` changelog entries

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

## Pull Request Guidelines

### Before Opening a PR

1. Read [AGENT.md](AGENT.md) to avoid common mistakes
2. Run `npm run lint` and fix all issues
3. Run `npm run test:all` and ensure all tests pass
4. Verify pre-commit hooks are installed and passing
5. Check that notebooks are clean (no execution outputs)

### CI Checks

All PRs must pass these checks before merging:

1. **Lint checks**: Prettier, ESLint, shellcheck, notebook cleanliness
2. **JavaScript tests**: Jest
3. **PHP tests**: PHPUnit
4. **Shell script tests**: Bash test framework

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
- `[minor]` or `minor:` or `feat:` → Minor version bump (1.0.0 → 1.1.0)
- Default → Patch version bump (1.0.0 → 1.0.1)

## Release Process

Releases are fully automated on merge to `main`. See [README.md](README.md#automated-release-workflow) for details.

### GitHub Workflows Comparison

| Aspect | `ci.yml` | `release.yml` |
|--------|----------|---------------|
| **Triggers** | PRs + pushes to `main`/`staging` | Pushes to `main` only |
| **Permissions** | Read-only | Write (`contents: write` via `RELEASE_TOKEN`) |
| **Purpose** | Validate changes before merge | Create versioned releases |
| **Actions** | Lint + test | Lint + test + version bump + build + release |
| **Outputs** | GitHub Checks status | GitHub Release with ZIPs |
| **Blocks merge** | Yes (must pass) | No (runs after merge) |
| **Safe for auto-merge** | Yes | N/A (only runs on main) |

**Required secrets**: `RELEASE_TOKEN` with `contents: write` permission to bypass branch protection when committing version changes.

**Developer workflow**:
1. Open PR against `main`
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

### Common Issues

**Pre-commit hooks not running**:
```bash
pre-commit install
pre-commit run --all-files  # Test manually
```

**Formatting inconsistencies**:
```bash
npm run format  # Auto-fix with Prettier
```

**Tests passing locally but failing in CI**:
- Check [AGENT.md](AGENT.md) for local vs CI differences
- Verify strict mode settings (exit codes, output suppression)
- Test in devcontainer to match CI environment

**Notebook has outputs after `notebooks:strip`**:
- Check that notebook is saved
- Manual clean: Open in Jupyter → Cell → All Output → Clear

## Getting Help

- **Technical patterns**: Consult [AGENT.md](AGENT.md)
- **WordPress plugin development**: Use `@EMFNAgent` (see `.github/agents/README.md`)
- **Repository structure**: See [README.md](README.md)
- **Testing strategy**: See [tests/TESTING_PLAN.md](tests/TESTING_PLAN.md)
