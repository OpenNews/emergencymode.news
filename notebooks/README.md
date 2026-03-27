# Disaster Risk Data Analysis Notebooks

## Overview

Three notebooks:

- **`US_disaster_risk_analysis.ipynb`** — downloads FEMA NRI data and generates
  per-state CSV files for US states + DC.
- **`CA-MX_disaster_risk_analysis.ipynb`** — research notebook documenting the data
  source and client-side lookup gap for Canada and Mexico. Makes live calls to
  ThinkHazard and FCC APIs to demonstrate the issues. Does not yet generate output files.
- **`FIPS_risk_lookup_dev.ipynb`** — notebook-native county FIPS lookup UI for local
  testing. Reads generated CSVs from `plugins/emfn-behavior-plugin/assets/data/` and
  renders hazard results in notebook output.

## Setup

This project uses `uv` for dependency management.

```bash
uv sync
uv run jupyter lab
```

Then open any notebook in `notebooks/`.

## Data source

- **[FEMA National Risk Index (NRI)](https://hazards.fema.gov/nri/data-resources)**:
  18 natural-hazard risk scores for every US county (December 2025, v3).
  Downloaded automatically on first run and cached in `notebooks/cache/`.

Canadian provinces and Mexican states use mocked data (no equivalent public
source is available via FEMA or RAPT).

## Output

Files are written to `plugins/emfn-behavior-plugin/assets/data/`:

| Region | Files | Source |
|--------|-------|--------|
| US states + DC | `AL.csv` … `WY.csv` | NRI real data (US notebook) |
| Canadian provinces/territories | `AB.csv` … `YT.csv` | Mocked (pending CA-MX notebook) |
| Mexican states | `AGU.csv` … `ZAC.csv` | Mocked (pending CA-MX notebook) |

Each file has columns: `county_fips`, `state`, `county`, `{HAZARD}_risk_score` × 18.

## Hazard Codes (NRI v3)

The notebook uses these 18 hazard types:

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
