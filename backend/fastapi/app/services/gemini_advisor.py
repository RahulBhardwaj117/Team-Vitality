import os
try:
    from google import genai
except ImportError:
    genai = None

logger = logging.getLogger("AgriUrbanAI")

def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and genai:
        return genai.Client(api_key=api_key)
    return None

client = get_client()

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
        return "Check crop safety immediately and alert local teams."
