# Disaster Risk Data Analysis Notebooks

## Overview

The notebooks in this directory support the EMFN Action Pack plugin's location-based risk workflow.

Current notebooks:

- **`US_disaster_risk_analysis.ipynb`** downloads FEMA National Risk Index county data and generates per-state CSV files for US states plus DC.
- **`CA-MX_disaster_risk_analysis.ipynb`** is a research notebook that documents the data and lookup gaps for Canada and Mexico. It makes exploratory live API calls but does not currently generate runtime output files for the site.
- **`FIPS_risk_lookup_dev.ipynb`** is a notebook-native lookup and rendering tool for local testing against the generated CSVs.

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
uv run jupyter lab
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
