try:
    from google import genai
except ImportError:
    genai = None
import os

def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and genai:
        return genai.Client(api_key=api_key)
    return None

client = get_client()

def get_recommendation(risk, temp=None, rainfall=None):
    prompt = f"""
    You are an agriculture expert.

    Situation:
    Risk Type: {risk}
    Temperature: {temp}
    Rainfall: {rainfall}

    Provide 2 short actionable farming recommendations (max 3 lines).
    Use very simple language for farmers in India.
    """

    if not client:
        return "Monitor crop health and ensure proper irrigation."

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )
