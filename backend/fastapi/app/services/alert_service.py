import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "alerts.db")

class AlertService:
    def __init__(self):
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                location TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                details TEXT
            )
        ''')
        conn.commit()
        conn.close()

    async def create_alert(self, type: str, severity: str, message: str, location: str = "General", details: Dict = None) -> Dict:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        details_json = json.dumps(details) if details else "{}"
        
        cursor.execute('''
            INSERT INTO alerts (type, severity, message, location, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (type, severity, message, location, details_json))
        
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "id": alert_id,
            "type": type,
            "severity": severity,
            "message": message,
            "location": location,
            "timestamp": datetime.now().isoformat(),
            "is_active": True,
            "details": details
        }

    async def get_active_alerts(self) -> List[Dict]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM alerts WHERE is_active = 1 ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        
        alerts = []
        for row in rows:
            alerts.append({
                "id": row["id"],
                "type": row["type"],
                "severity": row["severity"],
                "message": row["message"],
                "location": row["location"],
                "timestamp": row["timestamp"],
                "is_active": bool(row["is_active"]),
                "details": json.loads(row["details"]) if row["details"] else {}
            })
        
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "alerts.db")

class AlertService:
    def __init__(self):
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                location TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                details TEXT
            )
        ''')
        conn.commit()
        conn.close()

    async def create_alert(self, type: str, severity: str, message: str, location: str = "General", details: Dict = None) -> Dict:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        details_json = json.dumps(details) if details else "{}"
        
        cursor.execute('''
            INSERT INTO alerts (type, severity, message, location, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (type, severity, message, location, details_json))
        
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "id": alert_id,
            "type": type,
            "severity": severity,
            "message": message,
            "location": location,
            "timestamp": datetime.now().isoformat(),
            "is_active": True,
            "details": details
        }

    async def get_active_alerts(self) -> List[Dict]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM alerts WHERE is_active = 1 ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        
        alerts = []
        for row in rows:
            alerts.append({
                "id": row["id"],
                "type": row["type"],
                "severity": row["severity"],
                "message": row["message"],
                "location": row["location"],
                "timestamp": row["timestamp"],
                "is_active": bool(row["is_active"]),
                "details": json.loads(row["details"]) if row["details"] else {}
            })
        
        conn.close()
        return alerts

    async def check_and_generate_alerts(self, prediction_data: Dict) -> List[Dict]:
        """
        Analyzes prediction data and generates alerts if thresholds are breached.
        Now also sends SMS/Calls to users via notification service.
        """
        from app.services.notification_service import send_alert_async
        from app.services.gemini_advisor import generate_short_advice
        from app.services.user_service import user_service
        
        generated_alerts = []
        
        # Handle both data formats:
        # Format 1: {"risk_type": "heatwave", "risk_level": "High", "data": {...}}
        # Format 2: {"flood": {"risk_level": "High"}, "heatwave": {...}}
        
        risk_type = prediction_data.get("risk_type", "").lower()
        risk_level = prediction_data.get("risk_level", "")
        
        # Check Format 1 (from /predict_and_alert endpoint)
        if risk_type and risk_level:
            if risk_type in ["heatwave", "flood", "drought"] and risk_level in ["High", "Medium"]:
                # Create alert in database
                alert = await self.create_alert(
                    type=risk_type.capitalize(),
                    severity=risk_level,
                    message=f"{risk_type.capitalize()} {risk_level} risk detected!",
                    location=prediction_data.get("location", "Unknown"),
                    details=prediction_data.get("data", {})
                )
                generated_alerts.append(alert)
                
                # Send SMS to all users
                users = user_service.get_all_users()
                temp = prediction_data.get("data", {}).get("temperature", 0)
                
                for user in users:
                    try:
                        # Generate AI advice
                        advice = await generate_short_advice(risk_type, temp, user.get("language", "en"))
                        
                        # Send alert
                        await send_alert_async(
                            user.get("name", "User"),
                            user.get("phone"),
                            user.get("language", "en"),
                            risk_type,
                            temp,
                            advice
                        )
                    except Exception as e:
                        print(f"Failed to send alert to {user.get('name')}: {e}")
        
        # Check Format 2 (from scheduler/comprehensive prediction)
        # Flood Check
        if prediction_data.get("flood", {}).get("risk_level") == "High":
            alert = await self.create_alert(
                type="Flood",
                severity="High",
                message="High risk of flooding detected. River levels rising.",
                location=prediction_data.get("location", "Unknown"),
                details=prediction_data.get("flood")
            )
            generated_alerts.append(alert)
            
        # Heatwave Check
        if prediction_data.get("heatwave", {}).get("risk_level") in ["High", "Severe"]:
             alert = await self.create_alert(
                type="Heatwave",
                severity="High",
                message=f"Heatwave warning! Temperatures expected to reach {prediction_data.get('heatwave', {}).get('max_temp', 'high levels')}.",
                location=prediction_data.get("location", "Unknown"),
                details=prediction_data.get("heatwave")
            )
             generated_alerts.append(alert)

        # Drought Check
        if prediction_data.get("drought", {}).get("risk_level") == "High":
             alert = await self.create_alert(
                type="Drought",
                severity="Medium",
                message="Drought conditions detected. Water conservation recommended.",
                location=prediction_data.get("location", "Unknown"),
                details=prediction_data.get("drought")
            )
             generated_alerts.append(alert)

        return generated_alerts
