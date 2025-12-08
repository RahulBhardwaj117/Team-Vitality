"""
Heatwave Prediction AI Model (Advanced Ensemble)
Predicts heatwave severity using an Ensemble of 5 XGBoost Models.
incorporates Climate Change Trends for realistic future forecasting.
"""

import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime, timedelta
import warnings
import os
import sys

warnings.filterwarnings('ignore')

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "heatwave_model_ensemble.pkl")
SCALER_FILE = os.path.join(BASE_DIR, "heatwave_scaler.pkl")
FEATURES_FILE = os.path.join(BASE_DIR, "heatwave_features.json")
DATA_FILE = os.path.join(BASE_DIR, "weatherdata.csv")
NORMALS_FILE = os.path.join(BASE_DIR, "delhi-temperature.csv")

# Climate Trend: Approx 0.05°C warming per year (conservative estimate)
# Base year for data is approx 2016 (midpoint of 2010-2023)
BASE_YEAR = 2016
WARMING_RATE = 0.05 

SEVERITY_MAP = {
    0: "Normal",
    1: "Watch (High Temp)",
    2: "HEATWAVE",
    3: "SEVERE HEATWAVE"
}

COLORS = {
    0: "\033[92m", # Green
    1: "\033[93m", # Yellow
    2: "\033[91m", # Red
    3: "\033[95m"  # Purple
}
RESET = "\033[0m"

class HeatwaveForecaster:
    def __init__(self):
        print("Initializing Advanced Heatwave Forecaster...")
        self.load_historical_data()
        self.load_model()
        
    def load_model(self):
        try:
            self.models = joblib.load(MODEL_FILE)
            self.scaler = joblib.load(SCALER_FILE)
            with open(FEATURES_FILE, 'r') as f:
                self.features = json.load(f)
            print(f"✓ Loaded Ensemble of {len(self.models)} models")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            print("Please run train_heatwave_ensemble.py first.")
            exit(1)

    def load_historical_data(self):
        df = pd.read_csv(DATA_FILE)
        cols = ['Max Temperature', 'Min Temperature', 'Avg Temperature']
        for col in cols:
            df[col] = (df[col] - 32) * 5/9
            
        df['DateStr'] = df['Year'].astype(str) + '-' + df['Month'].astype(str) + '-' + df['Date'].astype(str)
        df['Date'] = pd.to_datetime(df['DateStr'])
        df['DayOfYear'] = df['Date'].dt.dayofyear
        
        self.daily_stats = df.groupby('DayOfYear').agg({
            'Max Temperature': ['mean', 'std'],
            'Min Temperature': ['mean', 'std'],
            'Avg Temperature': 'mean',
            'Avg Humidity': 'mean',
            'Max Wind Speed': 'mean'
        })
        
        normals = pd.read_csv(NORMALS_FILE)
        normals['Date'] = pd.to_datetime(normals['Date'])
        normals['DayOfYear'] = normals['Date'].dt.dayofyear
        self.normals = normals.groupby('DayOfYear')['Temp Max'].mean()
        
        print("✓ Historical patterns loaded")

    def generate_weather_for_date(self, target_date, scenario='realistic'):
        """Generate synthetic weather with Climate Trend"""
        if hasattr(target_date, 'dayofyear'):
            day_of_year = target_date.dayofyear
        else:
            day_of_year = target_date.timetuple().tm_yday
            
        if day_of_year == 366: day_of_year = 365
        
        stats = self.daily_stats.loc[day_of_year]
        
        max_temp = stats['Max Temperature']['mean']
        min_temp = stats['Min Temperature']['mean']
        std_dev = stats['Max Temperature']['std']
        humidity = stats['Avg Humidity']['mean']
        wind = stats['Max Wind Speed']['mean']
        
        # --- CLIMATE TREND ADJUSTMENT ---
        # Calculate years since base period
        years_diff = target_date.year - BASE_YEAR
        if years_diff > 0:
            warming = years_diff * WARMING_RATE
            max_temp += warming
            min_temp += warming
            # Humidity slightly decreases with warming (Clausius-Clapeyron relation complex, but generally relative humidity drops over land)
            humidity *= (1 - (0.002 * years_diff)) 
        
        # Apply Scenario
        if scenario == 'pessimistic':
            max_temp += std_dev * 1.5
            min_temp += std_dev * 1.0
            humidity *= 0.9
        elif scenario == 'optimistic':
            max_temp -= std_dev * 1.0
            min_temp -= std_dev * 1.0
        
        # Random noise
        noise = np.random.normal(0, 0.5)
        max_temp += noise
        
        return {
            'MaxTemp': max_temp,
            'MinTemp': min_temp,
            'AvgTemp': (max_temp + min_temp) / 2,
            'Humidity': humidity,
            'WindSpeed': wind,
            'Date': target_date
        }

    def calculate_heat_index(self, temp, humidity):
        T = (temp * 9/5) + 32
        R = humidity
        HI = 0.5 * (T + 61.0 + ((T-68.0)*1.2) + (R*0.094))
        if HI > 80:
            HI = -42.379 + 2.04901523*T + 10.14333127*R - .22475541*T*R - .00683783*T*T - .05481717*R*R + .00122874*T*T*R + .00085282*T*R*R - .00000199*T*T*R*R
        return (HI - 32) * 5/9

    def prepare_features(self, weather_data, prev_days_data):
        row = weather_data.copy()
        date = row['Date']
        
        if hasattr(date, 'dayofyear'):
            doy = date.dayofyear
        else:
            doy = date.timetuple().tm_yday
        if doy == 366: doy = 365
        
        normal_max = self.normals.loc[doy]
        row['Normal_Max'] = normal_max
        row['Departure_Max'] = row['MaxTemp'] - normal_max
        row['HeatIndex'] = self.calculate_heat_index(row['MaxTemp'], row['Humidity'])
        
        temps = [d['MaxTemp'] for d in prev_days_data] + [row['MaxTemp']]
        hums = [d['Humidity'] for d in prev_days_data] + [row['Humidity']]
        
        row['Temp_3d'] = np.mean(temps[-3:])
        row['Temp_7d'] = np.mean(temps[-7:])
        row['Humidity_3d'] = np.mean(hums[-3:])
        row['MaxTemp_Lag1'] = temps[-2]
        row['MaxTemp_Lag2'] = temps[-3]
        
        row['Month'] = date.month
        row['Week'] = date.isocalendar().week
        row['Temp_Humidity_Interaction'] = row['MaxTemp'] * row['Humidity']
        
        df = pd.DataFrame([row])
        return df[self.features]

    def predict_period(self, start_date, end_date, scenario='realistic'):
        print(f"\nGenerating forecast for {start_date.date()} to {end_date.date()} ({scenario})...")
        results = []
        
        history = []
        curr = start_date - timedelta(days=7)
        while curr < start_date:
            history.append(self.generate_weather_for_date(curr, scenario))
            curr += timedelta(days=1)
            
        curr = start_date
        while curr <= end_date:
            weather = self.generate_weather_for_date(curr, scenario)
            X = self.prepare_features(weather, history)
            X_scaled = self.scaler.transform(X)
            
            # ENSEMBLE PREDICTION
            avg_probs = np.zeros(4)
            for model in self.models:
                avg_probs += model.predict_proba(X_scaled)[0]
            avg_probs /= len(self.models)
            
            pred = np.argmax(avg_probs)
            
            result = weather.copy()
            result['Severity'] = int(pred)
            result['SeverityName'] = SEVERITY_MAP[int(pred)]
            result['Confidence'] = avg_probs[int(pred)] * 100
            result['HeatIndex'] = self.calculate_heat_index(weather['MaxTemp'], weather['Humidity'])
            
            results.append(result)
            history.append(weather)
            history.pop(0)
            curr += timedelta(days=1)
            
        return pd.DataFrame(results)

