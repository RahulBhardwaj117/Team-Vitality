#!/usr/bin/env python3
"""
Enhanced Groundwater Forecast Script

Predicts groundwater extraction stage for Delhi assessment units using the trained ensemble model.
Now works with assessment unit-level predictions and district aggregations.

Usage:
    python groundwater_forcast_enhanced.py                      # Interactive mode
    python groundwater_forcast_enhanced.py "Civil Lines"        # Predict for specific unit
    python groundwater_forcast_enhanced.py --all                # Predict for all units
    python groundwater_forcast_enhanced.py --district Central   # Predict for all units in district
"""

import sys
import json
import joblib
import pandas as pd
import numpy as np

# ================= CONFIGURATION =================
DATA_FILE = "groundwater_enhanced.csv"
MODEL_FILE = "groundwater_model_ensemble.pkl"
SCALER_FILE = "groundwater_scaler.pkl"
FEATURES_FILE = "groundwater_features.json"
TARGET_COL = "Extraction_Stage_Pct"

# ================= LOAD ARTIFACTS =================
print("Loading groundwater prediction model...")
try:
    model = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    with open(FEATURES_FILE, 'r') as f:
        model_features = json.load(f)
    print(f"✓ Model loaded (expects {len(model_features)} features)")
except Exception as e:
    print(f"ERROR: Failed to load model: {e}")
    print("\nPlease run train_improved_groundwater_model.py first!")
    sys.exit(1)

# Load dataset
df = pd.read_csv(DATA_FILE)
print(f"✓ Dataset loaded ({len(df)} assessment units)\n")

# ================= HELPER FUNCTIONS =================
def get_unit_names():
    """Get list of available assessment unit names."""
    units = df['Unit_Name'].dropna().tolist()
    return units

def get_districts():
    """Get list of unique districts."""
    districts = df['District'].dropna().unique().tolist()
    return sorted(districts)

def find_unit_row(unit_name):
    """Find the row for a given assessment unit (case-insensitive)."""
    mask = df['Unit_Name'].str.lower() == unit_name.lower()
    
    if not mask.any():
        # Try partial match
        mask = df['Unit_Name'].str.lower().str.contains(unit_name.lower(), na=False)
    
    if not mask.any():
        return None
    
    return df.loc[mask].iloc[0]

def predict_for_unit(unit_name):
    """Predict groundwater extraction stage for a specific assessment unit."""
    row = find_unit_row(unit_name)
    
    if row is None:
        print(f"ERROR: Assessment unit '{unit_name}' not found.")
        print(f"\nAvailable units:")
        for u in get_unit_names()[:10]:
            print(f"  - {u}")
        print(f"  ... and {len(get_unit_names())-10} more")
        return None
    
    # Extract features
    X = row[model_features].values.astype(float).reshape(1, -1)
    X_scaled = scaler.transform(X)
    
    # Predict
    prediction = model.predict(X_scaled)[0]
    
    # Get actual value if available
    actual = row.get(TARGET_COL, None)
    
    return {
        'unit': row.get('Unit_Name', unit_name),
        'district': row.get('District', 'Unknown'),
        'prediction': prediction,
        'actual': actual,
        'extractable_resource': row.get('Extractable_Resource', 0),
        'total_extraction': row.get('Total_Extraction', 0),
        'features': {feat: row[feat] for feat in model_features if feat in row}
    }

def display_prediction(result):
    """Display prediction results in a formatted way."""
    if result is None:
        return
    
    print(f"\n{'='*70}")
    print(f"GROUNDWATER EXTRACTION STAGE FORECAST")
    print(f"{'='*70}")
    print(f"Assessment Unit: {result['unit']}")
    print(f"District: {result['district']}")
    print(f"\nPredicted Extraction Stage: {result['prediction']:.2f}%")
    
    if result['actual'] is not None and not pd.isna(result['actual']):
        print(f"Current Extraction Stage:   {result['actual']:.2f}%")
        diff = result['prediction'] - result['actual']
        trend = "Increase" if diff > 0 else "Decrease"
        print(f"Expected Change:            {diff:+.2f}% ({trend})")
    
    # Status assessment
    print(f"\n{'-'*70}")
    print(f"STATUS ASSESSMENT")
    print(f"{'-'*70}")
    
    stage = result['prediction']
    if stage < 70:
        status = "SAFE"
        color = "✓"
    elif stage < 90:
        status = "MODERATE"
        color = "⚠"
    elif stage < 100:
        status = "SEMI-CRITICAL"
        color = "⚠"
    else:
        status = "OVER-EXPLOITED"
        color = "✗"
    
    print(f"Status: {color} {status}")
    print(f"  Extractable Resource: {result['extractable_resource']:,.2f} Ham")
    print(f"  Total Extraction:     {result['total_extraction']:,.2f} Ham")
    
    if stage >= 100:
        print(f"\n  WARNING: Extraction exceeds sustainable levels!")
        print(f"  Recommended Action: Reduce extraction or increase recharge")
    
    print(f"{'='*70}\n")

