#!/usr/bin/env python3
"""
Improved Groundwater Level Prediction Model Training Script

Uses ensemble learning (XGBoost + Random Forest + LightGBM) with stacking
to achieve >90% R² accuracy in predicting future groundwater availability.

Outputs:
- groundwater_model_ensemble.pkl
- groundwater_scaler.pkl
- groundwater_features.json
- groundwater_training_report.txt
- groundwater_feature_importance.png
- groundwater_predictions_vs_actual.png
"""

import pandas as pd
import numpy as np
import joblib
import json
import warnings
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.ensemble import RandomForestRegressor, VotingRegressor, StackingRegressor
from sklearn.linear_model import Ridge
from xgboost import XGBRegressor
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# ================= CONFIGURATION =================
INPUT_FILE = "groundwater_enhanced.csv"
MODEL_FILE = "groundwater_model_ensemble.pkl"
SCALER_FILE = "groundwater_scaler.pkl"
FEATURES_FILE = "groundwater_features.json"
REPORT_FILE = "groundwater_training_report.txt"
TARGET_COL = "Extraction_Stage_Pct"  # Changed from Net GW availability

# Random seed for reproducibility
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

print("="*70)
print("ENHANCED GROUNDWATER PREDICTION MODEL TRAINING")
print("="*70)

# ================= DATA LOADING =================
print("\n[1/7] Loading enhanced dataset...")

df = pd.read_csv(INPUT_FILE)
print(f"  ✓ Loaded {len(df)} samples")

if TARGET_COL not in df.columns:
    raise ValueError(f"Target column '{TARGET_COL}' not found!")

# ================= FEATURE SELECTION =================
print("\n[2/7] Selecting features...")

# Exclude non-predictive columns
exclude_cols = [
    TARGET_COL,
    'Sl. No',
    'District',
    'District_Norm',
    'Unit_Name',  # Unit name is not predictive
    'Assessment Unit Name'  # Alternative name column
]

# Get numeric columns
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
features = [col for col in numeric_cols if col not in exclude_cols]

# Remove features with too many missing values (>50%)
valid_features = []
for feat in features:
    missing_pct = df[feat].isna().sum() / len(df)
    if missing_pct < 0.5:
        valid_features.append(feat)
    else:
        print(f"  ⚠ Removing {feat} ({missing_pct*100:.1f}% missing)")

features = valid_features

# Handle remaining missing values
df[features] = df[features].fillna(df[features].median())

X = df[features]
y = df[TARGET_COL]

print(f"  ✓ Selected {len(features)} features")
print(f"  ✓ Target: {TARGET_COL}")

# ================= TRAIN/VALIDATION SPLIT =================
print("\n[3/7] Splitting data...")

X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.25, random_state=RANDOM_STATE
)

print(f"  ✓ Training set: {len(X_train)} samples")
print(f"  ✓ Validation set: {len(X_val)} samples")

# ================= FEATURE SCALING =================
print("\n[4/7] Scaling features...")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_val_scaled = scaler.transform(X_val)

# Save scaler and features
joblib.dump(scaler, SCALER_FILE)
with open(FEATURES_FILE, "w") as f:
    json.dump(features, f, indent=2)

print(f"  ✓ Scaler saved to {SCALER_FILE}")
print(f"  ✓ Features saved to {FEATURES_FILE}")

# ================= BUILD ENSEMBLE MODEL =================
print("\n[5/7] Building ensemble model...")
print("  Creating base models:")

# Base Model 1: XGBoost (optimized)
print("    [1/3] XGBoost Regressor")
xgb_model = XGBRegressor(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.1,
    reg_lambda=1.5,
    random_state=RANDOM_STATE,
    n_jobs=-1,
    verbosity=0
)

# Base Model 2: Random Forest
print("    [2/3] Random Forest Regressor")
rf_model = RandomForestRegressor(
    n_estimators=500,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    max_features='sqrt',
    bootstrap=True,
    random_state=RANDOM_STATE,
    n_jobs=-1
)

# Base Model 3: LightGBM
print("    [3/3] LightGBM Regressor")
lgb_model = lgb.LGBMRegressor(
    n_estimators=500,
    max_depth=7,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_samples=5,
    reg_alpha=0.1,
    reg_lambda=1.5,
    random_state=RANDOM_STATE,
    n_jobs=-1,
    verbose=-1
)