def print_forecast(df):
    print("\n" + "="*90)
    print(f"   HEATWAVE FORECAST REPORT (Ensemble Model)")
    print("="*90)
    
    severe_days = df[df['Severity'] == 3].shape[0]
    heatwave_days = df[df['Severity'] == 2].shape[0]
    watch_days = df[df['Severity'] == 1].shape[0]
    
    print(f"\nPeriod: {df['Date'].iloc[0].date()} to {df['Date'].iloc[-1].date()}")
    print(f"Max Temp Forecast: {df['MaxTemp'].max():.1f}°C")
    print(f"Max Heat Index:    {df['HeatIndex'].max():.1f}°C")
    
    print("\nRISK SUMMARY:")
    if severe_days > 0:
        print(f"  {COLORS[3]}⚠ SEVERE HEATWAVE expected for {severe_days} days{RESET}")
    if heatwave_days > 0:
        print(f"  {COLORS[2]}⚠ HEATWAVE expected for {heatwave_days} days{RESET}")
    if watch_days > 0:
        print(f"  {COLORS[1]}⚠ Heat Watch for {watch_days} days{RESET}")
    if severe_days == 0 and heatwave_days == 0 and watch_days == 0:
        print(f"  {COLORS[0]}✓ Normal temperatures expected{RESET}")
        
    print("\nDAILY BREAKDOWN:")
    print("-" * 90)
    print(f"{'Date':<12} {'Day':<10} {'MaxTemp':<8} {'Humidity':<8} {'HeatIdx':<8} {'Status'}")
    print("-" * 90)
    
    for _, row in df.iterrows():
        date_str = row['Date'].strftime('%Y-%m-%d')
        day_str = row['Date'].strftime('%A')
        temp = f"{row['MaxTemp']:.1f}°C"
        hum = f"{row['Humidity']:.0f}%"
        hi = f"{row['HeatIndex']:.1f}°C"
        
        sev = row['Severity']
        status = SEVERITY_MAP[sev]
        color = COLORS[sev]
        
        print(f"{date_str:<12} {day_str:<10} {temp:<8} {hum:<8} {hi:<8} {color}{status}{RESET}")
        
    print("-" * 90)

def main():
    forecaster = HeatwaveForecaster()
    
    print("\nHEATWAVE PREDICTION SYSTEM (Advanced)")
    print("1. Predict Specific Date")
    print("2. Predict Specific Week")
    print("3. Predict Month")
    
    choice = input("\nChoice (1-3): ").strip()
    
    if choice == '1':
        date_str = input("Enter date (YYYY-MM-DD): ").strip()
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            df = forecaster.predict_period(date, date)
            print_forecast(df)
        except ValueError:
            print("Invalid date format")
            
    elif choice == '2':
        year = int(input("Enter Year: "))
        week = int(input("Enter Week (1-52): "))
        start = datetime.fromisocalendar(year, week, 1)
        end = datetime.fromisocalendar(year, week, 7)
        df = forecaster.predict_period(start, end)
        print_forecast(df)
        
    elif choice == '3':
        year = int(input("Enter Year: "))
        month = int(input("Enter Month (1-12): "))
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        start = datetime(year, month, 1)
        end = datetime(year, month, last_day)
        df = forecaster.predict_period(start, end)
        print_forecast(df)

if __name__ == "__main__":
    main()
