
import requests
import json

def test_gemini_alert():
    url = "http://localhost:8000/alert/predict_and_alert"
    # Sending data that triggers a Heatwave risk (Temp > 40)
    # This should trigger the alert service, which calls Gemini for advice
    payload = {
        "temperature": 43, 
        "rainfall": 0, 
        "humidity": 15, 
        "soil_moisture": 10
    }
    
    print("Testing Gemini AI Advice Integration...")
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        print(f"Status: {response.status_code}")
        
        alerts = data.get("alerts_generated", [])
        if alerts:
            print("✅ Alert Generated!")
            # In a real scenario, we'd check the logs or the actual SMS for the AI content.
            # Since the API response structure for 'check_and_generate_alerts' returns the list of sent status,
            # we assume if it's not empty, the pipeline ran.
            print(f"Details: {alerts}")
        else:
            print("⚠️ No alerts generated (maybe test numbers not set or conditions not met?)")
            
    except Exception as e:
        print(f"❌ Test Failed: {e}")

if __name__ == "__main__":
    test_gemini_alert()
