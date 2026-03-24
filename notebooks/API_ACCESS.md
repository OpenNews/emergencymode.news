# API Access Note

## FEMA API Access

The FEMA National Risk Index API (`https://www.fema.gov/api/open/v2/FimaNriNationalRiskIndex`) may be restricted in certain environments.

### Alternative Approaches

If you encounter connection issues with the FEMA API:

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
