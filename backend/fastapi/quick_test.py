
import requests
import json

def send_test_sms():
    url = "http://localhost:8000/alert/send_sms"
    payload = {
        "to": "+918882429871",
        "message": "🔔 AgriUrbanAI Test: This is a verification alert for +918882429871."
    }
    try:
        response = requests.post(url, json=payload)
        print(f"SMS Response Status: {response.status_code}")
        print(f"SMS Response Body: {response.json()}")
    except Exception as e:
        print(f"Failed to send SMS: {e}")

if __name__ == "__main__":
    send_test_sms()
