from fastapi import APIRouter, HTTPException, Depends
from datetime import date, datetime
from typing import Optional

from app.services.prediction_service import prediction_service
from app.schemas.prediction_schemas import WeatherRequest, WeatherResponse, WeeklyWeatherResponse

router = APIRouter()

@router.post("/daily", response_model=WeatherResponse)
async def get_daily_weather(request: WeatherRequest):
    try:
        result = await prediction_service.predict_weather_daily(request.date)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/weekly", response_model=WeeklyWeatherResponse)
async def get_weekly_weather(start_date: Optional[date] = None):
    """
    Get 15-day forecast starting from start_date (defaults to today)
    """
    if start_date is None:
        start_date = date.today()
        
    try:
        result = await prediction_service.predict_weather_weekly(start_date)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
