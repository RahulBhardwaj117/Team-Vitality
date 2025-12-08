import json
import os
import logging
from typing import List, Dict, Optional

USERS_DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "users.json")
logger = logging.getLogger("AgriUrbanAI")

class UserService:
    def __init__(self):
        self._ensure_db()
        
    def _ensure_db(self):
        if not os.path.exists(USERS_DB_FILE):
            with open(USERS_DB_FILE, 'w') as f:
                json.dump([], f)
                
    def get_all_users(self) -> List[Dict]:
        try:
            with open(USERS_DB_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load users: {e}")
            return []
            
    def register_user(self, user_data: Dict):
        """
        Register or update a user for alerts.
        Expected keys: name, phone, language, location, email
        """
        users = self.get_all_users()
        
        # Check if user exists (by phone or email)
        phone = user_data.get("phone")
        email = user_data.get("email")
        
        updated = False
        for i, u in enumerate(users):
            if (phone and u.get("phone") == phone) or (email and u.get("email") == email):
                users[i].update(user_data)
                updated = True
                break
                
        if not updated:
            users.append(user_data)
            
        try:
            with open(USERS_DB_FILE, 'w') as f:
                json.dump(users, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save user: {e}")
            return False

user_service = UserService()