# Stacking Ensemble with Ridge meta-learner
print("\n  Building stacking ensemble...")
ensemble = StackingRegressor(
    estimators=[
        ('xgb', xgb_model),
        ('rf', rf_model),
        ('lgb', lgb_model)
    ],
    final_estimator=Ridge(alpha=1.0),
    cv=5,
    n_jobs=-1
)

# ================= TRAIN MODEL =================
print("\n[6/7] Training ensemble model...")
print("  This may take 5-10 minutes...")

ensemble.fit(X_train_scaled, y_train)
print("  ✓ Ensemble model trained!")

# ================= EVALUATE MODEL =================
print("\n[7/7] Evaluating model performance...")

# Cross-validation on training set
cv_scores = cross_val_score(
    ensemble, X_train_scaled, y_train, 
    cv=KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
    scoring='r2',
    n_jobs=-1
)

# Validation set predictions
y_train_pred = ensemble.predict(X_train_scaled)
y_val_pred = ensemble.predict(X_val_scaled)

# Metrics
train_r2 = r2_score(y_train, y_train_pred)
train_mae = mean_absolute_error(y_train, y_train_pred)
train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))

val_r2 = r2_score(y_val, y_val_pred)
val_mae = mean_absolute_error(y_val, y_val_pred)
val_rmse = np.sqrt(mean_squared_error(y_val, y_val_pred))

cv_r2_mean = cv_scores.mean()
cv_r2_std = cv_scores.std()

# Display results
print("\n" + "="*70)
print("MODEL PERFORMANCE SUMMARY")
print("="*70)
print("\nCross-Validation (5-Fold):")
print(f"  Mean R²: {cv_r2_mean:.4f} ± {cv_r2_std:.4f}")
print(f"  Individual folds: {[f'{s:.4f}' for s in cv_scores]}")

print("\nTraining Set:")
print(f"  R² Score: {train_r2:.4f}")
print(f"  MAE:      {train_mae:.2f} Ham")
print(f"  RMSE:     {train_rmse:.2f} Ham")

print("\nValidation Set:")
print(f"  R² Score: {val_r2:.4f}")
print(f"  MAE:      {val_mae:.2f} Ham")
print(f"  RMSE:     {val_rmse:.2f} Ham")

# Overfitting check
overfitting_gap = train_r2 - val_r2
print(f"\nOverfitting Check:")
print(f"  Train-Val R² Gap: {overfitting_gap:.4f}", end="")
if overfitting_gap < 0.05:
    print(" ✓ (Good)")
elif overfitting_gap < 0.10:
    print(" ⚠ (Acceptable)")
else:
    print(" ✗ (Possible overfitting)")

print("="*70)

# Success criteria
if val_r2 >= 0.90:
    print("\n🎉 SUCCESS! Target R² > 0.90 achieved!")
elif val_r2 >= 0.85:
    print("\n✓ Good performance (R² > 0.85)")
else:
    print(f"\n⚠ Performance below target (R²: {val_r2:.4f})")

# ================= SAVE MODEL =================
print(f"\nSaving model to {MODEL_FILE}...")
joblib.dump(ensemble, MODEL_FILE)
print("  ✓ Model saved!")

# ================= SAVE TRAINING REPORT =================
with open(REPORT_FILE, 'w') as f:
    f.write("="*70 + "\n")
    f.write("GROUNDWATER PREDICTION MODEL - TRAINING REPORT\n")
    f.write("="*70 + "\n\n")
    
    f.write("MODEL ARCHITECTURE\n")
    f.write("-"*70 + "\n")
    f.write("Ensemble Type: Stacking Regressor\n")
    f.write("Base Models:\n")
    f.write("  1. XGBoost Regressor (500 trees)\n")
    f.write("  2. Random Forest Regressor (500 trees)\n")
    f.write("  3. LightGBM Regressor (500 trees)\n")
    f.write("Meta-Learner: Ridge Regression (alpha=1.0)\n\n")
    
    f.write("DATASET\n")
    f.write("-"*70 + "\n")
    f.write(f"Total Samples: {len(df)}\n")
    f.write(f"Training Samples: {len(X_train)}\n")
    f.write(f"Validation Samples: {len(X_val)}\n")
    f.write(f"Features: {len(features)}\n")
    f.write(f"Target: {TARGET_COL}\n\n")
    
    f.write("PERFORMANCE METRICS\n")
    f.write("-"*70 + "\n")
    f.write(f"Cross-Validation R² (5-Fold): {cv_r2_mean:.4f} ± {cv_r2_std:.4f}\n")
    f.write(f"Training R²:   {train_r2:.4f}\n")
    f.write(f"Validation R²: {val_r2:.4f}\n")
    f.write(f"Training MAE:  {train_mae:.2f} Ham\n")
    f.write(f"Validation MAE: {val_mae:.2f} Ham\n")
    f.write(f"Training RMSE: {train_rmse:.2f} Ham\n")
    f.write(f"Validation RMSE: {val_rmse:.2f} Ham\n\n")
    
    f.write("FEATURES\n")
    f.write("-"*70 + "\n")
    for i, feat in enumerate(features, 1):
        f.write(f"{i:2d}. {feat}\n")

