import requests

# Trigger a REAL heatwave alert with high temperature
url = "http://localhost:8000/alert/predict_and_alert"
payload = {
    "temperature": 44,  # High temperature triggers heatwave
    "rainfall": 2,
    "humidity": 18,
    "soil_moisture": 12
}

print("Triggering HEATWAVE ALERT to your number...")
print(f"Payload: {payload}")

response = requests.post(url, json=payload)
print(f"\nStatus: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    result = response.json()
    assessment = result.get('assessment', {})
    print(f"\n✅ Risk Detected: {assessment.get('risk')} - {assessment.get('level')}")
    print("Check your phone for the alert SMS!")
