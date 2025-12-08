"""
Improved Drought Prediction Model Training
Uses multi-dataset features with weighted scoring and cross-validation
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, StratifiedKFold
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
print("IMPROVED DROUGHT PREDICTION MODEL TRAINING")
print("Multi-Dataset Integration with Cross-Validation")
print("="*80)

# Configuration
DROUGHT_MODEL_PATH = "drought_model.pkl"
DROUGHT_SCALER_PATH = "drought_scaler.pkl"
DROUGHT_FEATURES_PATH = "drought_features.json"
TEST_SIZE = 0.2
RANDOM_STATE = 42
N_FOLDS = 5

print("\n[1/7] Loading integrated dataset...")

# Load comprehensive data
try:
    df = pd.read_csv('comprehensive_weather_drought_data.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    print(f"✓ Comprehensive data: {len(df)} days ({df['Date'].min().date()} to {df['Date'].max().date()})")
except:
    print("⚠ Using final_weather.csv as fallback...")
    df = pd.read_csv('final_weather.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    df['SoilMoisture_Actual'] = np.nan
    df['GW_Extraction_Rate'] = 100.0
    df['GW_Availability'] = 2000.0

# Load historical rainfall averages
monthly_rain = pd.read_csv('delhi-monthly-rains.csv')
months_list = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
historical_rain_avg = {}
for i, month_name in enumerate(months_list, 1):
    if month_name in monthly_rain.columns:
        historical_rain_avg[i] = monthly_rain[month_name].mean()
    else:
        historical_rain_avg[i] = 50.0

print("\n[2/7] Engineering comprehensive features...")

# Basic time features
df['Month'] = df['Date'].dt.month
df['Week'] = df['Date'].dt.isocalendar().week
df['DayOfYear'] = df['Date'].dt.dayofyear
df['Monsoon'] = df['Month'].isin([6, 7, 8, 9]).astype(int)
df['PreMonsoon'] = df['Month'].isin([3, 4, 5]).astype(int)
df['Winter'] = df['Month'].isin([12, 1, 2]).astype(int)

# Historical average
df['HistoricalRainAvg'] = df['Month'].map(historical_rain_avg)

# ============================================================================
# RAINFALL FEATURES
# ============================================================================
print("  - Rainfall features...")
df['Rain_3d'] = df['Rainfall'].rolling(3, min_periods=1).sum()
df['Rain_7d'] = df['Rainfall'].rolling(7, min_periods=1).sum()
df['Rain_14d'] = df['Rainfall'].rolling(14, min_periods=1).sum()
df['Rain_30d'] = df['Rainfall'].rolling(30, min_periods=1).sum()
df['Rain_60d'] = df['Rainfall'].rolling(60, min_periods=1).sum()
df['Rain_90d'] = df['Rainfall'].rolling(90, min_periods=1).sum()

# Consecutive dry days (< 2.5mm threshold)
streaks = []
current_streak = 0
for rainfall in df['Rainfall']:
    if rainfall < 2.5:
        current_streak += 1
    else:
        current_streak = 0
    streaks.append(current_streak)
df['DryDays'] = streaks

# Days since significant rain (>= 10mm)
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

# ============================================================================
# TEMPERATURE FEATURES
# ============================================================================
print("  - Temperature features...")

# Ensure temperature columns exist
if 'MaxTemp' not in df.columns:
    df['MaxTemp'] = 35.0
if 'MinTemp' not in df.columns:
    df['MinTemp'] = 20.0

df['AvgTemp'] = (df['MaxTemp'] + df['MinTemp']) / 2
df['TempRange'] = df['MaxTemp'] - df['MinTemp']

# Rolling temperature averages
df['Temp_7d_avg'] = df['AvgTemp'].rolling(7, min_periods=1).mean()
df['Temp_14d_avg'] = df['AvgTemp'].rolling(14, min_periods=1).mean()
df['Temp_30d_avg'] = df['AvgTemp'].rolling(30, min_periods=1).mean()

# Heat wave detection (consecutive days with temp > 42°C)
heat_days = (df['MaxTemp'] > 42).astype(int)
df['HeatWave_Days'] = heat_days.rolling(15, min_periods=1).sum()

# High temperature days in last 30 days
df['HighTemp_Days_30d'] = (df['MaxTemp'] > 40).astype(int).rolling(30, min_periods=1).sum()

# Temperature stress index
df['TempStress_Index'] = df['HeatWave_Days'] * (df['AvgTemp'] / 35.0)

# ============================================================================
# EVAPOTRANSPIRATION FEATURES
# ============================================================================
print("  - Evapotranspiration features...")

if 'Evapotranspiration' in df.columns:
    df['Evap_7d'] = df['Evapotranspiration'].rolling(7, min_periods=1).mean()
    df['Evap_14d'] = df['Evapotranspiration'].rolling(14, min_periods=1).mean()
    df['Evap_30d'] = df['Evapotranspiration'].rolling(30, min_periods=1).mean()
else:
    # Estimate evapotranspiration from temperature (simplified Hargreaves equation)
    df['Evap_7d'] = df['TempRange'] * 0.4
    df['Evap_14d'] = df['Evap_7d']
    df['Evap_30d'] = df['Evap_7d']

# PEI (Precipitation Evapotranspiration Index)
df['PEI'] = df['Rain_30d'] / (df['Evap_30d'] * 30 + 0.1)

# Water balance
df['WaterBalance'] = df['Rain_30d'] - (df['Evap_30d'] * 30)
df['WaterBalance_60d'] = df['Rain_60d'] - (df['Evap_30d'] * 60)

# ============================================================================
# SOIL MOISTURE FEATURES
# ============================================================================
print("  - Soil moisture features...")

# Check if we have real soil moisture data
has_real_sm = 'SoilMoisture_Actual' in df.columns and not df['SoilMoisture_Actual'].isna().all()

if has_real_sm:
    print("    ✓ Using real soil moisture data")
    # Forward fill and interpolate
    df['SoilMoisture_Actual'] = df['SoilMoisture_Actual'].fillna(method='ffill').fillna(method='bfill')
    df['SoilMoisture'] = df['SoilMoisture_Actual']
else:
    print("    ⚠ Calculating soil moisture from rainfall/evaporation")
    # Simplified soil moisture calculation
    sm = [20.0]
    for i in range(1, len(df)):
        prev = sm[-1]
        rain = df.iloc[i]['Rainfall']
        evap = df.iloc[i]['Evap_7d']
        change = (rain * 0.8) - (evap * 0.3)
        new_sm = np.clip(prev + change, 5.0, 50.0)
        sm.append(new_sm)
    df['SoilMoisture'] = sm

# Soil moisture rolling averages
df['SM_7d'] = df['SoilMoisture'].rolling(7, min_periods=1).mean()
df['SM_14d'] = df['SoilMoisture'].rolling(14, min_periods=1).mean()
df['SM_30d'] = df['SoilMoisture'].rolling(30, min_periods=1).mean()

# Soil moisture trend (rate of change)
df['SM_Trend'] = df['SoilMoisture'].diff(periods=7).fillna(0)

# Soil moisture deficit (compared to seasonal average)
seasonal_sm_avg = df.groupby('Month')['SoilMoisture'].transform('mean')
df['SM_Deficit'] = seasonal_sm_avg - df['SoilMoisture']

# ============================================================================
# INTERACTION FEATURES
# ============================================================================
print("  - Interaction features...")

# Rain to soil moisture conversion efficiency
df['Rain_to_SM_Ratio'] = df['Rain_30d'] / (df['SM_30d'] + 1)

# Temperature-based evaporation potential
df['Evap_Potential'] = df['TempRange'] * df['Temp_30d_avg'] / 500

# Moisture stress index (composite)
df['Moisture_Stress_Index'] = (df['RainDeficit_Pct'] * df['TempStress_Index']) / (df['SoilMoisture'] + 1)

# Drought risk score (composite)
df['Drought_Risk_Score'] = (
    (df['DryDays'] / 30.0) * 0.3 +
    (df['RainDeficit_Pct'] / 100.0) * 0.3 +
    ((50 - df['SoilMoisture']) / 50.0) * 0.2 +
    (df['TempStress_Index'] / 10.0) * 0.2
)

# ============================================================================
# GROUNDWATER FEATURES (if available)
# ============================================================================
if 'GW_Extraction_Rate' in df.columns:
    df['GW_Stress'] = df['GW_Extraction_Rate'] / 100.0
else:
    df['GW_Stress'] = 1.0

# Fill any remaining NaNs
df = df.fillna(method='bfill').fillna(method='ffill').fillna(0)

print(f"✓ Created {len(df.columns)} total columns")

# ============================================================================
# IMPROVED DROUGHT CLASSIFICATION (WEIGHTED SCORING)
# ============================================================================
print("\n[3/7] Creating improved drought labels...")

def classify_drought_severity_improved(row):
    """
    Weighted scoring system for drought classification
    Score range: 0-10, mapped to severity levels
    """
    score = 0
    
    # COMPONENT 1: Rainfall (0-3 points)
    rain_pct = (row['Rain_30d'] / max(row['HistoricalRainAvg'], 1)) * 100
    if rain_pct < 15:
        score += 3
    elif rain_pct < 30:
        score += 2.5
    elif rain_pct < 50:
        score += 1.5
    elif rain_pct < 70:
        score += 0.5
    
    # COMPONENT 2: Soil Moisture (0-3 points)
    sm = row['SoilMoisture']
    if sm < 8:
        score += 3
    elif sm < 12:
        score += 2.5
    elif sm < 16:
        score += 1.5
    elif sm < 22:
        score += 0.5
    
    # COMPONENT 3: Dry Days (0-2 points)
    if row['DryDays'] >= 35:
        score += 2
    elif row['DryDays'] >= 25:
        score += 1.5
    elif row['DryDays'] >= 15:
        score += 1
    elif row['DryDays'] >= 8:
        score += 0.5
    
    # COMPONENT 4: Temperature Stress (0-2 points)
    if row['HeatWave_Days'] >= 12:
        score += 2
    elif row['HeatWave_Days'] >= 8:
        score += 1.5
    elif row['HeatWave_Days'] >= 5:
        score += 1
    elif row['HighTemp_Days_30d'] >= 15:
        score += 0.5
    
    # SEASONAL ADJUSTMENT: Be more lenient in winter
    if row['Winter'] == 1:
        score *= 0.7  # Reduce score by 30% in winter
    
    # CONVERT SCORE TO SEVERITY
    # Thresholds adjusted to be less aggressive
    if score >= 7.5:       # Very high score needed for Severe
        return 3  # Severe
    elif score >= 5.0:     # Moderate threshold
        return 2  # Moderate  
    elif score >= 2.5:     # Mild threshold
        return 1  # Mild
    else:
        return 0  # None

df['DroughtSeverity'] = df.apply(classify_drought_severity_improved, axis=1)

severity_names = ['None', 'Mild', 'Moderate', 'Severe']
print(f"\nSeverity Distribution:")
for sev in range(4):
    count = (df['DroughtSeverity'] == sev).sum()
    pct = count / len(df) * 100
    print(f"  - {severity_names[sev]:10s}: {count:5d} ({pct:5.1f}%)")

# ============================================================================
# PREPARE TRAINING DATA
# ============================================================================
print("\n[4/7] Preparing training data...")

# Select features
feature_candidates = [
    # Rainfall
    'Rainfall', 'Rain_3d', 'Rain_7d', 'Rain_14d', 'Rain_30d', 'Rain_60d', 'Rain_90d',
    'DryDays', 'DaysSinceRain', 'RainDeficit', 'RainDeficit_Pct',
    
    # Temperature
    'MaxTemp', 'MinTemp', 'AvgTemp', 'TempRange',
    'Temp_7d_avg', 'Temp_14d_avg', 'Temp_30d_avg',
    'HeatWave_Days', 'HighTemp_Days_30d', 'TempStress_Index',
    
    # Evapotranspiration
    'Evap_7d', 'Evap_14d', 'Evap_30d', 'PEI',
    'WaterBalance', 'WaterBalance_60d',
    
    # Soil Moisture
    'SoilMoisture', 'SM_7d', 'SM_14d', 'SM_30d', 'SM_Trend', 'SM_Deficit',
    
    # Interaction
    'Rain_to_SM_Ratio', 'Evap_Potential', 'Moisture_Stress_Index', 'Drought_Risk_Score',
    
    # Groundwater
    'GW_Stress',
    
    # Temporal
    'Month', 'Monsoon', 'PreMonsoon', 'Winter',
    'HistoricalRainAvg'
]

# Filter to existing columns
features = [f for f in feature_candidates if f in df.columns]
print(f"✓ Using {len(features)} features")

X = df[features].values
y = df['DroughtSeverity'].values

# Split chronologically (important for time-series)
split_idx = int(len(X) * (1 - TEST_SIZE))
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

print(f"✓ Train: {len(X_train)}, Test: {len(X_test)}")

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Save scaler and features
joblib.dump(scaler, DROUGHT_SCALER_PATH)
with open(DROUGHT_FEATURES_PATH, 'w') as f:
    json.dump(features, f, indent=2)

print("✓ Scaler and features saved")

# ============================================================================
# CROSS-VALIDATION
# ============================================================================
print(f"\n[5/7] Running {N_FOLDS}-fold cross-validation...")

# Create base model
base_model = XGBClassifier(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=RANDOM_STATE,
    eval_metric='mlogloss',
    n_jobs=-1
)

# Stratified K-Fold
skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)

# Cross-validation scores
cv_scores = cross_val_score(base_model, X_train_scaled, y_train, cv=skf, scoring='accuracy', n_jobs=-1)

print(f"\nCross-Validation Accuracy:")
for fold, score in enumerate(cv_scores, 1):
    print(f"  Fold {fold}: {score:.4f}")
print(f"  Mean: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ============================================================================
# TRAIN FINAL MODEL
# ============================================================================
print("\n[6/7] Training final model on full training set...")

model = XGBClassifier(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=RANDOM_STATE,
    eval_metric='mlogloss',
    n_jobs=-1
)

model.fit(X_train_scaled, y_train)
joblib.dump(model, DROUGHT_MODEL_PATH)
print(f"✓ Model saved to {DROUGHT_MODEL_PATH}")

# ============================================================================
# EVALUATION
# ============================================================================
print("\n[7/7] Evaluating on test set...")

y_pred = model.predict(X_test_scaled)

# Overall metrics
accuracy = accuracy_score(y_test, y_pred)
print(f"\nTest Set Accuracy: {accuracy:.2%}")

# Classification report
print(f"\nClassification Report:")
unique_classes = sorted(np.unique(np.concatenate([y_test, y_pred])))
class_labels = [severity_names[i] for i in unique_classes]
print(classification_report(y_test, y_pred, labels=unique_classes, target_names=class_labels, zero_division=0))

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='YlGnBu',
            xticklabels=severity_names, yticklabels=severity_names,
            cbar_kws={'label': 'Count'})
plt.title('Improved Drought Prediction - Confusion Matrix', fontsize=14, fontweight='bold')
plt.ylabel('Actual Severity', fontsize=12)
plt.xlabel('Predicted Severity', fontsize=12)
plt.tight_layout()
plt.savefig('drought_confusion_matrix.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"✓ Saved confusion matrix")

# Feature importance
plt.figure(figsize=(12, 10))
importance_df = pd.DataFrame({
    'Feature': features,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=False).head(20)

plt.barh(importance_df['Feature'], importance_df['Importance'], color='steelblue')
plt.xlabel('Importance Score', fontsize=12)
plt.title('Top 20 Feature Importances - Improved Model', fontsize=14, fontweight='bold')
plt.gca().invert_yaxis()
plt.tight_layout()
plt.savefig('drought_feature_importance.png', dpi=300, bbox_inches='tight')
plt.close()
print(f"✓ Saved feature importance plot")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("TRAINING COMPLETE!")
print("="*80)
print(f"\nModel Performance:")
print(f"  - Cross-Validation Accuracy: {cv_scores.mean():.2%}")
print(f"  - Test Set Accuracy: {accuracy:.2%}")

# Per-class F1 scores
for i in unique_classes:
    mask = y_test == i
    if mask.sum() > 0:
        pred_mask = y_pred == i
        f1 = f1_score(y_test, y_pred, labels=[i], average='micro', zero_division=0)
        print(f"  - {severity_names[i]} F1-Score: {f1:.2%}")

print(f"\nFiles Created:")
print(f"  - {DROUGHT_MODEL_PATH}")
print(f"  - {DROUGHT_SCALER_PATH}")
print(f"  - {DROUGHT_FEATURES_PATH}")
print(f"  - drought_confusion_matrix.png")
print(f"  - drought_feature_importance.png")

if accuracy >= 0.75:
    print("\n✓ Good accuracy achieved!")
else:
    print("\n⚠ Consider further tuning or feature engineering")

print("="*80)
