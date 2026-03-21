import os
from google import genai
from dotenv import load_dotenv

# Ensure .env is loaded (one level up)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path, override=True)

# Initialize Client
api_key = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: Using Gemini Key: {api_key[:5] if api_key else 'None'}")
client = genai.Client(api_key=api_key)

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
        # Using gemini-pro instead of gemini-1.5-flash-8b to avoid 404
        response = client.models.generate_content(
            model="gemini-pro",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"DEBUG: Gemini API Error: {e}")
        return "Protect livestock and ensure proper drainage in fields."
