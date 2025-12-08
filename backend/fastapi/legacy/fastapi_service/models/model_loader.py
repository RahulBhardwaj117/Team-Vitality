import os
import sys
import logging
import joblib
import json
import pandas as pd
from typing import Any, Dict, Optional

logger = logging.getLogger("AgriUrbanAI")

# Path configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

class ModelLoader:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance.loaded_models = {}
            cls._instance.model_paths = {
                "flood": {
                    "model": os.path.join(BASE_DIR, "flood_xgboost_balanced.pkl"),
                    "scaler": os.path.join(BASE_DIR, "flood_scaler_balanced.pkl"),
                    "features": os.path.join(BASE_DIR, "flood_features_balanced.json")
                },
                "drought": {
                    "model": os.path.join(BASE_DIR, "drought_model.pkl"),
                    "scaler": os.path.join(BASE_DIR, "drought_scaler.pkl"),
                    "features": os.path.join(BASE_DIR, "drought_features.json")
                },
                "heatwave": {
                    "model": os.path.join(BASE_DIR, "heatwave_model_ensemble.pkl"),
                    "scaler": os.path.join(BASE_DIR, "heatwave_scaler.pkl"),
                    "features": os.path.join(BASE_DIR, "heatwave_features.json")
                },
                "groundwater": {
                    "model": os.path.join(BASE_DIR, "groundwater_model.pkl"),
                    "scaler": os.path.join(BASE_DIR, "groundwater_scaler.pkl")
                },
                "weather": {
                    "data": os.path.join(BASE_DIR, "final_weather.csv")
                }
            }
        return cls._instance

    def get_model(self, model_name: str) -> Dict[str, Any]:
        """
        Lazy load a model. If already loaded, return it.
        If not, load from disk and cache it.
        """
        if model_name in self.loaded_models:
            return self.loaded_models[model_name]
            
        logger.info(f"Lazy loading model: {model_name}...")
        
        try:
            paths = self.model_paths.get(model_name)
            if not paths:
                raise ValueError(f"Unknown model: {model_name}")
                
            artifacts = {}
            
            # Specific loading logic for each model type
            if model_name == "weather":
                # Weather model is mainly data + logic in forecast_future_weather.py
                # We just verify data exists here
                if not os.path.exists(paths["data"]):
                    logger.warning(f"Weather data not found at {paths['data']}")
                artifacts["status"] = "ready"
                
            elif model_name in ["flood", "drought", "heatwave"]:
                # Standard Scikit-Learn/XGBoost models
                if os.path.exists(paths["model"]):
                    artifacts["model"] = joblib.load(paths["model"])
                else:
                    logger.error(f"Model file missing: {paths['model']}")
                    raise FileNotFoundError(f"Model file missing: {paths['model']}")
                    
                if "scaler" in paths and os.path.exists(paths["scaler"]):
                    artifacts["scaler"] = joblib.load(paths["scaler"])
                    
                if "features" in paths and os.path.exists(paths["features"]):
                    with open(paths["features"], 'r') as f:
                        artifacts["features"] = json.load(f)
                        
            self.loaded_models[model_name] = artifacts
            logger.info(f"Successfully loaded {model_name}")
            return artifacts
            
        except Exception as e:
            logger.error(f"Failed to load {model_name}: {e}")
            raise e

model_loader = ModelLoader()
