# emergencymode.news

Custom WordPress plugins, Python Notebooks and miscellaneous code version control for the Emergency Mode for News (EMFN) Newspack website.

| badge | status |
| --- | --- |
| Tests on `main` & `staging` | [![CI](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/ci.yml) |
| Dev Container | [![Dev Container](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/devcontainer.yml) |
| Release versioning on `main` | [![Release](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml) |
| CodeQL | [![CodeQL](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql) |
| Dependabot | [![Dependabot Updates](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates) |
| License | [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) |


## Overview

This repository contains:
* the `emfn-action-pack-plugin` — the active front-end integration for the Action Pack assessment flow
* the `emfn-site-styles-plugin` — site-wide CSS and (eventually?) JS we need to run the site, rather than store code in WordPress inputs   
* Python notebooks that generate and validate FEMA National Risk Index county-level CSVs consumed by the Action Pack plugin
* Lotta tests
* A release cycle that generates ZIPs and release versioning based on which plugin has an update

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards and workflow.

### Repository Structure

```text
emergencymode.news/
├── .devcontainer/                          # Dev environment config (see CONTRIBUTING.md)
├── .github/
│   ├── agents/                             # Custom Copilot agents
│   │   └── EMFNAgent.agent.md
│   ├── instructions/                       # Agent instruction files
│   │   └── wordpress-plugin.instructions.md
│   ├── workflows/
│   │   ├── ci.yml                          # Test suite execution
│   │   ├── devcontainer.yml                # Devcontainer health check
│   │   └── release.yml                     # Automated release workflow on push to main
│   └── dependabot.yml                      # Automated dependency updates (npm, GitHub Actions)
├── .vscode/                                # VS Code workspace settings
│   ├── extensions.json
│   └── settings.json
├── notebooks/                              # Python notebooks for risk-data generation and research
│   ├── US_disaster_risk_analysis.ipynb     # Action Pack #risks work
│   ├── CA-MX_disaster_risk_analysis.ipynb  # Draft of possible expansion 
│   ├── shared_setup.py                     # Shared setup utilities for notebooks
│   ├── README.md                           # Notebook documentation
│   └── cache/                              # Cached FEMA source downloads
│       └── NRI_Table_Counties.csv
├── plugins/
│   ├── emfn-action-pack-plugin/            # Gravity Forms augmentation
│   │   ├── emfn-action-pack-plugin.php     # Main plugin file
│   │   ├── readme.txt                      # WordPress plugin readme
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   │   └── emfn-action-pack-plugin.css
│   │   │   ├── data/                       # CSVs used in geolocation & hash encoding/decoding
│   │   │   │   ├── _tallCategories.csv     # Category mapping registry
│   │   │   │   └── {ST}.csv                # State-specific NRI risk data (51 files)
│   │   │   ├── html-templates/
│   │   │   │   └── gravityForms-Your_Risks-body.html
│   │   │   └── js/
│   │   │       └── emfn-action-pack-plugin.js
│   │   ├── includes/
│   │   │   └── class-emfn-action-pack-plugin.php
│   │   └── languages/
│   ├── emfn-site-styles-plugin/            # Site-wide CSS/JS
│   │   ├── emfn-site-styles-plugin.php     # Main plugin file
│   │   ├── readme.txt                      # WordPress plugin readme
│   │   ├── MOVE_TO_SASS.md                 # SASS migration roadmap
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   │   └── emfn-site-styles-plugin.css
│   │   │   ├── html-templates/
│   │   │   ├── js/
│   │   │   │   └── emfn-site-styles-plugin.js
│   │   │   └── scss/                       # SASS source files
│   │   ├── includes/
│   │   │   └── class-emfn-site-styles-plugin.php
│   │   └── languages/
│   └── shared/
│       └── emfn-types.d.ts                 # Shared Types for JavaScript
├── scripts/                                # Release, notebook, and testing utilities (see scripts/README.md)
│   ├── README.md                           # Script documentation
│   ├── build-release-assets.sh
│   ├── check-notebooks-clean.sh
│   ├── detect-plugin-changes.sh
│   ├── generate-version-matrix.sh
│   ├── get-plugin-version.sh
│   ├── strip-notebook-outputs.sh
│   ├── sync-release-version.sh
│   └── test-devcontainer-workflow.sh
├── tests/                                  # Testing infrastructure
│   ├── js/                                 # JavaScript tests (Jest)
│   │   ├── setup.js                        # Test environment setup
│   │   ├── action-pack/                    # Action Pack plugin tests
│   │   └── lib/                            # Shared test utilities
│   ├── php/                                # PHP tests (PHPUnit)
│   │   ├── bootstrap.php                   # Test bootstrap with WordPress stubs
│   │   └── action-pack/                    # Action Pack plugin tests
│   ├── scripts/                            # Shell script tests
│   │   ├── test-helpers.sh                 # Test framework helpers
│   │   ├── test-build-assets.sh            # Build script tests
│   │   └── test-version-bump.sh            # Version logic tests
│   ├── fixtures/                           # Test data
│   │   ├── payload-test-cases.json         # Action Pack encoding tests
│   │   └── location-test-data.json         # Geolocation test data
│   ├── TESTING_PLAN.md                     # Testing strategy
│   └── README.md                           # Quick start for running tests
├── dist/                                   # Build output (gitignored, generated by scripts/build-release-assets.sh)
├── tmp/                                    # Temporary/scratch files (not deployed)
│   ├── _tallCategories.csv
│   └── ga.txt
├── tools/                                  # Development utilities (not deployed)
│   ├── README.md
│   └── scripts/
│       ├── README.md
│       └── SheetsWPAppScript.js            # Google AppScript utilities
├── .editorconfig                           # Cross-editor formatting rules
├── .gitignore
├── .pre-commit-config.yaml                 # Pre-commit hook configuration
├── .prettierignore
├── .prettierrc                             # Prettier formatting config
├── AGENT.md                                # Agent guide: lessons learned, gotchas, best practices
├── composer.json                           # PHP dependencies (PHPUnit, WordPress stubs)
├── CONTRIBUTING.md                         # Development workflow, coding standards, testing
├── coverage/                               # Test coverage reports (gitignored, generated by test:coverage)
│   ├── js/                                 # JavaScript coverage (Jest)
│   └── php/                                # PHP coverage (PHPUnit)
├── eslint.config.js                        # ESLint configuration
├── jest.config.cjs                         # Jest test configuration
├── jsconfig.json                           # Editor & Type config 
├── LICENSE
├── package.json                            # npm dependencies & scripts
├── phpunit.xml                             # PHPUnit configuration
├── pyproject.toml                          # Notebook dependencies
├── README.md                               # This file
└── uv.lock                                 # Python dependency lockfile
```

## Release Workflow

This repository uses **independent plugin versioning** with automated releases on push to `main`.

### Plugin Versioning

Each plugin has its own version number and release cycle. See [Releases](https://github.com/OpenNews/emergencymode.news/releases) for current versions and ZIPs.

### Git Tags

Plugin releases create plugin-specific tags in the format `<plugin-slug>/vX.Y.Z`:
- `action-pack/v*` - Action Pack plugin releases
- `site-styles/v*` - Site Styles plugin releases

### Automatic Releases

When changes are merged to `main`:

1. **Detection**: Workflow detects which plugins have changes
2. **Version bump**: Calculates next version from commit messages:
   - `[major]` or `major:` → Major version bump (1.0.0 → 2.0.0)
   - `[minor]` or `minor:` → Minor version bump (1.0.0 → 1.1.0)
   - Default → Patch version bump (1.0.0 → 1.0.1)
3. **Update files**: Syncs version across plugin PHP files and readme.txt
4. **Build assets**: Creates plugin ZIP files in `dist/`
5. **Create release**: Tags commit and publishes GitHub release with ZIP

### Manual Releases

Trigger releases manually via Actions tab:
```bash
Actions → Release → Run workflow
```

### Scripts

For release automation, notebook hygiene, and local testing scripts, see [scripts/README.md](scripts/README.md).

## emfn-action-pack-plugin

This is the core custom plugin in the EMFN Newspack site.  
Responsibilities:

- **Setup**
  - Enqueues the Action Pack CSS and JS bundles
  - Exposes `window.emfnData.dataUrl` and an `ap2.`-prefix in the final quiz URL to help both client and server see canonical data
- **Geolocation**
  - Binds to [Google Places v2 integration within Gravity Forms](https://www.gravityforms.com/blog/get-started-geolocation-add-on-tutorial/) to resolve user's geolocation
  - Hits [FCC's Area API](https://geo.fcc.gov/api/census/) to resolve `countyFIPS` from Places' `lat`/`lng` coords
  - Fetches the matching `<st>.csv` and renders likely hazards from [FEMA National Risk Index scores](https://www.fema.gov/about/openfema/data-sets/national-risk-index-data) (_see [/notebooks/README](/notebooks/README.md)_)
  - Persists resolved location data in `sessionStorage` so it persists across a multi-page Gravity Form (in addition to in-memory client-side variables)
- **Submission client-side Hash Encoding**
  - Computes a compact [client-side Action Pack payload/hash](#action-pack-flow) from matched Categories for subsequent share URLs, looking (probably) like `?actionPack=ap2.2w6g74.1y`
- **PHP server-side Hash Decoding**
  - Decodes the same `actionPack` payload/hash on the server and maps them to Newspack Query Loop query params including `category__in`, filtering and sort-order

### Page Detection

These event bindings and `/data/` file fetches can be memory-intensive and **we want to simplify that for EMFN site visitors** experiencing an emergency or amid recovery from a disaster.

Assets load on any frontend page with either of these querystring parameters:

- `?mode=<value>` → quiz/form pages
- `?actionPack=<hash>` → results pages

### Debugging & Troubleshooting

**Debug Mode (`emfnDebug=true`)**

Add `&emfnDebug=true` to Action Pack URLs to request debug logging:

```
.../start/action/?mode=mode-during&emfnDebug=true
.../start/action-pack/?actionPack=ap2.xyz123&emfnDebug=true
```

Server-side PHP debug output only appears when `emfnDebug=true` **and** the current user is a WordPress administrator or editor.

**What Gets Logged:**
- **Client-side JS (browser console):** Form values, category mappings, encoded payloads
- **Server-side PHP (footer `<script>`):** Payload presence signal, decoded term IDs and CSS class-based block filters

**Where to Look:**
- Open browser DevTools Console (F12)
- Enable "Persist logs" to preserve output across page navigation
- PHP debug entries appear as `console.debug()` calls in footer scripts
- Look for `EMFN:` prefixes on PHP debug labels

**When to Use:**
- Form not redirecting with proper `actionPack` parameter
- Results page showing wrong/no content
- Category filtering not working
- Troubleshooting payload encoding/decoding mismatches
- Verifying CSV category order synchronization between client and server

**Sample Debug Output**
```bash
<LOG_TIMESTAMP> .hashable form values: (6) ['mode-during', 'disasterType-flooding', 'size-25', 'activeReporting-true', 'pubSituation-0', 'contactPlan-true']
<LOG_TIMESTAMP> Encoded Action Pack categories: (32) ['Flooding (1)', 'Power & connectivity (2)', 'Solo operator (1)', 'Small newsroom (1)', 'Co-located team (1)', 'Rural (3)', ...]

Navigated to https://<domain>/start/action-pack/?actionPack=ap2.<hash>&emfnDebug=true

<LOG_TIMESTAMP> EMFN: Block categories applied {
  className: "emfn-action-pack emfn-content-cards is-style-default",
  termIds: (23) [3, 153, 121, 122, 72, 151, ...],
}
```

### Action Pack Flow

The Action Pack operates in two phases, with payload encoding/decoding coordinated between `emfn-action-pack-plugin.js` and `class-emfn-action-pack-plugin.php`.

**Phase 1: Assessment (.emfn-forms)**
- Multi-"page" Gravity Form at `/action/` collects location, disaster type, newsroom characteristics
- JS plugin binds geolocation
- On submit, collects `.hashable`-marked form entries
- Fetches `_tallCategories.csv` to map answers → WP Category IDs → compact `ap2.` bitmask payload
- Writes encoded payload to `.hashMarker input` (to save to Form entry) and form redirects with `?actionPack=ap2.<hash>`
- Location data persists in `sessionStorage` across form pages, as a backup mechanism 

**Phase 2: Action Pack Customization**
- User lands on results page with `?actionPack=ap2.<hash>` parameter
- PHP decodes payload using `_tallCategories.csv` category order (synchronized with client JS)
- Resolves Category names → WordPress term IDs
- Filters Newspack Content Loop blocks with `.emfn-action-pack` class to matched categories
- URL is shareable; returns user a similarly ranked personalized Action Pack configuration... at least until we change any Categories in WP, then they all break
  - Not much we can do about that except re-compute `_tallCategories` with the new Category-tagging strategy for the content store
- Debug mode (`&emfnDebug=true`) logs decode details when the user is logged in to WordPress

### Content Recommendation Algorithm

The Action Pack delivers personalized content recommendations by converting quiz responses into a smart, multi-factor relevance score. This section explains how the system ensures quality and diversity even with a modest content library.

#### How Quiz Answers Become Recommendations

When you complete the Action Pack assessment, your answers generate a ranked list of content categories that match your newsroom's needs. The system then uses a **three-tier scoring algorithm** to surface the most relevant articles:

**1. Editorial Quality Tiers (Primary Sort)**

All Action Pack content is Tagged with quality tiers (`resources-tier-1`, `resources-tier-2`, `resources-tier-3`):
- **Tier 1**: Flagship resources, essential guides, thoroughly vetted practices
- **Tier 2**: Solid supporting content, case studies, practical templates
- **Tier 3**: Supplementary material, experimental approaches, niche topics

Tier tags act as **quality bands** — all tier-1 content ranks above tier-2, regardless of other factors. This ensures your top results always reflect editorial priorities.

**2. Category Relevance Weights (Secondary Sort)**

Your quiz responses create a weighted category list. Categories that match more of your answers (higher "Total Rank" in the scoring table) receive higher weights. For example, if your quiz emphasizes staff safety and field reporting challenges, those categories get prioritized.

Within each quality tier, the algorithm calculates a relevance score based on:
- **Category weight**: How strongly your quiz responses align with that category
- **Multi-category bonus**: Articles matching multiple relevant categories score higher
- **Scarcity multiplier**: Rare, specific content gets a boost (explained below)

**3. Scarcity Diversity Mechanism**

Here's where the algorithm prevents your highest-weighted category from dominating results: the **scarcity multiplier** gives extra credit to high-quality content in categories with fewer total articles.

**Why this matters:** Imagine your quiz strongly matches "Staff safety" (which might have 8 articles) and moderately matches "Field reporting" (which has only 3 articles). Without scarcity balancing, you'd see mostly staff safety content. The multiplier boosts the field reporting articles so they appear alongside staff safety pieces, giving you **topical diversity** instead of redundancy.

**For _A LOT_ more on content strategy growth and query optimization, see [/data/_tallCategoriesREADME](/plugins/emfn-action-pack-plugin/assets/data/_tallCategoriesREADME.md)**

### Risk data flow

For the U.S., we match `countyFIPS` to NRI risk scores, where the **score is at least `x`**, the `riskThreshold` constant/variable in `plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js`.

The plugin currently maps ~18 FEMA NRI hazard families based on the `RiskRenderer.hazardLabels` property defined in `plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js`.

#### Example API response for NRI

```csv
county_fips,state,county,AVLN_risk_score,CFLD_risk_score,CWAV_risk_score,DRGT_risk_score,ERQK_risk_score,HAIL_risk_score,HWAV_risk_score,HRCN_risk_score,ISTM_risk_score,LNDS_risk_score,LTNG_risk_score,IFLD_risk_score,SWND_risk_score,TRND_risk_score,TSUN_risk_score,VLCN_risk_score,WFIR_risk_score,WNTW_risk_score
01001,Alabama,Autauga,,,28.18066157760814,45.64249363867685,67.84351145038168,44.30661577608143,85.90237636480411,72.090112640801,42.98567144285238,73.50508905852418,81.67938931297712,65.52162849872774,51.68575063613231,74.10941475826972,,,45.73791348600509,9.038828771483132
```

### Supporting files

- `plugins/emfn-action-pack-plugin/assets/data/{st}.csv` contains per-state county risk data generated by the notebooks.
- `plugins/emfn-action-pack-plugin/assets/data/_tallCategories.csv`, an export from Google Sheets of every _uniquely_ meaningful Category per quiz response
- `plugins/emfn-action-pack-plugin/assets/html-templates/` stores HTML snippets which exist within the Gravity Form "HTML field", which provides the DOM for our `#risks` info

## emfn-site-styles-plugin

Site-wide CSS and JavaScript that supports the EMFN Newspack instance. This plugin provides styles and functionality that would otherwise need to be maintained in WordPress admin panels (Additional CSS, Custom HTML blocks, etc.).

**Current assets:**
- `assets/css/emfn-site-styles-plugin.css` - Site-wide styles including color variables, byline link accessibility improvements and republishable card formatting
- `assets/html-templates/homepage_animation.html` - Homepage hero animation with hardware-accelerated CSS and `requestAnimationFrame()` optimizations
- `assets/js/emfn-site-styles-plugin.js` - Site-wide JavaScript utilities

Future work on migrating to a SASS build system is documented in [MOVE_TO_SASS.md](plugins/emfn-site-styles-plugin/MOVE_TO_SASS.md).

## Development & Dependencies

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

The `notebooks/` directory contains Python workflows that generate and validate FEMA National Risk Index county data consumed by the Action Pack plugin.

**Current notebooks:**

- `US_disaster_risk_analysis.ipynb` — Downloads FEMA NRI data and generates per-state CSVs for all 50 US states plus DC
- `CA-MX_disaster_risk_analysis.ipynb` — Research notebook exploring Canada and Mexico data; does not currently generate runtime output

**Setup:**
Each notebook runs `uv sync` on startup to ensure dependencies are in sync, then verifies the environment is healthy via `shared_setup.py`.

**Output location:**
- `plugins/emfn-action-pack-plugin/assets/data/` (51 US state + DC CSVs)
- `notebooks/cache/` (cached FEMA source downloads)

**Managing dependencies:**
See the [Dependency updates](#development--dependencies) section above, or refer to [notebooks/README.md](notebooks/README.md) for detailed dependency management instructions.

The notebooks are managed with `uv` and are not deployed to WordPress—they support data generation and validation only.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development workflow, code quality standards and testing practices.

### npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run format` | Auto-fix formatting with Prettier (HTML, CSS, JS, JSON, YAML, Markdown) |
| `npm run format:check` | Verify Prettier formatting without changes |
| `npm run eslint` | Lint JavaScript files in `plugins/` |
| `npm run eslint:fix` | Auto-fix ESLint issues |
| `npm run shellcheck` | Lint shell scripts via pre-commit hook |
| `npm run notebooks:strip` | Remove execution outputs from notebooks |
| `npm run notebooks:check-clean` | Verify notebooks have no outputs |
| `npm run lint` | Run all checks (Prettier, ESLint, shellcheck, notebook cleanliness) |
| `npm run test` | Run JavaScript and shell script tests |
| `npm run test:all` | Run all tests (JavaScript, PHP, shell scripts) |
| `npm run test:js` | Run JavaScript tests with Jest |
| `npm run test:js:watch` | Run Jest in watch mode |
| `npm run test:js:coverage` | Run Jest with coverage report |
| `npm run test:php` | Run PHP tests with PHPUnit |
| `npm run test:php:coverage` | Run PHPUnit with HTML coverage report (see `coverage/php/index.html`) |
| `npm run test:scripts` | Run shell script tests |

**Quick reference:**

```bash
# Setup
npm install && composer install && uv sync
pre-commit install

# Linting
npm run lint              # Run all checks
npm run format            # Auto-fix formatting

# Testing
npm run test:all          # All tests
npm run test:js           # JavaScript only
npm run test:php          # PHP only

# Notebooks
uv sync && uv run jupyter lab
npm run notebooks:strip   # Remove outputs before commit
```

The plugin JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`. `jsconfig.json` scopes editor support to plugin JS and shared `.d.ts` files for lightweight type assistance without a full TypeScript build.

## Automated Maintenance

### Dependabot Configuration

This repo uses Dependabot (`.github/dependabot.yml`) for automated dependency management:

- **npm dependencies:** Weekly checks for updates with grouped minor/patch PRs (if available)
- **Python/pip dependencies:** Not configured in Dependabot; notebook deps are maintained manually
- **GitHub Actions:** Weekly checks for workflow dependency updates (if available)

Dependabot PRs can be auto-merged after CI passes, enabling frequent maintenance with minimal manual intervention.

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

### Continuous Integration (CI) Checks

The `.github/workflows/ci.yml` workflow runs on all pull requests and pushes to `main`/`staging`:

1. **Lint checks:** `npm run lint` (Prettier, ESLint, shellcheck, notebook cleanliness)
2. **JavaScript tests:** `npm run test:js` (Jest)
3. **PHP tests:** `npm run test:php` (PHPUnit)
4. **Shell script tests:** `npm run test:scripts` (Bash test framework)

Test results appear in GitHub Checks on PRs, providing immediate feedback before merge. All checks must pass before merging to `main`.

### Automated Release Workflow

On every push to `main`, `.github/workflows/release.yml` executes:

1. **Lint checks:** Runs `npm run lint` (Prettier, ESLint, shellcheck, notebook cleanliness)
2. **Test execution:** Runs `npm run test:all` (JavaScript, PHP, shell script tests)
3. **Version increment:** Computes next patch version tag (e.g., `v1.0.0` → `v1.0.1`)
4. **Version sync:** Updates all version references via `scripts/sync-release-version.sh`:
   - Plugin PHP headers (`Version:` field)
   - Plugin PHP constants (`EMFN_*_PLUGIN_VERSION`)
   - Plugin `readme.txt` stable tags
   - Plugin `readme.txt` changelog entries
5. **Commit sync:** Pushes version updates back to `main` as a bot commit
6. **Build assets:** Creates plugin ZIP files via `scripts/build-release-assets.sh`
7. **GitHub Release:** Publishes release with auto-generated notes and ZIP attachments
8. **Tag updates:** Maintains floating `latest` and `vX` tags

**Required Secrets:** The workflow requires a `RELEASE_TOKEN` repository secret with `contents: write` permission to bypass branch protection when committing version changes. Without this token, the workflow fails at step 5 (commit sync).

**Infinite loop prevention:** The workflow skips when the latest commit is already a version sync, preventing recursive triggers.

**Developer workflow benefits:**
- Merge PR → automatic version bump and release
- No manual version file editing
- Tests run automatically before release
- Consistent versioning across all files
- Release notes auto-generated from commit history
- Safe for Dependabot auto-merge after CI passes

## Deployment

Deployment to Newspack staging and production is handled manually by site owners. We _SHOULD NOT_ ask Newspack Support TAMs about this custom plugin.

For plugin deployment:

1. Merge changes to `main` (automated release workflow creates GitHub Release)
2. Download plugin ZIP from the newly generated (and successfully vetted and created) GitHub Release
3. Install WordPress Admin and activate, overriding the prior plugin if necessary

The devcontainer, notebooks, scripts, tests and `tmp/` files are **not** deployed to WordPress.

## Testing

This repository includes comprehensive test coverage across JavaScript, PHP and shell scripts.

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:js          # JavaScript (Jest)
npm run test:php         # PHP (PHPUnit)
npm run test:scripts     # Shell scripts

# With coverage
npm run test:js:coverage
npm run test:php:coverage  # HTML report in coverage/php/
```

**Test infrastructure**: Jest for JavaScript, PHPUnit for PHP, custom bash framework for shell scripts. Test files in `tests/js/`, `tests/php/` and `tests/scripts/`. Fixtures in `tests/fixtures/`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed testing workflow and [AGENT.md](AGENT.md) for common gotchas.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, coding standards and pull request guidelines.

**Key points:**
- **Never manually edit version numbers** — automated release workflow handles this
- Follow WordPress coding standards, prefix functions/classes/hooks with `emfn_`
- Use the devcontainer for consistent development environment (see [CONTRIBUTING.md](CONTRIBUTING.md#devcontainer) for setup details)
- Pre-commit hooks enforce code quality (install with `pre-commit install`)
- Read [AGENT.md](AGENT.md) before making changes to avoid common mistakes

## Troubleshooting

### Common Issues and Solutions

**Plugin not loading**
- **Symptoms:** No custom styles, JS not executing, form looks like default Gravity Forms with the royal blue progress bar, etc.
- **Causes:** Page detection failing
- **Solutions:**
  - Confirm WordPress not in safe mode or plugin not disabled
  - Verify page has `.emfn-forms` class on the form element or `.emfn-action-pack` on results blocks
  - Make sure our custom Gravity Forms block is in page content
  - Confirm page slug matches `action` (for `/start/action/` pages)
  - Clear WordPress object cache if using caching plugins
  - Check `is_action_pack_page_request()` returns true via debug mode

**No risk data showing**
- **Symptoms:** Location autocomplete works but no hazards display in form
- **Causes:** Geolocation API failures, CSV access issues
- **Solutions:**
  - Confirm WordPress not in safe mode or plugin not disabled
  - Verify Google Places API key is valid and has Places API (New) enabled
  - Check browser console for FCC Area API errors (CORS, 404, invalid lat/lon errors -- all should be logged to dev-tools Console)
  - Confirm state CSV files exist in `assets/data/{ST}.csv` (uppercase state abbreviation)
  - Verify `countyFIPS` resolved correctly from FCC API response and shows up in recent submissions

**Payload not decoding**
- **Symptoms:** Results page shows no filtered content, empty category list in debug output
- **Causes:** CSV category order mismatch, invalid base36 encoding
- **Solutions:**
  - Confirm WordPress not in safe mode or plugin not disabled
  - Enable debug mode (`&emfnDebug=true`) and ensure PHP debug gating conditions are met
  - Verify `_tallCategories.csv` is identical on client and server
  - Check payload format starts with `ap2.` prefix
  - Confirm category order hasn't changed between encoding and decoding
  - Manually test base36 decoding with browser console: `parseInt('7', 36)` should return decimal value

**Categories not filtering content**
- **Symptoms:** Results page shows all posts or no posts instead of filtered content
- **Causes:** Category ID resolution failed, block class missing
- **Solutions:**
  - Confirm WordPress not in safe mode or plugin not disabled
  - Verify Newspack Content Loop block is present in page and has `.emfn-action-pack` class
  - Check debug output for resolved category IDs (should be array of integers)
  - Confirm WordPress categories exist matching decoded category names (exact match required)
  - Verify posts are _assigned_ to the resolved categories
  - Inspect `filter_action_pack_newspack_block_data()` execution in debug logs

## References

- Newspack Plugin documentation: https://github.com/Automattic/newspack-plugin
- Newspack Blocks documentation: https://github.com/Automattic/newspack-blocks
