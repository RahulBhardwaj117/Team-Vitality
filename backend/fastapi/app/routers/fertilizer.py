from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from app.services.prediction_service import prediction_service

router = APIRouter()

class FertilizerRequest(BaseModel):
    crop: str
    soil_type: str = "Loam"
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None

class FertilizerResponse(BaseModel):
    crop: str
    soil_type: str
    nutrients_status: Dict[str, float]
    recommended_nutrients: Optional[Dict[str, float]] = None
    recommendations: List[str]
    ai_advice: Optional[str] = None
    note: Optional[str] = None

@router.post("/", response_model=FertilizerResponse)
async def predict_fertilizer(request: FertilizerRequest):
    try:
        result = await prediction_service.predict_fertilizer(
            request.crop,
            request.soil_type,
            request.nitrogen,
            request.phosphorus,
            request.potassium
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
