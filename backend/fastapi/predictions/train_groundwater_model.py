# train_groundwater_model.py
"""
Training script for groundwater level prediction using XGBoost Regressor.
The dataset (ground_water.csv) contains district‑wise groundwater statistics.
We predict the column "Net GW availability for future" using all other numeric features.
Artifacts saved:
- groundwater_model.pkl
- groundwater_scaler.pkl
- groundwater_features.json
- groundwater_feature_importance.png
"""

import pandas as pd
import numpy as np
import joblib
import json
import warnings
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# ================= CONFIGURATION =================
GROUNDWATER_FILE = "ground_water.csv"
MODEL_FILE = "groundwater_model.pkl"
SCALER_FILE = "groundwater_scaler.pkl"
FEATURES_FILE = "groundwater_features.json"
TARGET_COL = "Net GW availability for future"

# ================= DATA LOADING =================
print("Loading groundwater dataset...")

gw = pd.read_csv(GROUNDWATER_FILE)
# Drop rows that are completely empty
gw = gw.dropna(axis=0, how='all').reset_index(drop=True)

if TARGET_COL not in gw.columns:
    raise ValueError(f"Target column '{TARGET_COL}' not found in dataset")

# Select numeric columns only (exclude district name, etc.)
numeric_cols = gw.select_dtypes(include=[np.number]).columns.tolist()
features = [col for col in numeric_cols if col != TARGET_COL]

X = gw[features]
y = gw[TARGET_COL]

print(f"Dataset size: {X.shape[0]} samples, {len(features)} features")

# ================= TRAIN/VALIDATION SPLIT =================
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

# ================= SCALING =================
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_val_scaled = scaler.transform(X_val)

# Save scaler and feature list
joblib.dump(scaler, SCALER_FILE)
with open(FEATURES_FILE, "w") as f:
    json.dump(features, f)
print("✓ Scaler and feature list saved.")

# ================= HYPERPARAMETER TUNING =================
param_grid = {
    "n_estimators": [200, 400, 600, 800],
    "max_depth": [3, 4, 5, 6, 8],
    "learning_rate": [0.01, 0.05, 0.1, 0.15],
    "subsample": [0.7, 0.8, 0.9, 1.0],
    "colsample_bytree": [0.7, 0.8, 0.9, 1.0],
    "min_child_weight": [1, 3, 5],
    "gamma": [0, 0.1, 0.3],
    "reg_alpha": [0, 0.01, 0.1],
    "reg_lambda": [1, 1.5, 2]
}

xgb = XGBRegressor(objective="reg:squarederror", n_jobs=-1, random_state=42)
search = RandomizedSearchCV(
    estimator=xgb,
    param_distributions=param_grid,
    n_iter=30,
    cv=5,
    scoring="r2",
    verbose=2,
    random_state=42,
    n_jobs=-1,
)
print("Starting hyperparameter search (30 iterations, 5‑fold CV)...")
search.fit(X_train_scaled, y_train)
best_model = search.best_estimator_
print("Best parameters:")
for k, v in search.best_params_.items():
    print(f"  {k}: {v}")
print(f"Best CV R²: {search.best_score_:.4f}")

# ================= EVALUATE ON VALIDATION SET =================
y_pred = best_model.predict(X_val_scaled)
val_r2 = r2_score(y_val, y_pred)
val_mae = mean_absolute_error(y_val, y_pred)
val_rmse = np.sqrt(mean_squared_error(y_val, y_pred))
print("\nValidation performance:")
print(f"R²: {val_r2:.4f}")
print(f"MAE: {val_mae:.3f} m")
print(f"RMSE: {val_rmse:.3f} m")

# ================= SAVE MODEL =================
joblib.dump(best_model, MODEL_FILE)
print(f"✓ Model saved to {MODEL_FILE}")

# ================= FEATURE IMPORTANCE PLOT =================
importances = best_model.feature_importances_
imp_df = pd.DataFrame({"Feature": features, "Importance": importances})
imp_df = imp_df.sort_values("Importance", ascending=False)
plt.figure(figsize=(10, 6))
sns.barplot(x="Importance", y="Feature", data=imp_df.head(15))
plt.title("Top 15 Feature Importances - Groundwater Model")
plt.tight_layout()
plt.savefig("groundwater_feature_importance.png")
print("✓ Feature importance plot saved as groundwater_feature_importance.png")

print("\nTraining complete!")
