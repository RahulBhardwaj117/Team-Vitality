# fastapi_service.py
"""FastAPI microservice for AgriUrbanAI predictions.
Provides endpoints for flood, drought, heatwave, groundwater, and weather forecasts.
All models are loaded once at startup for efficiency.
"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime

# Import prediction modules (assumed to be in the same directory)
try:
    import flood_prediction
    import drought_prediction
    import heatwave_prediction
    import groundwater_forcast
    import weather_forcast
except ImportError as e:
    raise ImportError(f"Required prediction module missing: {e}")

app = FastAPI(title="AgriUrbanAI Prediction Service", version="1.0.0")

class DateRange(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

class SingleDate(BaseModel):
    date: str  # YYYY-MM-DD

def parse_date(date_str: str) -> datetime:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

@app.post("/predict/flood")
async def predict_flood(range: DateRange):
    start = parse_date(range.start_date)
    end = parse_date(range.end_date)
    result = flood_prediction.predict_flood_risk(start, end)
    return {"risk": result}

@app.post("/predict/drought")
async def predict_drought(range: DateRange):
    start = parse_date(range.start_date)
    end = parse_date(range.end_date)
    df = drought_prediction.predict_date_range(start, end, scenario="realistic", is_future=True)
    return {"forecast": df.to_dict(orient="records")}

@app.post("/predict/heatwave")
async def predict_heatwave(range: DateRange):
    start = parse_date(range.start_date)
    end = parse_date(range.end_date)
    df = heatwave_prediction.HeatwaveForecaster().predict_period(start, end, scenario="realistic")
    return {"forecast": df.to_dict(orient="records")}

@app.post("/predict/groundwater")
async def predict_groundwater(district: SingleDate = None):
    # If a district is provided, use it; otherwise predict all districts.
    if district:
        result = groundwater_forcast.predict_for_district(district.date)
    else:
        result = groundwater_forcast.predict_all_districts()
    return {"result": result}

@app.get("/predict/weather")
async def predict_weather(date: str):
    # Delegates to weather_forcast module.
    forecast = weather_forcast.get_weather_forecast(date)
    if "error" in forecast:
        raise HTTPException(status_code=400, detail=forecast["error"])
    return forecast
