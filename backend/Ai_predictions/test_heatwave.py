"""
Test Heatwave Prediction
"""
from heatwave_prediction import HeatwaveForecaster, print_forecast
from datetime import datetime

print("Initializing...")
forecaster = HeatwaveForecaster()

# Test 1: May 2025 (Peak Heat)
print("\nTEST 1: May 2025 (Expected Heatwave)")
start = datetime(2025, 5, 20)
end = datetime(2025, 5, 27)
df = forecaster.predict_period(start, end, scenario='pessimistic') # Pessimistic to trigger heatwave
print_forecast(df)

# Test 2: January 2026 (Winter)
print("\nTEST 2: January 2026 (Expected Normal)")
start = datetime(2026, 1, 10)
end = datetime(2026, 1, 15)
df = forecaster.predict_period(start, end, scenario='realistic')
print_forecast(df)
