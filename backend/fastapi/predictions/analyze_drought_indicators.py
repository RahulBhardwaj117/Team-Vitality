"""
Drought Indicator Analysis
Analyzes all datasets to identify drought patterns and indicators
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("DROUGHT INDICATOR ANALYSIS")
print("="*80)

# Load datasets
weather_db = pd.read_csv('final_weather.csv')
weather_db['Date'] = pd.to_datetime(weather_db['Date'])
weather_db['Month'] = weather_db['Date'].dt.month
weather_db['Year'] = weather_db['Date'].dt.year

monthly_rain = pd.read_csv('delhi-monthly-rains.csv')

print(f"\n1. RAINFALL ANALYSIS")
print("-" * 80)
print(f"Total days analyzed: {len(weather_db)}")
print(f"Date range: {weather_db['Date'].min().date()} to {weather_db['Date'].max().date()}")

# Drought indicators based on rainfall
print(f"\nRainfall Statistics:")
print(weather_db['Rainfall'].describe())

# Identify dry periods
zero_rain_days = (weather_db['Rainfall'] == 0).sum()
low_rain_days = (weather_db['Rainfall'] < 2.5).sum()
print(f"\nDry Period Indicators:")
print(f"  - Days with zero rainfall: {zero_rain_days} ({zero_rain_days/len(weather_db)*100:.1f}%)")
print(f"  - Days with <2.5mm rainfall: {low_rain_days} ({low_rain_days/len(weather_db)*100:.1f}%)")

# Calculate consecutive dry days
weather_db['IsDry'] = (weather_db['Rainfall'] < 2.5).astype(int)
weather_db['DryStreak'] = weather_db.groupby((weather_db['IsDry'] != weather_db['IsDry'].shift()).cumsum())['IsDry'].cumsum()

max_dry_streak = weather_db[weather_db['IsDry'] == 1]['DryStreak'].max()
print(f"  - Maximum consecutive dry days: {max_dry_streak}")

# Monthly rainfall analysis
print(f"\n2. MONTHLY PATTERNS")
print("-" * 80)
monthly_avg = weather_db.groupby('Month')['Rainfall'].agg(['mean', 'sum', 'count'])
print("\nAverage monthly rainfall:")
for month in range(1, 13):
    if month in monthly_avg.index:
        avg = monthly_avg.loc[month, 'mean']
        total = monthly_avg.loc[month, 'sum']
        print(f"  Month {month:2d}: Avg={avg:6.2f} mm/day, Total={total:7.1f} mm")

# Identify drought-prone months
drought_months = monthly_avg[monthly_avg['mean'] < 2.0].index.tolist()
print(f"\nDrought-prone months (avg < 2mm/day): {drought_months}")

# Historical rainfall analysis
print(f"\n3. HISTORICAL CONTEXT (1901-2021)")
print("-" * 80)
months_list = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
print("\nHistorical monthly averages (121 years):")
for i, month_name in enumerate(months_list, 1):
    if month_name in monthly_rain.columns:
        hist_avg = monthly_rain[month_name].mean()
        hist_min = monthly_rain[month_name].min()
        print(f"  {month_name:5s}: Avg={hist_avg:6.1f} mm, Min={hist_min:6.1f} mm")

# Evapotranspiration analysis
if 'Evapotranspiration' in weather_db.columns:
    print(f"\n4. EVAPOTRANSPIRATION ANALYSIS")
    print("-" * 80)
    print(weather_db['Evapotranspiration'].describe())
    
    # High evaporation = drought risk
    high_evap_days = (weather_db['Evapotranspiration'] > 7).sum()
    print(f"\nDays with high evapotranspiration (>7mm): {high_evap_days}")

# Temperature analysis
if 'MaxTemp' in weather_db.columns:
    print(f"\n5. TEMPERATURE ANALYSIS")
    print("-" * 80)
    print(f"Maximum temperature statistics:")
    print(weather_db['MaxTemp'].describe())
    
    hot_days = (weather_db['MaxTemp'] > 40).sum()
    print(f"\nExtremely hot days (>40°C): {hot_days}")

# Soil moisture
try:
    soil_moisture = pd.read_csv('sm_Delhi_2020.csv')
    soil_moisture['Date'] = pd.to_datetime(soil_moisture['Date'])
    
    print(f"\n6. SOIL MOISTURE ANALYSIS")
    print("-" * 80)
    print(f"Data available: {len(soil_moisture)} observations")
    
    sm_col = 'Volume Soilmoisture percentage (at 15cm)'
    if sm_col in soil_moisture.columns:
        print(f"\nSoil moisture statistics:")
        print(soil_moisture[sm_col].describe())
        
        dry_soil_days = (soil_moisture[sm_col] < 15).sum()
        print(f"\nDays with low soil moisture (<15%): {dry_soil_days}")
except:
    print(f"\n6. SOIL MOISTURE: Data not available")

print(f"\n" + "="*80)
print("DROUGHT CRITERIA DEFINITION")
print("="*80)
print("""
Based on analysis, drought conditions identified when:
1. Consecutive dry days (rainfall < 2.5mm) > 14 days
2. Monthly rainfall < 50% of historical average
3. Soil moisture < 15% (when available)
4. High evapotranspiration (>7mm) + low rainfall (<2mm)
5. Temperature > 40°C + no rain for 7+ days

DROUGHT SEVERITY LEVELS:
- MILD: 7-14 consecutive dry days, 50-70% of normal rainfall
- MODERATE: 15-30 consecutive dry days, 30-50% of normal rainfall
- SEVERE: 30-60 consecutive dry days, <30% of normal rainfall
- EXTREME: >60 consecutive dry days, <10% of normal rainfall
""")

print("="*80)
