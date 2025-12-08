"""
Drought Prediction for Any Time Period (Past or Future)
Predicts drought severity for specific weeks or months
Uses improved multi-dataset model
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import json
import warnings
import os
import sys

warnings.filterwarnings('ignore')

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from forecast_future_weather import HistoricalWeatherForecaster

print("Loading drought prediction model...")

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "drought_model.pkl")
SCALER_FILE = os.path.join(BASE_DIR, "drought_scaler.pkl")
FEATURES_FILE = os.path.join(BASE_DIR, "drought_features.json")
WEATHER_DB_FILE = os.path.join(BASE_DIR, "final_weather.csv")
MONTHLY_RAIN_FILE = os.path.join(BASE_DIR, "delhi-monthly-rains.csv")

# Load model
try:
    drought_model = joblib.load(MODEL_FILE)
    drought_scaler = joblib.load(SCALER_FILE)
    with open(FEATURES_FILE, 'r') as f:
        drought_features = json.load(f)
    print(f"[OK] Loaded model with {len(drought_features)} features")
except Exception as e:
    print(f"Error loading drought model: {e}")
    sys.exit(1)

# Load historical data
try:
    weather_db = pd.read_csv(WEATHER_DB_FILE)
    weather_db['Date'] = pd.to_datetime(weather_db['Date'])
    weather_db = weather_db.sort_values('Date').reset_index(drop=True)
    
    DATA_START = weather_db['Date'].min()
    DATA_END = weather_db['Date'].max()
    
    # Load historical rainfall averages
    monthly_rain = pd.read_csv(MONTHLY_RAIN_FILE)
    months_list = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
    historical_rain_avg = {}
    for i, month_name in enumerate(months_list, 1):
        if month_name in monthly_rain.columns:
            historical_rain_avg[i] = monthly_rain[month_name].mean()
        else:
            historical_rain_avg[i] = 50.0
            
    # Initialize forecaster
    forecaster = HistoricalWeatherForecaster()
except Exception as e:
    print(f"Error loading data: {e}")
    sys.exit(1)

print(f"[OK] Loaded historical data: {len(weather_db)} days ({DATA_START.date()} to {DATA_END.date()})")
print(f"[OK] Future forecasting ready")

SEVERITY_NAMES = ['None', 'Mild', 'Moderate', 'Severe']

def prepare_drought_features(df):
    """Prepare comprehensive drought features matching trained model"""
    df = df.copy()
    
    # Basic time features
    df['Month'] = df['Date'].dt.month
    df['Week'] = df['Date'].dt.isocalendar().week
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['PreMonsoon'] = df['Month'].isin([3, 4, 5]).astype(int)
    df['Winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    
    df['HistoricalRainAvg'] = df['Month'].map(historical_rain_avg)
    
    # Rainfall features
    df['Rain_3d'] = df['Rainfall'].rolling(3, min_periods=1).sum()
    df['Rain_7d'] = df['Rainfall'].rolling(7, min_periods=1).sum()
    df['Rain_14d'] = df['Rainfall'].rolling(14, min_periods=1).sum()
    df['Rain_30d'] = df['Rainfall'].rolling(30, min_periods=1).sum()
    df['Rain_60d'] = df['Rainfall'].rolling(60, min_periods=1).sum()
    df['Rain_90d'] = df['Rainfall'].rolling(90, min_periods=1).sum()
    
    # Consecutive dry days
    streaks = []
    current_streak = 0
    for rainfall in df['Rainfall']:
        if rainfall < 2.5:
            current_streak += 1
        else:
            current_streak = 0
        streaks.append(current_streak)
    df['DryDays'] = streaks
    
    # Days since rain
    days_since = []
    days_count = 0
    for rainfall in df['Rainfall']:
        if rainfall >= 10:
            days_count = 0
        else:
            days_count += 1
        days_since.append(days_count)
    df['DaysSinceRain'] = days_since
    
    # Rainfall deficit
    df['RainDeficit'] = df['HistoricalRainAvg'] - (df['Rain_30d'] / 30)
    df['RainDeficit_Pct'] = ((df['HistoricalRainAvg'] - (df['Rain_30d'] / 30)) / (df['HistoricalRainAvg'] + 0.1)) * 100
    
    # Temperature features
    if 'MaxTemp' not in df.columns:
        df['MaxTemp'] = 35.0
    if 'MinTemp' not in df.columns:
        df['MinTemp'] = 20.0
    
    df['AvgTemp'] = (df['MaxTemp'] + df['MinTemp']) / 2
    df['TempRange'] = df['MaxTemp'] - df['MinTemp']
    
    df['Temp_7d_avg'] = df['AvgTemp'].rolling(7, min_periods=1).mean()
    df['Temp_14d_avg'] = df['AvgTemp'].rolling(14, min_periods=1).mean()
    df['Temp_30d_avg'] = df['AvgTemp'].rolling(30, min_periods=1).mean()
    
    heat_days = (df['MaxTemp'] > 42).astype(int)
    df['HeatWave_Days'] = heat_days.rolling(15, min_periods=1).sum()
    df['HighTemp_Days_30d'] = (df['MaxTemp'] > 40).astype(int).rolling(30, min_periods=1).sum()
    df['TempStress_Index'] = df['HeatWave_Days'] * (df['AvgTemp'] / 35.0)
    
    # Evapotranspiration
    if 'Evapotranspiration' in df.columns:
        df['Evap_7d'] = df['Evapotranspiration'].rolling(7, min_periods=1).mean()
        df['Evap_14d'] = df['Evapotranspiration'].rolling(14, min_periods=1).mean()
        df['Evap_30d'] = df['Evapotranspiration'].rolling(30, min_periods=1).mean()
    else:
        df['Evap_7d'] = df['TempRange'] * 0.4
        df['Evap_14d'] = df['Evap_7d']
        df['Evap_30d'] = df['Evap_7d']
    
    df['PEI'] = df['Rain_30d'] / (df['Evap_30d'] * 30 + 0.1)
    df['WaterBalance'] = df['Rain_30d'] - (df['Evap_30d'] * 30)
    df['WaterBalance_60d'] = df['Rain_60d'] - (df['Evap_30d'] * 60)
    
    # Soil moisture
    has_real_sm = 'SoilMoisture_Actual' in df.columns and not df['SoilMoisture_Actual'].isna().all()
    
    if has_real_sm:
        df['SoilMoisture_Actual'] = df['SoilMoisture_Actual'].fillna(method='ffill').fillna(method='bfill')
        df['SoilMoisture'] = df['SoilMoisture_Actual']
    else:
        sm = [20.0]
        for i in range(1, len(df)):
            prev = sm[-1]
            rain = df.iloc[i]['Rainfall']
            evap = df.iloc[i]['Evap_7d']
            change = (rain * 0.8) - (evap * 0.3)
            new_sm = np.clip(prev + change, 5.0, 50.0)
            sm.append(new_sm)
        df['SoilMoisture'] = sm
    
    df['SM_7d'] = df['SoilMoisture'].rolling(7, min_periods=1).mean()
    df['SM_14d'] = df['SoilMoisture'].rolling(14, min_periods=1).mean()
    df['SM_30d'] = df['SoilMoisture'].rolling(30, min_periods=1).mean()
    df['SM_Trend'] = df['SoilMoisture'].diff(periods=7).fillna(0)
    
    seasonal_sm_avg = df.groupby('Month')['SoilMoisture'].transform('mean')
    df['SM_Deficit'] = seasonal_sm_avg - df['SoilMoisture']
    
    # Interaction features
    df['Rain_to_SM_Ratio'] = df['Rain_30d'] / (df['SM_30d'] + 1)
    df['Evap_Potential'] = df['TempRange'] * df['Temp_30d_avg'] / 500
    df['Moisture_Stress_Index'] = (df['RainDeficit_Pct'] * df['TempStress_Index']) / (df['SoilMoisture'] + 1)
    df['Drought_Risk_Score'] = (
        (df['DryDays'] / 30.0) * 0.3 +
        (df['RainDeficit_Pct'] / 100.0) * 0.3 +
        ((50 - df['SoilMoisture']) / 50.0) * 0.2 +
        (df['TempStress_Index'] / 10.0) * 0.2
    )
    
    # Groundwater
    if 'GW_Extraction_Rate' not in df.columns:
        df['GW_Extraction_Rate'] = 100.0
    df['GW_Stress'] = df['GW_Extraction_Rate'] / 100.0
    
    df = df.fillna(method='bfill').fillna(method='ffill').fillna(0)
    
    return df

def predict_date_range(start_date, end_date, scenario='realistic', is_future=False):
    """Predict drought severity for a date range"""
    if is_future or start_date > DATA_END:
        print(f"  ℹ Using weather forecasting (scenario: {scenario})")
        
        # Generate forecasted weather
        forecasted_data = []
        current_date = start_date
        
        while current_date <= end_date:
            week_num = current_date.isocalendar()[1]
            year = current_date.year
            
            week_forecast = forecaster.forecast_week(year, week_num, scenario)
            week_forecast = week_forecast[
                (week_forecast['Date'] >= current_date) &
                (week_forecast['Date'] <= end_date)
            ]
            
            forecasted_data.append(week_forecast)
            current_date += timedelta(days=7)
        
        period_data = pd.concat(forecasted_data, ignore_index=True)
    else:
        # Use historical data
        mask = (weather_db['Date'] >= start_date) & (weather_db['Date'] <= end_date)
        period_data = weather_db[mask].copy()
        
        if len(period_data) == 0:
            print(f"⚠ No data available")
            return None
    
    # Prepare features
    period_data = prepare_drought_features(period_data)
    
    # Extract features (only those model was trained on)
    X = period_data[drought_features].values
    X_scaled = drought_scaler.transform(X)
    
    # Predict
    predictions = drought_model.predict(X_scaled)
    probabilities = drought_model.predict_proba(X_scaled)
    
    period_data['DroughtSeverity'] = predictions
    period_data['DroughtProb'] = probabilities.max(axis=1) * 100
    
    return period_data

def predict_drought_week(year, week_number, scenario='realistic'):
    """Predict drought for a specific week"""
    print(f"\n{'='*80}")
    print(f"   DROUGHT PREDICTION FOR WEEK {week_number}, {year}")
    print(f"{'='*80}\n")
    
    start_date = datetime.fromisocalendar(year, week_number, 1)
    end_date = datetime.fromisocalendar(year, week_number, 7)
    
    is_future = start_date > DATA_END
    
    if is_future:
        print(f"📅 Future forecast ({scenario} scenario)")
    else:
        print(f"📊 Historical analysis")
    
    results = predict_date_range(start_date, end_date, scenario, is_future)
    
    if results is None:
        return
    
    # Get day of week information
    start_day = start_date.strftime('%A')
    end_day = end_date.strftime('%A')
    
    print(f"\nPeriod: {start_date.date()} to {end_date.date()}")
    print(f"Days: {start_day} - {end_day}\n")
    
    # Aggregate drought severity
    avg_severity = results['DroughtSeverity'].mean()
    max_severity = results['DroughtSeverity'].max()
    drought_days = (results['DroughtSeverity'] > 0).sum()
    
    overall_severity = int(round(avg_severity))
    overall_name = SEVERITY_NAMES[overall_severity] if overall_severity < len(SEVERITY_NAMES) else 'Extreme'
    
    print(f"SUMMARY:")
    print(f"  - Overall Severity: {overall_name}")
    print(f"  - Average Severity Index: {avg_severity:.2f}")
    print(f"  - Maximum Severity: {SEVERITY_NAMES[int(max_severity)]}")
    print(f"  - Days with Drought: {drought_days} out of 7\n")
    
    # Daily breakdown
    print("DAILY FORECAST (by Day of Week):")
    print("-" * 90)
    print(f"{'Date':<12} {'Day of Week':<15} {'Rainfall':<12} {'Dry Days':<12} {'Severity'}")
    print("-" * 90)
    
    for _, row in results.iterrows():
        date_str = row['Date'].strftime('%Y-%m-%d')
        day_str = row['Date'].strftime('%A')
        rainfall = row['Rainfall']
        dry_days = int(row['DryDays'])
        severity_idx = int(row['DroughtSeverity'])
        severity_name = SEVERITY_NAMES[severity_idx] if severity_idx < len(SEVERITY_NAMES) else 'Extreme'
        
        print(f"{date_str:<12} {day_str:<15} {rainfall:>6.1f} mm   {dry_days:>4d} days   {severity_name}")
    
    # Drought indicators
    print(f"\nDROUGHT INDICATORS:")
    print(f"  - Total Rainfall: {results['Rainfall'].sum():.1f} mm")
    print(f"  - 7-day Cumulative: {results['Rain_7d'].iloc[-1]:.1f} mm")
    print(f"  - Consecutive Dry Days: {results['DryDays'].max()}")
    print(f"  - Days Since Rain (>10mm): {results['DaysSinceRain'].iloc[-1]}")
    print(f"  - Soil Moisture: {results['SoilMoisture'].mean():.1f}%")
    print(f"  - Water Balance: {results['WaterBalance'].iloc[-1]:.1f} mm")
    
    if overall_severity >= 2:
        print(f"\n⚠ DROUGHT ALERT: {overall_name} drought conditions expected")
        print(f"   Recommendations:")
        print(f"   - Conserve water resources")
        print(f"   - Monitor soil moisture")
        print(f"   - Plan irrigation accordingly")
    elif overall_severity >= 1:
        print(f"\n💡 WATCH: Mild drought conditions")
    else:
        print(f"\n✓ NORMAL: No drought expected")
    
    if is_future:
        print(f"\n💡 Forecast based on historical patterns ({scenario} scenario)")
    
    print("\n" + "="*80)

def predict_drought_month(year, month, scenario='realistic'):
    """Predict drought for a specific month"""
    month_name = datetime(year, month, 1).strftime('%B')
    
    print(f"\n{'='*80}")
    print(f"   DROUGHT PREDICTION FOR {month_name.upper()} {year}")
    print(f"{'='*80}\n")
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year, month, 31)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    is_future = start_date > DATA_END
    
    if is_future:
        print(f"📅 Future forecast ({scenario} scenario)")
    else:
        print(f"📊 Historical analysis")
    
    results = predict_date_range(start_date, end_date, scenario, is_future)
    
    if results is None:
        return
    
    # Get day of week information
    start_day = start_date.strftime('%A')
    end_day = end_date.strftime('%A')
    
    print(f"\nPeriod: {start_date.date()} to {end_date.date()}")
    print(f"Days: {start_day} - {end_day} ({len(results)} days)\n")
    
    # Summary
    avg_severity = results['DroughtSeverity'].mean()
    max_severity = results['DroughtSeverity'].max()
    drought_days = (results['DroughtSeverity'] > 0).sum()
    
    overall_severity = int(round(avg_severity))
    overall_name = SEVERITY_NAMES[overall_severity] if overall_severity < len(SEVERITY_NAMES) else 'Extreme'
    
    print(f"SUMMARY:")
    print(f"  - Overall Severity: {overall_name}")
    print(f"  - Drought Days: {drought_days} out of {len(results)}")
    print(f"  - Total Rainfall: {results['Rainfall'].sum():.1f} mm")
    print(f"  - Maximum Dry Streak: {results['DryDays'].max()} days\n")
    
    # Weekly breakdown
    results['Week'] = results['Date'].dt.isocalendar().week
    weekly = results.groupby('Week').agg({
        'DroughtSeverity': 'mean',
        'Rainfall': 'sum',
        'Date': ['min', 'max']
    }).reset_index()
    
    print("WEEKLY BREAKDOWN:")
    print("-" * 95)
    for _, row in weekly.iterrows():
        week_num = int(row['Week'])
        week_start_date = row['Date']['min']
        week_end_date = row['Date']['max']
        start = week_start_date.strftime('%b %d')
        end = week_end_date.strftime('%b %d')
        start_day = week_start_date.strftime('%a')
        end_day = week_end_date.strftime('%a')
        total_rain = row['Rainfall']['sum']
        avg_sev = row['DroughtSeverity']['mean']
        sev_idx = int(round(avg_sev))
        sev_name = SEVERITY_NAMES[sev_idx] if sev_idx < len(SEVERITY_NAMES) else 'Extreme'
        
        print(f"  Week {week_num}: {start}({start_day})-{end}({end_day})  Rain:{total_rain:6.1f}mm  Severity:{sev_name}")
    
    print(f"\nDROUGHT RISK:")
    if overall_severity >= 2:
        print(f"  ⚠ {overall_name.upper()} drought expected - take action")
    elif overall_severity >= 1:
        print(f"  💡 Mild drought possible - monitor conditions")
    else:
        print(f"  ✓ Normal conditions expected")
    
    print("="*80)


# Interactive mode
if __name__ == "__main__":
    import sys
    
    print("\n" + "="*80)
    print("   DROUGHT PREDICTION - PAST & FUTURE")
    print("="*80)
    
    # Check for command-line arguments
    if len(sys.argv) > 1:
        # CLI mode: python drought_prediction.py 2027-02-04
        try:
            date_str = sys.argv[1]
            scenario = sys.argv[2] if len(sys.argv) > 2 else 'realistic'
            
            # Parse date
            test_date = datetime.strptime(date_str, "%Y-%m-%d")
            year, month, day = test_date.year, test_date.month, test_date.day
            
            # Determine if it's in the future
            if test_date > DATA_END:
                print(f"\n[FUTURE] Predicting for date: {test_date.date()}")
                print(f"         Using scenario: {scenario}")
            else:
                print(f"\n[PAST] Predicting for date: {test_date.date()}")
                scenario = 'realistic'
            
            # Predict for the specific month
            predict_drought_month(year, month, scenario)
            
        except Exception as e:
            print(f"Error: {e}")
            print("Usage: python drought_prediction.py YYYY-MM-DD [scenario]")
            print("Example: python drought_prediction.py 2027-02-04 realistic")
    else:
        # Interactive mode
        while True:
            print("\nOptions: 1=Week, 2=Month, 3=Exit")
            choice = input("Choice: ").strip()
            
            if choice == '1':
                year = int(input("Year: "))
                week = int(input("Week (1-52): "))
                test_date = datetime.fromisocalendar(year, week, 1)
                scenario = input("Scenario (optimistic/realistic/pessimistic) [realistic]: ").strip() or 'realistic' if test_date > DATA_END else 'realistic'
                predict_drought_week(year, week, scenario)
            
            elif choice == '2':
                year = int(input("Year: "))
                month = int(input("Month (1-12): "))
                test_date = datetime(year, month, 1)
                scenario = input("Scenario (optimistic/realistic/pessimistic) [realistic]: ").strip() or 'realistic' if test_date > DATA_END else 'realistic'
                predict_drought_month(year, month, scenario)
            
            elif choice == '3':
                break

