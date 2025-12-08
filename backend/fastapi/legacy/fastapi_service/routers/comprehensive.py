from fastapi import APIRouter, HTTPException
from services.prediction_service import prediction_service
from schemas.prediction_schemas import ComprehensiveRequest, ComprehensiveResponse

router = APIRouter()

@router.post("/", response_model=ComprehensiveResponse)
async def predict_comprehensive(request: ComprehensiveRequest):
    """
    Generate comprehensive environmental risk assessment.
    
    Runs all prediction models in parallel:
    - Flood risk prediction
    - Drought severity prediction
    - Heatwave forecasting
    - Groundwater trend analysis
    
    Returns unified risk assessment with actionable insights.
    """
    try:
        result = await prediction_service.predict_comprehensive(
            request.start_date, 
            request.end_date,
            request.district
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
