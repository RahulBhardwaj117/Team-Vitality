"""
Train Heatwave Prediction Model
Uses weatherdata.csv (2010-2023) for rich features (Humidity, Wind)
Uses delhi-temperature.csv (1951-2024) for long-term normals
"""

import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from xgboost import XGBClassifier
import warnings
warnings.filterwarnings('ignore')

# --- Configuration ---
MODEL_FILE = "heatwave_model.pkl"
SCALER_FILE = "heatwave_scaler.pkl"
FEATURES_FILE = "heatwave_features.json"

def load_and_prep_data():
    print("Loading datasets...")
    
    # 1. Load Long-term Temperature Data (for Normals)
    long_term = pd.read_csv("delhi-temperature.csv")
    long_term['Date'] = pd.to_datetime(long_term['Date'])
    long_term['DayOfYear'] = long_term['Date'].dt.dayofyear
    
    # Calculate daily normals (baseline)
    daily_normals = long_term.groupby('DayOfYear').agg({
        'Temp Max': 'mean',
        'Temp Min': 'mean'
    }).rename(columns={'Temp Max': 'Normal_Max', 'Temp Min': 'Normal_Min'})
    
    print(f"✓ Calculated normals from {len(long_term)} historical records")
    
    # 2. Load Rich Weather Data (2010-2023)
    # Columns: Date, Year, Month, Max Temperature (F), Avg Humidity, etc.
    df = pd.read_csv("weatherdata.csv")
    
    # Construct Date
    df['DateStr'] = df['Year'].astype(str) + '-' + df['Month'].astype(str) + '-' + df['Date'].astype(str)
    df['Date'] = pd.to_datetime(df['DateStr'])
    df['DayOfYear'] = df['Date'].dt.dayofyear
    
    # Convert Fahrenheit to Celsius
    # C = (F - 32) * 5/9
    cols_to_convert = ['Max Temperature', 'Min Temperature', 'Avg Temperature']
    for col in cols_to_convert:
        df[col] = (df[col] - 32) * 5/9
        
    # Rename for consistency
    df = df.rename(columns={
        'Max Temperature': 'MaxTemp',
        'Min Temperature': 'MinTemp',
        'Avg Temperature': 'AvgTemp',
        'Avg Humidity': 'Humidity',
        'Max Wind Speed': 'WindSpeed'
    })
    
    # Merge with Normals
    df = df.merge(daily_normals, on='DayOfYear', how='left')
    
    # Calculate Departure
    df['Departure_Max'] = df['MaxTemp'] - df['Normal_Max']
    
    print(f"✓ Loaded {len(df)} rich weather records (2010-2023)")
    return df

def calculate_heat_index(temp_c, humidity):
    """
    Calculate Heat Index using NOAA formula (approximation)
    Temp in Celsius, Humidity in %
    """
    # Convert to F for formula
    T = (temp_c * 9/5) + 32
    R = humidity
    
    HI = 0.5 * (T + 61.0 + ((T-68.0)*1.2) + (R*0.094))
    
    if HI > 80:
        HI = -42.379 + 2.04901523*T + 10.14333127*R - .22475541*T*R - .00683783*T*T - .05481717*R*R + .00122874*T*T*R + .00085282*T*R*R - .00000199*T*T*R*R
        
    # Convert back to C
    return (HI - 32) * 5/9

def define_heatwave_severity(row):
    """
    IMD Criteria for Heatwave (Plains):
    - Normal: < 40°C
    - Heatwave: MaxTemp >= 40°C AND (Departure >= 4.5°C OR MaxTemp >= 45°C)
    - Severe: MaxTemp >= 40°C AND (Departure >= 6.4°C OR MaxTemp >= 47°C)
    
    Classes:
    0: Normal
    1: Watch (High temp but not official heatwave)
    2: Heatwave
    3: Severe Heatwave
    """
    max_t = row['MaxTemp']
    dep = row['Departure_Max']
    
    if max_t < 40:
        return 0 # Normal
    
    # High temp zone
    if max_t >= 47 or dep >= 6.4:
        return 3 # Severe Heatwave
    elif max_t >= 45 or dep >= 4.5:
        return 2 # Heatwave
    else:
        return 1 # Watch (Hot but not technical heatwave)

def feature_engineering(df):
    print("Engineering features...")
    
    # Heat Index
    df['HeatIndex'] = df.apply(lambda row: calculate_heat_index(row['MaxTemp'], row['Humidity']), axis=1)
    
    # Rolling Averages
    df['Temp_3d'] = df['MaxTemp'].rolling(3).mean()
    df['Temp_7d'] = df['MaxTemp'].rolling(7).mean()
    df['Humidity_3d'] = df['Humidity'].rolling(3).mean()
    
    # Lags
    df['MaxTemp_Lag1'] = df['MaxTemp'].shift(1)
    df['MaxTemp_Lag2'] = df['MaxTemp'].shift(2)
    
    # Temporal
    df['Month'] = df['Date'].dt.month
    df['Week'] = df['Date'].dt.isocalendar().week
    
    # Interaction
    df['Temp_Humidity_Interaction'] = df['MaxTemp'] * df['Humidity']
    
    # Target
    df['Heatwave_Severity'] = df.apply(define_heatwave_severity, axis=1)
    
    # Drop NaN
    df = df.dropna()
    
    return df

def train_model(df):
    features = [
        'MaxTemp', 'MinTemp', 'AvgTemp', 'Humidity', 'WindSpeed',
        'Normal_Max', 'Departure_Max', 'HeatIndex',
        'Temp_3d', 'Temp_7d', 'Humidity_3d',
        'MaxTemp_Lag1', 'MaxTemp_Lag2',
        'Month', 'Week', 'Temp_Humidity_Interaction'
    ]
    
    X = df[features]
    y = df['Heatwave_Severity']
    
    # Save features list
    import json
    with open(FEATURES_FILE, 'w') as f:
        json.dump(features, f)
        
    # Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, SCALER_FILE)
    
    # Model - XGBoost
    # Use class weights for imbalance
    from sklearn.utils.class_weight import compute_sample_weight
    sample_weights = compute_sample_weight(class_weight='balanced', y=y)
    
    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='multi:softprob',
        num_class=4,
        random_state=42,
        n_jobs=-1
    )
    
    # Cross Validation
    print("\nRunning 5-Fold Cross-Validation...")
    kfold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X_scaled, y, cv=kfold, scoring='accuracy')
    print(f"✓ CV Accuracy: {scores.mean()*100:.2f}% (+/- {scores.std()*100:.2f}%)")
    
    # Train Final Model
    print("\nTraining final model...")
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
    
    model.fit(X_train, y_train)
    
    # Evaluation
    y_pred = model.predict(X_test)
    print("\nTest Set Evaluation:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Watch', 'Heatwave', 'Severe']))
    
    # Save
    joblib.dump(model, MODEL_FILE)
    print(f"✓ Model saved to {MODEL_FILE}")
    
    # Feature Importance
    plt.figure(figsize=(10, 6))
    importances = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
    importances.plot(kind='bar')
    plt.title("Heatwave Model Feature Importance")
    plt.tight_layout()
    plt.savefig("heatwave_feature_importance.png")
    print("✓ Feature importance plot saved")

if __name__ == "__main__":
    print("="*60)
    print("   HEATWAVE MODEL TRAINING PIPELINE")
    print("="*60)
    
    data = load_and_prep_data()
    data = feature_engineering(data)
    
    print(f"\nDataset Shape: {data.shape}")
    print("Severity Distribution:")
    print(data['Heatwave_Severity'].value_counts().sort_index())
    
    train_model(data)
    print("\nDone!")
