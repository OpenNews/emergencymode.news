# emergencymode.news

Code storage for customizations, plugins and theme work related to the Emergency Mode / EMFN WordPress Newspack instance.

## Overview

This repository holds custom code that extends and customizes the [Newspack](https://newspack.com/) WordPress platform powering emergencymode.news. It is organized to reflect how WordPress loads and applies customizations, making it easy to deploy files to the correct locations on the server.

## Repository Structure

```
emergencymode.news/
├── .devcontainer/           # VS Code dev container config (not deployed to WordPress)
│   ├── devcontainer.json    # Container image, extensions, settings, post-create hook
│   └── setup.sh             # Post-create script: installs uv + Python dependencies
│
├── notebooks/               # Python notebooks for data analysis (uv-based)
│   ├── US_disaster_risk_analysis.ipynb         # Generates per-US-state NRI risk CSVs
│   ├── CA-MX_disaster_risk_analysis.ipynb      # Research: CA+MX data gaps (no output yet)
│   ├── FIPS_risk_lookup_dev.ipynb              # Notebook-native FIPS<>risk for testing
│   ├── README.md                               # Notebooks documentation
│   └── cache/                                  # Cached source data downloads
│
├── plugins/
│   └── emfn-risk-assessment-plugin/               # Custom front-end behavior plugin
│       ├── plugin entry file                      # Plugin entry point + header
│       ├── readme.txt
│       ├── includes/
│       │   └── class-emfn-risk-assessment-plugin.php # Singleton; enqueues assets + wp_localize_script
│       ├── assets/
│       │   ├── css/
│       │   │   └── emfn-risk-assessment-plugin.css # Site style overrides + component styles
│       │   ├── js/
│       │   │   └── emfn-risk-assessment-plugin.js # Geolocation, NRI risk lookup, form wiring
│       │   ├── data/
│       │   │   ├── {ST}.csv                    # Per-state NRI risk scores (e.g. AL.csv)
│       │   │   └── readme.txt                  # Data directory documentation
│       │   └── html-templates/
│       │       ├── gravityForms-...-body.html  # HTML for Gravity Forms HTML field
│       │       └── readme.txt
│       └── languages/
│
└── tmp/                                        # Scratch files; not deployed
```

## emfn-risk-assessment-plugin

The primary active plugin. Responsibilities:

- **Site style overrides** – CSS targeting Newspack theme components, Gravity Forms and custom UI elements.
- **Geolocation + risk mapping** – On Gravity Forms address input, resolves lat/lng via Google Places v2, looks up county FIPS via the [FCC Area API](https://geo.fcc.gov/api/census/block/find), fetches a per-state NRI CSV from `assets/data/` and surfaces likely hazards to the user ranked by NRI risk score.
- **NRI data** – Per-state CSVs (`assets/data/{ST}.csv`) contain FEMA National Risk Index composite risk scores (0–100) for 18 hazard types across all counties. Scores ≥ 50 (configurable via `riskThreshold`) are shown. See `assets/data/readme.txt` for full schema.
- **HTML templates** – Copy/paste snippets for Gravity Forms HTML fields used in the Action Pack Assessment form.

`window.emfnData.dataUrl` is injected by `wp_localize_script` and points to the plugin's `assets/data/` directory on the server.

### Gravity Forms: hashing responses for custom Action Pack display (JS-only)

The Action Pack hash flow is client-side and depends on Gravity Forms frontend events.

Current flow:
1. The plugin binds `controlFormSubmission()` after Gravity Forms JS initializes.
2. On `gform/submission/submission_started`, the script reads `new FormData(data.form)`.
3. It keeps `input_*` keys, sorts them, serializes as `key:value|...`, and computes a base36 hash.
4. It writes the hash to a hidden field with class `.hashMarker`.
5. Gravity Forms merge tags then place that value in the confirmation URL.

Code location:
- `plugins/emfn-risk-assessment-plugin/assets/js/emfn-risk-assessment-plugin.js`

Expected confirmation pattern:
- `https://emergencymode.news/action-pack/?mode={Mode:38}&actionPack={Hash Marker:75}`

#### Troubleshooting `.hashMarker`

If `actionPack` is missing or empty, troubleshoot in this order:

1. Confirm Gravity Forms frontend JS is present on the page.
   - Browser console should not show: `Gravity Forms JS API not available; skipping submission filter binding.`

2. Confirm the hash-marker input exists at submit time.
   - The submitted form must contain an input with class `.hashMarker`.
   - Browser console warning indicates this issue: `.hashMarker input not found; actionPack will not appear in Confirmation URL.`

3. Confirm the field has not moved outside the `<form>` during template edits.
   - If the field "wanders off" into markup outside the form element, it will not be included in submitted `FormData`.
   - Keep the hidden field inside the same Gravity Form instance targeted by `form.emfn-forms`.

4. Confirm confirmation uses the correct merge tag field ID.
   - If field IDs changed, update `{Hash Marker:ID}` accordingly.

5. Confirm your dynamic field naming strategy remains stable.
   - The hash intentionally uses only `input_*` keys and sorted key order for determinism.

## Deploying Changes

Deployment to the Newspack staging and production environments is handled manually by Newspack Support staff. To prepare a plugin update:

1. Commit changes to `main`.
2. Provide the updated plugin folder to Newspack Support for installation via _Plugins > Add New > Upload Plugin_ or direct server copy.

| Repo path                | WordPress server path               |
| ------------------------ | ----------------------------------- |
| `plugins/<plugin-name>/` | `wp-content/plugins/<plugin-name>/` |

`.devcontainer/`, `dev-tools/`, and `notebooks/` are not deployed to WordPress.

## Data Analysis Notebooks

The `notebooks/` directory contains Python notebooks for data journalism and analysis work. These are managed with [uv](https://github.com/astral-sh/uv) and are **not deployed to the WordPress server**.

### Why Use The Devcontainer For Notebooks

The recommended way to run notebooks in this repo is inside the VS Code devcontainer.

- It provides a consistent Debian + Python toolchain for everyone on the project.
- It runs `.devcontainer/setup.sh`, which installs `uv` and project dependencies expected by the notebooks.
- It avoids host-machine drift (different Python versions, missing system libs, or mismatched package sets) that can break notebook execution.
- It keeps notebook tooling isolated from your local/global Python environment.

In short: the devcontainer makes notebook runs reproducible and reduces setup/debug time across contributors.

### Getting Started with Notebooks

1. **Install uv** (if not already installed):
   ```bash
   pip install uv
   ```

2. **Install dependencies**:
   ```bash
   uv sync
   ```

3. **Start JupyterLab**:
   ```bash
   uv run jupyter lab
   ```

4. **Open a notebook**: Navigate to `notebooks/` and open the desired `.ipynb` file

### Prevent Notebook Output In Git

This repo uses a pre-commit hook to keep notebooks in a clean, unexecuted state in commits.

1. Install pre-commit:
   ```bash
   uv tool install pre-commit
   ```
2. Enable hooks in this repo:
   ```bash
   pre-commit install
   ```

On each commit, notebook hooks will:
- strip notebook code-cell outputs and execution metadata
- fail the commit if executed notebook state remains

### Available Notebooks

- **US_disaster_risk_analysis.ipynb**: Downloads FEMA NRI data and generates per-state CSV files (`assets/data/{ST}.csv`) for US states + DC
- **CA-MX_disaster_risk_analysis.ipynb**: Research notebook demonstrating the data-source and client-side lookup gap for Canada and Mexico (ThinkHazard + FCC API live calls; no output files yet)
- **FIPS_risk_lookup_dev.ipynb**: Notebook-native county FIPS lookup tool for local testing of hazard rendering using generated state CSVs

See `notebooks/README.md` for detailed documentation on each notebook.

## Newspack Customization Notes

- **Hooks and filters** for Newspack-specific behavior live in the plugin's `includes/class-emfn-risk-assessment-plugin.php`.
- **Newspack Plugin documentation:** https://github.com/Automattic/newspack-plugin
- **Newspack Blocks documentation:** https://github.com/Automattic/newspack-blocks

## Development Notes

- WordPress version and plugin dependencies are managed on the hosted Newspack environment; this repo stores only _custom_ code.
- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix all custom functions, classes and hooks with `emfn_` to avoid conflicts.
