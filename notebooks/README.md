# Disaster Risk Data Analysis Notebooks

## Overview

The notebooks in this directory support the EMFN Action Pack plugin's location-based risk workflow.

Current notebooks:

- **`US_disaster_risk_analysis.ipynb`** downloads FEMA National Risk Index county data and generates per-state CSV files for US states plus DC.
- **`CA-MX_disaster_risk_analysis.ipynb`** is a research notebook that documents the data and lookup gaps for Canada and Mexico. It makes exploratory live API calls but does not currently generate runtime output files for the site.

## Current Output Location

Generated runtime data for the Action Pack plugin lives in:

`plugins/emfn-action-pack-plugin/assets/data/`

That directory currently contains committed US state files plus DC:

- `AK.csv` through `WY.csv`
- `DC.csv`

There are no committed Canada or Mexico runtime CSVs in the current branch.

## Data Source

- **[FEMA National Risk Index (NRI)](https://hazards.fema.gov/nri/data-resources)** provides the county-level US hazard data used by the US notebook.
- The cached upstream county table is stored in `notebooks/cache/NRI_Table_Counties.csv` after download.
- Canada and Mexico work is still exploratory; this repo does not currently ship equivalent non-US generated files.

## Output Schema

The generated CSV files used by the plugin contain:

- `county_fips`
- `state`
- `county`
- `{HAZARD}_risk_score` columns for 18 NRI hazard families

The Action Pack plugin matches rows by `county_fips` and filters hazards in client-side JS using its `riskThreshold` setting.

## Dependency Management

All notebooks share setup utilities via `shared_setup.py`, which both notebooks import to verify their execution environment:

1. **Cell 2**: `uv sync` — ensures the environment is in sync with `uv.lock`
2. **Cell 3**: Calls `check_dependencies()` from `shared_setup.py` to verify environment health

**Shared Setup Utilities (`shared_setup.py`):**

The `shared_setup.py` module provides a single source of truth for environment checking across both `US_disaster_risk_analysis.ipynb` and `CA-MX_disaster_risk_analysis.ipynb`. It:

- Verifies that `uv sync --frozen` succeeds (environment is in sync with lock file)
- Tests critical package imports
- Reports installed versions and displays clear status

**When Cell 3 reports an issue:**

The output will show exactly what's wrong and provide the next steps. If the environment is out of sync, you'll see instructions to run `uv sync` from the repo root. If packages are missing, the output recommends the same.

**Python dependencies are manually maintained** (not auto-updated) since notebooks are rarely used. Dependabot automation focuses on the plugin code (JavaScript/npm) instead.

## Hazard Codes

The current US notebook and plugin use these 18 NRI hazard families:

| Code | Hazard Type |
|------|-------------|
| AVLN | Avalanche |
| CFLD | Coastal Flooding |
| CWAV | Cold Wave |
| DRGT | Drought |
| ERQK | Earthquake |
| HAIL | Hail |
| HWAV | Heat Wave |
| HRCN | Hurricane |
| ISTM | Ice Storm |
| LNDS | Landslide |
| LTNG | Lightning |
| IFLD | Inland Flooding |
| SWND | Strong Wind |
| TRND | Tornado |
| TSUN | Tsunami |
| VLCN | Volcanic Activity |
| WFIR | Wildfire |
| WNTW | Winter Weather |

## Recommended Workflow

Use the VS Code devcontainer for notebook work. It provides the expected Debian and Python environment and runs the repo setup automatically.

Typical setup:

```bash
uv sync
uv run jupyter lab # if you're not in a code editor that can render notebooks
```

Then open the desired notebook from `notebooks/`.

Python dependencies are managed in `pyproject.toml` and currently include:

- `jupyterlab`
- `pandas`
- `requests`
- `numpy`
- `ipykernel`
- `tqdm`

## Notebook Hygiene

This repo keeps notebooks in a clean, unexecuted state in commits.

Available commands:

- `npm run notebooks:strip`
- `npm run notebooks:check-clean`

To enable local hooks:

```bash
uv tool install pre-commit
pre-commit install
```

The configured hooks strip outputs from changed notebooks and fail commits if executed notebook state remains.
