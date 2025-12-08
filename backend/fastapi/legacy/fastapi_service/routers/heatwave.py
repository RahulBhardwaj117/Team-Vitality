from fastapi import APIRouter, HTTPException
from services.prediction_service import prediction_service
from schemas.prediction_schemas import HeatwaveRequest, HeatwaveResponse

router = APIRouter()

@router.post("/", response_model=HeatwaveResponse)
async def predict_heatwave(request: HeatwaveRequest):
    """
    Predict heatwave conditions for a specific date range.
    
    Uses ensemble model with climate change trends incorporated.
    Supports different scenarios (realistic, pessimistic, optimistic).
    
    Returns maximum temperature forecast, number of heatwave days,
    and daily severity predictions.
    """
    try:
        result = await prediction_service.predict_heatwave(
            request.start_date, 
            request.end_date,
            request.scenario
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
