import requests
import json

# Test the drought API directly
FASTAPI_URL = 'http://localhost:8000'

# Sample payload matching what the frontend sends
payload = {
    "forecast": [
        {"day": "2024-12-04", "condition": "Clear", "rain_chance": 10, "temp": 25, 
         "icon": "☀️", "humidity": 60, "wind": 10, "min_temp": 20, "max_temp": 30},
        {"day": "2024-12-05", "condition": "Clear", "rain_chance": 5, "temp": 26, 
         "icon": "☀️", "humidity": 55, "wind": 12, "min_temp": 21, "max_temp": 31},
        {"day": "2024-12-06", "condition": "Sunny", "rain_chance": 0, "temp": 28, 
         "icon": "☀️", "humidity": 50, "wind": 8, "min_temp": 22, "max_temp": 33}
    ],
    "location": "Delhi"
}

print("=" * 60)
print("TESTING DROUGHT API ENDPOINT")
print("=" * 60)

try:
    response = requests.post(
        f"{FASTAPI_URL}/predict/drought/integrated",
        json=payload,
        timeout=10
    )
    
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ API WORKING! Response:")
        print(json.dumps(result, indent=2))
        print(f"\n🎯 Risk Level: {result.get('risk_level', 'N/A')}")
        print(f"🌍 Soil Moisture: {result.get('soil_moisture', 'N/A')}")
        print(f"💧 Rainfall Deficit: {result.get('rainfall_deficit', 'N/A')}")
        print(f"📈 Confidence: {result.get('confidence', 'N/A')}%")
    else:
        print(f"\n❌ API ERROR!")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n💥 EXCEPTION: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
