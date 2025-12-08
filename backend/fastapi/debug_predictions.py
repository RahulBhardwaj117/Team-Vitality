import sys
import os
import pandas as pd

# Add model directory
sys.path.append(os.path.join(os.path.dirname(__file__), "../New_prediction"))

import flood_forcast

# Simulate low rainfall forecast (similar to what the UI shows)
# Let's say: 10%, 15%, 5%, 0%, 0%, 0%, 5% rain chances
low_rain_forecast = []
for i, rain_pct in enumerate([10, 15, 5, 0, 0, 0, 5]):
    row = {
        'MaxTemp': 30 + i,
        'MinTemp': 20 + i,
        'sunshine_duration': 10.0,
        'precipitation_probability_max': rain_pct,
        'wind_speed_10m_max': 10.0,
        'Evapotranspiration': 4.0,
        'Rainfall': (rain_pct / 100) * 10  # Same formula as endpoint
    }
    low_rain_forecast.append(row)

df_input = pd.DataFrame(low_rain_forecast)

print("=== INPUT DATA (Low Rainfall Forecast) ===")
print(df_input)
print()

try:
    predicted_rain = flood_forcast.predict_7_days(df_input)
    print("=== MODEL PREDICTIONS ===")
    for i, rain in enumerate(predicted_rain):
        print(f"Day {i+1}: {rain:.2f} mm")
    
    total_rain = sum(predicted_rain)
    rise = total_rain / 80
    risk = 'Low' if rise < 0.5 else 'Medium' if rise < 1 else 'High'
    
    print(f"\nTotal Rain: {total_rain:.2f} mm")
    print(f"Expected Rise: {rise:.2f} m")
    print(f"Risk Level: {risk}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
