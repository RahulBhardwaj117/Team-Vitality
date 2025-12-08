import sys
import os
import asyncio
import json
from datetime import datetime

# Setup paths to mimic the FastAPI environment
sys.path.append(os.path.abspath(os.path.join("d:\Python\change5\TeamVitality\AU", "backend", "fastapi")))

# Mock data needed for the requests
mock_forecast = [
    {
        "day": "Monday",
        "condition": "Sunny",
        "rain_chance": 5.0,
        "temp": 35.0,
        "icon": "☀️",
        "humidity": 45.0,
        "wind": 12.0,
        "min_temp": 25.0,
        "max_temp": 38.0
    }
] * 7 # Repeat for 7 days

print("--- STARTING DIAGNOSTIC ---")

try:
    print("1. Testing Flood Prediction Integration...")
    from app.routers.flood_new import predict_flood_integrated, FloodPredictionRequest, DailyForecast
    
    flood_req = FloodPredictionRequest(forecast=mock_forecast, location="TestLoc")
    print("   Calling flood endpoint function directy...")
    # It is a synchronous function now
    try:
        flood_res = predict_flood_integrated(flood_req)
        print("   ✅ Flood Result:", flood_res)
    except Exception as e:
        print(f"   ❌ FLOOD FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

except ImportError as e:
    print(f"   ❌ Flood Import Error: {e}")
except Exception as e:
    print(f"   ❌ Flood General Error: {e}")

print("\n----------------\n")

try:
    print("2. Testing Heatwave Prediction Integration...")
    from app.routers.heatwave_new import predict_heatwave_integrated, HeatwavePredictionRequest, DailyForecast
    
    # We can reuse the DailyForecast class but need to map keys if different or use dict
    # Pydantic models in different files are distinct classes, need to cast or use dicts if valid
    
    heat_req = HeatwavePredictionRequest(forecast=mock_forecast, location="TestLoc")
    print("   Calling heatwave endpoint function directly...")
    try:
        heat_res = predict_heatwave_integrated(heat_req)
        print("   ✅ Heatwave Result:", heat_res)
    except Exception as e:
        print(f"   ❌ HEATWAVE FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

except ImportError as e:
    print(f"   ❌ Heatwave Import Error: {e}")
except Exception as e:
    print(f"   ❌ Heatwave General Error: {e}")

print("\n----------------\n")

try:
    print("3. Testing Drought Prediction Integration...")
    from app.routers.drought_new import predict_drought_integrated, DroughtPredictionRequest, DailyForecast
    
    drought_req = DroughtPredictionRequest(forecast=mock_forecast, location="TestLoc")
    print("   Calling drought endpoint function directly...")
    try:
        drought_res = predict_drought_integrated(drought_req)
        print("   ✅ Drought Result:", drought_res)
    except Exception as e:
        print(f"   ❌ DROUGHT FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

except ImportError as e:
    print(f"   ❌ Drought Import Error: {e}")
except Exception as e:
    print(f"   ❌ Drought General Error: {e}")
    
print("\n--- DIAGNOSTIC COMPLETE ---")
