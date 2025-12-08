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
    {"name": "Pramod Pandey", "phone": "+918858031887", "language": "en"},
    {"name": "Rishabh Verma", "phone": "+919457829890", "language": "hi"},
    {"name": "Rahul Bhardwaj", "phone":"+917307438928", "language": "kn"},
    {"name": "Mihir Sinha", "phone":"+918882429871", "language": "hi"},
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
    import google.generativeai as genai
    
    # Configure Gemini
    GEMINI_API_KEY = "AIzaSyD1dHOT_Yh6vRtTdJz-HbAtbNu_IP-OMEU"
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        model = None

    try:
        # Select random user
        user = random.choice(DEFAULT_USERS)
        
        # User requirement: "flood alert will be send"
        risk_type = "flood"
        
        # Simulate conditions for flood
        temp = 28
        rain = 150 # High rain
        
        # Get Recommendation from Gemini
        recommendation = ""
        if model:
            try:
                prompt = (
                    f"You are an expert agricultural advisor in India. "
                    f"There is a HIGH FLOOD RISK (Rainfall: {rain}mm) for a farmer named {user['name']}. "
                    f"Provide a very short, urgent, 1-sentence action recommendation in English. "
                    f"Keep it under 15 words."
                )
                response = model.generate_content(prompt)
                recommendation = response.text.strip()
            except Exception as e:
                logger.error(f"Gemini generation failed: {e}")
                recommendation = "Move crops to higher ground immediately."
        else:
            recommendation = "Ensure drainage channels are clear."

        # Construct message
        message = (
            f"🚨 FLOOD ALERT! Hello {user['name']}, heavy rain predicted ({rain}mm). "
            f"Advisory: {recommendation} - AgriUrbanAI"
        )
        
        # Send to the actual user's phone number directly
        target_phone = user["phone"]
        sms_status = "skipped"
        sms_error = None
        
        if is_valid_phone(target_phone):
            # REAL SMS SENDING
            # Using synchronous send to ensure we know if it succeeded
            logger.info(f"Initiating real SMS to {target_phone} via Twilio...")
            success, error = send_sms_sync(target_phone, message)
            
            if success:
                logger.info(f"✅ SMS successfully sent to {user['name']} at {target_phone}")
                sms_status = "sent"
            else:
                logger.error(f"❌ SMS failed to {user['name']} ({target_phone}): {error}")
                sms_status = "failed"
                sms_error = error
        else:
            logger.warning(f"⚠️ Invalid phone number for {user['name']}: {target_phone}")
            sms_status = "invalid_number"
            
        return {
            "status": "success" if sms_status == "sent" else "warning",
            "message": message,
            "user": user,
            "risk": risk_type,
            "sent_to": target_phone,
            "delivery_status": sms_status,
            "delivery_error": sms_error,
            "recommendation": recommendation if recommendation else "Check generic flood guidelines."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
