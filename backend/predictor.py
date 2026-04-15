import os
import logging
import random

# Setup logging
logger = logging.getLogger("AgriUrban")

# Global variables for models
model = None

def get_base_dir():
    """Returns the base directory of the backend."""
    return os.path.dirname(os.path.abspath(__file__))

def load_model(model_name="model.pkl"):
    """
    Loads an ML model from the current directory or the central models directory.
    """
    global model
    import joblib # Import here to avoid global failure if not installed
    
    # Potential paths to check
    base_dir = get_base_dir()
    search_paths = [
        os.path.join(base_dir, model_name),
        os.path.join(base_dir, "fastapi", "models", model_name),
        os.path.join(base_dir, "fastapi", "models", "flood_xgboost_balanced.pkl") # Default fallback model
    ]
    
    for path in search_paths:
        if os.path.exists(path):
            try:
                model = joblib.load(path)
                logger.info(f"ML Model loaded successfully from: {path}")
                return model
            except Exception as e:
                logger.error(f"Error loading model from {path}: {e}")
    
    logger.warning(f"No ML model found. Tested paths: {search_paths}. Using rule-based fallback.")
    return None

def fetch_live_weather():
    """
    Simulates or fetches live weather data.
    """
    # In a real scenario, this would call an API like OpenWeather
    return {
        "temperature": random.uniform(20.0, 45.0),
        "rainfall": random.uniform(0.0, 150.0),
        "humidity": random.uniform(10.0, 90.0),
        "soil_moisture": random.uniform(5.0, 50.0)
    }

# Initialization
load_model()

def predict_risk(data):
    """
    Predicts environmental risk using ML model or heuristic fallback.
    """
    global model
    
    # Try ML Prediction (XGBoost/Scikit-Learn)
    if model:
        try:
            # Assuming model expects [temp, rainfall, humidity, soil_moisture]
            features = [[
                data.get("temperature", 25),
                data.get("rainfall", 0),
                data.get("humidity", 50),
                data.get("soil_moisture", 20)
            ]]
            # Some models return an array of strings, others numeric codes
            prediction = model.predict(features)[0]
            
            # Convert numeric prediction to string if necessary
            if isinstance(prediction, (int, float)):
                mapping = {0: "normal", 1: "flood", 2: "drought", 3: "heatwave"}
                return mapping.get(int(prediction), "normal")
            return str(prediction).lower()
        except Exception as e:
            logger.error(f"ML Prediction failed: {e}. Switching to heuristics.")

    # Rule-based Heuristic Fallback
    temp = data.get("temperature", 25)
    rain = data.get("rainfall", 0)
    
    if temp > 40:
        return "heatwave"
    elif rain > 100:
        return "flood"
    elif rain < 10 and temp > 30:
        return "drought"
    else:
        return "normal"
