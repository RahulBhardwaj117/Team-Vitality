import os
from google import genai
import logging
from dotenv import load_dotenv

# Load env from parent directory
# Load env from backend/fastapi/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
# Load env from backend/.env (Fall back)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'))

logger = logging.getLogger("AgriUrbanAI")

API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCmD1E_rHZX0-tn5oqS0yx3XQ-Y2bE_fyg"
client = None

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        logger.info("Successfully initialized Gemini Client in Advisor Service.")
    except Exception as e:
        logger.error(f"Failed to init Gemini Client: {e}")
else:
    logger.warning("GEMINI_API_KEY not found. AI advice will be disabled.")

async def generate_short_advice(risk_type: str, temp: float, lang: str = "en") -> str:
    """
    Generates a very short (1 sentence) advice for SMS/Voice.
    """
    if not client:
        return "Please consult local authorities."
        
    try:
        prompt = f"""
        Act as an agriculture emergency expert.
        Write a single short sentence (max 15 words) advice for a farmer facing {risk_type} risk (Temp: {temp}).
        Language: {lang}.
        Do not use emojis. output only the sentence.
        """
        
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.replace("\n", " ").strip()
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        return "Check crop safety immediately."
