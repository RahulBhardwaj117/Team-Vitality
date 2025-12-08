import joblib
import pandas as pd
import json
import numpy as np

try:
    # Load model
    models = joblib.load("weather_models.pkl")
    model = models['Rainfall']
    print(f"Model loaded. Expected features: {model.n_features_in_}")
    
    # Load features
    with open("model_features.json", "r") as f:
        features = json.load(f)
    print(f"Features loaded: {len(features)}")
    
    # Create dummy input
    X = pd.DataFrame(np.zeros((1, len(features))), columns=features)
    print(f"Dummy input shape: {X.shape}")
    print(f"Dummy input columns: {X.columns.tolist()}")
    
    # Predict
    pred = model.predict(X)
    print(f"Prediction success: {pred}")
    
except Exception as e:
    print(f"Error: {e}")
