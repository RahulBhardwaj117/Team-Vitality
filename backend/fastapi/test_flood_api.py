import requests
import json

url = "http://localhost:8000/predict/flood/integrated"
payload = {
    "forecast": [
        {
            "day": "Monday",
            "condition": "Sunny",
            "rain_chance": 10,
            "temp": 30,
            "icon": "☀️",
            "humidity": 50,
            "wind": 10,
            "min_temp": 20,
            "max_temp": 35
        },
        {
            "day": "Tuesday",
            "condition": "Cloudy",
            "rain_chance": 30,
            "temp": 28,
            "icon": "☁️",
            "humidity": 60,
            "wind": 15,
            "min_temp": 22,
            "max_temp": 32
        },
        {
            "day": "Wednesday",
            "condition": "Rainy",
            "rain_chance": 80,
            "temp": 25,
            "icon": "🌧️",
            "humidity": 85,
            "wind": 20,
            "min_temp": 20,
            "max_temp": 28
        },
        {
            "day": "Thursday",
            "condition": "Rainy",
            "rain_chance": 90,
            "temp": 24,
            "icon": "🌧️",
            "humidity": 90,
            "wind": 25,
            "min_temp": 19,
            "max_temp": 27
        },
        {
            "day": "Friday",
            "condition": "Cloudy",
            "rain_chance": 40,
            "temp": 27,
            "icon": "☁️",
            "humidity": 70,
            "wind": 18,
            "min_temp": 21,
            "max_temp": 30
        },
        {
            "day": "Saturday",
            "condition": "Sunny",
            "rain_chance": 15,
            "temp": 29,
            "icon": "☀️",
            "humidity": 55,
            "wind": 12,
            "min_temp": 22,
            "max_temp": 33
        },
        {
            "day": "Sunday",
            "condition": "Sunny",
            "rain_chance": 10,
            "temp": 31,
            "icon": "☀️",
            "humidity": 50,
            "wind": 10,
            "min_temp": 23,
            "max_temp": 35
        }
    ],
    "location": "Gautam Buddha Nagar"
}

print("Sending request to:", url)
print("Payload:", json.dumps(payload, indent=2))
print("\n" + "="*50 + "\n")

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("\nResponse:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
    print(f"Response text: {response.text if 'response' in locals() else 'N/A'}")
