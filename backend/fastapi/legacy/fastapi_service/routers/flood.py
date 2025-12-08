from fastapi import APIRouter, HTTPException
from services.prediction_service import prediction_service
from schemas.prediction_schemas import FloodRequest, FloodResponse

router = APIRouter()

@router.post("/", response_model=FloodResponse)
async def predict_flood(request: FloodRequest):
    """
    Predict flood risk for a specific date range.
    
    Returns daily forecasts with flood probability, soil moisture,
    and actionable recommendations based on risk level.
    """
    try:
        result = await prediction_service.predict_flood(
            request.start_date, 
            request.end_date
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