def predict_all_units():
    """Predict for all assessment units and display summary."""
    results = []
    
    for unit in get_unit_names():
        result = predict_for_unit(unit)
        if result:
            results.append(result)
    
    if not results:
        print("No predictions generated.")
        return
    
    # Create summary DataFrame
    summary_df = pd.DataFrame([
        {
            'Unit': r['unit'],
            'District': r['district'],
            'Predicted Stage (%)': r['prediction'],
            'Current Stage (%)': r['actual'] if r['actual'] is not None else 0,
            'Change (%)': r['prediction'] - (r['actual'] if r['actual'] is not None else 0)
        }
        for r in results
    ])
    
    print(f"\n{'='*90}")
    print(f"GROUNDWATER EXTRACTION STAGE FORECAST - ALL ASSESSMENT UNITS")
    print(f"{'='*90}\n")
    print(summary_df.to_string(index=False))
    
    print(f"\n{'='*90}")
    print(f"SUMMARY STATISTICS")
    print(f"{'='*90}")
    print(f"Average Predicted Stage:       {summary_df['Predicted Stage (%)'].mean():.2f}%")
    print(f"Units with Safe Status (<70%): {(summary_df['Predicted Stage (%)'] < 70).sum()}")
    print(f"Units with Moderate (70-90%):  {((summary_df['Predicted Stage (%)'] >= 70) & (summary_df['Predicted Stage (%)'] < 90)).sum()}")
    print(f"Units with Semi-Critical (90-100%): {((summary_df['Predicted Stage (%)'] >= 90) & (summary_df['Predicted Stage (%)'] < 100)).sum()}")
    print(f"Units Over-Exploited (>100%):  {(summary_df['Predicted Stage (%)'] >= 100).sum()}")
    print(f"{'='*90}\n")

def predict_district(district_name):
    """Predict for all units in a specific district."""
    district_units = df[df['District'].str.lower() == district_name.lower()]
    
    if len(district_units) == 0:
        print(f"ERROR: District '{district_name}' not found.")
        print(f"\nAvailable districts:")
        for d in get_districts():
            print(f"  - {d}")
        return
    
    print(f"\n{'='*70}")
    print(f"PREDICTIONS FOR {district_name.upper()} DISTRICT")
    print(f"{'='*70}\n")
    
    for _, unit_row in district_units.iterrows():
        result = predict_for_unit(unit_row['Unit_Name'])
        if result:
            print(f"{result['unit']:30s}: {result['prediction']:6.2f}%  ", end="")
            if result['prediction'] >= 100:
                print("✗ OVER-EXPLOITED")
            elif result['prediction'] >= 90:
                print("⚠ SEMI-CRITICAL")
            elif result['prediction'] >= 70:
                print("⚠ MODERATE")
            else:
                print("✓ SAFE")
    
    print(f"\n{'='*70}\n")

# ================= MAIN =================
def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg in ['--all', '-a']:
            predict_all_units()
        elif arg in ['--district', '-d']:
            if len(sys.argv) > 2:
                predict_district(sys.argv[2])
            else:
                print("ERROR: Please specify district name after --district")
        elif arg in ['--help', '-h']:
            print(__doc__)
        else:
            # Treat as unit name
            result = predict_for_unit(arg)
            display_prediction(result)
    else:
        # Interactive mode
        print("Available districts:")
        for i, district in enumerate(get_districts(), 1):
            units_count = len(df[df['District'] == district])
            print(f"  {i:2d}. {district} ({units_count} units)")
        
        print("\nOptions:")
        print("  - Enter assessment unit name")
        print("  - Type 'district:NAME' to see all units in a district")
        print("  - Type 'all' to see all predictions")
        print("  - Type 'q' to quit")
        
        while True:
            inp = input("\nEnter choice: ").strip()
            
            if inp.lower() in ['q', 'quit', 'exit']:
                break
            elif inp.lower() == 'all':
                predict_all_units()
            elif inp.lower().startswith('district:'):
                district = inp.split(':', 1)[1].strip()
                predict_district(district)
            else:
                result = predict_for_unit(inp)
                display_prediction(result)

if __name__ == "__main__":
    main()
