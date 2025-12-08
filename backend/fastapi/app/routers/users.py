from fastapi import APIRouter, HTTPException
from app.services.user_service import user_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    phone: str
    location: str
    language: Optional[str] = "en"
    email: Optional[str] = None
    crop: Optional[str] = None
    landArea: Optional[str] = None

@router.post("/register")
async def register_user(user: UserRegister):
    """
    Registers a user for the 6-hour alert engine.
    """
    try:
        success = user_service.register_user(user.dict())
        if success:
            return {"status": "success", "message": "User registered for alerts"}
        else:
            raise HTTPException(status_code=500, detail="Failed to register user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
