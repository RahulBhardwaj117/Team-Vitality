"""
Comprehensive Dataset Analysis for Flood Prediction Model
Analyzes all available datasets to determine best features and model approach
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("COMPREHENSIVE DATASET ANALYSIS FOR FLOOD PREDICTION")
print("="*80)

datasets = {}

# 1. Analyze final_weather.csv
print("\n1. FINAL_WEATHER.CSV - Main weather dataset")
try:
    df = pd.read_csv('final_weather.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    datasets['final_weather'] = df
    
    print(f"   Shape: {df.shape}")
    print(f"   Date Range: {df['Date'].min().date()} to {df['Date'].max().date()}")
    print(f"   Total Days: {(df['Date'].max() - df['Date'].min()).days}")
    print(f"   Columns: {df.columns.tolist()}")
    print(f"   Missing Values:\n{df.isnull().sum()}")
    print(f"\n   Key Statistics:")
    if 'Rainfall' in df.columns:
        print(f"   - Rainfall: mean={df['Rainfall'].mean():.2f}, max={df['Rainfall'].max():.2f}")
    if 'MaxTemp' in df.columns:
        print(f"   - MaxTemp: mean={df['MaxTemp'].mean():.2f}, max={df['MaxTemp'].max():.2f}")
except Exception as e:
    print(f"   Error: {e}")

# 2. Analyze testset.csv - Large weather dataset
print("\n2. TESTSET.CSV - Extended weather dataset") 
try:
    df = pd.read_csv('testset.csv', nrows=1000) # Sample first 1000 rows for analysis
    datasets['testset_sample'] = df
    
    print(f"   Shape (sample): {df.shape}")
    print(f"   Columns: {df.columns.tolist()}")
    print(f"   Has rain column: {' _rain' in df.columns}")
    if ' _rain' in df.columns:
        print(f"   - Rain events: {df[' _rain'].sum()} out of {len(df)}")
    if ' _precipm' in df.columns:
        print(f"   - Precipitation: mean={df[' _precipm'].mean():.2f}, max={df[' _precipm'].max():.2f}")
except Exception as e:
    print(f"   Error: {e}")

# 3. Analyze delhi-monthly-rains.csv - Historical rainfall
print("\n3. DELHI-MONTHLY-RAINS.CSV - Historical monthly rainfall (1901-present)")
try:
    df = pd.read_csv('delhi-monthly-rains.csv')
    datasets['monthly_rains'] = df
    
    print(f"   Shape: {df.shape}")
    print(f"   Years covered: {df['Year'].min()} to {df['Year'].max()}")
    print(f"   Columns: {df.columns.tolist()}")
    print(f"\n   Average monthly rainfall:")
    months = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
    for month in months:
        if month in df.columns:
            print(f"   - {month}: {df[month].mean():.2f} mm")
    
    # Find years with highest rainfall
    if 'Total' in df.columns:
        top_years = df.nlargest(5, 'Total')[['Year', 'Total']]
        print(f"\n   Top 5 wettest years:")
        for _, row in top_years.iterrows():
            print(f"   - {int(row['Year'])}: {row['Total']:.2f} mm")
except Exception as e:
    print(f"   Error: {e}")

# 4. Analyze sm_Delhi_2020.csv - Soil Moisture
print("\n4. SM_DELHI_2020.CSV - Soil Moisture Data")
try:
    df = pd.read_csv('sm_Delhi_2020.csv')
    datasets['soil_moisture'] = df
    
    print(f"   Shape: {df.shape}")
    print(f"   Columns: {df.columns.tolist()}")
    
    # Parse date
    df['Date'] = pd.to_datetime(df['Date'])
    print(f"   Date Range: {df['Date'].min().date()} to {df['Date'].max().date()}")
    
    # Check for soil moisture columns
    sm_cols = [col for col in df.columns if 'moisture' in col.lower() or 'sm' in col.lower()]
    print(f"   Soil Moisture Columns: {sm_cols}")
    
    for col in sm_cols[:2]:  # Show stats for first 2 SM columns
        print(f"   - {col}: mean={df[col].mean():.2f}, max={df[col].max():.2f}")
        
except Exception as e:
    print(f"   Error: {e}")

# 5. Analyze delhi-temperature.csv
print("\n5. DELHI-TEMPERATURE.CSV - Temperature Data")
try:
    df = pd.read_csv('delhi-temperature.csv', nrows=1000)
    datasets['temperature_sample'] = df
    
    print(f"   Shape (sample): {df.shape}")
    print(f"   Columns: {df.columns.tolist()}")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "="*80)
print("ANALYSIS SUMMARY AND RECOMMENDATIONS")
print("="*80)

print("""
AVAILABLE FEATURES FOR MODEL:
1. Weather Features:
   - Rainfall (daily, 7-day rolling, 30-day rolling)
   - Temperature (max, min, mean)
   - Humidity
   - Wind speed
   - Precipitation probability
   - Evapotranspiration
   
2. Temporal Features:
   - Day of year
   - Month
   - Week
   - Season/Monsoon indicator
   
3. Soil Features:
   - Soil moisture (from sm_Delhi_2020.csv or calculated)
   
4. Groundwater Features (already in model):
   - Extraction stage
   - GW deficit
   - Overexploited indicator

DATASET COVERAGE:
- Historical weather: Multiple years of data available
- Soil moisture: 2020 data available
- Monthly rainfall: 1901-present (excellent for long-term patterns)

RECOMMENDED MODEL APPROACH:
1. LSTM for time-series patterns (already have flood_lstm_model.h5)
2. XGBoost/RandomForest for feature-based prediction (currently in use)
3. Hybrid: Combine both for better accuracy

FOR TIME-PERIOD PREDICTIONS:
- Aggregate daily predictions to week/month level
- Use rolling statistics (7-day, 14-day, 30-day rainfall)
- Train separate models for different time horizons
- Use ensemble methods to improve accuracy
""")

print("\nNEXT STEPS:")
print("1. Merge historical rainfall data with weather data")
print("2. Incorporate soil moisture features")
print("3. Add more temporal features (season, monsoon patterns)")
print("4. Train LSTM model for sequential prediction")
print("5. Create ensemble of LSTM + XGBoost for final predictions")
print("6. Validate on hold-out set with proper metrics")

print("\n" + "="*80)
