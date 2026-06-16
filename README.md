# emergencymode.news

Custom WordPress plugins, Python Notebooks and miscellaneous code version control for the Emergency Mode for News (EMFN) Newspack website.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


## Overview

This repository contains:
* the `emfn-action-pack-plugin` — the active front-end integration for the Action Pack assessment flow
* the `emfn-site-styles-plugin` — site-wide CSS and (eventually?) JS we need to run the site, rather than store code in WordPress inputs   
* Python notebooks that generate and validate FEMA National Risk Index county-level CSVs consumed by the Action Pack plugin
* Lotta tests
* A release cycle that generates ZIPs and release versioning based on which plugin has an update
* Lotta developer-experience and AI efforts that should keep things steady 

**Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards and workflow.

### Repository Structure (in _humane_ order, not alphabetical)

```text
emergencymode.news/
├── README.md                               # This file
├── AGENTS.md                               # instructions for most agents
├── AGENT_LESSONS.md                        # Agent guide: lessons learned, gotchas, errors
├── CONTRIBUTING.md                         # Development workflow, coding standards, testing
│
├── plugins/
│   ├── emfn-action-pack-plugin/            # Gravity Forms augmentation
│   │   ├── assets/
│   │   │   ├── js/emfn-action-pack….js     # JS that encodes Quiz responses to custom ActionPack 
│   │   │   ├── data/                       # CSVs used in geolocation & hash encoding/decoding
│   │   │   │   ├── _tallCategories.csv     # Category mapping registry
│   │   │   │   └── {ST}.csv                # State-specific NRI risk data (51 files)
│   │   │   ├── html-templates/*            # backups of important HTML used it WP
│   │   │   └── css/emfn-action-pack….css   # custom styles for Action Pack
│   │   ├── includes/
│   │   │   └── class-emfn-action-pack….php # PHP that decodes Action Pack and matches Categories
│   │   ├── emfn-action-pack-plugin.php     # Main plugin file
│   │   ├── readme.txt                      # WordPress plugin readme for WP ecosystem
│   │   └── languages/                      # i18n support for the future, if ever
│   │
│   ├── emfn-site-styles-plugin/            # Site-wide CSS/JS
│   │   ├── includes/
│   │   │   └── class-emfn-site-styles….php # enqueues plugin's CSS/JS files when site loads
│   │   ├── assets/
│   │   │   ├── css/emfn-site-styles….css   # Sitewide styles
│   │   │   ├── html-templates/*            # backups of important HTML used it WP
│   │   │   ├── js/*                        # We may grow to have site-wide JS
│   │   │   └── scss/                       # SASS source files…if we want to go this route
│   │   ├── MOVE_TO_SASS.md                 # SASS migration plan (ditto)
│   │   ├── emfn-site-styles-plugin.php     # Main plugin file
│   │   ├── readme.txt                      # WordPress plugin readme for WP ecosystem
│   │   └── languages/                      # i18n support for the future, if ever
│   │  
│   └── shared/
│       └── emfn-types.d.ts                 # Shared Types for JavaScript
│
├── notebooks/                              # Python notebooks for risk-data generation and research
│   ├── US_disaster_risk_analysis.ipynb     # Action Pack #risks work
│   ├── CA-MX_disaster_risk_analysis.ipynb  # Draft of possible expansion to MX and CA 
│   ├── shared_setup.py                     # Shared setup utilities for notebooks
│   ├── README.md                           # Notebook documentation
│   └── cache/*                             # Cached FEMA source downloads
│
├── scripts/                                # Release, notebook and test utils (see its README.md)
│   ├── <various scripts>.sh                # See scripts/README for details
│   └── README.md                           # Scripts documentation
│
├── tests/                                  # Testing infrastructure
│   ├── README.md                           # Quick start for running tests
│   ├── TESTING_PLAN.md                     # Testing strategy, as we grow
│   ├── js/                                 # JavaScript tests (Jest)
│   │   ├── setup.js                        # Test environment setup
│   │   ├── action-pack/                    # Action Pack plugin tests
│   │   └── lib/                            # Shared test utilities
│   ├── php/                                # PHP tests (PHPUnit)
│   │   ├── bootstrap.php                   # Test bootstrap with WordPress stubs
│   │   └── action-pack/                    # Action Pack plugin tests
│   ├── scripts/                            # Shell script tests
│   └── fixtures/                           # Test mock data (it must not touch real data)
│
├── tools/                                  # Development utilities (not deployed)
│   ├── README.md                           # Tour of version-controlled tools
│   └── scripts/*                           # Version-controlled backups of extra things we need
│
├── dist/                                   # Build output (gitignored, generated by scripts/build-release-assets.sh)
├── tmp/                                    # Your local temporary/scratch files (gitignored)
│
├── .devcontainer/                          # Dev "box" config (see CONTRIBUTING.md)
├── .github/                                # Instrux for GitHub & releases  (see CONTRIBUTING.md)
├── .vscode/                                # Shared VSCode settings (see CONTRIBUTING.md)
├── .gitignore                              # files we do not want to EVER commit to GitHub
├── .editorconfig                           # Cross-editor formatting rules
├── .pre-commit-config.yaml                 # Pre-commit hook configuration
├── .prettierrc                             # Prettier formatting config
├── .prettierignore                         # Files to ignore for Prettier's cleanup
│
├── eslint.config.js                        # ESLint configuration
├── jsconfig.json                           # Editor & Type config 
├── composer.json                           # PHP dependencies (PHPUnit, WordPress stubs)
├── jest.config.cjs                         # Jest test configuration
├── phpunit.xml                             # PHPUnit test configuration
├── coverage/                               # Test coverage reports (gitignored, generated by test:coverage)
│   ├── js/                                 # JavaScript coverage (Jest)
│   └── php/                                # PHP coverage (PHPUnit)
│
├── pyproject.toml                          # Notebook dependencies
├── package.json                            # npm dependencies & scripts
├── uv.lock                                 # Python dependency lockfile
└── LICENSE
```

