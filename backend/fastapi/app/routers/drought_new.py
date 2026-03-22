from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import requests
import os
import sys

router = APIRouter()

class DailyForecast(BaseModel):
    day: str
    condition: str
    rain_chance: float
    temp: float
    icon: str
    humidity: float
    wind: float
    min_temp: float
    max_temp: float

class DroughtPredictionRequest(BaseModel):
    forecast: List[DailyForecast]
    location: str = "Delhi"

class DroughtPredictionResponse(BaseModel):
    risk_level: str
    soil_moisture: str
    rainfall_deficit: str
    dry_days: int
    avg_humidity: int
    confidence: int
    recommendation: str

GEMINI_API_KEY = "AIzaSyA5BuCNj1fgJNnwryjjLUKxjIluCzSrbnc"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

# Add the directory containing the model script to sys.path
# Current file: backend/fastapi/app/routers/drought_new.py
# Target: backend/fastapi/training
# Path: ../../training
training_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../training"))
sys.path.append(training_path)

print(f"DEBUG: Added to sys.path: {training_path}")

# Import the model logic
try:
    import train_drought_model_improved as drought_model
    print("DEBUG: Successfully imported train_drought_model_improved")
except Exception as e:
    print(f"ERROR: Error importing train_drought_model_improved: {e}")
    print(f"DEBUG: sys.path is: {sys.path}")
    drought_model = None

def calculate_drought_risk(forecast_data):
    """
    Advanced Drought Risk Calculator
    Uses the AI model logic from train_drought_model_improved.py
    """
    if not drought_model:
        return {
            "risk_level": "Low",
            "soil_moisture": "Adequate",
            "rainfall_deficit": "None",
            "dry_days": 0,
            "avg_humidity": 50,
            "confidence": 50,
            "drought_score": 0
        }

    try:
        # Prepare data for the model function
        # It expects a list of dicts with keys matching the forecast data
        data = [f.dict() for f in forecast_data]
        
        # Call the prediction function from the imported module
        result = drought_model.predict_drought_risk(data)
        
        if result:
            return result
        else:
            raise Exception("Model returned None")

    except Exception as e:
        print(f"⚠️ Error in drought calculation: {e}")
        import traceback
        traceback.print_exc()
        return {
            "risk_level": "Low",
            "soil_moisture": "Adequate",
            "rainfall_deficit": "None",
            "dry_days": 0,
            "avg_humidity": 50,
            "confidence": 50,
            "drought_score": 0
        }

def get_rule_based_recommendation(risk_level, dry_days, soil_moisture, avg_humidity):
    """Fallback rule-based recommendations"""
    if risk_level == "High":
        return f"<strong>⚠️ Severe Drought Risk!</strong><br>{dry_days} dry days expected with {avg_humidity}% humidity. <strong>Critical water conservation required.</strong> Implement strict irrigation schedules. Reduce non-essential water use. Consider drought-resistant crops. Monitor groundwater levels closely."
    elif risk_level == "Medium":
        return f"<strong>⚠️ Moderate Drought Risk.</strong><br>{dry_days} dry days with {avg_humidity}% humidity. Practice water conservation. Optimize irrigation timing (early morning/evening). Mulch soil to retain moisture. Harvest rainwater when possible."
    else:
        return f"<strong>✅ Low Drought Risk.</strong><br>Soil moisture levels are adequate ({avg_humidity}% humidity). Continue standard water management practices. Monitor weather conditions regularly."

def get_gemini_recommendation(risk_level, dry_days, soil_moisture, avg_humidity):
    prompt = f"""
    You are an expert agricultural drought consultant.
    Analyze the following drought risk data for Delhi:
    - Risk Level: {risk_level}
    - Dry Days Expected: {dry_days} days
    - Soil Moisture: {soil_moisture}
    - Average Humidity: {avg_humidity}%

    Provide a concise, actionable recommendation (max 3 sentences) for farmers and water managers.
    Focus on water conservation and irrigation strategies.
    Format as HTML with <strong> tags for emphasis.
    """
    try:
        print(f"🌐 Calling Gemini API for Drought...")
        response = requests.post(GEMINI_URL, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=10)
        
        if response.status_code == 200:
            result = response.json()['candidates'][0]['content']['parts'][0]['text']
            print(f"✅ Gemini Recommendation: {result}")
            return result
        else:
            print(f"⚠️ Gemini API Error: Status {response.status_code}, using fallback")
            return get_rule_based_recommendation(risk_level, dry_days, soil_moisture, avg_humidity)
    except Exception as e:
        print(f"⚠️ Gemini API Exception: {type(e).__name__}: {str(e)}, using fallback")
        return get_rule_based_recommendation(risk_level, dry_days, soil_moisture, avg_humidity)

@router.post("/integrated", response_model=DroughtPredictionResponse)
def predict_drought_integrated(request: DroughtPredictionRequest):
    """
    Analyze forecast data for drought risk
    Uses rule-based calculation for reliable predictions
    """
    try:
        print(f"💧 Drought prediction request received for {request.location}")
        print(f"📊 Analyzing {len(request.forecast)} days of forecast data")
        
        # Calculate drought risk
        result = calculate_drought_risk(request.forecast)
        
        print(f"📈 Drought Analysis: {result}")
        
        # Get recommendation (try Gemini, fallback to rule-based)
        recommendation = get_gemini_recommendation(
            result['risk_level'],
            result['dry_days'],
            result['soil_moisture'],
            result['avg_humidity']
        )
        
        response = {
            "risk_level": result['risk_level'],
            "soil_moisture": result['soil_moisture'],
            "rainfall_deficit": result['rainfall_deficit'],
            "dry_days": result['dry_days'],
            "avg_humidity": result['avg_humidity'],
            "confidence": result['confidence'],
            "recommendation": recommendation
        }
        
        print(f"✅ Drought prediction successful: {response['risk_level']} risk")
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Drought prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
