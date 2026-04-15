from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client
from xml.sax.saxutils import escape
from dotenv import load_dotenv
from typing import Optional, List, Union, Dict, Any
from concurrent.futures import ThreadPoolExecutor
from gemini_recommendation import get_recommendation
import os, re, logging

# --------------------------------
# CONFIG & LOGGING
# --------------------------------
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgriUrban")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE       = os.getenv("TWILIO_PHONE")
TWILIO_TEST_NUMBERS = [n.strip() for n in os.getenv("TWILIO_TEST_NUMBERS", "").split(",") if n]

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
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return _twilio_client

# --------------------------------
# USERS (Replace with DB later)
# --------------------------------
USERS = [
    {"name": "Farmer A", "phone": "+918858031887", "language": "en"},
    {"name": "Farmer B", "phone": "+919457829890", "language": "hi"},
    {"name": "Farmer C", "phone": "+917307438928", "language": "mr"}
]

TEMPLATES = {
    "heatwave": {
        "en": "⚠ Heatwave Alert! Temp reaching {temp}°C. Reduce irrigation & stay hydrated.",
        "hi": "⚠ गर्मी चेतावनी! तापमान {temp}°C तक पहुँच सकता है। पानी बचाएं।",
        "mr": "⚠ उष्णतेचा इशारा! तापमान {temp}°C पर्यंत जाईल."
    },
    "flood": {
        "en": "⚠ Flood Alert! Heavy rainfall expected. Move to safe areas.",
        "hi": "⚠ बाढ़ चेतावनी! भारी वर्षा की संभावना। सुरक्षित स्थान पर जाएँ।",
        "mr": "⚠ पूर सूचना! जोरदार पाऊस अपेक्षित."
    },
    "drought": {
        "en": "⚠ Drought Alert! Very low rainfall. Conserve water.",
        "hi": "⚠ सूखा चेतावनी! बहुत कम वर्षा। पानी बचाएं।",
        "mr": "⚠ दुष्काळ सूचना! खूप कमी पाऊस."
    }
}

VOICE_LANG = {"en": "en-IN", "hi": "hi-IN", "mr": "mr-IN"}

def is_valid_phone(n): return bool(_phone_re.match(n))

def format_msg(alert, lang, temp=None):
    msg = TEMPLATES[alert].get(lang, TEMPLATES[alert]["en"])
    return msg.format(temp=temp) if "{temp}" in msg else msg

# --------------------------------
# ML INTEGRATION
# --------------------------------
try:
    from predictor import predict_risk, fetch_live_weather
    logger.info("ML predictor loaded.")
except:
    predict_risk = None
    fetch_live_weather = None
    logger.warning("ML NOT FOUND. Using fallback logic.")

def get_climate_output():
    if fetch_live_weather:
        data = fetch_live_weather()
    else:
        data = {"temperature": 40, "rainfall": 5, "humidity": 30, "soil_moisture": 12}

    if predict_risk:
        risk = predict_risk(data)
    else:
        # fallback logic
        if data["temperature"] > 40: risk = "heatwave"
        elif data["rainfall"] > 100: risk = "flood"

# Import from our new modules
from alerts import trigger_alerts, send_sms_single
try:
    from predictor import predict_risk, fetch_live_weather
except ImportError:
    predict_risk = None
    fetch_live_weather = None

# --------------------------------
# CONFIG & LOGGING
# --------------------------------
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgriUrban")

TWILIO_TEST_NUMBERS = [n.strip() for n in os.getenv("TWILIO_TEST_NUMBERS", "").split(",") if n]

# --------------------------------
# FASTAPI APP
# --------------------------------
app = FastAPI(title="Agri Urban AI Alert System")
scheduler = None

# --------------------------------
# HELPERS
# --------------------------------
def get_climate_output():
    if fetch_live_weather:
        data = fetch_live_weather()
    else:
        data = {"temperature": 40, "rainfall": 5, "humidity": 30, "soil_moisture": 12}

    if predict_risk:
        risk = predict_risk(data)
    else:
        # fallback logic
        if data["temperature"] > 40: risk = "heatwave"
        elif data["rainfall"] > 100: risk = "flood"
        elif data["rainfall"] < 10: risk = "drought"
        else: risk = "normal"

    data["risk"] = risk
    return data

def process_alerts():
    logger.info("Checking alerts...")
    data = get_climate_output()
    trigger_alerts(data["risk"], data["temperature"], data["rainfall"])

# --------------------------------
# SCHEDULER
# --------------------------------
@app.on_event("startup")
def start_scheduler():
    global scheduler
    scheduler = BackgroundScheduler()
    # scheduler.add_job(process_alerts, "interval", hours=6)
    # scheduler.start()
    logger.info("❌ Scheduler disabled (Manual Mode only).")

@app.on_event("shutdown")
def stop_scheduler():
    if scheduler:
        scheduler.shutdown()

# --------------------------------
# API ENDPOINTS
# --------------------------------
class SMS(BaseModel):
    to: Union[str,List[str]]
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

@app.get("/")
def home(): return {"status":"Agri Urban AI is running"}

@app.get("/trigger")
def trigger(bg:BackgroundTasks):
    bg.add_task(process_alerts)
    if TWILIO_TEST_NUMBERS:
        bg.add_task(send_sms_single, TWILIO_TEST_NUMBERS[0], "🚨 Manual Trigger Executed")
    return {"status":"triggered"}

@app.post("/send_sms")
def send(payload:SMS):
    targets = payload.to if isinstance(payload.to,list) else [payload.to]
    return [send_sms_single(n,payload.message) for n in targets]

@app.post("/predict_and_alert")
def predict(payload:Predict):
    data = payload.dict()
    risk = predict_risk(data) if predict_risk else "normal"
    data["risk"] = risk
    if risk in ("heatwave","flood","drought"):
        trigger_alerts(risk, data.get("temperature"), data.get("rainfall"))
    return data

@app.post("/trigger_alert_manual")
def manual_trigger(payload: ManualAlert):
    """
    Manually trigger an alert if you already have the ML output.
    """
    return trigger_alerts(payload.risk, payload.temperature, payload.rainfall)