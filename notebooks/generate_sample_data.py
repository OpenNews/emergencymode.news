"""
Sample data generator for testing the disaster risk analysis notebook.

This script creates realistic sample data that mimics the structure of 
FEMA National Risk Index data for testing purposes.
"""
import pandas as pd
import numpy as np
from pathlib import Path

# Hazard codes from FEMA NRI
HAZARD_CODES = [
    'AVLN', 'CFLD', 'CWAV', 'DRGT', 'ERQK', 'HAIL', 'HWAV', 'HRCN',
    'ISTM', 'LNDS', 'LTNG', 'RFLD', 'SWND', 'TRND', 'TSUN', 'VLCN',
    'WFIR', 'WNTW'
]

# Sample states and counties
SAMPLE_LOCATIONS = [
    ('01', '001', 'Alabama', 'Autauga'),
    ('06', '001', 'California', 'Alameda'),
    ('06', '037', 'California', 'Los Angeles'),
    ('12', '086', 'Florida', 'Miami-Dade'),
    ('48', '201', 'Texas', 'Harris'),
    ('36', '061', 'New York', 'New York'),
    ('17', '031', 'Illinois', 'Cook'),
    ('04', '013', 'Arizona', 'Maricopa'),
    ('53', '033', 'Washington', 'King'),
    ('42', '101', 'Pennsylvania', 'Philadelphia'),
]


def generate_sample_nri_data(num_records=100):
    """
    Generate sample National Risk Index data.
    
    Args:
        num_records: Number of county records to generate
    
    Returns:
        DataFrame with sample NRI data
    """
    np.random.seed(42)  # For reproducibility
    
    data = []
    
    # Generate data for sample locations plus random additions
    locations = SAMPLE_LOCATIONS.copy()
    
    # Add more random locations if needed
    while len(locations) < num_records:
        state_fips = f"{np.random.randint(1, 57):02d}"
        county_fips = f"{np.random.randint(1, 200):03d}"
        state_name = f"State_{state_fips}"
        county_name = f"County_{county_fips}"
        locations.append((state_fips, county_fips, state_name, county_name))
    
    for state_fips, county_fips, state, county in locations[:num_records]:
        stcofips = state_fips + county_fips
        
        record = {
            'STCOFIPS': stcofips,
            'STATE': state,
            'COUNTY': county,
            'STATEFIPS': state_fips,
            'COUNTYFIPS': county_fips,
            'POPULATION': np.random.randint(10000, 5000000),
            'BUILDVALUE': np.random.randint(1000000, 100000000),
            'AGRIVALUE': np.random.randint(100000, 10000000),
        }
        
        # Generate risk scores for each hazard
        for hazard in HAZARD_CODES:
            # Risk score (0-100 scale, with some hazards more common)
            base_risk = np.random.exponential(15)
            risk_score = min(100, max(0, base_risk))
            
            # Risk rating based on score
            if risk_score >= 75:
                risk_rating = 'Very High'
            elif risk_score >= 50:
                risk_rating = 'Relatively High'
            elif risk_score >= 25:
                risk_rating = 'Relatively Moderate'
            elif risk_score >= 10:
                risk_rating = 'Relatively Low'
            else:
                risk_rating = 'Very Low'
            
            record[f'{hazard}_RISKS'] = round(risk_score, 2)
            record[f'{hazard}_RISKR'] = risk_rating
            record[f'{hazard}_EALS'] = round(np.random.exponential(100000), 2)
            record[f'{hazard}_EALR'] = np.random.randint(1, 5)
        
        # Overall risk score (composite)
        all_scores = [record[f'{h}_RISKS'] for h in HAZARD_CODES]
        record['RISK_SCORE'] = round(np.mean(all_scores), 2)
        record['RISK_RATNG'] = record['ERQK_RISKR']  # Use earthquake as proxy
        
        data.append(record)
    
    df = pd.DataFrame(data)
    return df


def main():
    """Generate and save sample data."""
    print("Generating sample FEMA National Risk Index data...")
    
    # Create sample data directory
    output_dir = Path(__file__).parent / 'sample_data'
    output_dir.mkdir(exist_ok=True)
    
    # Generate sample data
    df = generate_sample_nri_data(num_records=100)
    
    # Save to CSV
    output_path = output_dir / 'sample_nri_data.csv'
    df.to_csv(output_path, index=False)
    
    print(f"✓ Generated {len(df)} sample records")
    print(f"✓ Saved to: {output_path}")
    print(f"\nColumns: {list(df.columns)[:10]}...")
    print(f"\nSample data:")
    print(df[['STCOFIPS', 'STATE', 'COUNTY', 'RISK_SCORE', 'WFIR_RISKS', 'ERQK_RISKS']].head())


if __name__ == '__main__':
    main()
