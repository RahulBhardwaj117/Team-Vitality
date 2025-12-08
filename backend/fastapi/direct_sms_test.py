import requests

# Direct SMS test - bypasses all services
url = "http://localhost:8000/alert/send_sms"
payload = {
    "to": "+919999999990",
    "message": "TEST MESSAGE FROM AGRIURBANAI - If you receive this, the system works!"
}

print("Sending direct SMS test...")
response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Also try without + symbol
payload2 = {
    "to": "919999999990",
    "message": "SECOND TEST - trying without + symbol"
}
print("\nTrying without + symbol...")
response2 = requests.post(url, json=payload2)
print(f"Status: {response2.status_code}")
print(f"Response: {response2.json()}")
