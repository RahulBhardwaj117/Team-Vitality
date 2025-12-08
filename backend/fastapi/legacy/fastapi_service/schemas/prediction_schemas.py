from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# --- Shared Schemas ---
class DateRangeRequest(BaseModel):
    start_date: date
    end_date: date
    location: Optional[str] = "Delhi"

# --- Weather Schemas ---
class WeatherRequest(BaseModel):
    date: date

class WeatherResponse(BaseModel):
    date: str
    max_temp: float = Field(..., alias="Max Temp (C)")
    min_temp: float = Field(..., alias="Min Temp (C)")
    humidity: float = Field(..., alias="Humidity (%)")
    rain_prob: float = Field(..., alias="Rain Probability (%)")
    rainfall: float = Field(..., alias="Rainfall (mm)")
    
    class Config:
        populate_by_name = True

class WeeklyWeatherResponse(BaseModel):
    forecast: List[WeatherResponse]

# --- Flood Schemas ---
class FloodRequest(DateRangeRequest):
    pass

class DailyFloodForecast(BaseModel):
    date: str
    rainfall: float
    soil_moisture: float
    flood_probability: float
    risk_level: str

class FloodResponse(BaseModel):
    risk_level: str
    probability: float
    high_risk_days: int
    daily_forecast: List[DailyFloodForecast]
    recommendations: List[str]

# --- Drought Schemas ---
class DroughtRequest(DateRangeRequest):
    scenario: str = "realistic"

class DroughtResponse(BaseModel):
    severity: str
    avg_severity_index: float
    daily_forecast: List[Dict[str, Any]]

# --- Heatwave Schemas ---
class HeatwaveRequest(DateRangeRequest):
    scenario: str = "realistic"

class HeatwaveResponse(BaseModel):
    max_temp: float
    heatwave_days: int
    daily_forecast: List[Dict[str, Any]]

# --- Groundwater Schemas ---
class GroundwaterRequest(BaseModel):
    district: Optional[str] = None

class GroundwaterResponse(BaseModel):
    predicted_level: float
    trend: str
    recommendations: List[str]

# --- Comprehensive Schema ---
class ComprehensiveRequest(DateRangeRequest):
    district: Optional[str] = None

class ComprehensiveResponse(BaseModel):
    flood: Optional[FloodResponse]
    drought: Optional[DroughtResponse]
    heatwave: Optional[HeatwaveResponse]
    groundwater: Optional[GroundwaterResponse]
    risk_summary: str
