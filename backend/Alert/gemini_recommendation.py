import os
from google import genai
from dotenv import load_dotenv

# Ensure .env is loaded (one level up)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path, override=True)

# Initialize Client gracefully
api_key = os.getenv("GEMINI_API_KEY")
debug_key = "SET" if api_key else "None"
print(f"DEBUG: Using Gemini Key: {debug_key}")
client = None
if api_key:
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"DEBUG: Failed to initialize Gemini Client: {e}")

def get_recommendation(risk, temp=None, rainfall=None):
    """
    Fetches expert agricultural advice based on the disaster risk.
    """
    prompt = f"""
    You are an agriculture expert specializing in Indian crops.

    Situation:
    Disaster Risk: {risk}
    Current Temperature: {temp}°C
    Expected Rainfall: {rainfall}mm

    Provide 2 short, actionable farming recommendations to mitigate risk (max 3 lines total).
    Use extremely simple, direct language.
    """

    try:
        if not client:
            return "Protect livestock and ensure proper drainage in fields."
        
        # Using gemini-1.5-flash instead of gemini-pro to avoid 404
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"DEBUG: Gemini API Error: {e}")
        return "Protect livestock and ensure proper drainage in fields."
