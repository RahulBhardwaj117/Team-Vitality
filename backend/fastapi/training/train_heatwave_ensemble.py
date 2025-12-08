"""
Advanced Heatwave Model Training
- Implements Ensemble Learning (5 Models)
- Hyperparameter Tuning via RandomizedSearchCV
- Cross-Validation for Robustness
"""

import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier
import warnings
warnings.filterwarnings('ignore')

# --- Configuration ---
MODEL_FILE = "heatwave_model_ensemble.pkl"  # Saving list of models
SCALER_FILE = "heatwave_scaler.pkl"
FEATURES_FILE = "heatwave_features.json"

def load_and_prep_data():
    print("Loading datasets...")
    long_term = pd.read_csv("delhi-temperature.csv")
    long_term['Date'] = pd.to_datetime(long_term['Date'])
    long_term['DayOfYear'] = long_term['Date'].dt.dayofyear
    
    daily_normals = long_term.groupby('DayOfYear').agg({
        'Temp Max': 'mean',
        'Temp Min': 'mean'
    }).rename(columns={'Temp Max': 'Normal_Max', 'Temp Min': 'Normal_Min'})
    
    df = pd.read_csv("weatherdata.csv")
    df['DateStr'] = df['Year'].astype(str) + '-' + df['Month'].astype(str) + '-' + df['Date'].astype(str)
    df['Date'] = pd.to_datetime(df['DateStr'])
    df['DayOfYear'] = df['Date'].dt.dayofyear
    
    cols_to_convert = ['Max Temperature', 'Min Temperature', 'Avg Temperature']
    for col in cols_to_convert:
        df[col] = (df[col] - 32) * 5/9
        
    df = df.rename(columns={
        'Max Temperature': 'MaxTemp',
        'Min Temperature': 'MinTemp',
        'Avg Temperature': 'AvgTemp',
        'Avg Humidity': 'Humidity',
        'Max Wind Speed': 'WindSpeed'
    })
    
    df = df.merge(daily_normals, on='DayOfYear', how='left')
    df['Departure_Max'] = df['MaxTemp'] - df['Normal_Max']
    return df

def calculate_heat_index(temp_c, humidity):
    T = (temp_c * 9/5) + 32
    R = humidity
    HI = 0.5 * (T + 61.0 + ((T-68.0)*1.2) + (R*0.094))
    if HI > 80:
        HI = -42.379 + 2.04901523*T + 10.14333127*R - .22475541*T*R - .00683783*T*T - .05481717*R*R + .00122874*T*T*R + .00085282*T*R*R - .00000199*T*T*R*R
    return (HI - 32) * 5/9

def define_heatwave_severity(row):
    max_t = row['MaxTemp']
    dep = row['Departure_Max']
    if max_t < 40: return 0
    if max_t >= 47 or dep >= 6.4: return 3
    elif max_t >= 45 or dep >= 4.5: return 2
    else: return 1

def feature_engineering(df):
    df['HeatIndex'] = df.apply(lambda row: calculate_heat_index(row['MaxTemp'], row['Humidity']), axis=1)
    df['Temp_3d'] = df['MaxTemp'].rolling(3).mean()
    df['Temp_7d'] = df['MaxTemp'].rolling(7).mean()
    df['Humidity_3d'] = df['Humidity'].rolling(3).mean()
    df['MaxTemp_Lag1'] = df['MaxTemp'].shift(1)
    df['MaxTemp_Lag2'] = df['MaxTemp'].shift(2)
    df['Month'] = df['Date'].dt.month
    df['Week'] = df['Date'].dt.isocalendar().week
    df['Temp_Humidity_Interaction'] = df['MaxTemp'] * df['Humidity']
    df['Heatwave_Severity'] = df.apply(define_heatwave_severity, axis=1)
    return df.dropna()

def train_ensemble(df):
    features = [
        'MaxTemp', 'MinTemp', 'AvgTemp', 'Humidity', 'WindSpeed',
        'Normal_Max', 'Departure_Max', 'HeatIndex',
        'Temp_3d', 'Temp_7d', 'Humidity_3d',
        'MaxTemp_Lag1', 'MaxTemp_Lag2',
        'Month', 'Week', 'Temp_Humidity_Interaction'
    ]
    
    X = df[features]
    y = df['Heatwave_Severity']
    
    # Save features
    with open(FEATURES_FILE, 'w') as f:
        json.dump(features, f)
        
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, SCALER_FILE)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
    
    # Hyperparameter Tuning
    print("Tuning hyperparameters...")
    param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [4, 6, 8],
        'learning_rate': [0.01, 0.05, 0.1],
        'subsample': [0.7, 0.8, 0.9],
        'colsample_bytree': [0.7, 0.8, 0.9]
    }
    
    base_model = XGBClassifier(objective='multi:softprob', num_class=4, n_jobs=-1, random_state=42)
    random_search = RandomizedSearchCV(base_model, param_grid, n_iter=10, cv=3, verbose=1, n_jobs=-1)
    random_search.fit(X_train, y_train)
    
    best_params = random_search.best_params_
    print(f"Best Params: {best_params}")
    
    # Train Ensemble of 5 Models
    print("\nTraining Ensemble (5 Models)...")
    models = []
    seeds = [42, 101, 202, 303, 404]
    
    for i, seed in enumerate(seeds):
        print(f"Training Model {i+1}/5 (Seed {seed})...")
        model = XGBClassifier(
            **best_params,
            objective='multi:softprob',
            num_class=4,
            random_state=seed,
            n_jobs=-1
        )
        model.fit(X_train, y_train)
        models.append(model)
        
    # Ensemble Prediction
    print("\nEvaluating Ensemble...")
    y_pred_proba = np.zeros((len(X_test), 4))
    for model in models:
        y_pred_proba += model.predict_proba(X_test)
    y_pred_proba /= len(models)
    y_pred = np.argmax(y_pred_proba, axis=1)
    
    print(f"Ensemble Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}%")
    
    # Save Ensemble
    joblib.dump(models, MODEL_FILE)
    print(f"✓ Ensemble saved to {MODEL_FILE}")

if __name__ == "__main__":
    data = load_and_prep_data()
    data = feature_engineering(data)
    train_ensemble(data)
