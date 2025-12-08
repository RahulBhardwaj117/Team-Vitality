#!/usr/bin/env python3
"""
Simple Flood Prediction Script
Uses the enhanced XGBoost model to predict flood risk for any date/period
"""

import pandas as pd
import numpy as np
import joblib
import json
import sys
from datetime import datetime, timedelta

# Load model artifacts
model = joblib.load("flood_xgboost_improved.pkl")
scaler = joblib.load("flood_scaler.pkl")
with open("flood_features.json") as f:
    features = json.load(f)

# Load historical weather
weather_db = pd.read_csv("final_weather.csv")
weather_db['Date'] = pd.to_datetime(weather_db['Date'])

print(f"[OK] Loaded model expecting {len(features)} features")
print(f"[OK] Historical data: {weather_db['Date'].min().date()} to {weather_db['Date'].max().date()}")

def engineer_all_features(df):
    """Engineer all 22 features for the model"""
    df = df.copy().sort_values('Date')
    
    # Rolling sums
    for days in [3, 7, 15, 30]:
        df[f'Rain_{days}d'] = df['Rainfall'].rolling(days, min_periods=1).sum()
    
    # Anomaly & lags
    df['Rain_30d_Mean'] = df['Rainfall'].rolling(30, min_periods=1).mean()
    df['Rain_Anomaly'] = df['Rainfall'] - df['Rain_30d_Mean']
    for lag in [1, 2, 3, 7]:
        df[f'Rain_Lag{lag}'] = df['Rainfall'].shift(lag)
    
    # Soil moisture (simple estimate)
    sm = [20.0]
    for i in range(1, len(df)):
        prev = sm[-1]
        rain = df.iloc[i]['Rainfall']
        new_sm = max(0, min(50, prev * 0.95 + rain * 0.3 - 0.5 - prev * 0.02))
        sm.append(new_sm)
    df['SoilMoisture'] = sm
    df['Soil_Rain_Interaction'] = df['SoilMoisture'] * df['Rain_7d']
    
    # Date features
    df['Month'] = df['Date'].dt.month
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    
    # Temperature features
    df['MaxTemp'] = df.get('MaxTemp', 35.0)
    df['MaxTemp_RollingMean'] = df['MaxTemp'].rolling(7, min_periods=1).mean()
    df['MaxTemp_RollingStd'] = df['MaxTemp'].rolling(7, min_periods=1).std().fillna(0)
    
    # Humidity interaction
    df['Humidity'] = df.get('Humidity', 60.0)
    df['Humidity_Temp_Interaction'] = df['Humidity'] * df['MaxTemp'] / 100.0
    
    # Seasonal flags
    df['Is_Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['Is_Winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    
    # Extreme weather
    df['Extreme_Hot'] = (df['MaxTemp'] > 40).astype(int)
    df['Extreme_Cold'] = (df['MaxTemp'] < 10).astype(int)
    
    # Consecutive dry days
    df['Is_Dry'] = (df['Rainfall'] < 0.1).astype(int)
    df['Consecutive_Dry'] = df.groupby((df['Is_Dry'] != df['Is_Dry'].shift()).cumsum())['Is_Dry'].cumsum() * df['Is_Dry']
    
    return df.fillna(0)

def forecast_future(target_month, target_year):
    """Generate forecast for a future month using seasonal patterns"""
    start_date = datetime(target_year, target_month, 1)
    if target_month == 12:
        end_date = datetime(target_year, 12, 31)
    else:
        end_date = datetime(target_year, target_month + 1, 1) - timedelta(days=1)
    
    # Get historical context (60 days before)
    context_start = start_date - timedelta(days=60)
    
    # For future dates, generate synthetic weather based on seasonal averages
    rows = []
    current = context_start
    
    while current <= end_date:
        month = current.month
        
        # Seasonal rainfall (mm/day average)
        if month in [7, 8, 9]:  # Monsoon
            rainfall = np.random.gamma(2, 8)
        elif month in [12, 1, 2]:  # Winter
            rainfall = np.random.gamma(0.5, 1.5)
        else:
            rainfall = np.random.gamma(0.3, 0.8)
        
        # Seasonal temperature
        if month in [5, 6]:  # Summer
            max_temp = 40 + np.random.normal(0, 2)
        elif month in [12, 1]:  # Winter
            max_temp = 22 + np.random.normal(0, 2)
        else:
            max_temp = 32 + np.random.normal(0, 3)
        
        rows.append({
            'Date': current,
            'Rainfall': max(0, rainfall),
            'MaxTemp': max_temp,
            'Humidity': 65 if month in [7, 8, 9] else 45
        })
        current += timedelta(days=1)
    
    return pd.DataFrame(rows)

def predict_flood_risk(year_month_str):
    """Predict flood risk for YYYY-MM format"""
    year, month = map(int, year_month_str.split('-'))
    
    print(f"\n{'='*60}")
    print(f"FLOOD RISK FORECAST: {year}-{month:02d}")
    print(f"{'='*60}\n")
    
    # Generate/get weather data
    df = forecast_future(month, year)
    
    # Engineer all features
    df = engineer_all_features(df)
    
    # Filter to target month
    target = df[df['Date'].dt.month == month].copy()
    
    # Predict
    X = target[features]
    X_scaled = scaler.transform(X)
    probs = model.predict_proba(X_scaled)[:, 1]
    
    target['Flood_Probability'] = probs
    target['Risk'] = pd.cut(probs, bins=[-0.1, 0.3, 0.6, 0.8, 1.1], 
                            labels=['Low', 'Moderate', 'High', 'Severe'])
    
    # Display results
    high_risk = target[target['Flood_Probability'] > 0.5]
    
    if len(high_risk) > 0:
        print(f"[WARNING] {len(high_risk)} High Risk Days Detected!\n")
        print(f"{'Date':<12} | {'Rain(mm)':<10} | {'Probability':<12} | {'Risk Level'}")
        print("-" * 60)
        for _, row in high_risk.head(10).iterrows():
            print(f"{row['Date'].date()} | {row['Rainfall']:<10.1f} | {row['Flood_Probability']:<12.1%} | {row['Risk']}")
    else:
        print("[OK] No significant flood risk detected for this period.\n")
    
    # Weekly summary
    target['Week'] = target['Date'].dt.isocalendar().week
    weekly = target.groupby('Week').agg({
        'Flood_Probability': 'max',
        'Rainfall': 'sum'
    }).reset_index()
    
    print(f"\n{'Weekly Summary'}")
    print("-" * 40)
    for _, row in weekly.iterrows():
        risk_icon = "[!]" if row['Flood_Probability'] > 0.5 else "[OK]"
        print(f"{risk_icon}  Week {row['Week']}: Max Risk {row['Flood_Probability']:.1%}, Total Rain {row['Rainfall']:.1f}mm")
    
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        predict_flood_risk(sys.argv[1])
    else:
        print("Usage: python simple_flood_predict.py YYYY-MM")
        print("Example: python simple_flood_predict.py 2024-10")
