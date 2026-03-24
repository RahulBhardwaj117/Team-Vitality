import sys
import os
import json

# Add path to New_prediction
sys.path.append(os.path.join(os.getcwd(), 'backend', 'New_prediction'))

import weather_prediction

# Get forecast
result = weather_prediction.get_weekly_forecast('2025-06-20')

# Save to file
with open('temp_forecast.json', 'w') as f:
    json.dump(result, f, indent=2)

print("Forecast saved to temp_forecast.json")
