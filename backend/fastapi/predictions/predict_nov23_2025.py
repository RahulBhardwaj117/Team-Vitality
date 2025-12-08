"""
Prediction for November 23, 2025
Week 47, 2025 (which includes Nov 23)
"""

from predict_flood_future import predict_week
from datetime import datetime

target_date = datetime(2025, 11, 23)
week_number = target_date.isocalendar()[1]

print("\n" + "="*80)
print(f"FLOOD PREDICTION FOR NOVEMBER 23, 2025")
print(f"(Week {week_number}, 2025)")
print("="*80 + "\n")

predict_week(2025, week_number, 'realistic')

print("\n" + "="*80)
print("✓ Prediction Complete!")
print("="*80)
