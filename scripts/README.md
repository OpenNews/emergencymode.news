# Scripts

Utility scripts for release management, notebook hygiene, and local testing.

## Release Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `sync-release-version.sh` | Sync version across plugin files (PHP header, readme.txt, package.json) | `./scripts/sync-release-version.sh [--force] [--plugin <name>] <version>` |
| `build-release-assets.sh` | Build production plugin ZIP with compiled assets | `./scripts/build-release-assets.sh [--plugin <name>] <version> <output-dir>` |
| `detect-plugin-changes.sh` | Detect changed plugins (outputs JSON array) | `./scripts/detect-plugin-changes.sh` |
| `generate-version-matrix.sh` | Generate GitHub Actions release matrix JSON | `./scripts/generate-version-matrix.sh` |
| `get-plugin-version.sh` | Extract version from plugin PHP file | `./scripts/get-plugin-version.sh [--plugin <name>]` |

**Notes:**
- `sync-release-version.sh` updates all version references (use `--force` to skip prompts)
- `build-release-assets.sh` compiles SASS, minifies JS, strips dev dependencies
- These run automatically in `.github/workflows/release.yml` on merge to `main`

## Notebook Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `strip-notebook-outputs.sh` | Remove execution state from notebooks | `./scripts/strip-notebook-outputs.sh [notebook.ipynb ...]` |
| `check-notebooks-clean.sh` | Validate notebooks have no outputs (CI check) | `./scripts/check-notebooks-clean.sh [notebook.ipynb ...]` |

**Notes:**
- Without arguments, processes all `notebooks/*.ipynb`
- `strip-notebook-outputs.sh` runs in pre-commit hook
- `check-notebooks-clean.sh` runs in CI to enforce clean commits

## Development & Testing

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-devcontainer-workflow.sh` | Test devcontainer build locally before CI | `./scripts/test-devcontainer-workflow.sh` |

**Notes:**
- Simulates `.github/workflows/devcontainer.yml` locally
- Verifies tool installations (uv, shellcheck, gh, node, npm, php, composer, python3)
- Tests dependency installation (npm ci, composer install)
- Run inside devcontainer to validate changes before pushing
