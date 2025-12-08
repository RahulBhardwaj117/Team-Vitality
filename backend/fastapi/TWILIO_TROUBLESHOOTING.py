"""
TWILIO ERROR 21211 - TROUBLESHOOTING GUIDE
==========================================

The error "Invalid 'To' Phone Number" means Twilio is rejecting the recipient number.

MOST COMMON CAUSES:
-------------------

1. TWILIO TRIAL ACCOUNT RESTRICTIONS
   • Trial accounts can ONLY send to verified phone numbers
   • You must verify +919999999990 in your Twilio console FIRST
   
   HOW TO FIX:
   → Go to: https://console.twilio.com/
   → Click "Phone Numbers" → "Verified Caller IDs"
   → Click "+ Add a new number"
   → Enter: +919999999990
   → Complete the verification process (you'll receive a code)

2. INCORRECT "FROM" NUMBER
   • Check that TWILIO_PHONE in your .env is the correct Twilio number
   • It should look like: +1XXXXXXXXXX (US number) or +44XXXXXXX (UK)
   
   HOW TO CHECK:
   → Go to: https://console.twilio.com/
   → Click "Phone Numbers" → "Manage" → "Active numbers"
   → Copy your Twilio number exactly (including +)

3. GEOGRAPHIC RESTRICTIONS
   • Some trial accounts can't send to certain countries (like India)
   
   HOW TO FIX:
   → Go to: https://console.twilio.com/
   → Settings → Geo Permissions
   → Enable "India" for SMS

4. ACCOUNT NOT UPGRADED
   • If you need to send to non-verified numbers, upgrade your account
   → https://console.twilio.com/billing/upgrade

RECOMMENDED NEXT STEPS:
-----------------------
1. Verify your number: +919999999990 in Twilio console
2. Double-check your .env file has the correct Twilio credentials
3. Enable India in Geo Permissions
4. Test again with: python quick_test.py

"""

print(__doc__)
