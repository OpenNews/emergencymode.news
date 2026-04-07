# emergencymode.news

Code storage for custom WordPress plugins, front-end assets, and supporting data-analysis notebooks for the Emergency Mode / EMFN Newspack site.

## Overview

This repository currently centers on two custom plugins:

- `emfn-action-pack-plugin` is the active front-end integration for the Action Pack assessment flow.
- `emfn-rich-search-plugin` is an early scaffold for hash-driven search and content personalization work.

The repo also includes Python notebooks that generate and validate FEMA National Risk Index county-level CSVs consumed by the Action Pack plugin.

## Repository Structure

```text
emergencymode.news/
├── .devcontainer/                          # Devcontainer config & setup script for local work
├── notebooks/                              # Python notebooks for risk-data generation and research
│   ├── US_disaster_risk_analysis.ipynb     # active in #risks work
│   ├── CA-MX_disaster_risk_analysis.ipynb  # needs work 
│   ├── FIPS_risk_lookup_dev.ipynb
│   ├── README.md
│   └── cache/                              # Cached FEMA source downloads
├── plugins/
│   ├── emfn-action-pack-plugin/            # Gravity Forms augmentation
│   │   ├── emfn-action-pack-plugin.php
│   │   ├── includes/
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   ├── data/                       # CSVs used in Geolocation & hash encoding/decoding
│   │   │   ├── html-templates/             # Preserved HTML-field for Gravity Forms
│   │   │   └── js/                         # major client-side enhancements
│   │   └── languages/
│   ├── emfn-rich-search-plugin/            # Draft of rich-search ideas
│   │   ├── emfn-rich-search-plugin.php
│   │   ├── includes/
│   │   ├── assets/
│   │   └── languages/
│   └── shared/
│       └── emfn-types.d.ts                 # Shared Types for JavaScript
├── scripts/                                # Notebook hygiene utilities
├── jsconfig.json                           # JS editor/type-checking scope 
├── package.json                            # Prettier + repo lint scripts
└── pyproject.toml                          # Notebook Python dependencies
```

## emfn-action-pack-plugin

This is the primary active plugin in the repo.

Responsibilities:

- Enqueues the Action Pack CSS and JS bundles
- Exposes `window.emfnData.dataUrl` so the browser can fetch runtime CSV data from `assets/data/<st>.csv`
- Exposes the `ap2.` payload prefix used for Action Pack share URLs
- Binds to Google Places v2 autocomplete feature within Gravity Forms to resolve user's geolocation
- Hits FCC's Area API to resolve `countyFIPS` from Places v2's lat/lng coords
- Fetches the matching `<st>.csv` and renders likely hazards from FEMA National Risk Index scores
- Persists resolved location data in `sessionStorage` so multi-page Gravity Forms flows can keep using it, in addition to in-memory client-side variables
- Computes a compact client-side Action Pack payload from matched Categories for subsequent share URLs
- Decodes `actionPack` request payloads on the server and maps them to Newspack Query Loop category filters

### Current Gravity Forms Action Pack flow

On this branch, the Action Pack payload flow is coordinated between `plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js` and `plugins/emfn-action-pack-plugin/includes/class-emfn-action-pack-plugin.php`.

Encoding behavior notes:

1. On a real submit action, it collects the current form values for controls inside `fieldset.hashable`
    * not every Form entry is `.hashable` -- many are just use-tracking for understanding overall grant reach and impact
1. Fetches `plugins/emfn-action-pack-plugin/assets/data/_tallCategories.csv` in the browser at submit time
1. Uses the CSV columns `answerID`, `category`, and `manualRank` to map selected values to unique Category names
1. Sorts those Categories by highest `manualRank` first and uses that category order to build the compact bitmask
1. Encodes that bitmask as one or more versioned base36 segments prefixed with `ap2.`
1. Writes the encoded payload into `.hashMarker input` before Gravity Forms continues submission
    * If `.hashMarker input` is missing, the payload cannot be stored with the submission
1. PHP decodes the same `ap2.` payload format back into Category names and resolves matching WordPress Categories for the `.emfn-action-pack` Query Loop block

