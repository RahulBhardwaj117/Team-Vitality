from fastapi import APIRouter, HTTPException
from app.services.prediction_service import prediction_service
from app.schemas.prediction_schemas import DroughtRequest, DroughtResponse

router = APIRouter()

@router.post("/", response_model=DroughtResponse)
async def predict_drought(request: DroughtRequest):
    """
    Predict drought severity for a specific date range.
    
    Supports different scenarios (realistic, pessimistic, optimistic)
    for future forecasting based on historical patterns.
    
    Returns drought severity levels and daily forecasts.
    """
    try:
        result = await prediction_service.predict_drought(
            request.start_date, 
            request.end_date,
            request.scenario
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
