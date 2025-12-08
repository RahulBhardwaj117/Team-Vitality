from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import pandas as pd
import requests
import math

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

class HeatwavePredictionRequest(BaseModel):
    forecast: List[DailyForecast]
    location: str = "Delhi"

class HeatwavePredictionResponse(BaseModel):
    risk_level: str
    peak_temp: float
    duration: int
    confidence: int
    recommendation: str

GEMINI_API_KEY = "AIzaSyC3Dsf6Kb6XPe51waZ94jBsmgCUPWhH6Zw"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

def calculate_heatwave_risk(forecast_data):
    """
    Rule-based heatwave risk calculator
    Analyzes temperature patterns from forecast data
    """
    try:
        df = pd.DataFrame([f.dict() for f in forecast_data])
        
        if df.empty:
            return {
                "risk_level": "Low",
                "peak_temp": 30.0,
                "duration": 0,
                "confidence": 0,
                "very_hot_days": 0,
                "hot_days": 0,
                "avg_temp": 30.0
            }
        
        # Extract temperature data
        temps = df['max_temp'].values
        peak_temp = float(temps.max())
        avg_temp = float(temps.mean())
        
        # Count hot days
        very_hot_days = len(df[df['max_temp'] >= 42])  # >= 42°C
        hot_days = len(df[df['max_temp'] >= 40])       # >= 40°C
        warm_days = len(df[df['max_temp'] >= 38])      # >= 38°C
        
        # Determine risk level
        if very_hot_days >= 3 or peak_temp >= 45:
            risk_level = "High"
            duration = very_hot_days
            confidence = 92
        elif hot_days >= 2 or peak_temp >= 42:
            risk_level = "Medium"
            duration = hot_days
            confidence = 88
        elif warm_days >= 3 or peak_temp >= 38:
            risk_level = "Low"
            duration = warm_days
            confidence = 85
        else:
            risk_level = "Low"
            duration = 0
            confidence = 90
        
        return {
            "risk_level": risk_level,
            "peak_temp": round(peak_temp, 1),
            "duration": int(duration),
            "confidence": confidence,
            "very_hot_days": very_hot_days,
            "hot_days": hot_days,
            "avg_temp": round(avg_temp, 1)
        }
    except Exception as e:
        print(f"⚠️ Error in heatwave calculation: {e}")
        # Return safe defaults
        return {
            "risk_level": "Low",
            "peak_temp": 35.0,
            "duration": 0,
            "confidence": 50,
            "very_hot_days": 0,
            "hot_days": 0,
            "avg_temp": 32.0
        }

def get_rule_based_recommendation(risk_level, peak_temp, duration):
    """Fallback rule-based recommendations"""
    if risk_level == "High":
        return f"<strong>⚠️ Severe Heatwave Alert!</strong><br>Peak temperatures of {peak_temp}°C expected for {duration} days. <strong>Avoid outdoor activities between 12-4 PM.</strong> Stay indoors in air-conditioned spaces. Drink at least 3-4 liters of water daily. Check on elderly neighbors and vulnerable individuals."
    elif risk_level == "Medium":
        return f"<strong>🌡️ Moderate Heat Risk.</strong><br>Temperatures reaching {peak_temp}°C over {duration} days. Limit sun exposure during peak hours. Wear light, breathable clothing. Stay hydrated with regular water intake. Avoid strenuous outdoor activities."
    else:  # Low
        return f"<strong>✅ Normal Summer Temperatures.</strong><br>Peak of {peak_temp}°C is within normal range. Standard summer precautions apply. Stay hydrated and use sunscreen when outdoors."

def get_gemini_recommendation(risk_level, peak_temp, duration):
    prompt = f"""
    You are an expert weather safety consultant.
    Analyze the following heatwave risk data for Delhi:
    - Risk Level: {risk_level}
    - Peak Temperature: {peak_temp}°C
    - Duration: {duration} days

    Provide a concise, actionable recommendation (max 3 sentences) for residents to stay safe.
    Format as HTML with <strong> tags for emphasis.
    """
    try:
        print(f"🌐 Calling Gemini API for Heatwave...")
        response = requests.post(GEMINI_URL, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=10)
        
        if response.status_code == 200:
            result = response.json()['candidates'][0]['content']['parts'][0]['text']
            print(f"✅ Gemini Recommendation: {result}")
            return result
        else:
            print(f"⚠️ Gemini API Error: Status {response.status_code}, using fallback")
            return get_rule_based_recommendation(risk_level, peak_temp, duration)
    except Exception as e:
        print(f"⚠️ Gemini API Exception: {type(e).__name__}: {str(e)}, using fallback")
        return get_rule_based_recommendation(risk_level, peak_temp, duration)

@router.post("/integrated", response_model=HeatwavePredictionResponse)
def predict_heatwave_integrated(request: HeatwavePredictionRequest):
    """
    Analyze forecast data for heatwave risk
    Uses rule-based calculation for reliable predictions
    """
    try:
        print(f"🌡️ Heatwave prediction request received for {request.location}")
        print(f"📊 Analyzing {len(request.forecast)} days of forecast data")
        
        # Calculate heatwave risk
        result = calculate_heatwave_risk(request.forecast)
        
        print(f"📈 Heatwave Analysis: {result}")
        
        # Get recommendation (try Gemini, fallback to rule-based)
        recommendation = get_gemini_recommendation(
            result['risk_level'], 
            result['peak_temp'], 
            result['duration']
        )
        
        # Sanitize outputs
        peak_temp = result['peak_temp']
        if math.isnan(peak_temp) or math.isinf(peak_temp): peak_temp = 0.0
        
        response = {
            "risk_level": result['risk_level'],
            "peak_temp": float(peak_temp),
            "duration": result['duration'],
            "confidence": result['confidence'],
            "recommendation": recommendation
        }
        
        print(f"✅ Heatwave prediction successful: {response['risk_level']} risk")
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Heatwave prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

