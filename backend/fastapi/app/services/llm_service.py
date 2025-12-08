import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("AgriUrbanAI")

class LLMService:
    def __init__(self):
        # Use provided key or env var
        self.api_key = "AIzaSyD1dHOT_Yh6vRtTdJz-HbAtbNu_IP-OMEU"
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found.")
            self.model = None
        else:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-pro')
            except Exception as e:
                logger.error(f"Failed to configure Gemini: {e}")
                self.model = None

    def generate_recommendation(self, risk_data: dict, role: str = "farmer") -> dict:
        """
        Generate a natural language recommendation based on risk data.
        """
        if not self.model:
            return {
                "recommendation": "AI recommendations unavailable (API Key missing).",
                "alert_message_en": "System Alert: AI service unavailable.",
                "alert_message_hi": "सिस्टम चेतावनी: एआई सेवा अनुपलब्ध है।",
                "actions": ["Check System Configuration"]
            }

        try:
            # Construct prompt based on role and risk data
            prompt = self._construct_prompt(risk_data, role)
            
            response = self.model.generate_content(prompt)
            content = response.text
            
            return self._parse_response(content)

        except Exception as e:
            logger.error(f"Error generating recommendation: {e}")
            return {
                "recommendation": "Error generating recommendation.",
                "alert_message_en": "System Alert: Error generating recommendation.",
                "alert_message_hi": "सिस्टम चेतावनी: सिफारिश उत्पन्न करने में त्रुटि।",
                "actions": ["Contact Support"]
            }

    def _construct_prompt(self, risk_data: dict, role: str) -> str:
        """
        Constructs the prompt for the LLM.
        """
        risk_summary = ""
        for key, value in risk_data.items():
            risk_summary += f"- {key}: {value}\n"

        if role == "farmer":
            return f"""
            Analyze the following agricultural risk data and provide a recommendation for a farmer:
            {risk_summary}
            
            Output format (JSON):
            {{
                "recommendation": "One sentence summary of the situation.",
                "alert_message_en": "HTML formatted detailed alert message in English (use <br> for newlines, <strong> for emphasis).",
                "alert_message_hi": "HTML formatted detailed alert message in Hindi (use <br> for newlines, <strong> for emphasis).",
                "actions": ["Action 1", "Action 2", "Action 3"]
            }}
            """
        else:
            return f"""
            Analyze the following urban climate risk data and provide a recommendation for an urban planner/authority:
            {risk_summary}
            
            Output format (JSON):
            {{
                "recommendation": "One sentence summary of the situation.",
                "alert_message_en": "HTML formatted detailed alert message in English (use <br> for newlines, <strong> for emphasis).",
                "alert_message_hi": "HTML formatted detailed alert message in Hindi (use <br> for newlines, <strong> for emphasis).",
                "actions": ["Action 1", "Action 2", "Action 3"]
            }}
            """

    def _parse_response(self, content: str) -> dict:
        """
        Parses the LLM response. Tries to parse JSON, falls back to text.
        """
        import json
        try:
            # Clean up markdown code blocks if present
            cleaned_content = content.replace("```json", "").replace("```", "")
            
            # Find JSON substring
            start = cleaned_content.find('{')
            end = cleaned_content.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = cleaned_content[start:end]
                return json.loads(json_str)
            else:
                raise ValueError("No JSON found")
        except Exception:
            return {
                "recommendation": content[:100] + "...",
                "alert_message_en": content,
                "alert_message_hi": "Translation unavailable.",
                "actions": ["Review detailed report"]
            }

llm_service = LLMService()
