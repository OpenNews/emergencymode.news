# Disaster Risk Data Analysis Notebooks

This directory contains Python notebooks for analyzing disaster risk projection data for Emergency Mode News.

## Overview

The `disaster_risk_analysis.ipynb` notebook pulls disaster risk projection data from FEMA and other sources to create a comprehensive risk assessment for counties in the northern hemisphere (primarily US, with plans to expand to Canada and Mexico).

## Setup

This project uses `uv` for dependency management. To get started:

1. **Install uv** (if not already installed):
   ```bash
   pip install uv
   ```

2. **Install dependencies**:
   ```bash
   cd /path/to/emergencymode.news
   uv sync
   ```

3. **Start JupyterLab**:
   ```bash
   uv run jupyter lab
   ```

4. **Open the notebook**:
   Navigate to `notebooks/disaster_risk_analysis.ipynb`

## Data Sources

### Primary Sources
- **FEMA National Risk Index (NRI)**: County-level risk scores for 18 natural hazards across the US
  - API: https://www.fema.gov/api/open/v2/FimaNriNationalRiskIndex
  - Documentation: https://www.fema.gov/about/openfema/data-sets/national-risk-index-data

- **FEMA OpenFEMA API**: Disaster declarations and related datasets
  - Documentation: https://www.fema.gov/about/openfema/api
  - Datasets: https://www.fema.gov/about/openfema/data-sets#disaster

- **FEMA RAPT (Resilience Analysis and Planning Tool)**: Hazard mapping and codes
  - Tool: https://www.fema.gov/emergency-managers/practitioners/resilience-analysis-and-planning-tool

### Future Sources (Planned)
- **GFDRR CCDR Tools**: Global climate and disaster risk data
  - Repository: https://github.com/GFDRR/CCDR-tools
  - EM-DAT Dashboard: https://gfdrr.github.io/CCDR-tools/tools/utility/emdat/EMDAT_dashboard.html
  
- **Risk Data Library**: Standardized hazard type codes
  - Documentation: https://docs.riskdatalibrary.org/en/latest/reference/codelists/#hazard-type

## Output Format

The notebook generates **per-state CSV files** (e.g., `california_risk_data_20260324.csv`, `texas_risk_data_20260324.csv`) with the following structure:

### Why Per-State Files?

- **Reduced lookup costs**: Smaller files load faster
- **State-level analysis**: Focus on specific states without loading all data
- **Better performance**: Only load what you need
- **Parallel processing**: Process multiple states simultaneously
- **Version control friendly**: Smaller diffs when data updates

### File Structure

Each state CSV contains:
- **Rows**: County FIPS codes within that state
- **Columns**: 
  - `county_fips`: 5-digit FIPS code identifying the county
  - `state`: State name (if available)
  - `county`: County name (if available)
  - `{HAZARD_CODE}_risk_score`: Risk score for each hazard type
  - `overall_risk_score`: Composite risk score (if available)

### Hazard Codes (RAPT/NRI)

The notebook analyzes 18 hazard types:

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
| RFLD | Riverine Flooding |
| SWND | Strong Wind |
| TRND | Tornado |
| TSUN | Tsunami |
| VLCN | Volcanic Activity |
| WFIR | Wildfire |
| WNTW | Winter Weather |

## Output Files

Generated files are saved to the `output/` directory:
- `{state_name}_risk_data_YYYYMMDD.csv`: Per-state CSV files with county FIPS and risk scores
- `risk_distributions_YYYYMMDD_HHMMSS.png`: Visualization of risk score distributions

Example output files:
- `california_risk_data_20260324.csv` (58 counties)
- `texas_risk_data_20260324.csv` (254 counties)
- `new_york_risk_data_20260324.csv` (62 counties)

## Usage

### Basic Usage

Simply run all cells in the notebook. The notebook will:
1. Attempt to fetch live data from FEMA's National Risk Index API
2. Process and transform the data into wide format
3. Export per-state CSV files with County FIPS codes and hazard risk scores
4. Generate visualizations

**Note on CORS**: Python's `requests` library (used in Jupyter notebooks) bypasses browser CORS restrictions, allowing direct access to the FEMA API without CORS issues.

### Customization

You can customize the analysis by modifying:
- **Hazard selection**: Edit the `HAZARD_MAPPING` dictionary to include/exclude specific hazards
- **Geographic scope**: Filter by state or region after fetching data
- **Output format**: Modify the `process_nri_data()` function to change column structure

## Future Enhancements

1. **International Data Integration**
   - Add Canadian disaster risk data (Public Safety Canada)
   - Add Mexican disaster risk data (CENAPRED)
   - Standardize geographic codes across countries

2. **Advanced Analytics**
   - Time series analysis of risk changes
   - Climate projection integration
   - Historical disaster event correlation

3. **Interactive Mapping**
   - Integrate with Folium or Plotly for interactive maps
   - Add choropleth maps for risk visualization

4. **GFDRR CCDR Tools Integration**
   - Import global hazard data
   - Add EM-DAT historical disaster database
   - Incorporate climate scenario modeling

## Dependencies

Key Python packages (managed by `uv`):
- `jupyterlab`: Interactive notebook environment
- `pandas`: Data manipulation and analysis
- `requests`: HTTP requests for API calls
- `numpy`: Numerical computing
- `matplotlib`: Data visualization
- `seaborn`: Statistical visualization
- `tqdm`: Progress bars

See `pyproject.toml` for complete dependency list.

## Contributing

When making changes:
1. Keep the notebook focused on data acquisition and transformation
2. Document all data sources and API endpoints
3. Include error handling for API requests
4. Add comments explaining complex transformations
5. Update this README with any new features or data sources

## Support

For questions or issues:
- Check FEMA OpenFEMA API documentation
- Review the Risk Data Library for hazard code standards
- Consult GFDRR CCDR tools documentation for international data

## License

This project is part of Emergency Mode News. See the main repository README for license information.
