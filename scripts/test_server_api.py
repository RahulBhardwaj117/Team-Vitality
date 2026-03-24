import requests
import json

url = "http://127.0.0.1:8000/predict/flood/integrated"
payload = {
    "location": "Delhi",
    "forecast": [
        {"day": "Mon", "condition": "Sunny", "rain_chance": 10, "temp": 35, "icon": "sun", "humidity": 40, "wind": 10, "min_temp": 25, "max_temp": 38}
    ] * 7
}

try:
    print(f"Testing {url}...")
    response = requests.post(url, json=payload, timeout=10)
    print(f"✅ Flood Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}...")
except Exception as e:
    print(f"❌ Flood Error: {e}")

# Test Heatwave
url_heat = "http://127.0.0.1:8000/predict/heatwave/integrated"
try:
    print(f"\nTesting {url_heat}...")
    response = requests.post(url_heat, json=payload, timeout=10)
    print(f"✅ Heatwave Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}...")
except Exception as e:
    print(f"❌ Heatwave Error: {e}")

# Test Drought
url_drought = "http://127.0.0.1:8000/predict/drought/integrated"
try:
    print(f"\nTesting {url_drought}...")
    response = requests.post(url_drought, json=payload, timeout=10)
    print(f"✅ Drought Status: {response.status_code}")
    print(f"   Response: {response.text[:200]}...")
except Exception as e:
    print(f"❌ Drought Error: {e}")
