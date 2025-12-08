
import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def wait_for_server():
    print(f"Waiting for server at {BASE_URL}...")
    for _ in range(10):
        try:
            resp = requests.get(f"{BASE_URL}/")
            if resp.status_code == 200:
                print("Server is up!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    print("Server failed to start.")
    return False

def test_trigger():
    print("\n[TEST] Manual Trigger (/alert/trigger)")
    resp = requests.get(f"{BASE_URL}/alert/trigger")
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")
    if resp.status_code == 200:
        print("PASS")
    else:
        print("FAIL")

def test_predict_alert():
    print("\n[TEST] Predict & Alert (/alert/predict_and_alert)")
    # High risk data
    payload = {"temperature": 45, "rainfall": 0, "humidity": 20, "soil_moisture": 10}
    try:
        resp = requests.post(f"{BASE_URL}/alert/predict_and_alert", json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
        if resp.status_code == 200 and resp.json().get("assessment", {}).get("risk") == "heatwave":
            print("PASS - Correctly identified Heatwave")
        else:
            print("FAIL - Did not identify risk correctly")
    except Exception as e:
        print(f"FAIL - Request Error: {e}")

def main():
    if wait_for_server():
        test_trigger()
        test_predict_alert()
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
