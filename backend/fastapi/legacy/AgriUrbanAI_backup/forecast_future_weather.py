"""
Weather Forecasting Module for Future Dates
Uses historical patterns to forecast likely weather conditions
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
import os
import sys

warnings.filterwarnings('ignore')

class HistoricalWeatherForecaster:
    """
    Forecasts future weather using historical patterns and statistical methods
    """
    
    def __init__(self, historical_data_path=None, monthly_rain_path=None):
        """Load historical data"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if historical_data_path is None:
            historical_data_path = os.path.join(base_dir, "final_weather.csv")
        if monthly_rain_path is None:
            monthly_rain_path = os.path.join(base_dir, "delhi-monthly-rains.csv")
        """Load historical data"""
        self.weather_db = pd.read_csv(historical_data_path)
        self.weather_db['Date'] = pd.to_datetime(self.weather_db['Date'])
        self.weather_db = self.weather_db.sort_values('Date').reset_index(drop=True)
        
        # Add temporal features
        self.weather_db['Month'] = self.weather_db['Date'].dt.month
        self.weather_db['DayOfYear'] = self.weather_db['Date'].dt.dayofyear
        self.weather_db['Week'] = self.weather_db['Date'].dt.isocalendar().week
        
        # Load monthly rainfall
        self.monthly_rain = pd.read_csv(monthly_rain_path)
        
        print(f"[OK] Loaded historical data: {len(self.weather_db)} days")
        print(f"  Date range: {self.weather_db['Date'].min().date()} to {self.weather_db['Date'].max().date()}")
    
    def get_historical_statistics(self, month, week=None):
        """
        Get historical statistics for a given month/week
        """
        # Filter by month
        month_data = self.weather_db[self.weather_db['Month'] == month]
        
        if week is not None:
            # Further filter by week if specified
            month_data = month_data[month_data['Week'] == week]
        
        if len(month_data) == 0:
            return None
        
        stats = {
            'Rainfall_mean': month_data['Rainfall'].mean(),
            'Rainfall_std': month_data['Rainfall'].std(),
            'Rainfall_p25': month_data['Rainfall'].quantile(0.25),
            'Rainfall_p50': month_data['Rainfall'].quantile(0.50),
            'Rainfall_p75': month_data['Rainfall'].quantile(0.75),
            'Rainfall_max': month_data['Rainfall'].max(),
        }
        
        # Temperature stats
        if 'MaxTemp' in month_data.columns:
            stats['MaxTemp_mean'] = month_data['MaxTemp'].mean()
            stats['MaxTemp_std'] = month_data['MaxTemp'].std()
            stats['MinTemp_mean'] = month_data['MinTemp'].mean()
            stats['MinTemp_std'] = month_data['MinTemp'].std()
        
        # Evapotranspiration
        if 'Evapotranspiration' in month_data.columns:
            stats['Evap_mean'] = month_data['Evapotranspiration'].mean()
            stats['Evap_std'] = month_data['Evapotranspiration'].std()
        
        return stats
    
    def forecast_week(self, year, week_number, scenario='realistic'):
        """
        Forecast weather for a specific week using historical patterns
        
        Args:
            year: Target year
            week_number: Week number (1-52)
            scenario: 'optimistic' (dry), 'realistic' (median), 'pessimistic' (wet)
        
        Returns:
            DataFrame with forecasted weather for 7 days
        """
        # Get start and end dates
        start_date = datetime.fromisocalendar(year, week_number, 1)
        end_date = datetime.fromisocalendar(year, week_number, 7)
        
        # Get month for this week
        month = start_date.month
        
        # Get historical statistics
        stats = self.get_historical_statistics(month, week_number)
        
        if stats is None:
            # Fallback to month-level statistics
            stats = self.get_historical_statistics(month)
        
        # Generate forecast for each day
        forecasted_data = []
        current_date = start_date
        
        for day in range(7):
            # Generate rainfall based on scenario
            if scenario == 'optimistic':
                # Lower rainfall (25th percentile)
                rainfall = max(0, np.random.normal(stats['Rainfall_p25'], stats['Rainfall_std'] * 0.5))
            elif scenario == 'pessimistic':
                # Higher rainfall (75th percentile or higher)
                rainfall = max(0, np.random.normal(stats['Rainfall_p75'], stats['Rainfall_std'] * 0.8))
            else:  # realistic
                # Median rainfall
                rainfall = max(0, np.random.normal(stats['Rainfall_mean'], stats['Rainfall_std'] * 0.6))
            
            # Generate temperature
            max_temp = np.random.normal(stats.get('MaxTemp_mean', 35), stats.get('MaxTemp_std', 3))
            min_temp = np.random.normal(stats.get('MinTemp_mean', 25), stats.get('MinTemp_std', 2))
            
            # Generate evapotranspiration
            evap = np.random.normal(stats.get('Evap_mean', 5), stats.get('Evap_std', 1))
            
            forecasted_data.append({
                'Date': current_date,
                'Rainfall': rainfall,
                'MaxTemp': max_temp,
                'MinTemp': min_temp,
                'Evapotranspiration': max(0, evap)
            })
            
            current_date += timedelta(days=1)
        
        forecast_df = pd.DataFrame(forecasted_data)
        return forecast_df
    
    def forecast_month(self, year, month, scenario='realistic'):
        """
        Forecast weather for an entire month
        """
        # Get date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year, 12, 31)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        days_in_month = (end_date - start_date).days + 1
        
        # Get historical statistics
        stats = self.get_historical_statistics(month)
        
        # Generate forecast for each day
        forecasted_data = []
        current_date = start_date
        
        for day in range(days_in_month):
            # Generate rainfall based on scenario
            if scenario == 'optimistic':
                rainfall = max(0, np.random.normal(stats['Rainfall_p25'], stats['Rainfall_std'] * 0.5))
            elif scenario == 'pessimistic':
                rainfall = max(0, np.random.normal(stats['Rainfall_p75'], stats['Rainfall_std'] * 0.8))
            else:
                rainfall = max(0, np.random.normal(stats['Rainfall_mean'], stats['Rainfall_std'] * 0.6))
            
            # Generate temperature
            max_temp = np.random.normal(stats.get('MaxTemp_mean', 35), stats.get('MaxTemp_std', 3))
            min_temp = np.random.normal(stats.get('MinTemp_mean', 25), stats.get('MinTemp_std', 2))
            
            # Generate evapotranspiration
            evap = np.random.normal(stats.get('Evap_mean', 5), stats.get('Evap_std', 1))
            
            forecasted_data.append({
                'Date': current_date,
                'Rainfall': rainfall,
                'MaxTemp': max_temp,
                'MinTemp': min_temp,
                'Evapotranspiration': max(0, evap)
            })
            
            current_date += timedelta(days=1)
        
        forecast_df = pd.DataFrame(forecasted_data)
        return forecast_df

# Test the forecaster
if __name__ == "__main__":
    forecaster = HistoricalWeatherForecaster()
    
    print("\n" + "="*80)
    print("TESTING WEATHER FORECASTING FOR FUTURE DATES")
    print("="*80)
    
    # Test week forecasting
    print("\nForecasting Week 31, 2025 (realistic scenario)...")
    forecast = forecaster.forecast_week(2025, 31, scenario='realistic')
    print(f"\nForecast generated for {len(forecast)} days:")
    print(forecast[['Date', 'Rainfall', 'MaxTemp', 'MinTemp']].to_string())
    
    print(f"\nTotal forecasted rainfall: {forecast['Rainfall'].sum():.1f} mm")
    print(f"Average daily rainfall: {forecast['Rainfall'].mean():.1f} mm")
    
    # Try pessimistic scenario
    print("\n" + "-"*80)
    print("Forecasting Week 31, 2025 (pessimistic/wet scenario)...")
    forecast_wet = forecaster.forecast_week(2025, 31, scenario='pessimistic')
    print(f"Total forecasted rainfall (wet): {forecast_wet['Rainfall'].sum():.1f} mm")
