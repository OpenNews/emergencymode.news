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
├── dev-tools/               # Local development tools (not deployed to WordPress)
│   ├── fips-risk-lookup.html    # Standalone FIPS risk lookup tool
│   └── README.md                # Dev tools documentation
│
├── notebooks/               # Python notebooks for data analysis (uv-based)
│   ├── US_disaster_risk_analysis.ipynb   # Generates per-US-state NRI risk CSVs
│   ├── CA-MX_disaster_risk_analysis.ipynb # Research: CA+MX data gaps (no output yet)
│   ├── README.md                          # Notebooks documentation
│   └── cache/                             # Cached source data downloads
│
├── plugins/
│   └── emfn-behavior-plugin/                   # Custom front-end behavior plugin
│       ├── emfn-behavior-plugin.php            # Plugin entry point + header
│       ├── readme.txt
│       ├── includes/
│       │   └── class-emfn-behavior-plugin.php  # Singleton; enqueues assets + wp_localize_script
│       ├── assets/
│       │   ├── css/
│       │   │   └── emfn-behavior-plugin.css    # Site style overrides + component styles
│       │   ├── js/
│       │   │   └── emfn-behavior-plugin.js     # Geolocation, NRI risk lookup, form wiring
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

## emfn-behavior-plugin

The primary active plugin. Responsibilities:

- **Site style overrides** – CSS targeting Newspack theme components, Gravity Forms and custom UI elements.
- **Geolocation + risk mapping** – On Gravity Forms address input, resolves lat/lng via Google Places v2, looks up county FIPS via the [FCC Area API](https://geo.fcc.gov/api/census/block/find), fetches a per-state NRI CSV from `assets/data/` and surfaces likely hazards to the user ranked by NRI risk score.
- **NRI data** – Per-state CSVs (`assets/data/{ST}.csv`) contain FEMA National Risk Index composite risk scores (0–100) for 18 hazard types across all counties. Scores ≥ 50 (configurable via `riskThreshold`) are shown. See `assets/data/readme.txt` for full schema.
- **HTML templates** – Copy/paste snippets for Gravity Forms HTML fields used in the Action Pack Assessment form.

`window.emfnData.dataUrl` is injected by `wp_localize_script` and points to the plugin's `assets/data/` directory on the server.

## Dev Tools

The `dev-tools/` directory contains local development tools for testing plugin functionality without WordPress.

### FIPS Risk Lookup Tool

A standalone HTML page (`fips-risk-lookup.html`) that demonstrates the plugin's client-side risk logic:

- Enter any 5-digit county FIPS code to see FEMA NRI risk scores
- Sample buttons for quick testing with major US counties
- Direct filesystem lookups of CSV data (no server-side code required)
- Matches the plugin's display logic and ≥50% risk threshold

**Usage:** Open `dev-tools/fips-risk-lookup.html` in a browser. See `dev-tools/README.md` for details.

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

### Available Notebooks

- **US_disaster_risk_analysis.ipynb**: Downloads FEMA NRI data and generates per-state CSV files (`assets/data/{ST}.csv`) for US states + DC
- **CA-MX_disaster_risk_analysis.ipynb**: Research notebook demonstrating the data-source and client-side lookup gap for Canada and Mexico (ThinkHazard + FCC API live calls; no output files yet)

See `notebooks/README.md` for detailed documentation on each notebook.

## Newspack Customization Notes

- **Hooks and filters** for Newspack-specific behavior live in the plugin's `includes/class-emfn-behavior-plugin.php`.
- **Newspack Plugin documentation:** https://github.com/Automattic/newspack-plugin
- **Newspack Blocks documentation:** https://github.com/Automattic/newspack-blocks

## Development Notes

- WordPress version and plugin dependencies are managed on the hosted Newspack environment; this repo stores only _custom_ code.
- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix all custom functions, classes and hooks with `emfn_` to avoid conflicts.
