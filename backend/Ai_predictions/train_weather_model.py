import pandas as pd
import numpy as np
from xgboost import XGBRegressor
import joblib
import json

def create_lag_features(df, target_cols, lags=[1, 2, 3, 7, 14, 30]):
    df_lagged = df.copy()
    for col in target_cols:
        for lag in lags:
            df_lagged[f'{col}_lag_{lag}'] = df_lagged[col].shift(lag)
    
    # Add date features
    df_lagged['Month'] = df_lagged['Date'].dt.month
    df_lagged['DayOfYear'] = df_lagged['Date'].dt.dayofyear
    df_lagged['Week'] = df_lagged['Date'].dt.isocalendar().week.astype(int)
    
    return df_lagged.dropna()

def train_models():
    print("Loading final_weather.csv...")
    df = pd.read_csv("final_weather.csv")
    df['Date'] = pd.to_datetime(df['Date'])
    
    targets = ['Rainfall', 'MaxTemp', 'MinTemp', 'Evapotranspiration']
    
    # Create features
    print("Creating lag features...")
    # We need to lag ALL columns that are time-dependent
    all_weather_cols = ['Rainfall', 'MaxTemp', 'MinTemp', 'Evapotranspiration', 
                        'sunshine_duration', 'precipitation_probability_max', 'wind_speed_10m_max']
    
    # Ensure all cols exist
    available_cols = [c for c in all_weather_cols if c in df.columns]
    
    df_train = create_lag_features(df, available_cols)
    
    # Features should ONLY be the lagged columns and date features
    # We must exclude the original columns (targets and other contemporaneous vars)
    feature_cols = [c for c in df_train.columns if '_lag_' in c or c in ['Month', 'DayOfYear', 'Week']]
    print(f"Training with {len(feature_cols)} features...")
    
    models = {}
    
    for target in targets:
        print(f"Training model for {target}...")
        X = df_train[feature_cols]
        y = df_train[target]
        
        model = XGBRegressor(n_estimators=500, learning_rate=0.05, n_jobs=-1, random_state=42)
        model.fit(X, y)
        models[target] = model
        
        # Evaluate (simple)
        score = model.score(X, y)
        print(f"  R2 Score: {score:.4f}")
        
    # Save models
    print("Saving models...")
    joblib.dump(models, "weather_models.pkl")
    
    # Save feature list for inference
    with open("model_features.json", "w") as f:
        json.dump(feature_cols, f)
        
    print("Done.")

if __name__ == "__main__":
    train_models()
