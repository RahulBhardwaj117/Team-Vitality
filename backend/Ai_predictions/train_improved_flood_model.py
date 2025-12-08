"""
Improved Flood Risk Model Training (Advanced)
Integrates Weather Data + NASA Soil Moisture
Target: Identifies weather patterns similar to known flood years (2010, 2013, 2023)
Features: Advanced Hyperparameter Tuning, Extended Features, 10-Fold CV
"""

import pandas as pd
import numpy as np
import joblib
import json
import warnings
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, f1_score
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# --- Configuration ---
WEATHER_FILE = "weatherdata.csv"
SOIL_FILE = "soil moisture.csv"
MODEL_FILE = "flood_xgboost_improved.pkl"
SCALER_FILE = "flood_scaler.pkl"
FEATURES_FILE = "flood_features.json"

# Known Flood Years in Delhi (during our data period 2021-2023)
# 2023: Severe flood
FLOOD_YEARS = [2023]

def load_data():
    print("Loading datasets...")
    
    # 1. Load Weather Data (Rich but no rain)
    weather_rich = pd.read_csv(WEATHER_FILE)
    weather_rich['DateStr'] = weather_rich['Year'].astype(str) + '-' + weather_rich['Month'].astype(str) + '-' + weather_rich['Date'].astype(str)
    weather_rich['Date'] = pd.to_datetime(weather_rich['DateStr'])
    weather_rich.columns = weather_rich.columns.str.strip()
    
    # Rename columns in rich data
    weather_rich = weather_rich.rename(columns={
        'Max Temperature': 'MaxTemp',
        'Min Temperature': 'MinTemp',
        'Avg Temperature': 'AvgTemp',
        'Avg Humidity': 'Humidity',
        'Max Wind Speed': 'WindSpeed'
    })
    
    # Convert Units for Rich Data (F -> C)
    for col in ['MaxTemp', 'MinTemp', 'AvgTemp']:
        if col in weather_rich.columns:
            weather_rich[col] = (weather_rich[col] - 32) * 5/9

    # 2. Load Rainfall Data (final_weather.csv - has rain, 2021-2023)
    weather_rain = pd.read_csv("final_weather.csv")
    weather_rain['Date'] = pd.to_datetime(weather_rain['Date'])
    
    # Merge: Keep rows where we have Rainfall data
    weather = weather_rain.merge(weather_rich[['Date', 'Humidity', 'WindSpeed', 'MaxTemp', 'MinTemp', 'AvgTemp']], 
                                 on='Date', how='left', suffixes=('_rain', ''))
    
    # Fill missing rich data
    weather['MaxTemp'] = weather['MaxTemp'].fillna(weather['MaxTemp_rain'])
    weather['MinTemp'] = weather['MinTemp'].fillna(weather['MinTemp_rain'])
    weather['AvgTemp'] = weather['AvgTemp'].fillna((weather['MaxTemp'] + weather['MinTemp']) / 2)
    weather['Humidity'] = weather['Humidity'].fillna(60.0)
    
    if 'Rainfall' not in weather.columns:
        print("Error: Rainfall column missing after merge!")
        return None, None
        
    # Extract Year/Month/DayOfYear
    weather['Year'] = weather['Date'].dt.year
    weather['Month'] = weather['Date'].dt.month
    weather['DayOfYear'] = weather['Date'].dt.dayofyear
    
    # PATCH: Fix missing rainfall for July 2023 Flood
    mask_jul8 = (weather['Date'] == '2023-07-08')
    mask_jul9 = (weather['Date'] == '2023-07-09')
    mask_jul10 = (weather['Date'] == '2023-07-10')
    
    weather.loc[mask_jul8, 'Rainfall'] = 126.0
    weather.loc[mask_jul9, 'Rainfall'] = 153.0
    weather.loc[mask_jul10, 'Rainfall'] = 50.0
    
    print(f"✓ Merged Weather Data: {len(weather)} rows (2021-2023)")
    
    # 3. Soil Moisture (NASA GWETROOT)
    soil_rows = []
    soil_file_path = "soil_level.csv" 
    
    try:
        with open(soil_file_path, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Warning: {soil_file_path} not found, trying 'soil moisture.csv'")
        with open("soil moisture.csv", 'r') as f:
            lines = f.readlines()
        
    start_idx = 0
    for i, line in enumerate(lines):
        if "PARAMETER,YEAR" in line:
            start_idx = i
            break
            
    for i in range(start_idx + 1, len(lines)):
        line = lines[i].strip()
        if not line: continue
        parts = line.split(',')
        if len(parts) < 16: continue
        try:
            year = int(parts[1])
            lat = float(parts[2])
            lon = float(parts[3])
            if 28.0 <= lat <= 29.0 and 76.5 <= lon <= 77.5:
                vals = []
                for x in parts[4:16]:
                    try:
                        vals.append(float(x))
                    except ValueError:
                        vals.append(0.0)
                for month_idx, val in enumerate(vals):
                    soil_rows.append({'Year': year, 'Month': month_idx + 1, 'SoilMoisture': val})
        except ValueError:
            continue
                
    soil_df = pd.DataFrame(soil_rows)
    soil_monthly = soil_df.groupby(['Year', 'Month'])['SoilMoisture'].mean().reset_index()
    
    print(f"✓ Loaded Soil Moisture: {len(soil_monthly)} months")
    return weather, soil_monthly

def feature_engineering(weather, soil_monthly):
    print("Engineering features...")
    
    # Merge Soil Moisture
    df = weather.merge(soil_monthly, on=['Year', 'Month'], how='left')
    df['SoilMoisture'] = df['SoilMoisture'].fillna(method='ffill').fillna(0.2)
    
    # Sort
    df = df.sort_values('Date')
    
    # Rolling Stats (3d, 7d, 15d, 30d)
    df['Rain_3d'] = df['Rainfall'].rolling(window=3, min_periods=1).sum()
    df['Rain_7d'] = df['Rainfall'].rolling(window=7, min_periods=1).sum()
    df['Rain_15d'] = df['Rainfall'].rolling(window=15, min_periods=1).sum()
    df['Rain_30d'] = df['Rainfall'].rolling(window=30, min_periods=1).sum()
    
    # Lag Features
    df['Rain_Lag1'] = df['Rainfall'].shift(1)
    df['Rain_Lag2'] = df['Rainfall'].shift(2)
    df['Rain_Lag3'] = df['Rainfall'].shift(3)
    df['Rain_Lag7'] = df['Rainfall'].shift(7)
    
    # Rainfall Anomaly (vs 30-day mean)
    df['Rain_30d_Mean'] = df['Rainfall'].rolling(window=30, min_periods=1).mean()
    df['Rain_Anomaly'] = df['Rainfall'] - df['Rain_30d_Mean']
    
    # Temperature Context
    df['MaxTemp_RollingMean'] = df['MaxTemp'].rolling(window=7, min_periods=1).mean()
    df['MaxTemp_RollingStd'] = df['MaxTemp'].rolling(window=7, min_periods=1).std().fillna(0)
    
    # Humidity-Temperature Interaction
    df['Humidity_Temp_Interaction'] = df['Humidity'] * df['MaxTemp'] / 100.0
    
    # Seasonal Indicators
    df['Is_Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
    df['Is_Winter'] = df['Month'].isin([12, 1, 2]).astype(int)
    
    # Extreme Weather Flags
    df['Extreme_Hot'] = (df['MaxTemp'] > 40).astype(int)
    df['Extreme_Cold'] = (df['MaxTemp'] < 10).astype(int)
    
    # Consecutive Dry Days
    df['Is_Dry'] = (df['Rainfall'] < 0.1).astype(int)
    df['Consecutive_Dry'] = df.groupby((df['Is_Dry'] != df['Is_Dry'].shift()).cumsum())['Is_Dry'].cumsum()
    df['Consecutive_Dry'] = df['Consecutive_Dry'] * df['Is_Dry']
    
    # Cyclical Date Features
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    
    # Soil-Rain Interaction
    df['Soil_Rain_Interaction'] = df['SoilMoisture'] * df['Rain_7d']
    
    # Target Definition
    def define_target(row):
        if row['Year'] in FLOOD_YEARS and row['Month'] in [6, 7, 8, 9]:
            if row['Rain_7d'] > 50 or row['Rain_15d'] > 100:
                return 1
            return 0
        return 0
        
    df['Flood_Risk'] = df.apply(define_target, axis=1)
    
    # Drop NaNs
    df = df.dropna()
    return df

def train_model(df):
    features = [
        'Rainfall', 'Rain_3d', 'Rain_7d', 'Rain_15d', 'Rain_30d',
        'SoilMoisture', 'Soil_Rain_Interaction',
        'Rain_Anomaly', 
        'Rain_Lag1', 'Rain_Lag2', 'Rain_Lag3', 'Rain_Lag7',
        'Day_Sin', 'Day_Cos',
        'MaxTemp_RollingMean', 'MaxTemp_RollingStd',
        'Humidity_Temp_Interaction',
        'Is_Monsoon', 'Is_Winter',
        'Extreme_Hot', 'Extreme_Cold',
        'Consecutive_Dry'
    ]
    
    X = df[features]
    y = df['Flood_Risk']
    
    print(f"\nTotal Features: {len(features)}")
    
    # Save features list
    with open(FEATURES_FILE, 'w') as f:
        json.dump(features, f)
        
    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    scaler.feature_names_in_ = features
    joblib.dump(scaler, SCALER_FILE)
    print(f"✓ Scaler saved to {SCALER_FILE}")
    
    # Advanced Hyperparameter Tuning
    print("\n" + "="*60)
    print("ADVANCED HYPERPARAMETER TUNING (XGBoost)")
    print("="*60)
    scale_pos_weight = (len(y) - y.sum()) / y.sum()
    print(f"Scale Pos Weight: {scale_pos_weight:.2f}")
    
    param_grid = {
        'n_estimators': [100, 200, 300, 500],
        'max_depth': [4, 6, 8, 10],
        'learning_rate': [0.01, 0.05, 0.1, 0.15],
        'subsample': [0.7, 0.8, 0.9, 1.0],
        'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
        'min_child_weight': [1, 3, 5],
        'gamma': [0, 0.1, 0.3, 0.5],
        'reg_alpha': [0, 0.01, 0.1, 1],
        'reg_lambda': [1, 1.5, 2, 3],
        'scale_pos_weight': [scale_pos_weight, scale_pos_weight * 1.2]
    }
    
    xgb = XGBClassifier(objective='binary:logistic', n_jobs=-1, random_state=42, eval_metric='logloss')
    
    # Stratified 10-Fold CV
    cv_strategy = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
    
    search = RandomizedSearchCV(
        xgb, param_grid, n_iter=50, cv=cv_strategy, scoring='f1', 
        verbose=2, random_state=42, n_jobs=-1
    )
    
    print("\nStarting search with 50 iterations and 10-fold CV...")
    search.fit(X_scaled, y)
    
    best_model = search.best_estimator_
    print(f"\n{'='*60}")
    print(f"BEST PARAMETERS:")
    print(f"{'='*60}")
    for param, value in search.best_params_.items():
        print(f"  {param}: {value}")
    print(f"\nBest CV F1 Score: {search.best_score_:.4f}")
    print(f"{'='*60}")
    
    # Save Model
    joblib.dump(best_model, MODEL_FILE)
    print(f"\n✓ Model saved to {MODEL_FILE}")
    
    # Feature Importance
    imp = pd.DataFrame({'Feature': features, 'Importance': best_model.feature_importances_})
    imp = imp.sort_values('Importance', ascending=False)
    print("\n" + "="*60)
    print("TOP 10 MOST IMPORTANT FEATURES")
    print("="*60)
    for idx, row in imp.head(10).iterrows():
        print(f"  {row['Feature']:30} {row['Importance']:.4f}")
    
    # Confusion Matrix
    y_pred = best_model.predict(X_scaled)
    cm = confusion_matrix(y, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Flood Risk Confusion Matrix (Enhanced)')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('flood_confusion_matrix_improved.png')
    print("\n✓ Confusion matrix saved to flood_confusion_matrix_improved.png")
    
    # Classification Report
    print("\n" + "="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(classification_report(y, y_pred, target_names=['No Flood', 'Flood Risk']))

if __name__ == "__main__":
    weather, soil = load_data()
    df = feature_engineering(weather, soil)
    print(f"\nDataset size: {len(df)}")
    print(f"Flood Risk Days: {df['Flood_Risk'].sum()}")
    
    if df['Flood_Risk'].sum() < 10:
        print("WARNING: Too few flood risk days found.")
    
    train_model(df)
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
