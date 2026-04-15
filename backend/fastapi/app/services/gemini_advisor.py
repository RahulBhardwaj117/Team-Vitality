import os
import google.generativeai as genai
import logging
from dotenv import load_dotenv

# Load env from parent directory
# Load env from backend/fastapi/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
# Load env from backend/.env (Fall back)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'))

logger = logging.getLogger("AgriUrbanAI")

if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-pro")
else:
    logger.warning("GEMINI_API_KEY not found. AI advice will be disabled.")
    model = None

async def generate_short_advice(risk_type: str, temp: float, lang: str = "en") -> str:
    """
    Generates a very short (1 sentence) advice for SMS/Voice.
    """
    if not model:
        return "Please consult local authorities."
        
    try:
        prompt = f"""
        Act as an agriculture emergency expert.
        Write a single short sentence (max 15 words) advice for a farmer facing {risk_type} risk (Temp: {temp}).
        Language: {lang}.
        Do not use emojis. output only the sentence.
        """
        
        # Run blocking call in executor if needed, but for now simple await if possible? 
        # Gemini lib is sync by default usually unless async method used.
        # We'll use the sync method directly as it's fast enough or wrap it if needed.
        response = model.generate_content(prompt)
        return response.text.replace("\n", " ").strip()
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        return "Check crop safety immediately."
