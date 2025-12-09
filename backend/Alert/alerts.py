import os
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from twilio.rest import Client
from xml.sax.saxutils import escape
from dotenv import load_dotenv
from gemini_recommendation import get_recommendation

# --------------------------------
# CONFIG & LOGGING
# --------------------------------
load_dotenv()
logger = logging.getLogger("AgriUrban")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE       = os.getenv("TWILIO_PHONE")

# --------------------------------
# DATA & CONSTANTS
# --------------------------------
# In a real app, fetch this from your database
DEFAULT_USERS= [
    {"name": "Pramod Pandey", "phone": "+918858031887", "language": "en"},
    {"name": "Rishabh Verma", "phone": "+919457829890", "language": "hi"},
    {"name": "Rahul Bhardwaj", "phone":"+917307438928",
     "language": "kn"},
     {"name": "Mihir Sinha", "phone":"+918882429871",
     "language": "hi"},
     {"name": "Sambhawna Bajpei", "phone":"+918368160206",
     "language": "kn"}
]


TEMPLATES = {
    "heatwave": {
        "en": "⚠ Heatwave Alert! Temp reaching {temp}°C. Reduce irrigation & stay hydrated.",
        "hi": "⚠ गर्मी चेतावनी! तापमान {temp}°C तक पहुँच सकता है। पानी बचाएं।",
         "kn": "⚠ ತೀವ್ರ ಬಿಸಿ ಎಚ್ಚರಿಕೆ! ತಾಪಮಾನ {temp}°C ತಲುಪುತ್ತಿದೆ."
    },
    "flood": {
        "en": "⚠ Flood Alert! Heavy rainfall expected. Move to safe areas.",
        "hi": "⚠ बाढ़ चेतावनी! भारी वर्षा की संभावना। सुरक्षित स्थान पर जाएँ।",
         "kn": "⚠ ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ!"
    },
    "drought": {
        "en": "⚠ Drought Alert! Very low rainfall. Conserve water.",
        "hi": "⚠ सूखा चेतावनी! बहुत कम वर्षा। पानी बचाएं।",
        "kn": "⚠ ಬರ ಎಚ್ಚರಿಕೆ!"
    }
}
VOICE_LANG = {"en": "en-IN", "hi": "hi-IN", "kn": "kn-IN"}

_phone_re = re.compile(r"^\+[1-9]\d{9,14}$")
_twilio_client = None
executor = ThreadPoolExecutor(max_workers=5)

# --------------------------------
# HELPERS
# --------------------------------
def get_twilio_client():
    global _twilio_client
    if not _twilio_client and TWILIO_ACCOUNT_SID:
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return _twilio_client

def is_valid_phone(n):
    return bool(_phone_re.match(n))

def format_msg(alert, lang, temp=None):
    msg = TEMPLATES[alert].get(lang, TEMPLATES[alert]["en"])
    return msg.format(temp=temp) if "{temp}" in msg else msg

# --------------------------------
# SENDING FUNCTIONS
# --------------------------------
def send_sms_single(to, msg):
    try:
        if not is_valid_phone(to): return {"to":to,"status":"invalid"}
        c = get_twilio_client()
        if not c: return {"to":to,"error":"Twilio not configured"}
        
        m = c.messages.create(to=to, from_=TWILIO_PHONE, body=msg)
        return {"to":to,"status":"sent","sid":m.sid}
    except Exception as e:
        logger.error(f"SMS failed for {to}: {e}")
        return {"to":to,"error":str(e)}

def send_call_single(to, msg, lang):
    try:
        if not is_valid_phone(to): return {"to":to,"status":"invalid"}
        c = get_twilio_client()
        if not c: return {"to":to,"error":"Twilio not configured"}

        safe = escape(msg)
        twiml = f"<Response><Say language='{VOICE_LANG.get(lang,'en-IN')}'>{safe}</Say></Response>"
        c.calls.create(from_=TWILIO_PHONE, to=to, twiml=twiml)
        return {"to":to,"call":"ok"}
    except Exception as e:
        logger.error(f"Call failed for {to}: {e}")
        return {"to":to,"call_error":str(e)}

# --------------------------------
# CORE ALERT LOGIC
# --------------------------------
def trigger_alerts(risk, temp, rainfall, users=None):
    """
    Triggers alerts and recommendations for the given risk condition.
    
    Args:
        risk (str): 'heatwave', 'flood', or 'drought'.
        temp (float): Current temperature.
        rainfall (float): Current rainfall.
        users (list, optional): List of user dicts. Defaults to DEFAULT_USERS.
    """
    if risk not in ("heatwave", "flood", "drought"):
        logger.info(f"Risk '{risk}' is not critical. No alerts sent.")
        return {"status": "ignored", "reason": "not critical"}

    target_users = users if users is not None else DEFAULT_USERS
    results = []
    
    # 1. Get AI Recommendation
    try:
        advice = get_recommendation(risk, temp, rainfall)
    except Exception as e:
        logger.error(f"Gemini API failed: {e}")
        advice = "Follow local agriculture officer guidance."

    # 2. Send Alerts
    for u in target_users:
        base_msg = format_msg(risk, u.get("language", "en"), temp)
        msg = f"{base_msg}\n\n📌 Advice:\n{advice}"
        
        # Send in background threads
        executor.submit(send_sms_single, u["phone"], msg)
        executor.submit(send_call_single, u["phone"], msg, u.get("language", "en"))
        
        results.append({"user": u.get("name", "Unknown"), "status": "queued"})
    
    return {"status": "processed", "risk": risk, "details": results}

if __name__ == "__main__":
    import random
    import sys
    import json

    # Simple logic to run this script from Node.js
    risks = ['heatwave', 'flood', 'drought']
    selected_risk = random.choice(risks)
    
    # Mock data for demonstration
    mock_values = {
        'heatwave': {'temp': 45.0, 'rain': 0.0},
        'flood': {'temp': 26.0, 'rain': 250.0},
        'drought': {'temp': 38.0, 'rain': 5.0}
    }
    
    vals = mock_values[selected_risk]
    
    # Send logs to stderr so they don't corrupt stdout JSON
    sys.stderr.write(f"DTO: Triggering {selected_risk} alert...\n")
    
    # Call the main function
    res = trigger_alerts(selected_risk, vals['temp'], vals['rain'])
    
    # Print ONLY the JSON result to stdout
    print(json.dumps(res))
