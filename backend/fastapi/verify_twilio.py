import os
import sys
import logging
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TwilioTest")

# Manually load vars to be sure
SID = os.getenv("TWILIO_ACCOUNT_SID")
TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUMBER = os.getenv("TWILIO_PHONE")

def test_sms():
    print(f"Testing Twilio Configuration...")
    print(f"SID: {SID}")
    print(f"From: {FROM_NUMBER}")
    
    try:
        client = Client(SID, TOKEN)
        
        # Send to Rahul's number
        target_number = "+917307438928" 
        
        print(f"Attempting to send SMS to {target_number}...")
        
        message = client.messages.create(
            body="AgriUrbanAI Logic Test: Real alert system is active.",
            from_=FROM_NUMBER,
            to=target_number
        )
        
        print(f"✅ SUCCESS! Message SID: {message.sid}")
        print(f"Status: {message.status}")
        return True

    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    test_sms()
