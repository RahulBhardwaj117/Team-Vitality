import asyncio
import sys
import os
import logging
from datetime import timedelta, date, datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

# Import schemas
from app.schemas.prediction_schemas import (
    WeatherResponse, WeeklyWeatherResponse,
    FloodResponse, DailyFloodForecast,
    DroughtResponse, HeatwaveResponse,
    GroundwaterResponse, ComprehensiveResponse
)

# Import existing AI modules from predictions folder
predictions_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'predictions'))
sys.path.insert(0, predictions_path)

try:
    import weather_forcast
    import flood_prediction
    import drought_prediction
    from heatwave_prediction import HeatwaveForecaster
    import groundwater_forcast
    import fertilizer_recommendation
except ImportError as e:
    logging.error(f"Failed to import AI modules: {e}")
    # Don't raise immediately, allow partial functionality
    pass

from app.services.llm_service import llm_service

logger = logging.getLogger("AgriUrbanAI")

# Thread pool for running blocking AI models
executor = ThreadPoolExecutor(max_workers=10)

class PredictionService:
    
    def __init__(self):
        # Initialize heatwave forecaster (it's class-based)
        self.heatwave_forecaster = None
    
    async def predict_weather_daily(self, target_date: date) -> dict:
        """
        Wraps weather_forcast.get_weather_forecast in a thread
        """
        date_str = target_date.strftime("%Y-%m-%d")
        
        # Run blocking code in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor, 
            weather_forcast.get_weather_forecast, 
            date_str
        )
        
        if "error" in result:
            # Fallback if model fails
            logger.warning(f"Weather model error: {result['error']}")
            return {
                "Date": date_str,
                "Temperature": 30,
                "Humidity": 50,
                "Rainfall": 0,
                "Condition": "Sunny (Fallback)"
            }
            
        return result

    async def predict_weather_weekly(self, start_date: date) -> WeeklyWeatherResponse:
        """
        Generates 15-day forecast using the enhanced weather model
        """
        date_str = start_date.strftime("%Y-%m-%d")
        
        # Import enhanced weather forecast
        try:
            import weather_forcast_enhanced
            
            # Run blocking code in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                executor,
                weather_forcast_enhanced.get_weekly_forecast,
                date_str
            )
            
            if "error" in result:
                logger.warning(f"Enhanced weather model error: {result['error']}, falling back to basic model")
                # Fallback to daily predictions
                forecasts = []
                current_date = start_date
                for _ in range(15):
                    daily_data = await self.predict_weather_daily(current_date)
                    forecasts.append(daily_data)
                    current_date += timedelta(days=1)
                return WeeklyWeatherResponse(forecast=forecasts)
            
            # Transform forecasts to match schema
            transformed_forecasts = []
            for forecast in result.get("forecasts", []):
                transformed = {
                    "date": forecast.get("date", ""),
                    "Max Temp (C)": forecast.get("temp", 30.0),
                    "Min Temp (C)": forecast.get("min_temp", 20.0),
                    "Humidity (%)": forecast.get("humidity", 50.0),
                    "Rain Probability (%)": forecast.get("rain_chance", 0.0),
                    "Rainfall (mm)": forecast.get("rainfall", 0.0)
                }
                transformed_forecasts.append(transformed)
            
            logger.info(f"Successfully generated 15-day forecast with enhanced model")
            return WeeklyWeatherResponse(forecast=transformed_forecasts)
            
        except Exception as e:
            logger.error(f"Enhanced weather model failed: {e}, using fallback")
            # Fallback to daily predictions
            forecasts = []
            current_date = start_date
            for _ in range(15):
                daily_data = await self.predict_weather_daily(current_date)
                forecasts.append(daily_data)
                current_date += timedelta(days=1)
            return WeeklyWeatherResponse(forecast=forecasts)

    async def predict_flood(self, start_date: date, end_date: date) -> FloodResponse:
        """
        Predict flood risk for a date range
        """
        logger.info(f"Predicting flood risk from {start_date} to {end_date}")
        
        # Convert to datetime for flood_prediction module
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.min.time())
        
        # Run blocking prediction in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            flood_prediction.predict_flood_risk,
            start_dt,
            end_dt
        )
        
        if not result or len(result) == 0:
            raise ValueError("No flood prediction data generated")
        
        # Transform to API response format
        daily_forecasts = []
        high_risk_count = 0
        max_prob = 0.0
        
        for day in result:
            prob = day.get('Flood_Probability', 0)
            max_prob = max(max_prob, prob)
            
            risk_label = "High" if prob > 0.7 else "Medium" if prob > 0.4 else "Low"
            if prob > 0.7:
                high_risk_count += 1
            
            daily_forecasts.append(DailyFloodForecast(
                date=day['Date'].strftime('%Y-%m-%d') if hasattr(day['Date'], 'strftime') else str(day['Date']),
                rainfall=day.get('Rainfall', 0),
                soil_moisture=day.get('SoilMoisture', 0),
                flood_probability=prob,
                risk_level=risk_label
            ))
        
        # Determine overall risk level
        if max_prob > 0.7:
            overall_risk = "High"
        elif max_prob > 0.4:
            overall_risk = "Medium"
        else:
            overall_risk = "Low"
        
        # Generate recommendations using LLM
        risk_data = {
            "Risk Type": "Flood",
            "Overall Risk": overall_risk,
            "Max Probability": f"{max_prob:.2f}",
            "High Risk Days": high_risk_count
        }
        llm_rec = llm_service.generate_recommendation(risk_data, role="urban") # Flood is usually urban/regional
        
        return FloodResponse(
            risk_level=overall_risk,
            probability=max_prob,
            high_risk_days=high_risk_count,
            daily_forecast=daily_forecasts,
            recommendations=llm_rec.get("actions", [])
        )

    async def predict_drought(self, start_date: date, end_date: date, scenario: str = "realistic") -> DroughtResponse:
        """
        Predict drought severity for a date range
        """
        logger.info(f"Predicting drought from {start_date} to {end_date}, scenario: {scenario}")
        
        # Convert to datetime
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.min.time())
        
        # Run blocking prediction in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            drought_prediction.predict_date_range,
            start_dt,
            end_dt,
            scenario,
            True  # is_future
        )
        
        if result is None or result.empty:
            raise ValueError("No drought prediction data generated")
        
        # Transform to API response format
        daily_forecast = result.to_dict(orient='records')
        
        # Calculate average severity
        severity_map = {0: "None", 1: "Mild", 2: "Moderate", 3: "Severe"}
        avg_severity = result['DroughtSeverity'].mean()
        severity_name = severity_map.get(int(round(avg_severity)), "None")
        
        return DroughtResponse(
            severity=severity_name,
            avg_severity_index=avg_severity,
            daily_forecast=daily_forecast
        )

    async def predict_heatwave(self, start_date: date, end_date: date, scenario: str = "realistic") -> HeatwaveResponse:
        """
        Predict heatwave for a date range
        """
        logger.info(f"Predicting heatwave from {start_date} to {end_date}, scenario: {scenario}")
        
        # Initialize forecaster if needed
        if self.heatwave_forecaster is None:
            loop = asyncio.get_event_loop()
            self.heatwave_forecaster = await loop.run_in_executor(
                executor,
                HeatwaveForecaster
            )
        
        # Convert to datetime
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.min.time())
        
        # Run blocking prediction in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            self.heatwave_forecaster.predict_period,
            start_dt,
            end_dt,
            scenario
        )
        
        if result is None or result.empty:
            raise ValueError("No heatwave prediction data generated")
        
        # Transform to API response format
        daily_forecast = result.to_dict(orient='records')
        max_temp = result['MaxTemp'].max()
        heatwave_days = result[result['Severity'] >= 2].shape[0]
        
        return HeatwaveResponse(
            max_temp=max_temp,
            heatwave_days=heatwave_days,
            daily_forecast=daily_forecast
        )

    async def predict_groundwater(self, district: str = None) -> GroundwaterResponse:
        """
        Predict groundwater level for a district
        """
        logger.info(f"Predicting groundwater for district: {district}")
        
        # If no district specified, use Central Delhi as default
        if not district:
            district = "Central"
        
        # Run blocking prediction in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            groundwater_forcast.predict_for_district,
            district
        )
        
        if result is None:
            raise ValueError(f"No groundwater data for district: {district}")
        
        # Determine trend
        actual = result.get('actual')
        predicted = result.get('prediction')
        
        if actual and predicted:
            diff = predicted - actual
            if diff > 10:
                trend = "Improving"
            elif diff < -10:
                trend = "Declining"
            else:
                trend = "Stable"
        else:
            trend = "Unknown"
        
        # Generate recommendations using LLM
        risk_data = {
            "Risk Type": "Groundwater",
            "District": district,
            "Trend": trend,
            "Predicted Level": f"{predicted:.2f} m bgl"
        }
        llm_rec = llm_service.generate_recommendation(risk_data, role="admin")
        
        return GroundwaterResponse(
            predicted_level=predicted,
            trend=trend,
            recommendations=llm_rec.get("actions", [])
        )

    async def predict_fertilizer(self, crop: str, soil_type: str) -> dict:
        """
        Recommend fertilizer
        """
        logger.info(f"Recommending fertilizer for {crop} in {soil_type} soil")
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            fertilizer_recommendation.get_recommendation,
            crop,
            soil_type
        )
        return result

    async def predict_comprehensive(self, start_date: date, end_date: date, district: str = None) -> ComprehensiveResponse:
        """
        Generate comprehensive prediction with all models
        """
        logger.info(f"Generating comprehensive prediction from {start_date} to {end_date}")
        
        # Run all predictions in parallel
        flood_task = self.predict_flood(start_date, end_date)
        drought_task = self.predict_drought(start_date, end_date)
        heatwave_task = self.predict_heatwave(start_date, end_date)
        groundwater_task = self.predict_groundwater(district)
        
        # Wait for all to complete
        flood_result, drought_result, heatwave_result, groundwater_result = await asyncio.gather(
            flood_task, drought_task, heatwave_task, groundwater_task,
            return_exceptions=True
        )
        
        # Check for errors and handle gracefully
        flood_data = flood_result if not isinstance(flood_result, Exception) else None
        drought_data = drought_result if not isinstance(drought_result, Exception) else None
        heatwave_data = heatwave_result if not isinstance(heatwave_result, Exception) else None
        groundwater_data = groundwater_result if not isinstance(groundwater_result, Exception) else None
        
        # Generate risk summary using LLM
        risk_data = {}
        if flood_data: risk_data["Flood Risk"] = flood_data.risk_level
        if drought_data: risk_data["Drought Severity"] = drought_data.severity
        if heatwave_data: risk_data["Heatwave Days"] = heatwave_data.heatwave_days
        if groundwater_data: risk_data["Groundwater Trend"] = groundwater_data.trend
        
        llm_rec = llm_service.generate_recommendation(risk_data, role="admin")
        
        return ComprehensiveResponse(
            flood=flood_data,
            drought=drought_data,
            heatwave=heatwave_data,
            groundwater=groundwater_data,
            risk_summary=llm_rec.get("recommendation", "Comprehensive analysis complete.")
        )

    async def predict_fertilizer(self, crop: str, soil_type: str, n: float = None, p: float = None, k: float = None):
        """
        Generate fertilizer recommendations.
        """
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                fertilizer_recommendation.get_recommendation,
                crop,
                soil_type,
                n,
                p,
                k
            )
            
            # Enhance with LLM if available
            if self.llm_service:
                try:
                    llm_advice = await self.llm_service.generate_recommendation({
                        "type": "Fertilizer",
                        "crop": crop,
                        "soil": soil_type,
                        "deficits": result.get("recommended_nutrients", {}),
                        "recommendations": result.get("recommendations", [])
                    })
                    result["ai_advice"] = llm_advice
                except Exception as e:
                    logger.error(f"LLM enhancement failed for fertilizer: {e}")
            
            return result
        except Exception as e:
            logger.error(f"Fertilizer prediction failed: {e}")
            raise ValueError(f"Fertilizer prediction failed: {str(e)}")

prediction_service = PredictionService()


