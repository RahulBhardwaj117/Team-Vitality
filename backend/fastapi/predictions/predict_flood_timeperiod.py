"""
Enhanced Flood & Heavy Rain Prediction for Specific Time Periods
Uses improved XGBoost model with comprehensive features
Supports week/month/date range predictions
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

print("Loading improved flood prediction model...")

# Load models and scalers
XGB_MODEL_PATH = "flood_xgboost_improved.pkl"
SCALER_PATH = "flood_scaler.pkl"
FEATURE_NAMES_PATH = "flood_features.json"
WEATHER_DB_PATH = "final_weather.csv"
MONTHLY_RAIN_PATH = "delhi-monthly-rains.csv"
SOIL_MOISTURE_PATH = "sm_Delhi_2020.csv"

# Load model
xgb_model = joblib.load(XGB_MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
with open(FEATURE_NAMES_PATH, 'r') as f:
    feature_names = json.load(f)

print(f"✓ Loaded model with {len(feature_names)} features")

# Load historical data
weather_db = pd.read_csv(WEATHER_DB_PATH)
weather_db['Date'] = pd.to_datetime(weather_db['Date'])
weather_db = weather_db.sort_values('Date').reset_index(drop=True)

monthly_rain = pd.read_csv(MONTHLY_RAIN_PATH)

# Load soil moisture
try:
    soil_moisture = pd.read_csv(SOIL_MOISTURE_PATH)
    soil_moisture['Date'] = pd.to_datetime(soil_moisture['Date'])
    soil_moisture_avg = soil_moisture.groupby('Date').agg({
        'Volume Soilmoisture percentage (at 15cm)': 'mean'
    }).reset_index()
    soil_moisture_avg.columns = ['Date', 'SoilMoisture_Actual']
except:
    soil_moisture_avg = pd.DataFrame()

print(f"✓ Loaded historical data: {len(weather_db)} days")

# Constants
GW_EXTRACTION_STAGE = 0.89  # Average across Delhi
GW_DEFICIT = 15000.0 
GW_OVEREXPLOITED = 1

def calculate_historical_rainfall_avg():
    months = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
    month_map = {i+1: month for i, month in enumerate(months)}
    
    historical_avg = {}
    for month_num, month_name in month_map.items():
        if month_name in monthly_rain.columns:
            historical_avg[month_num] = monthly_rain[month_name].mean()
        else:
            historical_avg[month_num] = 50.0
    return historical_avg

historical_rain_avg = calculate_historical_rainfall_avg()

def prepare_features(df):
    """
    Prepare features from weather dataframe
    """
    # If soil moisture available
    if not soil_moisture_avg.empty:
        df = df.merge(soil_moisture_avg, on='Date', how='left')
    
    # Temporal features
    df['Month'] = df['Date'].dt.month
    df['Week'] = df['Date'].dt.isocalendar().week
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    
    # Cyclical encoding
    df['Month_sin'] = np.sin(2 * np.pi * df['Month'] / 12)
    df['Month_cos'] = np.cos(2 * np.pi * df['Month'] / 12)
    
    # Rolling rainfall features
    df['Rainfall_3d'] = df['Rainfall'].rolling(window=3, min_periods=1).sum()
    df['Rainfall_7d'] = df['Rainfall'].rolling(window=7, min_periods=1).sum()
    df['Rainfall_14d'] = df['Rainfall'].rolling(window=14, min_periods=1).sum()
    df['Rainfall_30d'] = df['Rainfall'].rolling(window=30, min_periods=1).sum()
    df['Rainfall_7d_mean'] = df['Rainfall'].rolling(window=7, min_periods=1).mean()
    df['Rainfall_7d_max'] = df['Rainfall'].rolling(window=7, min_periods=1).max()
    df['Rainfall_intensity'] = df['Rainfall_7d'] / 7.0
    
    # Historical anomaly
    df['Historical_Avg'] = df['Month'].map(historical_rain_avg)
    df['Rainfall_Anomaly'] = df['Rainfall'] - (df['Historical_Avg'] / 30)
    
    # Soil moisture
    if 'SoilMoisture_Actual' in df.columns:
        df['SoilMoisture'] = df['SoilMoisture_Actual'].ffill().bfill().fillna(20.0)
    else:
        # Calculate
        sm = [20.0]
        for i in range(1, len(df)):
            prev = sm[-1]
            rain = df.iloc[i]['Rainfall']
            evap = df.iloc[i].get('Evapotranspiration', 5.0)
            change = (rain * 0.8) - (evap * 0.3)
            new_sm = np.clip(prev + change, 5.0, 50.0)
            sm.append(new_sm)
        df['SoilMoisture'] = sm
    
    # Lag features
    for lag in [1, 2, 3, 7]:
        df[f'Rainfall_lag_{lag}'] = df['Rainfall'].shift(lag)
        df[f'SoilMoisture_lag_{lag}'] = df['SoilMoisture'].shift(lag)
    
    # Temperature features
    if 'MaxTemp' in df.columns and 'MinTemp' in df.columns:
        df['TempRange'] = df['MaxTemp'] - df['MinTemp']
        df['AvgTemp'] = (df['MaxTemp'] + df['MinTemp']) / 2
    else:
        df['TempRange'] = 0
        df['AvgTemp'] = 25
    
    # Groundwater features
    df['GW_Extraction_Stage'] = GW_EXTRACTION_STAGE
    df['GW_Deficit'] = GW_DEFICIT
    df['GW_Overexploited'] = GW_OVEREXPLOITED
    
    # Fill NaN
    df = df.bfill().fillna(0)
    
    return df

def predict_date_range(start_date, end_date):
    """
    Predict flood risk for a date range
    """
    # Get data for the period
    mask = (weather_db['Date'] >= start_date) & (weather_db['Date'] <= end_date)
    period_data = weather_db[mask].copy()
    
    if len(period_data) == 0:
        print(f"⚠ No historical data available for the specified period")
        return None
    
    # Prepare features
    period_data = prepare_features(period_data)
    
    # Extract feature values
    X = period_data[feature_names].values
    
    # Scale
    X_scaled = scaler.transform(X)
    
    # Predict
    predictions = xgb_model.predict_proba(X_scaled)[:, 1]
    
    # Add to dataframe
    period_data['Flood_Risk_%'] = predictions * 100
    period_data['Flood_Risk'] = (predictions > 0.5).astype(int)
    
    return period_data

def predict_week(year, week_number):
    """
    Predict flood risk for a specific week
    """
    print(f"\n{'='*80}")
    print(f"   FLOOD PREDICTION FOR WEEK {week_number}, {year}")
    print(f"{'='*80}\n")
    
    # Get start and end dates for the week
    start_date = datetime.fromisocalendar(year, week_number, 1)
    end_date = datetime.fromisocalendar(year, week_number, 7)
    
    results = predict_date_range(start_date, end_date)
    
    if results is None:
        return
    
    # Display results
    print(f"Period: {start_date.date()} to {end_date.date()}\n")
    
    avg_risk = results['Flood_Risk_%'].mean()
    max_risk = results['Flood_Risk_%'].max()
    high_risk_days = (results['Flood_Risk_%'] > 70).sum()
    
    print(f"SUMMARY:")
    print(f"  - Average Risk: {avg_risk:.1f}%")
    print(f"  - Maximum Risk: {max_risk:.1f}%")
    print(f"  - High Risk Days (>70%): {high_risk_days} out of {len(results)}")
    
    # Risk level
    if avg_risk > 70:
        risk_level = "EXTREME - Flood likely"
    elif avg_risk > 50:
        risk_level = "HIGH - Flood possible"
    elif avg_risk > 30:
        risk_level = "MODERATE - Monitor closely"
    else:
        risk_level = "LOW - Normal conditions"
    
    print(f"  - Overall Assessment: {risk_level}\n")
    
    # Daily breakdown
    print("DAILY FORECAST:")
    print("-" * 80)
    print(f"{'Date':<12} {'Day':<10} {'Rainfall':<12} {'Risk %':<10} {'Assessment'}")
    print("-" * 80)
    
    for _, row in results.iterrows():
        date_str = row['Date'].strftime('%Y-%m-%d')
        day_str = row['Date'].strftime('%A')
        rainfall = row['Rainfall']
        risk_pct = row['Flood_Risk_%']
        
        if risk_pct > 70:
            assessment = "⚠ EXTREME"
        elif risk_pct > 50:
            assessment = "⚠ HIGH"
        elif risk_pct > 30:
            assessment = "• MODERATE"
        else:
            assessment = "✓ LOW"
        
        print(f"{date_str:<12} {day_str:<10} {rainfall:>6.1f} mm   {risk_pct:>6.1f}%   {assessment}")
    
    # Contributing factors
    print(f"\nCONTRIBUTING FACTORS:")
    avg_soil_moisture = results['SoilMoisture'].mean()
    total_rainfall = results['Rainfall'].sum()
    avg_rainfall_7d = results['Rainfall_7d'].mean()
    
    print(f"  - Total Rainfall: {total_rainfall:.1f} mm")
    print(f"  - Average 7-day Rainfall: {avg_rainfall_7d:.1f} mm")
    print(f"  - Average Soil Moisture: {avg_soil_moisture:.1f}%")
    print(f"  - Monsoon Period: {'Yes' if results['Monsoon'].mean() > 0.5 else 'No'}")
    print(f"  - Groundwater Status: {'Overexploited' if GW_OVEREXPLOITED else 'Normal'}")
    
    print("\n" + "="*80)

def predict_month(year, month):
    """
    Predict flood risk for a specific month
    """
    print(f"\n{'='*80}")
    print(f"   FLOOD PREDICTION FOR {datetime(year, month, 1).strftime('%B %Y').upper()}")
    print(f"{'='*80}\n")
    
    # Get start and end dates for the month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year, month, 31)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    results = predict_date_range(start_date, end_date)
    
    if results is None:
        return
    
    # Display results
    print(f"Period: {start_date.date()} to {end_date.date()}\n")
    
    avg_risk = results['Flood_Risk_%'].mean()
    max_risk = results['Flood_Risk_%'].max()
    high_risk_days = (results['Flood_Risk_%'] > 70).sum()
    extreme_risk_days = (results['Flood_Risk_%'] > 85).sum()
    
    print(f"SUMMARY:")
    print(f"  - Average Risk: {avg_risk:.1f}%")
    print(f"  - Maximum Risk: {max_risk:.1f}%")
    print(f"  - High Risk Days (>70%): {high_risk_days} out of {len(results)}")
    print(f"  - Extreme Risk Days (>85%): {extreme_risk_days} out of {len(results)}")
    
    # Risk level
    if avg_risk > 70:
        risk_level = "EXTREME - Flooding expected"
    elif avg_risk > 50:
        risk_level = "HIGH - Significant flood risk"
    elif avg_risk > 30:
        risk_level = "MODERATE - Some flood risk"
    else:
        risk_level = "LOW - Normal conditions"
    
    print(f"  - Overall Assessment: {risk_level}\n")
    
    # Weekly breakdown
    results['Week'] = results['Date'].dt.isocalendar().week
    weekly = results.groupby('Week').agg({
        'Flood_Risk_%': 'mean',
        'Rainfall': 'sum',
        'Date': ['min', 'max']
    }).reset_index()
    
    print("WEEKLY BREAKDOWN:")
    print("-" * 80)
    print(f"{'Week':<8} {'Dates':<25} {'Total Rain':<15} {'Avg Risk %':<15} {'Status'}")
    print("-" * 80)
    
    for _, row in weekly.iterrows():
        week_num = int(row['Week'])
        start = row['Date']['min'].strftime('%b %d')
        end = row['Date']['max'].strftime('%b %d')
        dates_str = f"{start} - {end}"
        total_rain = row['Rainfall']['sum']
        avg_risk = row['Flood_Risk_%']['mean']
        
        if avg_risk > 70:
            status = "⚠ EXTREME"
        elif avg_risk > 50:
            status = "⚠ HIGH"
        elif avg_risk > 30:
            status = "• MODERATE"
        else:
            status = "✓ LOW"
        
        print(f"{week_num:<8} {dates_str:<25} {total_rain:>8.1f} mm     {avg_risk:>8.1f}%     {status}")
    
    # Contributing factors
    print(f"\nCONTRIBUTING FACTORS:")
    total_rainfall = results['Rainfall'].sum()
    max_daily_rainfall = results['Rainfall'].max()
    avg_soil_moisture = results['SoilMoisture'].mean()
    
    print(f"  - Total Rainfall: {total_rainfall:.1f} mm")
    print(f"  - Maximum Daily Rainfall: {max_daily_rainfall:.1f} mm")
    print(f"  - Average Soil Moisture: {avg_soil_moisture:.1f}%")
    print(f"  - Monsoon Period: {'Yes' if results['Monsoon'].mean() > 0.5 else 'No'}")
    
    # Historical comparison
    month_name = datetime(year, month, 1).strftime('%B')
    month_names = {'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'April',
                   'May': 'May', 'June': 'June', 'July': 'July', 'August': 'Aug',
                   'September': 'Sept', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'}
    hist_avg = historical_rain_avg.get(month, 100)
    
    print(f"\nHISTORICAL CONTEXT:")
    print(f"  - Historical Average for {month_name}: {hist_avg:.1f} mm")
    print(f"  - Current Prediction: {total_rainfall:.1f} mm")
    print(f"  - Deviation: {((total_rainfall/hist_avg - 1) * 100):.1f}%")
    
    print("\n" + "="*80)

# Interactive mode
if __name__ == "__main__":
    print("\n" + "="*80)
    print("   ENHANCED FLOOD & HEAVY RAIN PREDICTION SYSTEM")
    print("="*80)
    print("\nPrediction Options:")
    print("  1. Predict for a specific week (e.g., 2024, week 30)")
    print("  2. Predict for a specific month (e.g., 2024, July)")
    print("  3. Exit")
    
    while True:
        print("\n" + "-"*80)
        choice = input("Enter choice (1/2/3): ").strip()
        
        if choice == '1':
            try:
                year = int(input("Enter year (e.g., 2024): "))
                week = int(input("Enter week number (1-52): "))
                predict_week(year, week)
            except Exception as e:
                print(f"Error: {e}")
        
        elif choice == '2':
            try:
                year = int(input("Enter year (e.g., 2024): "))
                month = int(input("Enter month (1-12): "))
                predict_month(year, month)
            except Exception as e:
                print(f"Error: {e}")
        
        elif choice == '3':
            print("\nExiting...")
            break
        
        else:
            print("Invalid choice. Please select 1, 2, or 3.")
