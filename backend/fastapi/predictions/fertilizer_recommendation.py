import pandas as pd
import numpy as np
import os
import logging
import joblib

logger = logging.getLogger("AgriUrbanAI")

class FertilizerRecommender:
    def __init__(self, models_dir="models"):
        self.models_dir = models_dir
        self.model = None
        self.le_crop = None
        self.le_soil = None
        self.load_models()

    def load_models(self):
        try:
            model_path = os.path.join(self.models_dir, "fertilizer_model.pkl")
            crop_enc_path = os.path.join(self.models_dir, "fertilizer_le_crop.pkl")
            soil_enc_path = os.path.join(self.models_dir, "fertilizer_le_soil.pkl")
            
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                self.le_crop = joblib.load(crop_enc_path)
                self.le_soil = joblib.load(soil_enc_path)
                logger.info("Fertilizer models loaded successfully.")
            else:
                logger.warning("Fertilizer model files not found. Using fallback logic.")
                
        except Exception as e:
            logger.error(f"Error loading fertilizer models: {e}")

    def recommend(self, crop_type, soil_type="Loam", nitrogen=None, phosphorus=None, potassium=None):
        """
        Recommend fertilizer based on crop and soil nutrients using ML model.
        """
        
        # Default soil nutrient content (fallback)
        soil_nutrients = {
            "Clay": {"N": 280, "P": 20, "K": 250},
            "Sandy": {"N": 150, "P": 15, "K": 150},
            "Loam": {"N": 300, "P": 25, "K": 300},
            "Black": {"N": 250, "P": 20, "K": 200}
        }
        
        # Normalize inputs
        crop_type = crop_type.capitalize() if crop_type else "Wheat"
        soil_type = soil_type.capitalize() if soil_type else "Loam"
        
        # Get current soil status if missing
        if nitrogen is None:
            current = soil_nutrients.get(soil_type, soil_nutrients["Loam"])
            nitrogen = current["N"]
            phosphorus = current["P"]
            potassium = current["K"]
            
        # ML Prediction
        if self.model and self.le_crop and self.le_soil:
            try:
                # Encode inputs
                # Handle unseen labels gracefully by falling back to defaults
                if crop_type not in self.le_crop.classes_:
                    crop_type = "Wheat"
                if soil_type not in self.le_soil.classes_:
                    soil_type = "Loam"
                    
                crop_enc = self.le_crop.transform([crop_type])[0]
                soil_enc = self.le_soil.transform([soil_type])[0]
                
                # Predict
                features = np.array([[crop_enc, soil_enc, nitrogen, phosphorus, potassium]])
                prediction = self.model.predict(features)[0]
                
                n_deficit = max(0, prediction[0])
                p_deficit = max(0, prediction[1])
                k_deficit = max(0, prediction[2])
                
            except Exception as e:
                logger.error(f"Prediction error: {e}. Using fallback.")
                return self._fallback_recommend(crop_type, soil_type, nitrogen, phosphorus, potassium)
        else:
            return self._fallback_recommend(crop_type, soil_type, nitrogen, phosphorus, potassium)
        
        # Generate Recommendations
        recommendations = []
        
        if n_deficit > 0:
            recommendations.append(f"Apply {int(n_deficit * 2.2)} kg/ha Urea for Nitrogen.")
        if p_deficit > 0:
            recommendations.append(f"Apply {int(p_deficit * 6.25)} kg/ha Super Phosphate for Phosphorus.")
        if k_deficit > 0:
            recommendations.append(f"Apply {int(k_deficit * 1.6)} kg/ha Muriate of Potash for Potassium.")
            
        if not recommendations:
            recommendations.append("Soil nutrients are sufficient. Maintain current organic compost application.")
            
        return {
            "crop": crop_type,
            "soil_type": soil_type,
            "nutrients_status": {"N": nitrogen, "P": phosphorus, "K": potassium},
            "recommended_nutrients": {"N": round(n_deficit, 2), "P": round(p_deficit, 2), "K": round(k_deficit, 2)},
            "recommendations": recommendations
        }

    def _fallback_recommend(self, crop_type, soil_type, nitrogen, phosphorus, potassium):
        # ... (Previous logic as fallback) ...
        # Simplified for brevity, reusing the core logic from previous version
        crop_requirements = {
            "Wheat": {"N": 120, "P": 60, "K": 40},
            "Rice": {"N": 100, "P": 50, "K": 50},
            "Maize": {"N": 150, "P": 65, "K": 60},
            "Cotton": {"N": 120, "P": 60, "K": 60},
            "Sugarcane": {"N": 250, "P": 100, "K": 100}
        }
        
        req = crop_requirements.get(crop_type, crop_requirements["Wheat"])
        
        n_deficit = max(0, req["N"] - (nitrogen * 0.2))
        p_deficit = max(0, req["P"] - (phosphorus * 0.2))
        k_deficit = max(0, req["K"] - (potassium * 0.2))
        
        recommendations = []
        if n_deficit > 0: recommendations.append(f"Apply {int(n_deficit * 2.2)} kg/ha Urea.")
        if p_deficit > 0: recommendations.append(f"Apply {int(p_deficit * 6.25)} kg/ha SSP.")
        if k_deficit > 0: recommendations.append(f"Apply {int(k_deficit * 1.6)} kg/ha MOP.")
        
        if not recommendations: recommendations.append("Nutrients sufficient.")
        
        return {
            "crop": crop_type,
            "soil_type": soil_type,
            "nutrients_status": {"N": nitrogen, "P": phosphorus, "K": potassium},
            "recommended_nutrients": {"N": round(n_deficit, 2), "P": round(p_deficit, 2), "K": round(k_deficit, 2)},
            "recommendations": recommendations,
            "note": "Using fallback rule-based logic."
        }

def get_recommendation(crop, soil_type, n=None, p=None, k=None):
    recommender = FertilizerRecommender(models_dir=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models')))
    return recommender.recommend(crop, soil_type, n, p, k)
