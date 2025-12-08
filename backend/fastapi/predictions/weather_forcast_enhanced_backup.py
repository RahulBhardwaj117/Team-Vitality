"""
Enhanced Weather Forecast Module with 7-Day Prediction
Provides accurate daily weather forecasts and weekly forecasts
"""

import pandas as pd
import numpy as np
import joblib
import os
import warnings
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, accuracy_score, r2_score, classification_report
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor, XGBClassifier

warnings.filterwarnings('ignore')

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "../data/delhi_weather.csv")
MODEL_DIR = os.path.join(SCRIPT_DIR, "weather_models_xgb")
NORMALS_FILE = os.path.join(MODEL_DIR, "daily_normals.csv")
SCALER_FILE = os.path.join(MODEL_DIR, "weather_scaler.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

MODELS = {
    'MaxTemp': 'xgb_max_temp.pkl',
    'MinTemp': 'xgb_min_temp.pkl',
    'Humidity': 'xgb_humidity.pkl',
    'RainProb': 'xgb_rain_prob.pkl',
    'RainAmount': 'xgb_rain_amount.pkl'
}

CONDITION_MAP = {
    (0, 10, 0): "☀️ Clear/Sunny",
    (0, 10, 1): "🌤️ Partly Cloudy",
    (10, 30, 0): "☁️ Cloudy",
    (10, 30, 1): "🌦️ Light Rain",
    (30, 50, 0): "⛅ Mostly Cloudy",
    (30, 50, 1): "🌧️ Rain",
    (50, 100, 1): "⛈️ Heavy Rain/Thunderstorm"
}

def load_and_prep_data():
    """Loads and preprocesses the weather data."""
    print(f"Loading data from {DATA_FILE}...")
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"{DATA_FILE} not found!")
        
    df = pd.read_csv(DATA_FILE)
    
    # Parse Date
    df['FullDate'] = pd.to_datetime(df['DATE'], format='%m/%d/%Y', errors='coerce')
    if df['FullDate'].isnull().any():
        df['FullDate'] = df['FullDate'].fillna(pd.to_datetime(df['DATE'], errors='coerce'))
    df = df.dropna(subset=['FullDate'])
    
    # Rename columns
    df = df.rename(columns={
        'tempmax': 'Max Temperature',
        'tempmin': 'Min Temperature',
        'humidity': 'Avg Humidity',
        'precip': 'Total Precipitation'
    })

    # Basic Features
    df['DayOfYear'] = df['FullDate'].dt.dayofyear
    df['Year'] = df['FullDate'].dt.year
    df['Month'] = df['FullDate'].dt.month
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    
    # Target variables
    df['Rain_Binary'] = (df['Total Precipitation'] > 0.1).astype(int)
    
    return df

def calculate_and_save_normals(df):
    """Calculates daily normals (climatology) and saves them."""
    print("Calculating daily normals...")
    normals = df.groupby('DayOfYear').agg({
        'Max Temperature': 'mean',
        'Min Temperature': 'mean',
        'Avg Humidity': 'mean',
        'Total Precipitation': 'mean',
        'Rain_Binary': 'mean'
    }).rename(columns={
        'Max Temperature': 'Normal_MaxTemp',
        'Min Temperature': 'Normal_MinTemp',
        'Avg Humidity': 'Normal_Humidity',
        'Total Precipitation': 'Normal_RainAmount',
        'Rain_Binary': 'Normal_RainProb'
    })
    
    # Smooth the normals with a rolling window
    normals = normals.rolling(window=7, center=True, min_periods=1).mean()
    
    normals.to_csv(NORMALS_FILE)
    return normals

def train_models():
    """Trains XGBoost models with hyperparameter tuning."""
    df = load_and_prep_data()
    
    # Calculate and merge normals
    normals = calculate_and_save_normals(df)
    df = df.merge(normals, on='DayOfYear', how='left')
    
    features = ['DayOfYear', 'Year', 'Month', 'Day_Sin', 'Day_Cos', 
                'Normal_MaxTemp', 'Normal_MinTemp', 'Normal_Humidity', 'Normal_RainProb']
    
    X = df[features]
    
    targets = {
        'MaxTemp': df['Max Temperature'],
        'MinTemp': df['Min Temperature'],
        'Humidity': df['Avg Humidity'],
        'RainProb': df['Rain_Binary'],
        'RainAmount': df['Total Precipitation']
    }
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    # Save scaler with feature names to avoid warnings
    scaler.feature_names_in_ = features
    joblib.dump(scaler, SCALER_FILE)
    
    print("\nStarting Training with Hyperparameter Tuning (XGBoost)...")
    print("This may take a few minutes.\n")
    
    for name, y in targets.items():
        print(f"  Training {name}...")
        
        if name == 'RainProb':
            model = XGBClassifier(objective='binary:logistic', eval_metric='logloss', n_jobs=-1, random_state=42)
            metric_name = "Accuracy"
            scoring = 'accuracy'
        else:
            model = XGBRegressor(objective='reg:squarederror', n_jobs=-1, random_state=42)
            metric_name = "MAE"
            scoring = 'neg_mean_absolute_error'
            
        # Hyperparameter Grid
        param_grid = {
            'n_estimators': [100, 200, 300],
            'learning_rate': [0.01, 0.05, 0.1],
            'max_depth': [3, 5, 7],
            'subsample': [0.8, 0.9, 1.0],
            'colsample_bytree': [0.8, 0.9, 1.0]
        }
        
        # Randomized Search
        search = RandomizedSearchCV(
            model, param_grid, n_iter=10, cv=3, scoring=scoring, 
            verbose=0, random_state=42, n_jobs=-1
        )
        
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        search.fit(X_train, y_train)
        
        best_model = search.best_estimator_
        
        # Evaluation
        y_pred = best_model.predict(X_test)
        
        if name == 'RainProb':
            score = accuracy_score(y_test, y_pred)
            print(f"    Best Params: {search.best_params_}")
            print(f"    {metric_name}: {score*100:.2f}%")
            print(f"    Classification Report:\n{classification_report(y_test, y_pred)}")
        else:
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            accuracy = max(0, 100 - (mae / y.mean() * 100)) # Simple accuracy approximation
            print(f"    Best Params: {search.best_params_}")
            print(f"    MAE: {mae:.4f}")
            print(f"    R2 Score: {r2:.4f}")
            print(f"    Approx. Accuracy: {accuracy:.2f}%")
            
        joblib.dump(best_model, os.path.join(MODEL_DIR, MODELS[name]))
        
    print(f"\nAll models saved to {MODEL_DIR}/")

