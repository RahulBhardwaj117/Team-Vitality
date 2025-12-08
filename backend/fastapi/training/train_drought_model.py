"""
Simplified Drought Prediction Model Training
Trains binary classifier first, then can extend to multi-class
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from xgboost import XGBClassifier
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("DROUGHT PREDICTION MODEL TRAINING")
print("="*80)

# Configuration
DROUGHT_MODEL_PATH = "drought_model.pkl"
DROUGHT_SCALER_PATH = "drought_scaler.pkl"
DROUGHT_FEATURES_PATH = "drought_features.json"
TEST_SIZE = 0.2
RANDOM_STATE = 42

print("\n[1/6] Loading and preprocessing data...")

# Load weather data
weather_db = pd.read_csv('final_weather.csv')
weather_db['Date'] = pd.to_datetime(weather_db['Date'])
weather_db = weather_db.sort_values('Date').reset_index(drop=True)
print(f"✓ Weather data: {len(weather_db)} days")

# Load historical rainfall
monthly_rain = pd.read_csv('delhi-monthly-rains.csv')
months_list = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
historical_rain_avg = {}
for i, month_name in enumerate(months_list, 1):
    if month_name in monthly_rain.columns:
        historical_rain_avg[i] = monthly_rain[month_name].mean()
    else:
        historical_rain_avg[i] = 50.0

df = weather_db.copy()
df['Month'] = df['Date'].dt.month
df['Week'] = df['Date'].dt.isocalendar().week
df['DayOfYear'] = df['Date'].dt.dayofyear
df['Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
df['PreMonsoon'] = df['Month'].isin([3, 4, 5]).astype(int)

print("\n[2/6] Engineering drought features...")

# Historical average
df['HistoricalRainAvg'] = df['Month'].map(historical_rain_avg)

# Rolling rainfall
df['Rain_7d'] = df['Rainfall'].rolling(window=7, min_periods=1).sum()
df['Rain_14d'] = df['Rainfall'].rolling(window=14, min_periods=1).sum()
df['Rain_30d'] = df['Rainfall'].rolling(window=30, min_periods=1).sum()
df['Rain_60d'] = df['Rainfall'].rolling(window=60, min_periods=1).sum()

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

# Evapotranspiration
if 'Evapotranspiration' in df.columns:
    df['Evap_7d'] = df['Evapotranspiration'].rolling(7, min_periods=1).mean()
    df['Evap_30d'] = df['Evapotranspiration'].rolling(30, min_periods=1).mean()
else:
    df['Evap_7d'] = 5.0
    df['Evap_30d'] = 5.0

# PEI
df['PEI'] = df['Rain_30d'] / (df['Evap_30d'] * 30 + 0.1)

# Soil moisture (simplified calculation)
sm = [20.0]
for i in range(1, len(df)):
    prev = sm[-1]
    rain = df.iloc[i]['Rainfall']
    evap = df.iloc[i]['Evap_7d']
    change = (rain * 0.8) - (evap * 0.3)
    new_sm = np.clip(prev + change, 5.0, 50.0)
    sm.append(new_sm)
df['SoilMoisture'] = sm
df['SM_30d'] = df['SoilMoisture'].rolling(30, min_periods=1).mean()

# Water balance
df['WaterBalance'] = df['Rain_30d'] - (df['Evap_30d'] * 30)

# Rainfall deficit
df['RainDeficit'] = df['HistoricalRainAvg'] - (df['Rain_30d'] / 30)

# Temperature
if 'MaxTemp' in df.columns:
    df['TempStress'] = (df['MaxTemp'] > 40).astype(int).rolling(30, min_periods=1).sum()
    df['AvgTemp'] = (df['MaxTemp'] + df['MinTemp']) / 2 if 'MinTemp' in df.columns else df['MaxTemp']
else:
    df['TempStress'] = 0
    df['AvgTemp'] = 30

df = df.bfill().fillna(0)

print(f"✓ Created features")

print("\n[3/6] Creating drought labels...")

# Multi-class drought severity (0=None, 1=Mild, 2=Moderate, 3=Severe)
def classify_drought_severity(row):
    dry_days = row['DryDays']
    rain_30d = row['Rain_30d']
    hist_avg = row['HistoricalRainAvg']
    sm = row['SoilMoisture']
    
    # Rain percentage of normal
    rain_pct = (rain_30d / (hist_avg + 0.1)) * 100 if hist_avg > 0 else 100
    
    # SEVERE
    if dry_days >= 25 or rain_pct < 25 or sm < 12:
        return 3
    # MODERATE  
    elif dry_days >= 12 or rain_pct < 45 or sm < 16:
        return 2
    # MILD
    elif dry_days >= 5 or rain_pct < 65 or sm < 20:
        return 1
    # NONE
    else:
        return 0

df['DroughtSeverity'] = df.apply(classify_drought_severity, axis=1)

severity_names = ['None', 'Mild', 'Moderate', 'Severe']
print(f"\nSeverity Distribution:")
for sev in range(4):
    count = (df['DroughtSeverity'] == sev).sum()
    pct = count / len(df) * 100
    print(f"  - {severity_names[sev]:10s}: {count:5d} ({pct:5.1f}%)")

print("\n[4/6] Preparing training data...")

features = [
    'Rainfall', 'Rain_7d', 'Rain_14d', 'Rain_30d', 'Rain_60d',
    'DryDays', 'DaysSinceRain',
    'Evap_7d', 'Evap_30d', 'PEI',
    'SoilMoisture', 'SM_30d',
    'WaterBalance', 'RainDeficit',
    'AvgTemp', 'TempStress',
    'Month', 'Monsoon', 'PreMonsoon'
]

features = [f for f in features if f in df.columns]
print(f"✓ Using {len(features)} features")

X = df[features].values
y = df['DroughtSeverity'].values

# Split
split_idx = int(len(X) * (1 - TEST_SIZE))
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

print(f"✓ Train: {len(X_train)}, Test: {len(X_test)}")

# Scale
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

joblib.dump(scaler, DROUGHT_SCALER_PATH)
with open(DROUGHT_FEATURES_PATH, 'w') as f:
    json.dump(features, f, indent=2)

print("\n[5/6] Training model...")

model = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.05,
    random_state=RANDOM_STATE,
    eval_metric='mlogloss',
    n_jobs=-1
)

model.fit(X_train_scaled, y_train)
joblib.dump(model, DROUGHT_MODEL_PATH)
print(f"✓ Model saved to {DROUGHT_MODEL_PATH}")

print("\n[6/6] Evaluating...")

y_pred = model.predict(X_test_scaled)

accuracy = accuracy_score(y_test, y_pred)
print(f"\nOverall Accuracy: {accuracy:.2%}")

print(f"\nClassification Report:")
# Get unique classes present in test set
unique_classes = sorted(np.unique(np.concatenate([y_test, y_pred])))
class_labels = [severity_names[i] if i < len(severity_names) else f'Class_{i}' for i in unique_classes]
print(classification_report(y_test, y_pred, labels=unique_classes, target_names=class_labels, zero_division=0))

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='YlOrRd',
            xticklabels=severity_names, yticklabels=severity_names)
plt.title('Drought Severity Prediction - Confusion Matrix')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.tight_layout()
plt.savefig('drought_confusion_matrix.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"✓ Saved confusion matrix")

# Feature importance
plt.figure(figsize=(10, 8))
importance_df = pd.DataFrame({
    'Feature': features,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=False).head(15)

plt.barh(importance_df['Feature'], importance_df['Importance'])
plt.xlabel('Importance')
plt.title('Top 15 Feature Importances')
plt.gca().invert_yaxis()
plt.tight_layout()
plt.savefig('drought_feature_importance.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"✓ Saved feature importance")

print("\n" + "="*80)
print("TRAINING COMPLETE!")
print("="*80)
print(f"\nFiles Created:")
print(f"  - {DROUGHT_MODEL_PATH}")
print(f"  - {DROUGHT_SCALER_PATH}")
print(f"  - {DROUGHT_FEATURES_PATH}")
print(f"\nAccuracy: {accuracy:.2%}")

if accuracy >= 0.70:
    print("✓ Target accuracy achieved!")

print("="*80)
