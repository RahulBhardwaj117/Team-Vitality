import sys
import os
from datetime import datetime

# Add current dir to path
sys.path.append(os.getcwd())

print("Importing flood_prediction (this will train the risk model)...")
try:
    import flood_prediction
except Exception as e:
    print(f"Import failed: {e}")
    exit(1)

print("\nTesting Historical Prediction (2023-08-01 to 2023-08-10)...")
try:
    start = datetime(2023, 8, 1)
    end = datetime(2023, 8, 10)
    flood_prediction.predict_period(start, end)
except Exception as e:
    print(f"Historical prediction failed: {e}")

print("\nTesting Future Prediction (2025-08-01 to 2025-08-10)...")
try:
    start = datetime(2025, 8, 1)
    end = datetime(2025, 8, 10)
    flood_prediction.predict_period(start, end)
except Exception as e:
    print(f"Future prediction failed: {e}")