def get_weather_condition(rain_prob, humidity, has_rain):
    """Determines weather condition based on predictions."""
    for (min_hum, max_hum, rain_flag), condition in CONDITION_MAP.items():
        if min_hum <= humidity < max_hum and (has_rain == rain_flag or rain_flag == -1):
            return condition
    return "☀️ Clear" if rain_prob < 0.3 else "⛅ Partly Cloudy"

def get_weather_forecast(date_str):
    """Predicts weather for a given date using XGBoost models."""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}
    
    # Load Normals
    if not os.path.exists(NORMALS_FILE):
        return {"error": "Normals file not found. Train models first."}
    normals = pd.read_csv(NORMALS_FILE, index_col='DayOfYear')
    
    day_of_year = date_obj.timetuple().tm_yday
    
    # Get normals for this day
    try:
        day_normals = normals.loc[day_of_year]
    except KeyError:
        # Fallback if day 366 is missing or something
        day_normals = normals.iloc[0] 
        
    year = date_obj.year
    month = date_obj.month
    day_sin = np.sin(2 * np.pi * day_of_year / 365.25)
    day_cos = np.cos(2 * np.pi * day_of_year / 365.25)
    
    # Create Feature DataFrame
    features_df = pd.DataFrame([{
        'DayOfYear': day_of_year,
        'Year': year,
        'Month': month,
        'Day_Sin': day_sin,
        'Day_Cos': day_cos,
        'Normal_MaxTemp': day_normals['Normal_MaxTemp'],
        'Normal_MinTemp': day_normals['Normal_MinTemp'],
        'Normal_Humidity': day_normals['Normal_Humidity'],
        'Normal_RainProb': day_normals['Normal_RainProb']
    }])
    
    # Load scaler
    if not os.path.exists(SCALER_FILE):
        return {"error": "Model not trained. Run script to train first."}
        
    scaler = joblib.load(SCALER_FILE)
    features_scaled = scaler.transform(features_df)
    
    # Predict
    result = {}
    for name, filename in MODELS.items():
        model_path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(model_path):
            return {"error": f"Model {name} not found."}
            
        model = joblib.load(model_path)
        
        if name == 'RainProb':
            pred = model.predict_proba(features_scaled)[0][1]
            result['rain_chance'] = round(float(pred * 100), 1)
        else:
            pred = model.predict(features_scaled)[0]
            if name == 'MaxTemp':
                result['temp'] = round(float(pred), 1)
            elif name == 'MinTemp':
                result['min_temp'] = round(float(pred), 1)
            elif name == 'Humidity':
                result['humidity'] = round(float(pred), 1)
            elif name == 'RainAmount':
                result['rainfall'] = round(float(max(0, pred)), 2)
    
    # Determine condition and icon
    has_rain = 1 if result['rain_chance'] > 30 else 0
    condition_full = get_weather_condition(result['rain_chance'], result['humidity'], has_rain)
    
    # Extract icon and condition text
    if '☀️' in condition_full:
        icon = '☀️'
    elif '🌤️' in condition_full:
        icon = '🌤️'
    elif '☁️' in condition_full or '⛅' in condition_full:
        icon = '☁️'
    elif '🌦️' in condition_full:
        icon = '🌦️'
    elif '🌧️' in condition_full:
        icon = '🌧️'
    elif '⛈️' in condition_full:
        icon = '⛈️'
    else:
        icon = '☀️'
    
    result['condition'] = condition_full.replace(icon, '').strip()
    result['icon'] = icon
    result['day'] = date_obj.strftime('%A')
    result['date'] = date_str
    result['wind'] = round(8 + np.random.uniform(-3, 5), 1)  # Estimate wind (can be improved with data)
    
    return result

def get_weekly_forecast(start_date_str=None):
    """Generates 7-day weather forecast."""
    if start_date_str is None:
        start_date = datetime.now()
    else:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD."}
    
    forecasts = []
    for i in range(7):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        forecast = get_weather_forecast(date_str)
        
        if "error" in forecast:
            return forecast
            
        forecasts.append(forecast)
    
    return {"forecasts": forecasts, "status": "success"}

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        date_input = sys.argv[1]
        if date_input == "--train":
            train_models()
        elif date_input == "--weekly":
            start_date = sys.argv[2] if len(sys.argv) > 2 else None
            forecast = get_weekly_forecast(start_date)
            print(forecast)
        else:
            forecast = get_weather_forecast(date_input)
            print(forecast)
    else:
        if not os.path.exists(SCALER_FILE):
            print("Models not found. Training...")
            train_models()
        else:
            print("Usage: python weather_forcast_enhanced.py <YYYY-MM-DD> or --train or --weekly [<YYYY-MM-DD>]")
