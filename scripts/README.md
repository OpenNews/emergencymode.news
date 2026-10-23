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
| `build-local-release.sh` | Preview ZIP of what merging to `main` would release, versioned `.alpha`, for uploading to the site by hand | `npm run release:site-styles` / `npm run release:action-pack` (add `-- minor` or `-- major` to match the merge message) |

**Notes:**
- `sync-release-version.sh` updates all version references (use `--force` to skip prompts)
- `build-release-assets.sh` compiles SASS, minifies JS, strips dev dependencies
- These run automatically in `.github/workflows/release.yml` on merge to `main`
- `build-local-release.sh` builds on your machine only. It uses the same version rule as the real release, then adds `.alpha` (site-styles 0.4.0 → `release/emfn-site-styles-plugin-0.4.1.alpha.zip`). The repo's files are not changed and nothing is committed or tagged; `release/` is gitignored

## Notebook Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `strip-notebook-outputs.sh` | Remove execution state from notebooks | `./scripts/strip-notebook-outputs.sh [notebook.ipynb ...]` |
| `check-notebooks-clean.sh` | Validate notebooks have no outputs (CI check) | `./scripts/check-notebooks-clean.sh [notebook.ipynb ...]` |

**Notes:**
- Without arguments, processes all `notebooks/*.ipynb`
- `strip-notebook-outputs.sh` runs in pre-commit hook
- `check-notebooks-clean.sh` runs in CI to enforce clean commits

## Dependency Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `check-tool-upgrades.sh` | Check available upgrades for TypeScript/ESLint tooling | `./scripts/check-tool-upgrades.sh` |

**Notes:**
- TypeScript and ESLint packages are not automatically updated by Dependabot to avoid version conflicts
- Run this script periodically (quarterly or before major refactoring) to check for available updates
- Shows current vs. latest versions for all tooling packages
- Provides copy-paste commands for manual updates

## Development & Testing

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-devcontainer-workflow.sh` | Test devcontainer build locally before CI | `./scripts/test-devcontainer-workflow.sh` |

**Notes:**
- Simulates `.github/workflows/devcontainer.yml` locally
- Verifies tool installations (uv, shellcheck, gh, node, npm, php, composer, python3)
- Tests dependency installation (npm ci, composer install)
- Run inside devcontainer to validate changes before pushing
