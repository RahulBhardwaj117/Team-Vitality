import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Define constants
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Generate Synthetic Data based on Agronomic Rules
# We simulate a dataset because we don't have a historical "application" log.
# The model will learn the relationship between Soil NPK, Crop, and Required Additions.

crops = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane']
soil_types = ['Clay', 'Sandy', 'Loam', 'Black']

# NPK Requirements (kg/ha)
crop_reqs = {
    "Wheat": {"N": 120, "P": 60, "K": 40},
    "Rice": {"N": 100, "P": 50, "K": 50},
    "Maize": {"N": 150, "P": 65, "K": 60},
    "Cotton": {"N": 120, "P": 60, "K": 60},
    "Sugarcane": {"N": 250, "P": 100, "K": 100}
}

data = []

for _ in range(5000): # Generate 5000 samples
    crop = np.random.choice(crops)
    soil = np.random.choice(soil_types)
    
    # Simulate Soil Content (randomized around typical values)
    # Clay: High K, Low P
    # Sandy: Low N, Low K
    # Loam: Balanced
    # Black: High N, High K
    
    if soil == 'Clay':
        s_n = np.random.normal(280, 30)
        s_p = np.random.normal(20, 5)
        s_k = np.random.normal(250, 30)
    elif soil == 'Sandy':
        s_n = np.random.normal(150, 20)
        s_p = np.random.normal(15, 5)
        s_k = np.random.normal(150, 20)
    elif soil == 'Loam':
        s_n = np.random.normal(300, 40)
        s_p = np.random.normal(25, 8)
        s_k = np.random.normal(300, 40)
    else: # Black
        s_n = np.random.normal(250, 30)
        s_p = np.random.normal(20, 5)
        s_k = np.random.normal(200, 25)
        
    # Ensure non-negative
    s_n = max(0, s_n)
    s_p = max(0, s_p)
    s_k = max(0, s_k)
    
    # Calculate Deficit (Target)
    # Assuming 20% soil nutrient availability efficiency
    req = crop_reqs[crop]
    
    rec_n = max(0, req['N'] - (s_n * 0.2))
    rec_p = max(0, req['P'] - (s_p * 0.2))
    rec_k = max(0, req['K'] - (s_k * 0.2))
    
    data.append({
        'Crop': crop,
        'Soil_Type': soil,
        'Soil_N': s_n,
        'Soil_P': s_p,
        'Soil_K': s_k,
        'Rec_N': rec_n,
        'Rec_P': rec_p,
        'Rec_K': rec_k
    })

df = pd.DataFrame(data)

# 2. Preprocessing
le_crop = LabelEncoder()
df['Crop_Encoded'] = le_crop.fit_transform(df['Crop'])

le_soil = LabelEncoder()
df['Soil_Encoded'] = le_soil.fit_transform(df['Soil_Type'])

X = df[['Crop_Encoded', 'Soil_Encoded', 'Soil_N', 'Soil_P', 'Soil_K']]
y = df[['Rec_N', 'Rec_P', 'Rec_K']]

# 3. Train Model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

score = model.score(X_test, y_test)
print(f"Model R2 Score: {score:.4f}")

# 4. Save Artifacts
joblib.dump(model, os.path.join(MODELS_DIR, 'fertilizer_model.pkl'))
joblib.dump(le_crop, os.path.join(MODELS_DIR, 'fertilizer_le_crop.pkl'))
joblib.dump(le_soil, os.path.join(MODELS_DIR, 'fertilizer_le_soil.pkl'))

print("Model and encoders saved successfully.")
