import random

def fetch_live_weather():
    """
    Simulates fetching live weather data.
    In a real scenario, this would call a weather API.
    """
    # Mock data
    return {
        "temperature": random.uniform(20.0, 45.0),
        "rainfall": random.uniform(0.0, 150.0),
        "humidity": random.uniform(10.0, 90.0),
        "soil_moisture": random.uniform(5.0, 50.0)
    }

import joblib
import os
import logging

# Setup logging
logger = logging.getLogger("AgriUrban")

# Global variable to hold the model
model = None

def load_model(model_path="model.pkl"):
    """
    Loads the ML model from the specified path.
    """
    global model
    try:
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            logger.info(f"ML Model loaded from {model_path}")
        else:
            logger.warning(f"No ML model found at {model_path}. Using rule-based fallback.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

# Attempt to load model on module import
load_model()

def predict_risk(data):
    """
    Predicts risk using the loaded ML model if available.
    Expects data to contain features required by the model.
    """
    global model
    
    # Ensure data is in the right format for the model (e.g., list of lists or DataFrame)
    # This is a placeholder: adjust based on your model's expected input
    try:
        if model:
            # Example: assuming model expects [[temp, rainfall, humidity, soil_moisture]]
            features = [[
                data.get("temperature", 0),
                data.get("rainfall", 0),
                data.get("humidity", 0),
                data.get("soil_moisture", 0)
            ]]
            prediction = model.predict(features)[0]
            return prediction
    except Exception as e:
        logger.error(f"Model prediction failed: {e}. Falling back to rules.")

    # Fallback Rule-based Logic
    temp = data.get("temperature", 0)
    rain = data.get("rainfall", 0)

    if temp > 40:
        return "heatwave"
    elif rain > 100:
        return "flood"
    elif rain < 10:
        return "drought"
    else:
        return "normal"
