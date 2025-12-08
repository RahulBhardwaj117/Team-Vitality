"""
Balanced Flood Risk Model Training (Multi-Factor Risk Scoring)
Addresses the 100% monsoon prediction issue by:
1. Multi-factor risk scoring instead of binary flood/no-flood
2. Balanced sampling and class weights
3. TimeSeriesSplit for proper temporal validation
4. Probability calibration for realistic risk percentages
"""

import pandas as pd
import numpy as np
import joblib
import json
import warnings
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.calibration import CalibratedClassifierCV
from imblearn.over_sampling import SMOTE
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# --- Configuration ---
WEATHER_FILE = "weatherdata.csv"
SOIL_FILE = "soil moisture.csv"
MODEL_FILE = "flood_xgboost_balanced.pkl"
SCALER_FILE = "flood_scaler_balanced.pkl"
FEATURES_FILE = "flood_features_balanced.json"

# Known Flood Events in Delhi (expand as more data becomes available)
FLOOD_EVENTS = {
    2023: {
        'July': [(8, 10)],  # July 8-10, 2023 - Major flooding
    },
    # Add more years/events if you have historical records
}

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

    # 2. Load Rainfall Data
    weather_rain = pd.read_csv("final_weather.csv")
    weather_rain['Date'] = pd.to_datetime(weather_rain['Date'])
    
    # Merge
    weather = weather_rain.merge(weather_rich[['Date', 'Humidity', 'WindSpeed', 'MaxTemp', 'MinTemp', 'AvgTemp']], 
                                 on='Date', how='left', suffixes=('_rain', ''))
    
    # Fill missing rich data
    weather['MaxTemp'] = weather['MaxTemp'].fillna(weather['MaxTemp_rain'])
    weather['MinTemp'] = weather['MinTemp'].fillna(weather['MinTemp_rain'])
    weather['AvgTemp'] = weather['AvgTemp'].fillna((weather['MaxTemp'] + weather['MinTemp']) / 2)
    weather['Humidity'] = weather['Humidity'].fillna(60.0)
    
    if 'Rainfall' not in weather.columns:
        print("Error: Rainfall column missing!")
        return None, None
        
    # Extract Year/Month/Day
    weather['Year'] = weather['Date'].dt.year
    weather['Month'] = weather['Date'].dt.month
    weather['Day'] = weather['Date'].dt.day
    weather['DayOfYear'] = weather['Date'].dt.dayofyear
    
    # PATCH: Fix missing rainfall for July 2023 Flood
    weather.loc[weather['Date'] == '2023-07-08', 'Rainfall'] = 126.0
    weather.loc[weather['Date'] == '2023-07-09', 'Rainfall'] = 153.0
    weather.loc[weather['Date'] == '2023-07-10', 'Rainfall'] = 50.0
    
    print(f"✓ Merged Weather Data: {len(weather)} rows")
    
    # 3. Soil Moisture
    soil_rows = []
    try:
        with open("soil_level.csv", 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
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

def calculate_consecutive_wet_days(df, idx):
    """Calculate consecutive wet days ending at index idx"""
    count = 0
    for i in range(idx, -1, -1):
        if df.iloc[i]['Rainfall'] > 1.0:  # Wet day threshold
            count += 1
        else:
            break
    return count

def feature_engineering(weather, soil_monthly):
    print("Engineering features...")
    
    # Merge Soil Moisture
    df = weather.merge(soil_monthly, on=['Year', 'Month'], how='left')
    df['SoilMoisture'] = df['SoilMoisture'].fillna(method='ffill').fillna(0.2)
    
    # Sort
    df = df.sort_values('Date').reset_index(drop=True)
    
    # Rolling Stats
    df['Rain_3d'] = df['Rainfall'].rolling(window=3, min_periods=1).sum()
    df['Rain_7d'] = df['Rainfall'].rolling(window=7, min_periods=1).sum()
    df['Rain_15d'] = df['Rainfall'].rolling(window=15, min_periods=1).sum()
    df['Rain_30d'] = df['Rainfall'].rolling(window=30, min_periods=1).sum()
    
    # Lag Features
    df['Rain_Lag1'] = df['Rainfall'].shift(1).fillna(0)
    df['Rain_Lag2'] = df['Rainfall'].shift(2).fillna(0)
    df['Rain_Lag3'] = df['Rainfall'].shift(3).fillna(0)
    df['Rain_Lag7'] = df['Rainfall'].shift(7).fillna(0)
    
    # Rainfall Anomaly
    df['Rain_30d_Mean'] = df['Rainfall'].rolling(window=30, min_periods=1).mean()
    df['Rain_Anomaly'] = df['Rainfall'] - df['Rain_30d_Mean']
    df['Rain_Anomaly'] = df['Rain_Anomaly'].fillna(0)
    
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
    
    # Consecutive Wet Days (NEW)
    df['Is_Wet'] = (df['Rainfall'] > 1.0).astype(int)
    df['Consecutive_Wet'] = df.groupby((df['Is_Wet'] != df['Is_Wet'].shift()).cumsum())['Is_Wet'].cumsum()
    df['Consecutive_Wet'] = df['Consecutive_Wet'] * df['Is_Wet']
    
    # Cyclical Date Features
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    
    # Soil-Rain Interaction
    df['Soil_Rain_Interaction'] = df['SoilMoisture'] * df['Rain_7d']
    
    # === IMPROVED TARGET LABELING ===
    def define_target_multi_factor(row):
        """
        Multi-factor flood risk scoring
        Returns 1 if total risk score >= 0.5, else 0
        """
        risk_score = 0.0
        
        # Factor 1: Extreme Rainfall Intensity (40% weight)
        if row['Rain_7d'] > 200:
            risk_score += 0.40
        elif row['Rain_7d'] > 150:
            risk_score += 0.30
        elif row['Rain_7d'] > 100:
            risk_score += 0.20
        elif row['Rain_7d'] > 50:
            risk_score += 0.10
        
        # Factor 2: Soil Saturation + Recent Rain (25% weight)
        if row['SoilMoisture'] > 0.35 and row['Rain_3d'] > 40:
            risk_score += 0.25
        elif row['SoilMoisture'] > 0.30 and row['Rain_3d'] > 25:
            risk_score += 0.15
        elif row['SoilMoisture'] > 0.25 and row['Rain_3d'] > 15:
            risk_score += 0.08
        
        # Factor 3: Rainfall Anomaly (20% weight)
        if row['Rain_Anomaly'] > 40:
            risk_score += 0.20
        elif row['Rain_Anomaly'] > 25:
            risk_score += 0.12
        elif row['Rain_Anomaly'] > 15:
            risk_score += 0.06
        
        # Factor 4: Consecutive Wet Days (15% weight)
        if row['Consecutive_Wet'] > 7:
            risk_score += 0.15
        elif row['Consecutive_Wet'] > 5:
            risk_score += 0.10
        elif row['Consecutive_Wet'] > 3:
            risk_score += 0.05
        
        # Bonus: Known Flood Events (mark as definite flood)
        if is_known_flood_event(row):
            return 1
        
        # Convert score to binary at threshold 0.5
        return 1 if risk_score >= 0.5 else 0
    
    def is_known_flood_event(row):
        """Check if this date is a known flood event"""
        year = row['Year']
        month = row['Month']
        day = row['Day']
        
        if year in FLOOD_EVENTS:
            month_name = pd.Timestamp(year=year, month=month, day=1).strftime('%B')
            if month_name in FLOOD_EVENTS[year]:
                for (start_day, end_day) in FLOOD_EVENTS[year][month_name]:
                    if start_day <= day <= end_day:
                        return True
        return False
    
    df['Flood_Risk'] = df.apply(define_target_multi_factor, axis=1)
    
    # Drop NaNs
    df = df.dropna()
    
    print(f"Total samples: {len(df)}")
    print(f"Flood Risk = 1: {df['Flood_Risk'].sum()} ({df['Flood_Risk'].mean()*100:.2f}%)")
    print(f"Flood Risk = 0: {(df['Flood_Risk']==0).sum()} ({(df['Flood_Risk']==0).mean()*100:.2f}%)")
    
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
        'Consecutive_Dry', 'Consecutive_Wet'
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
    
    # Apply SMOTE for better class balance
    print("\nApplying SMOTE for balanced sampling...")
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_resampled, y_resampled = smote.fit_resample(X_scaled, y)
    print(f"After SMOTE: {len(X_resampled)} samples")
    print(f"Class 1: {y_resampled.sum()} ({y_resampled.mean()*100:.2f}%)")
    
    # TimeSeriesSplit for proper temporal validation
    print("\n" + "="*60)
    print("TRAINING WITH TIME SERIES CROSS-VALIDATION")
    print("="*60)
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    # Simplified param grid for faster training
    param_grid = {
        'n_estimators': [200, 300, 500],
        'max_depth': [6, 8, 10],
        'learning_rate': [0.05, 0.1, 0.15],
        'subsample': [0.8, 0.9],
        'colsample_bytree': [0.8, 0.9],
        'min_child_weight': [1, 3],
        'gamma': [0, 0.1, 0.3],
        'reg_alpha': [0, 0.1],
        'reg_lambda': [1, 2],
        'scale_pos_weight': [1, 2]  # Already balanced by SMOTE
    }
    
    xgb = XGBClassifier(objective='binary:logistic', n_jobs=-1, random_state=42, eval_metric='logloss')
    
    search = RandomizedSearchCV(
        xgb, param_grid, n_iter=30, cv=tscv, scoring='f1', 
        verbose=2, random_state=42, n_jobs=-1
    )
    
    print("\nStarting search with 30 iterations and TimeSeriesSplit CV...")
    search.fit(X_resampled, y_resampled)
    
    best_model = search.best_estimator_
    print(f"\n{'='*60}")
    print(f"BEST PARAMETERS:")
    print(f"{'='*60}")
    for param, value in search.best_params_.items():
        print(f"  {param}: {value}")
    print(f"\nBest CV F1 Score: {search.best_score_:.4f}")
    
    # Calibrate probabilities for more realistic percentages
    print("\nCalibrating probability predictions...")
    calibrated_model = CalibratedClassifierCV(best_model, method='sigmoid', cv=3)
    calibrated_model.fit(X_resampled, y_resampled)
    
    # Save Calibrated Model
    joblib.dump(calibrated_model, MODEL_FILE)
    print(f"\n✓ Calibrated Model saved to {MODEL_FILE}")
    
    # Feature Importance (from base model)
    imp = pd.DataFrame({'Feature': features, 'Importance': best_model.feature_importances_})
    imp = imp.sort_values('Importance', ascending=False)
    print("\n" + "="*60)
    print("TOP 10 MOST IMPORTANT FEATURES")
    print("="*60)
    for idx, row in imp.head(10).iterrows():
        print(f"  {row['Feature']:30} {row['Importance']:.4f}")
    
    # Evaluate on original data (not resampled)
    y_pred = calibrated_model.predict(X_scaled)
    y_proba = calibrated_model.predict_proba(X_scaled)[:, 1]
    
    print("\n" + "="*60)
    print("EVALUATION ON ORIGINAL DATA")
    print("="*60)
    print(classification_report(y, y_pred, target_names=['No Flood', 'Flood Risk']))
    
    if len(np.unique(y)) == 2:
        auc = roc_auc_score(y, y_proba)
        print(f"ROC-AUC Score: {auc:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(y, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Flood Risk Confusion Matrix (Balanced)')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('flood_confusion_matrix_balanced.png')
    print("\n✓ Confusion matrix saved to flood_confusion_matrix_balanced.png")
    
    # Show probability distribution
    print("\n" + "="*60)
    print("PROBABILITY DISTRIBUTION")
    print("="*60)
    print(f"Mean probability for Flood Risk=1: {y_proba[y==1].mean():.3f}")
    print(f"Mean probability for Flood Risk=0: {y_proba[y==0].mean():.3f}")
    
    return calibrated_model

if __name__ == "__main__":
    weather, soil = load_data()
    if weather is None:
        exit(1)
    
    df = feature_engineering(weather, soil)
    
    if df['Flood_Risk'].sum() < 5:
        print("\nWARNING: Very few flood risk days. Model may not generalize well.")
        print("Consider adding more known flood events or adjusting thresholds.")
    
    model = train_model(df)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("New model saved as: flood_xgboost_balanced.pkl")
    print("="*60)
