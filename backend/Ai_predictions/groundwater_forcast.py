#!/usr/bin/env python3
"""
Groundwater Forecast Script

Predicts net groundwater availability for Delhi districts using the trained model.
The model predicts based on district characteristics (recharge rates, extraction, etc.)

Usage:
    python groundwater_forcast.py                    # Interactive mode
    python groundwater_forcast.py Central            # Predict for specific district
    python groundwater_forcast.py --all              # Predict for all districts
"""

import sys
import json
import joblib
import pandas as pd
import numpy as np

# ================= CONFIGURATION =================
DATA_FILE = "ground_water.csv"
MODEL_FILE = "groundwater_model.pkl"
SCALER_FILE = "groundwater_scaler.pkl"
FEATURES_FILE = "groundwater_features.json"
TARGET_COL = "Net GW availability for future"

# ================= LOAD ARTIFACTS =================
print("Loading groundwater prediction model...")
model = joblib.load(MODEL_FILE)
scaler = joblib.load(SCALER_FILE)
with open(FEATURES_FILE, 'r') as f:
    model_features = json.load(f)

# Load dataset
df = pd.read_csv(DATA_FILE)
df = df.dropna(axis=0, how='all').reset_index(drop=True)

print(f"✓ Model loaded (expects {len(model_features)} features)")
print(f"✓ Dataset loaded ({len(df)} districts)\n")


# ================= HELPER FUNCTIONS =================
def get_district_names():
    """Get list of available district names."""
    name_col = [c for c in df.columns if 'District' in c and c != 'Sl. No'][0]
    districts = df[name_col].dropna().tolist()
    return [d for d in districts if d.lower() not in ['total', 'grand total']]


def find_district_row(district_name):
    """Find the row for a given district (case-insensitive)."""
    name_col = [c for c in df.columns if 'District' in c and c != 'Sl. No'][0]
    mask = df[name_col].str.lower() == district_name.lower()
    
    if not mask.any():
        # Try partial match
        mask = df[name_col].str.lower().str.contains(district_name.lower(), na=False)
    
    if not mask.any():
        return None
    
    return df.loc[mask].iloc[0]


def predict_for_district(district_name):
    """Predict groundwater availability for a specific district."""
    row = find_district_row(district_name)
    
    if row is None:
        print(f"ERROR: District '{district_name}' not found.")
        print(f"\nAvailable districts:")
        for d in get_district_names():
            print(f"  - {d}")
        return None
    
    # Extract features
    X = row[model_features].values.astype(float).reshape(1, -1)
    X_scaled = scaler.transform(X)
    
    # Predict
    prediction = model.predict(X_scaled)[0]
    
    # Get actual value if available
    actual = row.get(TARGET_COL, None)
    
    return {
        'district': row.get('Name of District', district_name),
        'prediction': prediction,
        'actual': actual,
        'features': {feat: row[feat] for feat in model_features}
    }


def display_prediction(result):
    """Display prediction results in a formatted way."""
    if result is None:
        return
    
    print(f"\n{'='*70}")
    print(f"GROUNDWATER AVAILABILITY FORECAST")
    print(f"{'='*70}")
    print(f"District: {result['district']}")
    print(f"\nPredicted Net GW Availability (2025+): {result['prediction']:,.2f} Ham")
    
    if result['actual'] is not None and not pd.isna(result['actual']):
        print(f"Current Net GW Availability:           {result['actual']:,.2f} Ham")
        diff = result['prediction'] - result['actual']
        trend = "Increase" if diff > 0 else "Decrease"
        print(f"Expected Change:                       {diff:+,.2f} Ham ({trend})")
    
    print(f"\n{'-'*70}")
    print(f"KEY INDICATORS")
    print(f"{'-'*70}")
    
    # Display important features
    important_features = [
        ('Total annual groundwater recharge', 'Total Recharge'),
        ('Total Annual Extraction', 'Total Extraction'),
        ('Stage of GW extraction (%)', 'Extraction Stage'),
        ('Annual Extractable Groundwater Resource', 'Extractable Resource')
    ]
    
    for feat_name, display_name in important_features:
        if feat_name in result['features']:
            value = result['features'][feat_name]
            if 'Stage' in feat_name or '%' in feat_name:
                print(f"{display_name:<30}: {value:>10.2f}%")
            else:
                print(f"{display_name:<30}: {value:>10,.2f} Ham")
    
    print(f"{'='*70}\n")


def predict_all_districts():
    """Predict for all districts and display summary."""
    results = []
    
    for district in get_district_names():
        result = predict_for_district(district)
        if result:
            results.append(result)
    
    if not results:
        print("No predictions generated.")
        return
    
    # Create summary DataFrame
    summary_df = pd.DataFrame([
        {
            'District': r['district'],
            'Predicted GW (Ham)': r['prediction'],
            'Current GW (Ham)': r['actual'] if r['actual'] is not None else 0,
            'Change (Ham)': r['prediction'] - (r['actual'] if r['actual'] is not None else 0)
        }
        for r in results
    ])
    
    print(f"\n{'='*80}")
    print(f"GROUNDWATER AVAILABILITY FORECAST - ALL DISTRICTS")
    print(f"{'='*80}\n")
    print(summary_df.to_string(index=False))
    
    print(f"\n{'='*80}")
    print(f"SUMMARY STATISTICS")
    print(f"{'='*80}")
    print(f"Total Predicted GW Availability: {summary_df['Predicted GW (Ham)'].sum():,.2f} Ham")
    print(f"Average per District:            {summary_df['Predicted GW (Ham)'].mean():,.2f} Ham")
    print(f"Districts with Positive Change:  {(summary_df['Change (Ham)'] > 0).sum()}")
    print(f"Districts with Negative Change:  {(summary_df['Change (Ham)'] < 0).sum()}")
    print(f"{'='*80}\n")


# ================= MAIN =================
def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg in ['--all', '-a']:
            predict_all_districts()
        elif arg in ['--help', '-h']:
            print(__doc__)
        else:
            # Treat as district name
            result = predict_for_district(arg)
            display_prediction(result)
    else:
        # Interactive mode
        print("Available districts:")
        for i, district in enumerate(get_district_names(), 1):
            print(f"  {i:2d}. {district}")
        
        print("\nOptions:")
        print("  - Enter district name or number")
        print("  - Type 'all' to see all predictions")
        print("  - Type 'q' to quit")
        
        while True:
            inp = input("\nEnter choice: ").strip()
            
            if inp.lower() in ['q', 'quit', 'exit']:
                break
            elif inp.lower() == 'all':
                predict_all_districts()
            elif inp.isdigit():
                idx = int(inp) - 1
                districts = get_district_names()
                if 0 <= idx < len(districts):
                    result = predict_for_district(districts[idx])
                    display_prediction(result)
                else:
                    print(f"Invalid number. Please enter 1-{len(districts)}")
            else:
                result = predict_for_district(inp)
                display_prediction(result)


if __name__ == "__main__":
    main()
