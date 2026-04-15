import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-pro")

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

    response = model.generate_content(prompt)

    return response.text.strip()
