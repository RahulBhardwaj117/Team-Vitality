import requests

# Test different phone number formats to find which one Twilio accepts
url = "http://localhost:8000/alert/send_sms"

formats = [
    "+919999999990",   # Current format
    "+91 9999999990",  # With space
    "9999999990",      # Without country code
    "919999999990",    # Country code without +
]

for phone in formats:
    print(f"\n{'='*50}")
    print(f"Testing: {phone}")
    payload = {"to": phone, "message": f"Test from format: {phone}"}
    
    try:
        response = requests.post(url, json=payload)
        result = response.json()
        print(f"Status: {response.status_code}")
        print(f"Response: {result}")
        
        if result and len(result) > 0:
            if result[0].get('status') == 'sent' and not result[0].get('error'):
                print("✅ SUCCESS! This format works!")
            else:
                print(f"❌ Error: {result[0].get('error', 'Unknown')}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
