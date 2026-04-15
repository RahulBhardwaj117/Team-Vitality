from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.alert_service import AlertService
from app.services.notification_service import send_sms_sync, is_valid_phone
from app.core.scheduler_engine import analyze_and_alert_job
from pydantic import BaseModel
from typing import Dict, Optional, List, Union, Any
import os
import logging

logger = logging.getLogger("AgriUrbanAI")

router = APIRouter()
alert_service = AlertService()

# --------------------------------
# DATA MODELS
# --------------------------------

# Users from recent update
DEFAULT_USERS = [
    {"name": "Rishabh Verma", "phone": "+919457829890", "language": "hi"},
    {"name": "Rahul Bhardwaj", "phone":"+917307438928", "language": "kn"},
    {"name": "Sakshi Sharma", "phone":"+917303305787", "language": "en"},
    {"name": "Sambhawna Bajpei", "phone":"+918368160206", "language": "kn"}
]


class SMS(BaseModel):
    to: Union[str, List[str]]
    message: str

class PredictPayload(BaseModel):
    temperature: float
    rainfall: float
    # Add other fields if necessary for your ML model
    humidity: Optional[float] = 0.0
    soil_moisture: Optional[float] = 0.0

class AlertCreate(BaseModel):
    type: str
    severity: str
    message: str
    location: Optional[str] = "General"
    details: Optional[Dict] = None

# --------------------------------
# ENDPOINTS
# --------------------------------

@router.get("/trigger")
async def manual_trigger_scheduler(bg: BackgroundTasks):
    """
    Manually triggers the background scheduler logic (same as the 6-hour job).
    Useful for testing or on-demand checks.
    """
    try:
        # We run this in background to avoid blocking the request
        bg.add_task(analyze_and_alert_job)
        return {"status": "triggered", "message": "Scheduled analysis started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send_sms")
async def send_sms_manual(payload: SMS):
    """
    Manually send an SMS to one or more numbers.
    """
    targets = payload.to if isinstance(payload.to, list) else [payload.to]
    results = []
    
    for phone in targets:
        if not is_valid_phone(phone):
            results.append({"phone": phone, "status": "invalid_number"})
            continue
            
        success, error = send_sms_sync(phone, payload.message)
        results.append({
            "phone": phone, 
            "status": "sent" if success else "failed",
            "error": error
        })
        
    return results

@router.post("/predict_and_alert")
async def predict_and_alert_manual(payload: PredictPayload):
    """
    Manually provide sensor data (temp, rain) to trigger the prediction & alert logic.
    Note: This bypasses the comprehensive prediction service and uses a simplified logic
    similar to the 'Integrated' standalone flow, simply to demonstrate the alert part.
    """
    data = payload.dict()
    
    # Placeholder for simple logic if you want to test the full pipeline
    # In a real scenario, you might call your ML Service here.
    
    risk_level = "Normal"
    risk_type = "normal"
    
    if data['temperature'] > 40:
        risk_type = "heatwave"
        risk_level = "High"
    elif data['rainfall'] > 100:
        risk_type = "flood"
        risk_level = "High"
    elif data['rainfall'] < 10 and data['temperature'] > 35:
        risk_type = "drought"
        risk_level = "Medium"
        
    # If high risk, generate alert
    alerts_generated = []
    if risk_level == "High" or (risk_type == "drought" and risk_level == "Medium"):
         alerts_generated = await alert_service.check_and_generate_alerts({
             "risk_type": risk_type,
             "risk_level": risk_level,
             "data": data
         })
         
    return {
        "input": data,
        "assessment": {"risk": risk_type, "level": risk_level},
        "alerts_generated": alerts_generated
    }

# --------------------------------
# EXISTING ENDPOINTS (Preserved)
# --------------------------------

@router.post("/create")
async def create_alert(alert: AlertCreate):
    try:
        result = await alert_service.create_alert(
            type=alert.type,
            severity=alert.severity,
            message=alert.message,
            location=alert.location,
            details=alert.details
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active")
async def get_active_alerts():
    try:
        alerts = await alert_service.get_active_alerts()
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check")
async def check_alerts(prediction_data: Dict):
    try:
        generated_alerts = await alert_service.check_and_generate_alerts(prediction_data)
        return {"generated_alerts": generated_alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/trigger_random")
async def trigger_random_alert(bg: BackgroundTasks):
    """
    Triggers a random alert for a random user from the default list.
    Used by the Dashboard 'Send Emergency Alert' button.
    Forces 'flood' risk and adds a specific Gemini recommendation.
    """
    import random
    from google import genai
    
    # Configure Gemini
    GEMINI_API_KEY = "AIzaSyCmD1E_rHZX0-tn5oqS0yx3XQ-Y2bE_fyg"
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        client = None

    results = []
    success_count = 0
    failure_count = 0

    # User requirement: "flood alert will be send"
    risk_type = "flood"
    rain = 150 # Simulated high rain

    for user in DEFAULT_USERS:
        target_phone = user["phone"]
        if not is_valid_phone(target_phone):
            logger.warning(f"⚠️ Skipping invalid number for {user['name']}: {target_phone}")
            continue

        # Get Recommendation from Gemini (Cache it for efficiency)
        recommendation = ""
        if client:
            try:
                prompt = f"Write a specific, urgent notification (max 1 sentence) for a user named {user['name']} who is facing a moderate flood in {user.get('location', 'their area')}. Do not use emojis."
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                recommendation = response.text.strip()
            except Exception as e:
                logger.error(f"Gemini generation failed for {user['name']}: {e}")
                recommendation = f"Urgent: Flood risk in your area. Please move to higher ground immediately."
        else:
            recommendation = "Emergency: High flood risk. Evacuate if necessary."

        message = (f"🚨 FLOOD BROADCAST! Hello {user['name']}, heavy rain ({rain}mm) detected. "
                   f"Advisory: {recommendation} — AgriUrbanAI")

        # REAL SEND
        logger.info(f"📤 Broadcasting SMS to {user['name']} ({target_phone})...")
        success, error = send_sms_sync(target_phone, message)
        
        if success:
            success_count += 1
            results.append({"user": user['name'], "status": "sent"})
        else:
            failure_count += 1
            results.append({"user": user['name'], "status": "failed", "error": error})

    return {
        "status": "success" if success_count > 0 else "error",
        "broadcast_summary": {
            "success": success_count,
            "failed": failure_count,
            "total": len(DEFAULT_USERS)
        },
        "details": results,
        "risk": risk_type,
        "recommendation_used": recommendation
    }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
