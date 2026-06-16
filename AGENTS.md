# Agents

This document outlines the AI agents used in the emergencymode.news project. It is the single source of truth for shared conventions across all subdirectories. Tool-specific files (CLAUDE.md, .github/copilot-instructions.md, etc.) reference this file.

## Overview

This is a WordPress plugin project with JavaScript, PHP, and Python components. Core stack: Node.js (Jest testing), PHP 8.3 (PHPUnit, Composer), Python 3.13 (uv for notebooks). DevContainer runs Debian GNU/Linux 13 (trixie). Dependencies managed via npm (weekly Dependabot), Composer, and uv 0.5.10. See [README.md](README.md) for full environment details, testing commands, and workflow documentation.

Agents are autonomous AI systems that perform specific tasks within the emergency news workflow. They are designed to follow guidelines from `.github/instructions` and lessons documented in `AGENT_LESSONS.md`.

## Agent Guidelines

All agents in this project must:
- Follow the instructions defined in `.github/instructions`
- Apply lessons learned from `AGENT_LESSONS.md`
- Maintain clear communication and documentation
- Handle errors gracefully
- Report results accurately

## Agent Development

When creating new agents, refer to:
1. `.github/instructions` - Project-wide guidelines
2. `AGENT_LESSONS.md` - Best practices and lessons learned
3. This document - Agent specifications and roles

## Key Commands

All commands use the package.json scripts from the repository root or direct use of scripts in `/scripts/`.

### Testing
- `npm test` — Run JavaScript and shell script tests
- `npm run test:all` — Run all tests (JavaScript, PHP, and shell scripts)
- `npm run test:js` — Run Jest tests only
- `npm run test:js:coverage` — Terminal summary + HTML report in `coverage/js/`
- `npm run test:php` — Run PHPUnit tests
- `npm run test:php:coverage` — HTML report in `coverage/php/index.html`
- `npm run test:scripts` — Run shell script tests from `tests/scripts/`

### Linting & Formatting
- `npm run lint` — Run all linters (Prettier, ESLint, shellcheck, notebook checks)
- `npm run format` — Auto-format all code with Prettier
- `npm run format:check` — Check formatting without modifying files
- `npm run eslint` — Lint JavaScript files in plugins
- `npm run eslint:fix` — Auto-fix ESLint issues
- `npm run shellcheck` — Lint shell scripts

### Notebooks
- `npm run notebooks:strip` — Remove outputs from Jupyter notebooks
- `npm run notebooks:check-clean` — Verify notebooks have no uncommitted outputs

### Release & Version Management (scripts/)
- `scripts/build-release-assets.sh` — Build plugin ZIP files for release
- `scripts/detect-plugin-changes.sh` — Detect which plugins changed since last tag
- `scripts/sync-release-version.sh` — Sync version numbers across plugin files
- `scripts/get-plugin-version.sh` — Extract version from plugin header
- `scripts/generate-version-matrix.sh` — Generate GitHub Actions version matrix 
