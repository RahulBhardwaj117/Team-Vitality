import os
import logging
import re
from typing import Any
from concurrent.futures import ThreadPoolExecutor
from twilio.rest import Client
from xml.sax.saxutils import escape
from dotenv import load_dotenv

# Load env from parent directory
# Load env from backend/fastapi/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
# Load env from backend/.env (Fall back or specific user file)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'))

logger = logging.getLogger("AgriUrbanAI")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE")

# Constants
VOICE_LANG = {"en": "en-IN", "hi": "hi-IN", "mr": "mr-IN"}
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{9,14}$")

TEMPLATES = {
    "heatwave": {
        "en": "⚠ Heatwave Alert! Temp reaching {val}°C. {advice}",
        "hi": "⚠ गर्मी चेतावनी! तापमान {val}°C तक पहुँच सकता है। {advice}",
        "mr": "⚠ उष्णतेचा इशारा! तापमान {val}°C पर्यंत जाईल. {advice}"
    },
    "flood": {
        "en": "⚠ Flood Alert! High risk detected. {advice}",
        "hi": "⚠ बाढ़ चेतावनी! भारी वर्षा की संभावना। {advice}",
        "mr": "⚠ पूर सूचना! जोरदार पाऊस अपेक्षित. {advice}"
    },
    "drought": {
        "en": "⚠ Drought Alert! Soil moisture low. {advice}",
        "hi": "⚠ सूखा चेतावनी! बहुत कम वर्षा। {advice}",
        "mr": "⚠ दुष्काळ सूचना! खूप कमी पाऊस. {advice}"
    }
}

executor = ThreadPoolExecutor(max_workers=5)
_twilio_client = None

def get_twilio_client():
    global _twilio_client
    if not _twilio_client and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
    return _twilio_client

def is_valid_phone(phone: str) -> bool:
    return bool(PHONE_REGEX.match(phone)) if phone else False

def format_message(risk_type: str, lang: str, value: Any, advice: str) -> str:
    template = TEMPLATES.get(risk_type.lower(), {}).get(lang, TEMPLATES[risk_type.lower()]["en"])
    return template.format(val=value, advice=advice)

def send_sms_sync(to: str, body: str):
    """Blocking SMS send"""
    try:
        if not is_valid_phone(to):
            logger.warning(f"Invalid phone number: {to}")
            return False, "Invalid phone number format"
            
        client = get_twilio_client()
        if not client:
            logger.error("Twilio not configured")
            return False, "Twilio credentials missing or invalid"
            
        msg = client.messages.create(
            to=to,
            from_=TWILIO_PHONE_NUMBER,
            body=body
        )
        logger.info(f"SMS sent to {to}: {msg.sid}")
        return True, None
    except Exception as e:
        logger.error(f"SMS failed to {to}: {e}")
        return False, str(e)

def send_call_sync(to: str, message: str, lang: str):
    """Blocking Call send"""
    try:
        if not is_valid_phone(to): return False
        
        client = get_twilio_client()
        if not client: return False

        safe_msg = escape(message)
        twiml = f"<Response><Say language='{VOICE_LANG.get(lang, 'en-IN')}'>{safe_msg}</Say></Response>"
        
        call = client.calls.create(
            to=to,
            from_=TWILIO_PHONE_NUMBER,
            twiml=twiml
        )
        logger.info(f"Call initiated to {to}: {call.sid}")
        return True
    except Exception as e:
        logger.error(f"Call failed to {to}: {e}")
        return False

async def send_alert_async(user_name: str, phone: str, lang: str, risk_type: str, value: Any, advice_short: str):
    """
    Sends an alert (SMS + Call) asynchronously via thread pool.
    """
    if not risk_type or risk_type.lower() == "normal":
        return

    # Prepare message
    message = format_message(risk_type, lang, value, advice_short)
    full_sms = f"Hello {user_name}, {message}"

    logger.info(f"Queuing alert for {user_name} ({phone}) - {risk_type}")
    
    # Run in background
    executor.submit(send_sms_sync, phone, full_sms)
    # executor.submit(send_call_sync, phone, message, lang) # Optional: Enable call if critical