**Sample client-side JS encoding in dev tools**
```js
Collected hashable form values: ["mode-before", "distribPlatforms-sms", "disasterType-flooding"]
Resolved Action Pack categories: ["Flooding", "Before", "Text messages"]
Serialized Action Pack categories: ["Flooding", "Before", "Text messages"]
// hidden .hashMarker input receives: ap2...
``` 

**Server-side decode notes**

1. Reads `$_GET['actionPack']` on landing-page requests
1. Decodes `ap2.` base36 bitmask segments back into Category names using category order derived from `_tallCategories.csv`
1. Resolves category names to WordPress term IDs and applies them to Query Loop blocks with the `emfn-action-pack` class
1. Emits a footer `console.debug()` with the decoded Category names when `actionPack` is present

### Risk data flow

For US lookups, we match `countyFIPS` to NRI risk scores, where the **score is at least `50`** (`riskThreshold` constant/variable in `emfn-action-pack-plugin.js`).

The plugin currently maps these 18 FEMA NRI hazard families:

- Avalanche
- Coastal Flooding
- Cold Wave
- Drought
- Earthquake
- Hail
- Heat Wave
- Hurricane
- Ice Storm
- Inland Flooding
- Landslide
- Lightning
- Strong Wind
- Tornado
- Tsunami
- Volcanic Activity
- Wildfire
- Winter Weather

#### Example API response for NRI

```csv
county_fips,state,county,AVLN_risk_score,CFLD_risk_score,CWAV_risk_score,DRGT_risk_score,ERQK_risk_score,HAIL_risk_score,HWAV_risk_score,HRCN_risk_score,ISTM_risk_score,LNDS_risk_score,LTNG_risk_score,IFLD_risk_score,SWND_risk_score,TRND_risk_score,TSUN_risk_score,VLCN_risk_score,WFIR_risk_score,WNTW_risk_score
01001,Alabama,Autauga,,,28.18066157760814,45.64249363867685,67.84351145038168,44.30661577608143,85.90237636480411,72.090112640801,42.98567144285238,73.50508905852418,81.67938931297712,65.52162849872774,51.68575063613231,74.10941475826972,,,45.73791348600509,9.038828771483132
```

### Supporting files

- `assets/data/{st}.csv` contains per-state county risk data generated by the notebooks.
- `assets/html-templates/` holds HTML snippets that were manually pasted into Gravity Forms HTML field(s), mostly the `#risks` DOM template we need

### Data Analysis Notebooks

The `notebooks/` directory contains the Python workflows that support the Action Pack plugin's risk data.

Current notebooks:

- `US_disaster_risk_analysis.ipynb` downloads FEMA NRI data and generates per-state CSVs for US states plus DC
- `CA-MX_disaster_risk_analysis.ipynb` is a research notebook for Canada and Mexico data gaps; it does not currently generate runtime output files
- `FIPS_risk_lookup_dev.ipynb` is a notebook-native dev tool for reading generated CSVs and previewing hazard output

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

## Deployment

Deployment to Newspack staging and production is handled manually by Newspack Support.

For plugin deployment:

1. Commit the desired changes to `main` when ready.
2. Provide the updated plugin directory to Newspack Support for installation via plugin upload or direct server copy.

| Repo path | WordPress server path |
| --- | --- |
| `plugins/emfn-action-pack-plugin/` | `wp-content/plugins/emfn-action-pack-plugin/` |
| `plugins/emfn-rich-search-plugin/` | `wp-content/plugins/emfn-rich-search-plugin/` |

The devcontainer, notebooks, scripts, and scratch files are not deployed to WordPress.

## Development Notes

- WordPress core and third-party plugin versions are managed on the hosted Newspack environment.
- This repo stores EMFN custom code and supporting data-generation assets.
- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix custom functions, classes, and hooks with `emfn_` to reduce conflicts.

## References

- Newspack Plugin documentation: https://github.com/Automattic/newspack-plugin
- Newspack Blocks documentation: https://github.com/Automattic/newspack-blocks
