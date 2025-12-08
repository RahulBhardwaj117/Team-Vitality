import requests
import json

FASTAPI_URL = 'http://localhost:8000'

# Test payload
payload = {
    "forecast": [
        {
            "day": "2024-12-04",
            "condition": "Clear",
            "rain_chance": 5,
            "temp": 35,
            "icon": "☀️",
            "humidity": 45,
            "wind": 10,
            "min_temp": 25,
            "max_temp": 35
        },
        {
            "day": "2024-12-05",
            "condition": "Sunny",
            "rain_chance": 0,
            "temp": 38,
            "icon": "☀️",
            "humidity": 40,
            "wind": 12,
            "min_temp": 26,
            "max_temp": 38
        }
    ],
    "location": "Delhi"
}

print("Testing Drought API...")
print(f"URL: {FASTAPI_URL}/predict/drought/integrated")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(
        f"{FASTAPI_URL}/predict/drought/integrated",
        json=payload,
        timeout=10
    )
    
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ SUCCESS!")
        print(f"\nResponse:")
        print(json.dumps(result, indent=2))
    else:
        print(f"\n❌ ERROR!")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n❌ EXCEPTION: {e}")
