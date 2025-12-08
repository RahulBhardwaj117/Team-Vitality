#!/usr/bin/env python3
"""
Improved Groundwater Data Integration - Uses Assessment Unit Level Data

Creates a richer dataset by using 34 assessment units instead of 12 districts.
For each assessment unit, we add district-level aggregates as additional features.

Target: Predict Stage of Ground Water Extraction (%) for each assessment unit
"""

import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

print("="*70)
print("GROUNDWATER DATA INTEGRATION (ASSESSMENT UNIT LEVEL)")
print("="*70)

# ================= LOAD DATASETS =================
print("\n[1/4] Loading datasets...")

# Primary: Detailed assessment unit data (34 samples)
gw_units = pd.read_csv("detailed_ground_water.csv")
gw_units = gw_units.dropna(axis=0, how='all').reset_index(drop=True)
gw_units = gw_units[~gw_units['District'].str.lower().str.contains('total', na=False)]

# Rename for clarity
gw_units = gw_units.rename(columns={
    'Annual Extractable Ground Water Resource (Ham)': 'Extractable_Resource',
    'Total Extraction (Ham)': 'Total_Extraction',
    'Stage of Ground Water Extraction (%)': 'Extraction_Stage_Pct',
    'Assessment Unit Name': 'Unit_Name'
})

# District-level aggregates for context
gw_district = pd.read_csv("ground_water.csv")
gw_district = gw_district.dropna(axis=0, how='all').reset_index(drop=True)
gw_district = gw_district[gw_district['Name of District'].notna()]
gw_district = gw_district[~gw_district['Name of District'].str.lower().str.contains('total', na=False)]

print(f"  ✓ Assessment units: {len(gw_units)}")
print(f"  ✓ Districts: {len(gw_district)}")

# ================= NORMALIZE DISTRICT NAMES =================
def normalize_district(name):
    """Normalize district names for consistent merging."""
    if pd.isna(name):
        return ""
    name = str(name).strip().lower()
    name = name.replace('delhi', '').replace('district', '').strip()
    # Standardize variations
    name = name.replace('non revenue unit', 'nazul land')
    return name

gw_units['District_Norm'] = gw_units['District'].apply(normalize_district)
gw_district['District_Norm'] = gw_district['Name of District'].apply(normalize_district)

# ================= AGGREGATE DISTRICT-LEVEL FEATURES =================
print("\n[2/4] Computing district-level features...")

# For each district, compute totals and averages
district_agg = gw_district.groupby('District_Norm').agg({
    'Total annual groundwater recharge': 'sum',
    'Annual Extractable Groundwater Resource': 'sum',
    'Total Annual Extraction': 'sum',
    'Irrigation - Annual extraction': 'sum',
    'Domestic - Annual Extraction': 'sum',
    'Industrial - Annual extraction': 'sum',
   'Stage of GW extraction (%)': 'mean',
    'Net GW availability for future': 'sum'
}).reset_index()

district_agg.columns = ['District_Norm', 'District_Total_Recharge', 'District_Total_Extractable',
                        'District_Total_Extraction', 'District_Irrigation', 'District_Domestic',
                        'District_Industrial', 'District_Avg_Stage', 'District_Net_GW_Future']

# Add derived district ratios
district_agg['District_Extraction_Ratio'] = district_agg['District_Total_Extraction'] / district_agg['District_Total_Recharge']
district_agg['District_Irrigation_Share'] = district_agg['District_Irrigation'] / district_agg['District_Total_Extraction']
district_agg['District_Domestic_Share'] = district_agg['District_Domestic'] / district_agg['District_Total_Extraction']
district_agg['District_Sustainability'] = district_agg['District_Net_GW_Future'] / district_agg['District_Total_Recharge']

#Merge district aggregates into assessment units
df = gw_units.merge(district_agg, on='District_Norm', how='left')

print(f"  ✓ Merged district features")

# ================= FEATURE ENGINEERING =================
print("\n[3/4] Engineering unit-level features...")

# Unit-specific ratios
df['unit_extraction_efficiency'] = df['Total_Extraction'] / df['Extractable_Resource']
df['unit_share_of_district_extraction'] = df['Total_Extraction'] / df['District_Total_Extraction']
df['unit_share_of_district_resource'] = df['Extractable_Resource'] / df['District_Total_Extractable']

# Relative performance vs district average
df['extraction_vs_district_avg'] = df['Extraction_Stage_Pct'] - df['District_Avg_Stage']
df['overextraction_indicator'] = (df['Extraction_Stage_Pct'] > 100).astype(int)

# Size indicators  
df['unit_resource_size'] = df['Extractable_Resource']
df['unit_extraction_size'] = df['Total_Extraction']

# Replace inf/nan
df = df.replace([np.inf, -np.inf], np.nan)
numeric_cols = df.select_dtypes(include=[np.number]).columns
for col in numeric_cols:
    if df[col].isna().any():
        df[col].fillna(df[col].median(), inplace=True)

print(f"  ✓ Total features: {len(df.columns)}")

# ================= SAVE ENHANCED DATASET =================
print("\n[4/4] Saving dataset...")

output_file = "groundwater_enhanced.csv"
df.to_csv(output_file, index=False)

print(f"\n{'='*70}")
print(f"✓ Enhanced dataset saved to: {output_file}")
print(f"  - Samples: {len(df)} assessment units")
print(f"  - Features: {len(df.columns)}")
print(f"  - Target: Extraction_Stage_Pct (extraction stage percentage)")
print(f"{'='*70}\n")

print("Key statistics:")
print(f"  Extraction Stage Range: {df['Extraction_Stage_Pct'].min():.1f}% - {df['Extraction_Stage_Pct'].max():.1f}%")
print(f"  Mean Extraction: {df['Extraction_Stage_Pct'].mean():.1f}%")
print(f"  Units with >100% extraction: {(df['Extraction_Stage_Pct'] > 100).sum()}")

print("\nReady for model training!")
