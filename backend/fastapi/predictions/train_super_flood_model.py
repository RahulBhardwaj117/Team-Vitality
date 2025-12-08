"""
Super Flood Risk Model Training
Integrates Weather, Soil, Groundwater, and Land Use Data
Uses Ensemble Learning (XGBoost + Random Forest + Gradient Boosting)
"""

import pandas as pd
import numpy as np
import joblib
import json
import warnings
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from imblearn.over_sampling import SMOTE
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# --- Configuration ---
DATA_FILE = "comprehensive_weather_drought_data.csv"
MODEL_FILE = "flood_model_super.pkl"
SCALER_FILE = "flood_scaler_super.pkl"
FEATURES_FILE = "flood_features_super.json"

# Known Flood Years/Events in Delhi (2021-2023)
# July 2023 was a major event
FLOOD_EVENTS = [
    ('2023-07-08', '2023-07-15'), # Severe flood
    ('2021-09-01', '2021-09-05'), # Heavy rain
    ('2022-09-21', '2022-09-25')  # Late monsoon surge
]

def load_and_prep_data():
    print("Loading integrated dataset...")
    df = pd.read_csv(DATA_FILE)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    
    # Fill any remaining NaNs
    df = df.fillna(method='ffill').fillna(method='bfill')
    
    # Fallback: Estimate Soil Moisture if missing
    # We do this BEFORE feature engineering so rolling stats work
    if 'SoilMoisture_NASA' not in df.columns or df['SoilMoisture_NASA'].isna().mean() > 0.5:
        print("⚠ High missing Soil Moisture. Using synthetic estimation...")
        sm_values = [20.0]
        decay = 0.95
        # Ensure Rainfall exists
        if 'Rainfall' not in df.columns:
             df['Rainfall'] = 0.0
             
        rain_values = df['Rainfall'].values
        for i in range(1, len(df)):
            prev_sm = sm_values[-1]
            rain = rain_values[i]
            infiltration = rain * 0.3
            evap = 0.5 + (prev_sm * 0.02)
            new_sm = (prev_sm * decay) + infiltration - evap
            new_sm = max(0, min(new_sm, 50))
            sm_values.append(new_sm)
        df['SoilMoisture_NASA'] = sm_values
        print("✓ Synthetic Soil Moisture generated.")

    print(f"Loaded {len(df)} rows")
    return df

def engineer_features(df):
    print("Engineering advanced features...")
    
    # 1. Rolling Stats (Rainfall)
    for window in [3, 7, 14, 30, 60]:
        df[f'Rain_{window}d_Sum'] = df['Rainfall'].rolling(window=window, min_periods=1).sum()
        df[f'Rain_{window}d_Mean'] = df['Rainfall'].rolling(window=window, min_periods=1).mean()
        df[f'Rain_{window}d_Max'] = df['Rainfall'].rolling(window=window, min_periods=1).max()
    
    # 2. Rolling Stats (Soil Moisture)
    for window in [7, 30]:
        df[f'Soil_{window}d_Mean'] = df['SoilMoisture_NASA'].rolling(window=window, min_periods=1).mean()
        
    # 3. Lag Features (Rainfall)
    for lag in [1, 2, 3, 5, 7]:
        df[f'Rain_Lag{lag}'] = df['Rainfall'].shift(lag)
        
    # 4. Interaction Features
    # Soil Saturation Potential: High Soil Moisture + High Rain = Flood
    df['Soil_Rain_Interaction'] = df['SoilMoisture_NASA'] * df['Rain_7d_Sum']
    
    # Groundwater Risk: High Extraction + Low Availability = Vulnerability (Inverse for flood?)
    # Actually, High Groundwater Level (Low Depth) + Rain = Flood. 
    # Our data is Extraction Rate (High = Bad for drought, maybe good for flood absorption? No, high extraction means empty aquifers)
    # Let's assume High Availability ~ High Water Table (Riskier for flood)
    df['GW_Rain_Interaction'] = df['GW_Availability'] * df['Rain_30d_Sum']
    
    # Land Use Risk: High Built-up Area * Rain = Urban Flood
    df['Urban_Rain_Interaction'] = df['Land_BuiltUp_Area'] * df['Rain_3d_Sum']
    
    # 5. Anomaly Detection
    df['Rain_Anomaly_30d'] = df['Rainfall'] - df['Rain_30d_Mean']
    
    # 6. Seasonal/Cyclical
    df['Month'] = df['Date'].dt.month
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Is_Monsoon'] = df['Month'].isin([7, 8, 9]).astype(int)
    
    # 7. Target Variable Definition
    # We define flood risk based on known events AND heavy rainfall thresholds
    def define_target(row):
        # Check known events
        for start, end in FLOOD_EVENTS:
            if start <= str(row['Date'].date()) <= end:
                return 1
        
        # Heuristic: Extreme Rain + High Soil Moisture
        if row['Rain_3d_Sum'] > 100 and row['SoilMoisture_NASA'] > 40:
            return 1
            
        if row['Rainfall'] > 80: # Single day extreme
            return 1
            
        return 0

    df['Flood_Risk'] = df.apply(define_target, axis=1)
    
    print(f"Rows before dropna: {len(df)}")
    with open('nan_report.txt', 'w') as f:
        f.write(str(df.isna().sum()))
    
    # Drop NaNs created by lags
    df = df.dropna()
    print(f"Rows after dropna: {len(df)}")
    
    return df

def train_ensemble_model(df):
    # Select Features
    exclude_cols = ['Date', 'DateStr', 'Flood_Risk', 'Year', 'Month', 'DayOfYear']
    features = [c for c in df.columns if c not in exclude_cols and df[c].dtype in [np.float64, np.int64, np.int32]]
    
    print(f"\nTraining with {len(features)} features...")
    
    X = df[features]
    y = df['Flood_Risk']
    
    # Save features list
    with open(FEATURES_FILE, 'w') as f:
        json.dump(features, f)
        
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    joblib.dump(scaler, SCALER_FILE)
    
    # Handle Imbalance with SMOTE
    print(f"Original Class Distribution: {y_train.value_counts().to_dict()}")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train_scaled, y_train)
    print(f"Resampled Class Distribution: {y_train_res.value_counts().to_dict()}")
    
    # Define Lighter Model (Random Forest)
    print("\nTraining Lighter Model (Random Forest)...")
    clf = RandomForestClassifier(
        n_estimators=100, 
        max_depth=10, 
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    clf.fit(X_train_res, y_train_res)
    
    # Evaluate
    print("\nEvaluating on Test Set...")
    y_pred = clf.predict(X_test_scaled)
    
    print("\n" + "="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(classification_report(y_test, y_pred))
    
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall: {recall_score(y_test, y_pred):.4f}")
    print(f"F1 Score: {f1_score(y_test, y_pred):.4f}")
    
    # Save Model
    joblib.dump(clf, MODEL_FILE)
    print(f"\nLighter Model saved to {MODEL_FILE}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Flood Model Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('flood_confusion_matrix_super.png')

if __name__ == "__main__":
    df = load_and_prep_data()
    df = engineer_features(df)
    
    print(f"\nTotal Data Points: {len(df)}")
    print(f"Flood Risk Days: {df['Flood_Risk'].sum()}")
    
    train_ensemble_model(df)
