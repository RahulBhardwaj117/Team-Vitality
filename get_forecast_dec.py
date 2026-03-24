import sys
import os
import json

# Add path to New_prediction
sys.path.append(os.path.join(os.getcwd(), 'backend', 'New_prediction'))

import weather_prediction

# Get forecast
result = weather_prediction.get_weekly_forecast('2025-12-02')

# Print formatted JSON
print(json.dumps(result, indent=2))
