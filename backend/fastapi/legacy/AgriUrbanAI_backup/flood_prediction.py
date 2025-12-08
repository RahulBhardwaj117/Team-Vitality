import pandas as pd
import numpy as np
import joblib
import json
import warnings
from datetime import datetime, timedelta
import re
import sys
import os

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from forecast_future_weather import HistoricalWeatherForecaster

warnings.filterwarnings("ignore")

# ================= CONFIGURATION =================
# Use the new balanced model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "flood_xgboost_balanced.pkl")
SCALER_FILE = os.path.join(BASE_DIR, "flood_scaler_balanced.pkl")
FEATURES_FILE = os.path.join(BASE_DIR, "flood_features_balanced.json")
WEATHER_DB_FILE = os.path.join(BASE_DIR, "final_weather.csv")

# ================= LOAD ARTIFACTS =================
print("Loading models and data...", flush=True)

try:
    model = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    with open(FEATURES_FILE, 'r') as f:
        model_features = json.load(f)
    print(f"✓ Loaded Flood Model (Expects {len(model_features)} features)", flush=True)
except Exception as e:
    print(f"Error loading flood model artifacts: {e}", flush=True)
    print(f"Please ensure {MODEL_FILE}, {SCALER_FILE}, and {FEATURES_FILE} exist.", flush=True)
    sys.exit(1)

# Initialize Weather Forecaster
try:
    forecaster = HistoricalWeatherForecaster()
    print("✓ Initialized Weather Forecaster", flush=True)
except Exception as e:
    print(f"Error initializing weather forecaster: {e}", flush=True)
    sys.exit(1)

# ================= HELPER FUNCTIONS =================

def estimate_soil_moisture(weather_df):
    """
    Estimate Soil Moisture using a simple water balance model
    SM_t = SM_{t-1} * decay + Infiltration - Evapotranspiration
    """
    # Initial SM (assume average start)
    sm_values = [20.0] 
    decay = 0.95
    
    for i in range(1, len(weather_df)):
        prev_sm = sm_values[-1]
        rain = weather_df.iloc[i]['Rainfall']
        
        # Simple proxy logic
        infiltration = rain * 0.3
        evap = 0.5 + (prev_sm * 0.02)
        
        new_sm = (prev_sm * decay) + infiltration - evap
        new_sm = max(0, min(new_sm, 60)) # Cap at 60%
        sm_values.append(new_sm)
        
    weather_df['SoilMoisture'] = sm_values
    return weather_df

