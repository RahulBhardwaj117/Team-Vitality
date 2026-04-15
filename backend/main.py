from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client
from dotenv import load_dotenv
from typing import Optional, List, Union, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import os, re, logging

# --------------------------------
# CONFIG & LOGGING
# --------------------------------
# Ensure we load .env from the current directory
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgriUrban")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE       = os.getenv("TWILIO_PHONE")
TWILIO_TEST_NUMBERS = [n.strip() for n in os.getenv("TWILIO_TEST_NUMBERS", "").split(",") if n]

# --------------------------------
# ML INTEGRATION
# --------------------------------
try:
    from predictor import predict_risk, fetch_live_weather
    logger.info("ML predictor loaded successfully.")
except ImportError:
    logger.warning("ML predictor modules not found. Using fallback logic.")
    predict_risk = None
    fetch_live_weather = None

# --------------------------------
# EXTERNAL LOGIC
# --------------------------------
from alerts import trigger_alerts, send_sms_single
from gemini_recommendation import get_recommendation

# --------------------------------
# FASTAPI APP
# --------------------------------
app = FastAPI(title="Agri Urban AI Alert System")

scheduler = None
executor = ThreadPoolExecutor(max_workers=5)
_phone_re = re.compile(r"^\+[1-9]\d{9,14}$")
_twilio_client: Optional[Client] = None

def get_twilio_client():
    global _twilio_client
    if not _twilio_client and TWILIO_ACCOUNT_SID:
        try:
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
    return _twilio_client

# --------------------------------
# HELPERS
# --------------------------------
def get_climate_output():
    """
    Retrieves current weather data and predicts risk level.
    """
    if fetch_live_weather:
        data = fetch_live_weather()
    else:
        # Static fallback if predictor is missing
        data = {"temperature": 40, "rainfall": 5, "humidity": 30, "soil_moisture": 12}

    if predict_risk:
        risk = predict_risk(data)
    else:
        # Direct rule-based fallback
        if data["temperature"] > 40: risk = "heatwave"
        elif data["rainfall"] > 100: risk = "flood"
        elif data["rainfall"] < 10: risk = "drought"
        else: risk = "normal"

    data["risk"] = risk
    return data

def process_alerts():
    """
    Background task to check conditions and trigger alerts.
    """
    logger.info("Auto-check: Evaluating climatic conditions for alerts...")
    data = get_climate_output()
    trigger_alerts(data["risk"], data.get("temperature"), data.get("rainfall"))

# --------------------------------
# LIFECYCLE
# --------------------------------
@app.on_event("startup")
def start_scheduler():
    global scheduler
    scheduler = BackgroundScheduler()
    # scheduler.add_job(process_alerts, "interval", hours=6)
    # scheduler.start()
    logger.info("❌ Scheduler disabled (Manual Mode only for now).")

@app.on_event("shutdown")
def stop_scheduler():
    if scheduler:
        scheduler.shutdown()

# --------------------------------
# API MODELS
# --------------------------------
class SMS(BaseModel):
    to: Union[str, List[str]]
    message: str

class Predict(BaseModel):
    temperature: float
    rainfall: float
    humidity: float
    soil_moisture: float

class ManualAlert(BaseModel):
    risk: str
    temperature: Optional[float] = None
    rainfall: Optional[float] = None

# --------------------------------
# API ENDPOINTS
# --------------------------------
@app.get("/")
def home(): 
    return {"status": "Agri Urban AI Alert System is running"}

@app.get("/trigger")
def trigger(bg: BackgroundTasks):
    """
    Manually trigger the alert processing cycle.
    """
    bg.add_task(process_alerts)
    if TWILIO_TEST_NUMBERS:
        bg.add_task(send_sms_single, TWILIO_TEST_NUMBERS[0], "🚨 Alert System: Manual Trigger Process Initiated.")
    return {"status": "Trigger task submitted to background"}

@app.post("/send_sms")
def send(payload: SMS):
    """
    Send a custom SMS to one or more recipients.
    """
    targets = payload.to if isinstance(payload.to, list) else [payload.to]
    results = [send_sms_single(n, payload.message) for n in targets]
    return {"results": results}

@app.post("/predict_and_alert")
def predict_endpoint(payload: Predict):
    """
    Predict risk based on provided sensor data and trigger alerts if needed.
    """
    data = payload.dict()
    risk = predict_risk(data) if predict_risk else "normal"
    data["risk"] = risk
    
    if risk in ("heatwave", "flood", "drought"):
        trigger_alerts(risk, data.get("temperature"), data.get("rainfall"))
    
    return data

@app.post("/trigger_alert_manual")
def manual_trigger(payload: ManualAlert):
    """
    Directly trigger a specific alert type with manual data.
    """
    return trigger_alerts(payload.risk, payload.temperature, payload.rainfall)