import logging
import asyncio
from datetime import datetime, date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.prediction_service import prediction_service
from app.services.user_service import user_service
from app.services.notification_service import send_alert_async
from app.services.gemini_advisor import generate_short_advice

logger = logging.getLogger("AgriUrbanAI")

scheduler = BackgroundScheduler()

async def analyze_and_alert_job():
    """
    The core engine job:
    1. Fetches all subscribed users.
    2. Suggests weather for their location.
    3. Runs predictions.
    4. Triggers alerts if risks are high.
    """
    logger.info("🕒 Starting Scheduled Analysis Engine...")
    
    users = user_service.get_all_users()
    if not users:
        logger.info("No users registered for alerts. Skipping.")
        return

    today = date.today()
    next_week = today + timedelta(days=7)

    for user in users:
        try:
            name = user.get("name", "Farmer")
            phone = user.get("phone")
            location = user.get("location", "Delhi")
            lang = user.get("language", "en")
            
            if not phone:
                continue
                
            logger.info(f"🔍 Analyzing for {name} in {location}...")
            
            # --- 1. Run Comprehensive Prediction ---
            # We use the existing comprehensive service which runs all models
            try:
                # Since we are in an async function run by asyncio.run(), just await!
                result = await prediction_service.predict_comprehensive(today, next_week, district=location)
            except Exception as exc:
                logger.error(f"Prediction failed for {name}: {exc}")
                continue

            # --- 2. Check Risks & Trigger Alerts ---
            
            # Flood Check
            if result.flood and result.flood.risk_level == "High":
                advice = await generate_short_advice("Flood", 0, lang) # Temp 0 as placeholder
                await send_alert_async(name, phone, lang, "flood", result.flood.probability, advice)
                
            # Heatwave Check
            elif result.heatwave and result.heatwave.max_temp > 40:
                advice = await generate_short_advice("Heatwave", result.heatwave.max_temp, lang)
                await send_alert_async(name, phone, lang, "heatwave", result.heatwave.max_temp, advice)
                
            # Drought Check (Medium or High)
            elif result.drought and result.drought.severity in ["Severe", "Moderate"]:
                advice = await generate_short_advice("Drought", 0, lang)
                await send_alert_async(name, phone, lang, "drought", result.drought.severity, advice)
            
            else:
                logger.info(f"✅ No high risks for {name}. Conditions normal.")

        except Exception as e:
            logger.error(f"Error processing user {user.get('name')}: {e}")

    logger.info("🕒 Scheduled Analysis Complete.")

def start_scheduler_engine():
    """
    Starts the background scheduler.
    """
    if not scheduler.running:
        # Run every 6 hours
        scheduler.add_job(lambda: asyncio.run(analyze_and_alert_job()), 'interval', hours=6)
        scheduler.start()
        logger.info("✅ Alert Scheduler Engine Started (Interval: 6 hours)")