## Automatic Release Workflow

This repository uses **independent versioning for each plugin** with automated releases on push to `main`. Each plugin has its own version number and release cycle. See [Releases](https://github.com/OpenNews/emergencymode.news/releases) for latest versions and ZIPs.

Plugin releases create plugin-specific tags in the format `<plugin-slug>/vX.Y.Z`:
- `action-pack/v*` - Action Pack plugin releases
- `site-styles/v*` - Site Styles plugin releases

When changes are merged to `main`:

1. **Detection**: Workflow detects which plugins have changes
2. **Version bump**: Calculates next version from commit messages:
   - `[major]` or `major:` → Major version bump (1.0.0 → 2.0.0)
   - `[minor]` or `minor:` → Minor version bump (1.0.0 → 1.1.0)
   - `[patch]` or `patch:` → Patch version bump (1.0.0 → 1.0.1) -- the default
   - `[pre]` → Pre-release version bump (e.g., 1.0.1-pre for next patch with pre-release flag)
3. **Update files**: Syncs version across plugin PHP files and readme.txt
4. **Build assets**: Creates plugin ZIP files in `dist/`
5. **Create release**: Tags commit and publishes GitHub release with ZIP

Pre-releases on a plugin are best used to validate a release candidate on staging or share a testable ZIP before cutting the next stable release. It can also be used to make small edits to the existing plugins that do not matter to functionality in WordPress and can go out with the next real release. 

### Manual Releases

Trigger releases manually via Actions tab in GitHub:
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
  - Binds to [Google Places v2 add-on in Gravity Forms](https://www.gravityforms.com/blog/get-started-geolocation-add-on-tutorial/) to receive user's geolocation
  - Hits [FCC's Area API](https://geo.fcc.gov/api/census/) to resolve `countyFIPS` from Places' `lat`/`lng` coords
  - Fetches the matching `<st>.csv` and renders likely hazards from [FEMA National Risk Index scores](https://www.fema.gov/about/openfema/data-sets/national-risk-index-data) (_see [/notebooks/README](/notebooks/README.md)_)
  - Persists resolved location data in `sessionStorage` so it persists across a multi-page Gravity Form (in addition to in-memory client-side variables)
- **Submission client-side Hash Encoding**
  - Computes a compact [client-side Action Pack payload/hash](#action-pack-flow) from matched Categories for subsequent share URLs, looking (probably) like `?actionPack=ap2.2w6g74.1y`
- **PHP server-side Hash Decoding**
  - Decodes the same `actionPack` payload/hash on the server and maps them to Newspack Query Loop query params via a [custom algorithm](#content-recommendation-algorithm)

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

**Phase 1: Action Pack Quiz (.emfn-forms)**
- Multi-"page" Gravity Form at `/action/` collects location, disaster type, newsroom characteristics
- JS plugin binds geolocation
- On submit, collects `.hashable`-marked form entries
- Fetches `_tallCategories.csv` to map answers → WP Category IDs → compact `ap2.` bitmask payload
- Writes encoded payload to `.hashMarker input` (to save to Form entry) and form redirects with `?actionPack=ap2.<hash>`
- Location data persists in `sessionStorage` across form pages, as a backup mechanism 

**Phase 2: Action Pack Recommendations**
- User lands on results page with `?actionPack=ap2.<hash>` parameter
- PHP decodes payload using `_tallCategories.csv` category order (synchronized with client JS)
- Resolves Category names → WordPress term IDs
- Filters Newspack Content Loop blocks with `.emfn-action-pack` class to matched categories
- URL is shareable; returns user a similarly ranked personalized Action Pack configuration, though it may contain newer material than last time they looked
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

Your quiz responses create a weighted category list. Categories that match more of your answers (higher "Total Rank" in the scoring table) receive higher weights. For example, if your responses emphasize staff safety and field reporting challenges, those categories get prioritized.

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

(While the NRI does offer census-tract level data and those risks would be more accurate, we're assuming that a newsroom wants to know about hazards and risk faced by their audience, which is rarely only the size of a census tract.)

The plugin currently maps ~18 FEMA NRI hazard families based on the `RiskRenderer.hazardLabels` property defined in `plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js`.

#### Example County response from NRI data

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
- `assets/html-templates/homepage_animation.html` - Backup copy of the homepage hero animation, which is mainly kept in an HTML Block
- `assets/js/emfn-site-styles-plugin.js` - Site-wide JavaScript utilities…if we grow to need them

Future work on migrating to a SASS build system is documented in [MOVE_TO_SASS.md](plugins/emfn-site-styles-plugin/MOVE_TO_SASS.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, coding standards and pull request guidelines.

**Key points:**
- **Never manually edit version numbers** — automated release workflow handles this
- Follow WordPress coding standards, prefix functions/classes/hooks with `emfn_`
- Use the devcontainer for consistent development environment (see [CONTRIBUTING.md](CONTRIBUTING.md#devcontainer) for setup details)
- Pre-commit hooks enforce code quality (install with `pre-commit install`)

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

The plugin JavaScript uses JSDoc typing backed by `plugins/shared/emfn-types.d.ts`. `jsconfig.json` scopes editor support to plugin JS and shared `.d.ts` files for lightweight type assistance without a full TypeScript build.

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
npm run test:js:coverage   # Terminal summary + HTML report in coverage/js/
npm run test:php:coverage  # HTML report in coverage/php/index.html
```

**Test infrastructure**: Jest for JavaScript, PHPUnit for PHP, custom bash framework for shell scripts. Test files in `tests/js/`, `tests/php/` and `tests/scripts/`. Fixtures in `tests/fixtures/`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed testing workflow and [AGENT_LESSONS.md](AGENT_LESSONS.md) for common gotchas.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## References

- Newspack Plugin documentation: https://github.com/Automattic/newspack-plugin
- Newspack Blocks documentation: https://github.com/Automattic/newspack-blocks
