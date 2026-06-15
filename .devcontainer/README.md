# Development Container Configuration

| badge | status |
| --- | --- |
| Dev Container | [![Dev Container](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml) |
| Tests on `main` & `staging` | [![CI](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml) |

**⚠️ Dependency Updates**: Dependabot does **not** support `devcontainer.json` format. Base images, features and tools installed by `setup.sh` require manual updates. The weekly devcontainer workflow (`.github/workflows/devcontainer.yml`) detects breakage but doesn't auto-fix it. Monitor workflow failures for drift.

This directory contains the VS Code devcontainer configuration for the EMFN repository.

## What It Does

The devcontainer provides a **consistent, reproducible development environment** with all required tools pre-installed:
- Python 3.13 with `uv` package manager
- Node.js LTS with npm
- PHP 8.3 with Composer
- Shellcheck and GitHub CLI
- VS Code extensions for Python, PHP, JavaScript, linting and testing

## Quick Start

**VS Code:**
1. Install [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this repository
3. Click "Reopen in Container" when prompted

**GitHub Codespaces:**
- Create a codespace from the repository's Code menu

After the container starts, install project dependencies:
```bash
npm install && composer install && uv sync
pre-commit install
```

## Files

- `devcontainer.json` - Container configuration, features and VS Code settings
- `setup.sh` - Post-create script that installs pinned uv (0.5.10), shellcheck and GitHub CLI
- `devcontainer-lock.json` - Feature version lockfile

## Detailed Documentation

For complete documentation including:
- What's installed and why
- How to customize the environment
- Troubleshooting tips
- Manual setup alternatives

See the **Devcontainer** section in [CONTRIBUTING.md](../CONTRIBUTING.md).