print(f"  ✓ Report saved to {REPORT_FILE}")

# ================= FEATURE IMPORTANCE =================
print("\nGenerating feature importance plot...")

# Get feature importance from XGBoost (most interpretable)
xgb_importances = ensemble.named_estimators_['xgb'].feature_importances_
rf_importances = ensemble.named_estimators_['rf'].feature_importances_
lgb_importances = ensemble.named_estimators_['lgb'].feature_importances_

# Average importance across models
avg_importances = (xgb_importances + rf_importances + lgb_importances) / 3

# Create dataframe
imp_df = pd.DataFrame({
    'Feature': features,
    'Importance': avg_importances,
    'XGB': xgb_importances,
    'RF': rf_importances,
    'LGB': lgb_importances
})
imp_df = imp_df.sort_values('Importance', ascending=False)

# Plot top 20 features
plt.figure(figsize=(12, 8))
top_features = imp_df.head(20)
sns.barplot(x='Importance', y='Feature', data=top_features, palette='viridis')
plt.title('Top 20 Feature Importances - Groundwater Ensemble Model', fontsize=14, fontweight='bold')
plt.xlabel('Average Importance Score', fontsize=12)
plt.ylabel('Feature', fontsize=12)
plt.tight_layout()
plt.savefig('groundwater_feature_importance.png', dpi=300)
print("  ✓ Feature importance saved to groundwater_feature_importance.png")

# ================= PREDICTIONS VS ACTUAL PLOT =================
print("Generating predictions vs actual plot...")

plt.figure(figsize=(10, 8))

# Combine train and validation for comprehensive view
y_all_actual = np.concatenate([y_train, y_val])
y_all_pred = np.concatenate([y_train_pred, y_val_pred])

# Scatter plot
plt.scatter(y_train, y_train_pred, alpha=0.6, s=100, label=f'Training (R²={train_r2:.3f})', c='blue')
plt.scatter(y_val, y_val_pred, alpha=0.6, s=100, label=f'Validation (R²={val_r2:.3f})', c='red')

# Perfect prediction line
min_val = min(y_all_actual.min(), y_all_pred.min())
max_val = max(y_all_actual.max(), y_all_pred.max())
plt.plot([min_val, max_val], [min_val, max_val], 'k--', lw=2, label='Perfect Prediction')

plt.xlabel('Actual Extraction Stage (%)', fontsize=12)
plt.ylabel('Predicted Extraction Stage (%)', fontsize=12)
plt.title('Groundwater Extraction Stage: Predictions vs Actual', fontsize=14, fontweight='bold')
plt.legend(fontsize=10)
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('groundwater_predictions_vs_actual.png', dpi=300)
print("  ✓ Predictions plot saved to groundwater_predictions_vs_actual.png")

# ================= COMPLETION =================
print("\n" + "="*70)
print("✓ TRAINING COMPLETE!")
print("="*70)
print("\nArtifacts created:")
print(f"  1. {MODEL_FILE}")
print(f"  2. {SCALER_FILE}")
print(f"  3. {FEATURES_FILE}")
print(f"  4. {REPORT_FILE}")
print(f"  5. groundwater_feature_importance.png")
print(f"  6. groundwater_predictions_vs_actual.png")
print("\nYou can now use groundwater_forcast.py for predictions!")
print("="*70 + "\n")
