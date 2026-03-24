import sys
import os
import json
import pandas as pd
import numpy as np
from datetime import date
from pydantic import BaseModel
from typing import List

# 1. Setup Environment
base_path = r"d:\Python\change5\TeamVitality\AU\backend\fastapi"
sys.path.append(base_path)
project_root = r"d:\Python\change5\TeamVitality\AU"
sys.path.append(project_root)

# Helper to print safely
def log(msg):
    try:
        print(str(msg).encode('ascii', 'ignore').decode('ascii'))
    except:
        print("Log error")

log("Starting Debug V3.1")

# Define Shared Pydantic Models for Test
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

# 2. Mock Data
mock_forecast = []
for i in range(7):
    mock_forecast.append({
        "day": f"Day {i}",
        "condition": "Sunny",
        "rain_chance": 10.0,
        "temp": 35.0,
        "icon": "Sun",
        "humidity": 40.0,
        "wind": 10.0,
        "min_temp": 25.0,
        "max_temp": 38.0
    })

daily_objects = [DailyForecast(**d) for d in mock_forecast]

# 3. Test Flood Endpoint
log("\n--- TESTING FLOOD ---")
try:
    from app.routers.flood_new import predict_flood_integrated, FloodPredictionRequest
    
    req = FloodPredictionRequest(forecast=daily_objects, location="Delhi")
    
    log("Calling flood function...")
    res = predict_flood_integrated(req)
    log(f"Flood Result: {res}")
    
except Exception as e:
    log(f"Flood ERROR: {type(e).__name__} - {e}")
    import traceback
    traceback.print_exc()

# 4. Test Heatwave Endpoint
log("\n--- TESTING HEATWAVE ---")
try:
    from app.routers.heatwave_new import predict_heatwave_integrated, HeatwavePredictionRequest
    
    req = HeatwavePredictionRequest(forecast=daily_objects, location="Delhi")
    
    log("Calling heatwave function...")
    res = predict_heatwave_integrated(req)
    log(f"Heatwave Result: {res}")

except Exception as e:
    log(f"Heatwave ERROR: {type(e).__name__} - {e}")
    import traceback
    traceback.print_exc()

# 5. Test Drought Endpoint
log("\n--- TESTING DROUGHT ---")
try:
    from app.routers.drought_new import predict_drought_integrated, DroughtPredictionRequest
    
    req = DroughtPredictionRequest(forecast=daily_objects, location="Delhi")
    
    log("Calling drought function...")
    res = predict_drought_integrated(req)
    log(f"Drought Result: {res}")

except Exception as e:
    log(f"Drought ERROR: {type(e).__name__} - {e}")
    import traceback
    traceback.print_exc()

log("\nDebug Complete")
