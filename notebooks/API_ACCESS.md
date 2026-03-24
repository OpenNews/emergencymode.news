# API Access Note

## FEMA API Access and CORS

### CORS Issues Explained

The FEMA National Risk Index API may have CORS (Cross-Origin Resource Sharing) restrictions when accessed from web browsers. However, **this notebook is not affected by CORS issues** because:

1. **Python `requests` library bypasses CORS**: CORS is a browser security feature. Python's `requests` library makes direct HTTP calls that are not subject to browser CORS restrictions.

2. **Jupyter notebooks run server-side**: The notebook runs on your local machine or server, not in a browser's JavaScript context.

3. **No XMLHttpRequest/Fetch API**: CORS only applies to browser APIs like `XMLHttpRequest` or `fetch()`.

### Using Live FEMA API Data

The notebook is configured to **prefer live API data** from:
- API endpoint: `https://www.fema.gov/api/open/v2/FimaNriNationalRiskIndex`

Simply run the notebook, and it will automatically fetch live data from the FEMA API.

### Alternative Approaches

If you encounter connection issues with the FEMA API (network restrictions, not CORS):

1. **Download NRI Data Locally**
   - Visit the [FEMA National Risk Index Data Download](https://hazards.fema.gov/nri/data-resources#csvDownload)
   - Download the complete CSV file
   - Load it directly with pandas:
     ```python
     nri_df = pd.read_csv('path/to/NRI_Table_Counties.csv')
     ```

2. **Use OpenFEMA Data Portal**
   - Alternative endpoint: `https://www.fema.gov/api/open/v1/NationalRiskIndex`
   - Download options available at: https://www.fema.gov/about/openfema/data-sets

3. **Work with Sample Data**
   - The repository includes a sample data file for testing
   - See `notebooks/sample_data/` directory

### API Rate Limits

When using the FEMA OpenFEMA API:
- Rate limit: 1,000 requests per day
- Maximum records per request: 1,000 (use `$top` parameter)
- Use pagination with `$skip` parameter for large datasets

### Example API Usage

```python
import requests
import pandas as pd

# Fetch data with pagination
def fetch_nri_data(limit=1000, offset=0):
    url = "https://www.fema.gov/api/open/v2/FimaNriNationalRiskIndex"
    params = {
        '$top': limit,
        '$skip': offset,
        '$format': 'json'
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()

# Or load from local CSV
nri_df = pd.read_csv('NRI_Table_Counties.csv')
```

### Data Dictionary

Key fields in the National Risk Index dataset:
- `STCOFIPS`: 5-digit County FIPS code
- `STATE`: State name
- `COUNTY`: County name
- `RISK_SCORE`: Overall risk score
- `{HAZARD}_RISKS`: Risk score for specific hazard (e.g., `WFIR_RISKS` for wildfire)
- `{HAZARD}_RISKR`: Risk rating (Very High, Relatively High, Relatively Low, Very Low, etc.)

See the [NRI Technical Documentation](https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf) for complete field definitions.
