from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import date
import sys
import os

# Add New_prediction path (updated to use weather_prediction.py)
new_prediction_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'New_prediction'))
sys.path.insert(0, new_prediction_path)

router = APIRouter()

@router.get("/raw")
async def get_raw_weekly_weather(start_date: str = None):
    """
    Returns raw AI weather predictions without schema validation
    Use this endpoint to get direct AI model outputs from weather_prediction.py
    """
    try:
        import weather_prediction
        
        # Get predictions from AI model
        result = weather_prediction.get_weekly_forecast(start_date)
        
        if "error" in result:
            return JSONResponse(
                status_code=500,
                content={"error": result["error"], "status": "error"}
            )
        
        # Return raw predictions
        return JSONResponse(content={
            "status": "success",
            "forecast": result.get("forecasts", []),
            "model": "weather_prediction (XGBoost)",
            "raw": True
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "status": "error",
                "message": f"AI model prediction failed: {str(e)}"
            }
        )
