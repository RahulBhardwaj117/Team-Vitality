import os
import logging
from google import genai
from dotenv import load_dotenv

# Load environment variables (one level up)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
load_dotenv(env_path)

logger = logging.getLogger("AgriUrbanAI")

class LLMService:
    def __init__(self):
        # Prefer environment variable over hardcoded key for security
        self.api_key = os.getenv("GEMINI_API_KEY") or "AIzaSyD1dHOT_Yh6vRtTdJz-HbAtbNu_IP-OMEU"
        
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found in environment.")
            self.client = None
        else:
            try:
                # Initialize modern Google GenAI Client
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Successfully initialized Gemini AI Client.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini Client: {e}")
                self.client = None

    def generate_recommendation(self, risk_data: dict, role: str = "farmer") -> dict:
        """
        Generate a natural language recommendation based on risk data using Gemini 1.5 Flash.
        """
        if not self.client:
            return {
                "recommendation": "AI recommendations unavailable (API Key or Client configuration missing).",
                "alert_message_en": "System Alert: AI generative service unavailable.",
                "alert_message_hi": "सिस्टम चेतावनी: एआई सेवा अनुपलब्ध है।",
                "actions": ["Verify GEMINI_API_KEY in .env"]
            }

        try:
            # Construct prompt for the AI expert
            prompt = self._construct_prompt(risk_data, role)
            
            # Using 1.5-flash for optimized performance and cost
            response = self.client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            
            return self._parse_json_safe(response.text)

        except Exception as e:
            logger.error(f"Error during AI recommendation generation: {e}")
            return {
                "recommendation": "Error communicating with AI service.",
                "alert_message_en": "System Alert: Fault detected in AI generative layer.",
                "alert_message_hi": "सिस्टम चेतावनी: एआई परत में खराबी।",
                "actions": ["Check network status", "Check API limits"]
            }

    def _construct_prompt(self, risk_data: dict, role: str) -> str:
        """
        Crafts the persona and data context for the AI.
        """
        risk_summary = "\n".join([f"- {k}: {v}" for k, v in risk_data.items()])
        
        target = "farmer" if role == "farmer" else "urban planner/authority"
        
        return f"""
        Analyze this agricultural/urban risk data and provide a professional recommendation for a {target}:
        {risk_summary}
        
        Provide your response EXACTLY as a JSON object:
        {{
            "recommendation": "One line summary.",
            "alert_message_en": "Detailed warning in English (HTML formatted: use <br>, <strong>).",
            "alert_message_hi": "Detailed warning in Hindi (HTML formatted: use <br>, <strong>).",
            "actions": ["Step 1", "Step 2", "Step 3"]
        }}
        """

    def _parse_json_safe(self, content: str) -> dict:
        """
        Robustly extracts JSON from potentially messy LLM output.
        """
        import json
        try:
            # Strip markdown codes if current AI generates them
            cleaned = content.strip().replace("```json", "").replace("```", "")
            
            # Locate first { and last }
            start = cleaned.find('{')
            end = cleaned.rfind('}') + 1
            if start < 0 or end <= start:
                raise ValueError("JSON anchors not found.")
            
            return json.loads(cleaned[start:end])
        except Exception:
            # Fallback if parsing fails
            return {
                "recommendation": "Manual review required for current situation.",
                "alert_message_en": f"AI Insight: {content[:200]}...",
                "alert_message_hi": "एआई अंतर्दृष्टि: विश्लेषण जारी है।",
                "actions": ["Refer to standard protocols"]
            }

# Create singleton instance
llm_service = LLMService()
