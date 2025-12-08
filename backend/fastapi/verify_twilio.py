import os
import sys
import logging
from twilio.rest import Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TwilioTest")

# Manually load vars to be sure
# SID and Token from previous step output (trimmed whitespace if any)
SID = "ACf86884475d351afd880511b10c8b3152"
TOKEN = "54c1bd0b2bb55199d209091f134153d7" 
FROM_NUMBER = "+17174524803"

def test_sms():
    print(f"Testing Twilio Configuration...")
    print(f"SID: {SID}")
    print(f"From: {FROM_NUMBER}")
    
    try:
        client = Client(SID, TOKEN)
        
        # Send to Rahul's number from the DEFAULT_USERS list
        # "name": "Rahul Bhardwaj", "phone":"+917307438928"
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
