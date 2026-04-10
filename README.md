# emergencymode.news

Version control for custom WordPress plugin(s), front-end assets and supporting data-analysis notebooks for the Emergency Mode for News (EMFN) Newspack site.

| badge | status |
| --- | --- |
| Release versioning on `main` | [![Release](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/OpenNews/emergencymode.news/actions/workflows/release.yml) |
| CodeQL | [![CodeQL](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/github-code-scanning/codeql) |
| Dependabot | [![Dependabot Updates](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/dependabot/dependabot-updates) |
| Copilot auto-Review | [![Copilot code review](https://github.com/OpenNews/emergencymode.news/actions/workflows/copilot-pull-request-reviewer/copilot-pull-request-reviewer/badge.svg)](https://github.com/OpenNews/emergencymode.news/actions/workflows/copilot-pull-request-reviewer/copilot-pull-request-reviewer) |


## Overview

This repository currently centers on two custom plugins:

- `emfn-action-pack-plugin` is the active front-end integration for the Action Pack assessment flow.
- `emfn-rich-search-plugin` is an early scaffold for hash-driven search and content personalization work.

The repo also includes Python notebooks that generate and validate FEMA National Risk Index county-level CSVs consumed by the Action Pack plugin.

## Repository Structure

```text
emergencymode.news/
├── .devcontainer/                          # Devcontainer config & setup script for local work
├── .github/
│   ├── dependabot.yml                      # Automated dependency updates (npm, pip, GitHub Actions)
│   └── workflows/
│       └── release.yml                     # Automated updates on PR-merge to main
├── notebooks/                              # Python notebooks for risk-data generation and research
│   ├── US_disaster_risk_analysis.ipynb     # Action Pack #risks work
│   ├── CA-MX_disaster_risk_analysis.ipynb  # draft of possible expansion 
│   ├── action_pack_roundtrip_dev.ipynb     # Action Pack payload encoding/decoding tests
│   ├── README.md
│   └── cache/                              # Cached FEMA source downloads
├── plugins/
│   ├── emfn-action-pack-plugin/            # Gravity Forms augmentation
│   │   ├── emfn-action-pack-plugin.php
│   │   ├── includes/
│   │   ├── assets/
│   │   │   ├── css/                        # styles for custom Gravity Form
│   │   │   ├── data/                       # CSVs used in Geolocation & hash encoding/decoding
│   │   │   ├── html-templates/             # Preserved HTML-field in custom Gravity Form
│   │   │   └── js/                         # major client-side work, incl. #risks and hashing
│   │   └── languages/
│   ├── emfn-rich-search-plugin/            # Draft of rich-search plugin
│   │   ├── emfn-rich-search-plugin.php
│   │   ├── includes/
│   │   ├── assets/
│   │   └── languages/
│   └── shared/
│       └── emfn-types.d.ts                 # Shared Types for JavaScript
├── scripts/                                # Release and notebook hygiene utilities
│   ├── sync-release-version.sh             # Updates Release version across many files
│   ├── build-release-assets.sh             # Builds plugin ZIPs
│   ├── strip-notebook-outputs.sh           # Cleans notebook execution state
│   └── check-notebooks-clean.sh            # Checks notebooks for cruft
├── tests/                                  # Testing infrastructure (planned)
│   ├── TESTING_PLAN.md                     # TBD testing strategy
│   └── README.md                           # Quick start for future tests
├── jsconfig.json                           # editor & Type config 
├── package.json                            # Code style consistency
└── pyproject.toml                          # Notebook dependencies
```

## emfn-action-pack-plugin

This is the primary active plugin in the repo.

Responsibilities:

- **Setup**
  - Enqueues the Action Pack CSS and JS bundles
  - Exposes `window.emfnData.dataUrl` and `ap2.`-prefix to help both client and server see canonical data
- **Geolocation**
  - Binds to Google Places v2 autocomplete feature within Gravity Forms to resolve user's geolocation
  - Hits FCC's Area API to resolve `countyFIPS` from Places v2's lat/lng coords
  - Fetches the matching `<st>.csv` and renders likely hazards from FEMA National Risk Index scores
  - Persists resolved location data in `sessionStorage` so multi-page Gravity Forms flows can keep using it, in addition to in-memory client-side variables
- **Submission client-side Hash Encoding**  
   Computes a compact client-side Action Pack payload from matched Categories for subsequent share URLs
- **PHP server-side Hash Decoding**  
  Decodes `actionPack` request payloads on the server and maps them to Newspack Query Loop category filters

### Page Detection

The plugin uses multiple detection methods to determine when to load its assets, ensuring coverage across both the assessment form and results pages:

1. **CSS Class Detection**: Checks for `.emfn-action-pack` or `.emfn-forms` classes
   - `form.emfn-forms` is our Gravity Form
   - `.emfn-action-pack` is our Action Pack results

2. **Gravity Forms Detection**: Checks for `gravityform` shortcode or `wp:gravityforms/form` block syntax
   - Catches assessment pages even when CSS classes aren't in stored content
   - Handles cases where classes are added dynamically during rendering

3. **Page Slug Detection**: Matches the page slug `action`
   - Provides fallback detection for `/start/action/` and similar URLs
   - Ensures assets load regardless of content changes

The plugin returns `true` from `is_action_pack_page_request()` if **any** of these conditions match, ensuring robust asset loading across the Action Pack two-phase flow.

### Debugging & Troubleshooting

**Debug Mode (`emfnDebug=true`)**

Add `&emfnDebug=true` to any Action Pack URL to enable detailed logging of payload encoding/decoding:

```
https://emergencymode.newspackstaging.com/start/action/?mode=mode-during&emfnDebug=true
https://emergencymode.newspackstaging.com/start/action-pack/?actionPack=ap2.xyz123&emfnDebug=true
```

**What Gets Logged:**
- **Client-side JS (browser console):** Form values, category mappings, encoded payloads
- **Server-side PHP (footer `<script>`):** Decoded categories, resolved term IDs, applied block filters

**Where to Look:**
- Open browser DevTools Console (F12)
- Enable "Persist logs" to preserve output across page navigation
- PHP debug entries appear as `console.debug()` calls in footer scripts
- Look for "EMFN Action Pack PHP debug v1" marker followed by decode data

**When to Use:**
- Form not redirecting with proper `actionPack` parameter
- Results page showing wrong/no content
- Category filtering not working
- Troubleshooting payload encoding/decoding mismatches
- Verifying CSV category order synchronization between client and server

**Sample Debug Output**
```bash
<LOG_TIMESTAMP> .hashable form values: (6) ['mode-during', 'disasterType-flooding', 'size-25', 'activeReporting-true', 'pubSituation-0', 'contactPlan-true']
<LOG_TIMESTAMP> Action Pack categories: (32) ['Flooding', 'Power & connectivity', 'Solo operator', 'Small newsroom', 'Fully remote', 'Co-located newsroom', 'Multilingual or non-English audience', 'Rural', 'Urban', ...]

Navigated to https://emergencymode.newspackstaging.com/start/action-pack/?actionPack=ap2.<hash>&emfnDebug=true

<LOG_TIMESTAMP> EMFN Action Pack PHP debug v1
<LOG_TIMESTAMP> decode_action_pack_bitmask_payload: (32) ['Flooding', 'Power & connectivity', 'Solo operator', 'Small newsroom', 'Fully remote', 'Co-located newsroom', 'Multilingual or non-English audience', 'Rural', 'Urban', ...]
<LOG_TIMESTAMP> newspack block categories applied {
  categories: (23) [3, 107, 121, 122, 73, 74, 110, 111, ...]
  className: "emfn-action-pack emfn-content-cards is-style-default"
```

### Action Pack Flow

The Action Pack operates in two phases, with payload encoding/decoding coordinated between `plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js` and `plugins/emfn-action-pack-plugin/includes/class-emfn-action-pack-plugin.php`.

**Phase 1: Assessment (form.emfn-forms)**
- Multi-page Gravity Form at `/start/action/` collects location, disaster type, newsroom characteristics
- JS plugin binds geolocation (Google Places → FCC Area API → FEMA NRI risk display)
- On submit, collects `.hashable` form values (excludes "lead gen" fields)
- Fetches `_tallCategories.csv` to map selections → Category names → compact `ap2.` bitmask payload
- Writes encoded payload to `.hashMarker input` and form redirects with `?actionPack=ap2.<hash>`
- Location data persists in `sessionStorage` across form pages; hash stored in form submission for tracking

**Phase 2: Action Pack Customization**
- User lands on results page with `?actionPack=ap2.<hash>` parameter
- PHP decodes payload using `_tallCategories.csv` category order (synchronized with client JS)
- Resolves Category names → WordPress term IDs
- Filters Newspack Content Loop blocks with `.emfn-action-pack` class to matched categories
- URL is shareable; returns user to same personalized Action Pack configuration
- Debug mode (`&emfnDebug=true`) logs decoded categories and IDs to browser console

### Risk data flow

For the U.S., we match `countyFIPS` to NRI risk scores, where the **score is at least `x`**, the `riskThreshold` constant/variable in `emfn-action-pack-plugin.js`.

The plugin currently maps ~18 FEMA NRI hazard families based on the `RiskRenderer.hazardLabels` property defined in `emfn-action-pack-plugin.js`.

#### Example API response for NRI

```csv
county_fips,state,county,AVLN_risk_score,CFLD_risk_score,CWAV_risk_score,DRGT_risk_score,ERQK_risk_score,HAIL_risk_score,HWAV_risk_score,HRCN_risk_score,ISTM_risk_score,LNDS_risk_score,LTNG_risk_score,IFLD_risk_score,SWND_risk_score,TRND_risk_score,TSUN_risk_score,VLCN_risk_score,WFIR_risk_score,WNTW_risk_score
01001,Alabama,Autauga,,,28.18066157760814,45.64249363867685,67.84351145038168,44.30661577608143,85.90237636480411,72.090112640801,42.98567144285238,73.50508905852418,81.67938931297712,65.52162849872774,51.68575063613231,74.10941475826972,,,45.73791348600509,9.038828771483132
```

### Supporting files

- `assets/data/{st}.csv` contains per-state county risk data generated by the notebooks.
- `assets/data/_tallCategories.csv`, an exportt from Google Sheets of every _uniquely_ meaningful Category per quiz response
- `assets/html-templates/` stores HTML snippets exist within the Gravity Form "HTML field", which provides the DOM for our `#risks` info

### Data Analysis Notebooks

The `notebooks/` directory contains the Python workflows that support the Action Pack plugin's risk data and some effort at hash-related encode/decode tests.

Current notebooks:

- `US_disaster_risk_analysis.ipynb` downloads FEMA NRI data and generates per-state CSVs for US states plus DC
- `CA-MX_disaster_risk_analysis.ipynb` is a research notebook for Canada and Mexico data gaps; it does not currently generate runtime output files
- `action_pack_roundtrip_dev.ipynb` is a dev notebook for testing Action Pack payload encoding and decoding roundtrips

Current output location:

- `plugins/emfn-action-pack-plugin/assets/data/`

The notebooks are managed with `uv` and are not deployed to WordPress.

#### Recommended notebook workflow

Use the VS Code devcontainer for notebook work. It provides the expected Debian/Python environment and runs the repo setup script automatically.

Typical setup:

```bash
uv sync
uv run jupyter lab
```

Python dependencies currently live in `pyproject.toml` and include `jupyterlab`, `pandas`, `requests`, `numpy`, `ipykernel`, and `tqdm`.

#### Prevent Notebook Output In Git

This repo uses local pre-commit hooks to keep notebooks clean in commits.

Install hooks with:

```bash
uv tool install pre-commit
pre-commit install
```

The configured hooks:

- strip notebook outputs and execution metadata from changed notebooks
- fail the commit if executed notebook state remains

Relevant scripts live in `scripts/strip-notebook-outputs.sh` and `scripts/check-notebooks-clean.sh`.

## emfn-rich-search-plugin

This plugin exists in the repo but is still a scaffold. Details TK.

## Shared JS Types And Tooling

The plugin JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`.

`window.emfnData` now localizes only environment-specific runtime values needed by the browser, currently `dataUrl` and the `ap2.` payload prefix.

`jsconfig.json` scopes editor support to plugin JS and shared `.d.ts` files so the repo gets lightweight type assistance without a full TypeScript build.

Node-side repo tooling is intentionally small:

- `npm run format` runs Prettier across repo markdown, JSON, HTML, CSS, and JS.
- `npm run format:check` verifies formatting.
- `npm run notebooks:strip` strips notebook outputs.
- `npm run notebooks:check-clean` verifies notebooks are in a clean committed state.
- `npm run lint` runs formatting checks plus notebook cleanliness checks.

## Automated Maintenance

### Dependabot Configuration

This repo uses Dependabot (`.github/dependabot.yml`) for automated dependency management:

- **npm dependencies:** Weekly updates with grouped minor/patch PRs
- **Python/pip dependencies:** Weekly updates with grouped minor/patch PRs
- **GitHub Actions:** Weekly updates for workflow dependencies

Dependabot PRs can be auto-merged after CI passes, enabling frequent maintenance with minimal manual intervention.

### Automated Release Workflow

On every push to `main`, `.github/workflows/release.yml` executes:

1. **Lint checks:** Runs `npm run lint` (Prettier + notebook cleanliness)
2. **Version increment:** Computes next patch version tag (e.g., `v1.0.0` → `v1.0.1`)
3. **Version sync:** Updates all version references via `scripts/sync-release-version.sh`:
   - `package.json` version
   - `pyproject.toml` version
   - Plugin PHP headers (`Version:` field)
   - Plugin PHP constants (`EMFN_*_PLUGIN_VERSION`)
   - Plugin `readme.txt` stable tags
   - Plugin `readme.txt` changelog entries
4. **Commit sync:** Pushes version updates back to `main` as a bot commit
5. **Build assets:** Creates plugin ZIP files via `scripts/build-release-assets.sh`
6. **GitHub Release:** Publishes release with auto-generated notes and ZIP attachments
7. **Tag updates:** Maintains floating `latest` and `vX` tags

**Infinite loop prevention:** The workflow skips when the latest commit is already a version sync, preventing recursive triggers.

**Developer workflow benefits:**
- Merge PR → automatic version bump and release
- No manual version file editing
- Consistent versioning across all files
- Release notes auto-generated from commit history
- Suitable for Dependabot auto-merge after testing

## Deployment

Deployment to Newspack staging and production is handled manually by Newspack Support.

For plugin deployment:

1. Merge changes to `main` (automated release workflow creates GitHub Release)
2. Download plugin ZIP from GitHub Releases
3. Provide to Newspack Support for installation via WordPress Admin or direct server copy

The devcontainer, notebooks, scripts, tests, and scratch files are **not** deployed to WordPress.

## Testing

Automated testing infrastructure is planned but not yet implemented. See `tests/TESTING_PLAN.md` for:

- Comprehensive testing strategy covering PHP, JavaScript, E2E, and notebooks
- CI/CD integration approach
- Implementation phases and effort estimates
- Agentic AI development recommendations

Testing will enable safe auto-merge of Dependabot PRs and provide confidence in automated releases.

## Development Notes

### Coding Standards

- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix custom functions, classes, and hooks with `emfn_` to reduce conflicts
- Use phpDoc comments for WordPress plugin headers and function documentation
- JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`

### Version Management

- **Never manually edit version numbers** — the automated release workflow handles this
- All version references are synced automatically on merge to `main`
- Plugin source files use both WordPress `Version:` headers and PHP constants
- Both version indicators must match and are updated together by `scripts/sync-release-version.sh`

### Development Environment

- Use the VS Code (or sibling editor) `devcontainer` for consistent Python/Node.js environment
- WordPress core and third-party plugin versions are managed on the hosted Newspack environment
- This repo stores EMFN custom code and supporting data-generation assets
- Pre-commit hooks enforce notebook cleanliness (install with `pre-commit install`)

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
  - Enable debug mode (`&emfnDebug=true`) to see decoded categories
  - Verify `_tallCategories.csv` is identical on client and server
  - Check payload format starts with `ap2.` prefix
  - Confirm category order hasn't changed between encoding and decoding
  - Test payload decode with `action_pack_roundtrip_dev.ipynb` notebook

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

## TODO: Documentation Improvements

The following sections need to be added to improve developer experience and troubleshooting:

### CSS/JS Asset Loading Details
- Document when assets load vs when they don't
- Explain what the CSS does (styles form UI, hides Gravity Forms default progress bar, custom risk display)
- Document JS responsibilities beyond encoding/decoding (geolocation binding, risk rendering, form interaction)

### sessionStorage Contract
Document the client-side storage schema:
- Keys stored and their data types
- When storage is written (geolocation resolution, form navigation)
- When storage is cleared (form completion, session end)
- Why it's necessary for multi-page Gravity Forms
- Example data structure and lifecycle