def engineer_features(df):
    """
    Recreate the exact features used in training (retrain_balanced_model.py)
    """
    # Ensure sorted
    df = df.sort_values('Date').reset_index(drop=True)
    
    # 1. Rolling Rainfall Stats
    df['Rain_3d'] = df['Rainfall'].rolling(window=3, min_periods=1).sum()
    df['Rain_7d'] = df['Rainfall'].rolling(window=7, min_periods=1).sum()
    df['Rain_15d'] = df['Rainfall'].rolling(window=15, min_periods=1).sum()
    df['Rain_30d'] = df['Rainfall'].rolling(window=30, min_periods=1).sum()
    
    # 2. Lag Features
    df['Rain_Lag1'] = df['Rainfall'].shift(1).fillna(0)
    df['Rain_Lag2'] = df['Rainfall'].shift(2).fillna(0)
    df['Rain_Lag3'] = df['Rainfall'].shift(3).fillna(0)
    df['Rain_Lag7'] = df['Rainfall'].shift(7).fillna(0)
    
    # 3. Rainfall Anomaly
    df['Rain_30d_Mean'] = df['Rainfall'].rolling(window=30, min_periods=1).mean()
    df['Rain_Anomaly'] = df['Rainfall'] - df['Rain_30d_Mean']
    df['Rain_Anomaly'] = df['Rain_Anomaly'].fillna(0)
    
    # 4. Temperature Context
    df['MaxTemp_RollingMean'] = df['MaxTemp'].rolling(window=7, min_periods=1).mean()
    df['MaxTemp_RollingStd'] = df['MaxTemp'].rolling(window=7, min_periods=1).std().fillna(0)
    
    # 5. Humidity-Temp Interaction (Estimate Humidity if missing)
    if 'Humidity' not in df.columns:
        # Simple estimation based on rain and season
        df['Humidity'] = 40.0 # Base
        # Increase humidity if raining or monsoon
        df.loc[df['Rainfall'] > 0, 'Humidity'] = 80.0
        df.loc[df['Date'].dt.month.isin([7,8,9]), 'Humidity'] = 70.0
        
    df['Humidity_Temp_Interaction'] = df['Humidity'] * df['MaxTemp'] / 100.0
    
    # 6. Seasonal Indicators
    df['Month'] = df['Date'].dt.month
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Is_Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['Is_Winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    
    # 7. Extreme Weather Flags
    df['Extreme_Hot'] = (df['MaxTemp'] > 40).astype(int)
    df['Extreme_Cold'] = (df['MaxTemp'] < 10).astype(int)
    
    # 8. Consecutive Dry Days
    df['Is_Dry'] = (df['Rainfall'] < 0.1).astype(int)
    df['Consecutive_Dry'] = df.groupby((df['Is_Dry'] != df['Is_Dry'].shift()).cumsum())['Is_Dry'].cumsum()
    df['Consecutive_Dry'] = df['Consecutive_Dry'] * df['Is_Dry']
    
    # 9. Consecutive Wet Days (NEW feature in balanced model)
    df['Is_Wet'] = (df['Rainfall'] > 1.0).astype(int)
    df['Consecutive_Wet'] = df.groupby((df['Is_Wet'] != df['Is_Wet'].shift()).cumsum())['Is_Wet'].cumsum()
    df['Consecutive_Wet'] = df['Consecutive_Wet'] * df['Is_Wet']
    
    # 10. Cyclical Date Features
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    
    # 11. Soil-Rain Interaction
    df['Soil_Rain_Interaction'] = df['SoilMoisture'] * df['Rain_7d']
    
    # Fill any remaining NaNs
    df = df.fillna(0)
    
    return df

def generate_weather_sequence(start_date, end_date):
    """
    Generates weather data for the requested period PLUS context period
    to allow for rolling window calculations.
    """
    # We need about 30 days of context for rolling features
    context_days = 35
    full_start = start_date - timedelta(days=context_days)
    
    # Generate forecast day by day
    current = full_start
    all_rows = []
    
    # print(f"Generating weather context from {full_start.date()}...", flush=True)
    
    while current <= end_date:
        # Determine week and year
        year = current.year
        week = current.isocalendar()[1]
        
        # Forecast this week
        # We use 'realistic' scenario by default
        week_df = forecaster.forecast_week(year, week, scenario='realistic')
        
        # Filter for days we haven't added yet and are within range
        for _, row in week_df.iterrows():
            d = row['Date']
            if d >= current and d <= end_date:
                all_rows.append(row)
        
        # Move to next week start
        current += timedelta(days=7)
        
    # Create DataFrame
    weather_df = pd.DataFrame(all_rows)
    weather_df = weather_df.drop_duplicates(subset=['Date']).sort_values('Date').reset_index(drop=True)
    
    # Filter to ensure we cover full_start to end_date
    weather_df = weather_df[(weather_df['Date'] >= full_start) & (weather_df['Date'] <= end_date)]
    
    return weather_df

# ================= MAIN PREDICTION =================

def predict_flood_risk(start_date, end_date):
    print(f"\nForecasting Flood Risk for: {start_date.date()} to {end_date.date()}", flush=True)
    
    # 1. Generate Weather (Forecast)
    weather_df = generate_weather_sequence(start_date, end_date)
    
    if len(weather_df) == 0:
        print("Error: No weather data generated.", flush=True)
        return

    # 2. Estimate Soil Moisture
    weather_df = estimate_soil_moisture(weather_df)
    
    # 3. Engineer Features
    full_df = engineer_features(weather_df)
    
    # 4. Filter for requested target period (remove context)
    target_df = full_df[(full_df['Date'] >= start_date) & (full_df['Date'] <= end_date)].copy()
    
    if len(target_df) == 0:
        print("Error: Target period empty after filtering.", flush=True)
        return
        
    # 5. Prepare for Model
    # Check for missing features
    missing_cols = [col for col in model_features if col not in target_df.columns]
    if missing_cols:
        print(f"Warning: Missing features: {missing_cols}", flush=True)
        for col in missing_cols:
            target_df[col] = 0
            
    X = target_df[model_features]
    
    # Scale
    X_scaled = scaler.transform(X)
    
    # 6. Predict Probabilities
    # The new model is calibrated, so predict_proba gives calibrated probabilities
    probs = model.predict_proba(X_scaled)[:, 1]
    
    target_df['Flood_Probability'] = probs
    target_df['Flood_Risk_Label'] = (probs > 0.5).astype(int)
    
    # 7. Display Results
    # (Output to file logic removed for brevity in API context, or kept if needed)
    # Keeping it as it doesn't hurt
    
    return target_df.to_dict(orient='records') # Return list of dicts for API

# ================= USER INPUT =================

def parse_date(date_str):
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    raise ValueError("Invalid date format")

if __name__ == "__main__":
    print("\n--- DELHI FLOOD PREDICTION SYSTEM (BALANCED MODEL) ---", flush=True)
    print("Enter a date range to check for flood risk.", flush=True)
    
    while True:
        try:
            start_input = input("\nEnter Start Date (YYYY-MM-DD) or 'q' to quit: ").strip()
            if start_input.lower() == 'q':
                break
                
            end_input = input("Enter End Date (YYYY-MM-DD): ").strip()
            
            start_date = parse_date(start_input)
            end_date = parse_date(end_input)
            
            if end_date < start_date:
                print("Error: End date must be after start date.", flush=True)
                continue
                
            predict_flood_risk(start_date, end_date)
            
        except ValueError:
            print("Invalid date format. Please use YYYY-MM-DD.", flush=True)
        except Exception as e:
            print(f"An error occurred: {e}", flush=True)