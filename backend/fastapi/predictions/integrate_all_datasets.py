"""
Integrate All Datasets for Drought Prediction
Merges: Rainfall, Temperature, Soil Moisture, and Groundwater data
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("INTEGRATING ALL DATASETS FOR DROUGHT PREDICTION")
print("="*80)

# ============================================================================
# 1. LOAD BASE WEATHER DATA (Rainfall)
# ============================================================================
print("\n[1/5] Loading base weather data...")
weather_df = pd.read_csv('final_weather.csv')
weather_df['Date'] = pd.to_datetime(weather_df['Date'])
weather_df = weather_df.sort_values('Date').reset_index(drop=True)
print(f"✓ Weather data: {len(weather_df)} days ({weather_df['Date'].min().date()} to {weather_df['Date'].max().date()})")

# ============================================================================
# 2. LOAD AND PROCESS TEMPERATURE DATA
# ============================================================================
print("\n[2/5] Loading temperature data...")
temp_df = pd.read_csv('delhi-temperature.csv')
temp_df['Date'] = pd.to_datetime(temp_df['Date'])
temp_df = temp_df.sort_values('Date').reset_index(drop=True)

# Rename columns to match
temp_df = temp_df.rename(columns={
    'Temp Max': 'MaxTemp_Full',
    'Temp Min': 'MinTemp_Full',
    'Rain': 'Rain_Temp_Source'
})

# Select relevant columns
temp_df = temp_df[['Date', 'MaxTemp_Full', 'MinTemp_Full']].copy()
print(f"✓ Temperature data: {len(temp_df)} days ({temp_df['Date'].min().date()} to {temp_df['Date'].max().date()})")

# ============================================================================
# 3. LOAD AND PROCESS SOIL MOISTURE DATA (NASA GWETTOP)
# ============================================================================
print("\n[3/5] Loading and processing soil moisture data...")

try:
    # Try NASA POWER data format (soil moisture.csv)
    # Skip header rows and read properly
    sm_df = pd.read_csv('soil moisture.csv', skiprows=20)
    
    # Parse columns - format is: PARAMETER, YEAR, LAT, LON, JAN, FEB, ..., DEC, ANN
    # Filter for Delhi region (lat ~28-29, lon ~77-78)
    # Column names might be different, let's check
    print(f"  Columns found: {sm_df.columns.tolist()[:5]}...")
    
    # Assuming format: GWETTOP, YEAR, LAT, LON, JAN, FEB, ..., DEC, ANN
    # Filter Delhi region
    if 'LAT' in sm_df.columns or len(sm_df.columns) > 4:
        # Proper column detection
        cols = sm_df.columns.tolist()
        
        # Create yearly-monthly dataframe
        # Filter approximate Delhi coordinates
        delhi_sm = sm_df[
            (sm_df.iloc[:, 1] >= 2020) &  # Year >= 2020
            (sm_df.iloc[:, 2] >= 27.5) & (sm_df.iloc[:, 2] <= 29.5) &  # Lat
            (sm_df.iloc[:, 3] >= 75.5) & (sm_df.iloc[:, 3] <= 78.5)    # Lon
        ].copy()
        
        print(f"  Found {len(delhi_sm)} Delhi region records")
        
        # Average across locations for each year-month
        # Melt to long format
        month_cols = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        
        # Build date-based soil moisture dataframe
        sm_records = []
        for _, row in delhi_sm.iterrows():
            year = int(row.iloc[1])
            for month_idx, month_name in enumerate(month_cols, 1):
                # Find column index for month
                month_col_idx = None
                for idx, col in enumerate(cols):
                    if month_name.lower() in str(col).lower():
                        month_col_idx = idx
                        break
                
                if month_col_idx is not None:
                    sm_value = row.iloc[month_col_idx]
                    if pd.notna(sm_value):
                        try:
                            date = datetime(year, month_idx, 15)  # Mid-month
                            sm_records.append({
                                'Date': date,
                                'SoilMoisture_NASA': float(sm_value) * 100  # Convert to percentage
                            })
                        except:
                            pass
        
        if sm_records:
            sm_monthly = pd.DataFrame(sm_records)
            sm_monthly = sm_monthly.groupby('Date')['SoilMoisture_NASA'].mean().reset_index()
            
            # Interpolate to daily
            all_dates = pd.date_range(sm_monthly['Date'].min(), sm_monthly['Date'].max(), freq='D')
            sm_daily = pd.DataFrame({'Date': all_dates})
            sm_daily = sm_daily.merge(sm_monthly, on='Date', how='left')
            sm_daily['SoilMoisture_NASA'] = sm_daily['SoilMoisture_NASA'].interpolate(method='linear')
            
            print(f"✓ Soil moisture data processed: {len(sm_daily)} days")
        else:
            raise Exception("No valid soil moisture records found")
    else:
        raise Exception("Unexpected soil moisture file format")
        
except Exception as e:
    print(f"  ⚠ Could not process NASA soil moisture data: {e}")
    print("  Attempting alternate source: sm_Delhi_2020.csv...")
    
    try:
        sm_alt = pd.read_csv('sm_Delhi_2020.csv')
        sm_alt['Date'] = pd.to_datetime(sm_alt['Date'])
        
        # Find soil moisture column
        sm_col = None
        for col in sm_alt.columns:
            if 'moisture' in col.lower() or 'volume' in col.lower():
                sm_col = col
                break
        
        if sm_col:
            sm_daily = sm_alt[['Date', sm_col]].copy()
            sm_daily = sm_daily.rename(columns={sm_col: 'SoilMoisture_NASA'})
            sm_daily = sm_daily.groupby('Date')['SoilMoisture_NASA'].mean().reset_index()
            print(f"✓ Soil moisture data (2020): {len(sm_daily)} days")
        else:
            print("  ⚠ No soil moisture data available, will use calculated values")
            sm_daily = None
    except Exception as e2:
        print(f"  ⚠ Alternate source failed: {e2}")
        sm_daily = None

# ============================================================================
# 4. LOAD AND PROCESS GROUNDWATER DATA
# ============================================================================
print("\n[4/5] Loading groundwater data...")
try:
    gw_df = pd.read_csv('ground_water.csv')
    
    # Extract key metrics (these are annual/district level)
    # We'll use Delhi totals as static features
    total_row = gw_df[gw_df['Name of District'].fillna('').str.contains('Total', na=False, case=False)]
    
    if len(total_row) > 0:
        gw_extraction_rate = total_row['Stage of GW extraction (%)'].values[0]
        gw_availability = total_row['Net GW availability for future'].values[0]
        
        print(f"✓ Groundwater metrics: Extraction={gw_extraction_rate}%, Availability={gw_availability}")
    else:
        # Use mean values
        gw_extraction_rate = gw_df['Stage of GW extraction (%)'].mean()
        gw_availability = gw_df['Net GW availability for future'].mean()
        print(f"✓ Groundwater metrics (averaged): Extraction={gw_extraction_rate:.1f}%, Availability={gw_availability:.1f}")
        
except Exception as e:
    print(f"  ⚠ Could not load groundwater data: {e}")
    gw_extraction_rate = 100.0
    gw_availability = 2000.0

# ============================================================================
# 5. LOAD AND PROCESS LAND USE DATA
# ============================================================================
print("\n[5/6] Loading land use data...")
try:
    land_use_df = pd.read_csv('land_use.csv')
    
    # Extract key metrics
    # We'll use these as static context features
    
    # Helper to clean and convert
    def get_land_val(row_name):
        row = land_use_df[land_use_df['Land Use'].str.contains(row_name, case=False, na=False)]
        if len(row) > 0:
            val = row.iloc[0]['Percentage']
            return float(val)
        return 0.0

    forest_cover = get_land_val('Forests')
    built_up_area = get_land_val('Not available for cultivation') # Proxy for built-up/urban
    fallow_land = get_land_val('Fallow')
    
    print(f"✓ Land Use: Forest={forest_cover}%, Built-up/Urban={built_up_area}%, Fallow={fallow_land}%")
    
except Exception as e:
    print(f"  ⚠ Could not load land use data: {e}")
    forest_cover = 1.0
    built_up_area = 50.0
    fallow_land = 5.0

# ============================================================================
# 6. MERGE ALL DATASETS
# ============================================================================
print("\n[6/6] Merging all datasets...")

# Start with weather data
merged_df = weather_df.copy()

# Merge temperature data
merged_df = merged_df.merge(temp_df, on='Date', how='left', suffixes=('', '_temp'))

# Prioritize full temperature data if available
if 'MaxTemp_Full' in merged_df.columns:
    merged_df['MaxTemp'] = merged_df['MaxTemp_Full'].combine_first(merged_df['MaxTemp'])
    merged_df['MinTemp'] = merged_df['MinTemp_Full'].combine_first(merged_df['MinTemp'])
    merged_df = merged_df.drop(columns=['MaxTemp_Full', 'MinTemp_Full'], errors='ignore')

# Merge soil moisture data
if sm_daily is not None:
    merged_df = merged_df.merge(sm_daily, on='Date', how='left')
else:
    merged_df['SoilMoisture_NASA'] = np.nan

# Add groundwater as static features
merged_df['GW_Extraction_Rate'] = gw_extraction_rate
merged_df['GW_Availability'] = gw_availability

# Add Land Use as static features
merged_df['Land_Forest_Cover'] = forest_cover
merged_df['Land_BuiltUp_Area'] = built_up_area
merged_df['Land_Fallow'] = fallow_land

# Fill missing values
print("\nHandling missing values...")
merged_df['MaxTemp'] = merged_df['MaxTemp'].fillna(method='ffill').fillna(35.0)
merged_df['MinTemp'] = merged_df['MinTemp'].fillna(method='ffill').fillna(20.0)

# For soil moisture, we'll calculate it if real data not available
if merged_df['SoilMoisture_NASA'].isna().all():
    print("  Using calculated soil moisture (no real data available)")
    merged_df['SoilMoisture_Actual'] = np.nan
else:
    # Forward fill and interpolate soil moisture
    merged_df['SoilMoisture_NASA'] = merged_df['SoilMoisture_NASA'].fillna(method='ffill').fillna(method='bfill')
    merged_df['SoilMoisture_Actual'] = merged_df['SoilMoisture_NASA']
    print(f"  ✓ Real soil moisture data available for {(~merged_df['SoilMoisture_Actual'].isna()).sum()} days")

# Calculate average temperature
merged_df['AvgTemp'] = (merged_df['MaxTemp'] + merged_df['MinTemp']) / 2

# ============================================================================
# SAVE INTEGRATED DATASET
# ============================================================================
output_file = 'comprehensive_weather_drought_data.csv'
merged_df.to_csv(output_file, index=False)

print("\n" + "="*80)
print("INTEGRATION COMPLETE!")
print("="*80)
print(f"\nOutput file: {output_file}")
print(f"Total records: {len(merged_df)}")
print(f"Date range: {merged_df['Date'].min().date()} to {merged_df['Date'].max().date()}")
print(f"\nColumns: {list(merged_df.columns)}")
print(f"\nMissing values per column:")
print(merged_df.isnull().sum())
print("\n" + "="*80)
