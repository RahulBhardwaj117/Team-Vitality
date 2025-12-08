"""
Predict drought for October 18, 2030
"""
from drought_prediction import predict_drought_week, predict_drought_month
from datetime import datetime

# Find which week October 18, 2030 falls in
target_date = datetime(2030, 10, 18)
week_number = target_date.isocalendar()[1]
day_of_week = target_date.strftime('%A')

print("="*80)
print(f"DROUGHT PREDICTION FOR OCTOBER 18, 2030")
print(f"Date: {target_date.strftime('%B %d, %Y')} ({day_of_week})")
print("="*80)

print(f"\n📍 October 18, 2030 falls in Week {week_number}")
print(f"   That's a {day_of_week}\n")

# Predict the specific week containing Oct 18
print("\n" + "="*80)
print(f"SPECIFIC WEEK PREDICTION (Week {week_number}, 2030)")
print("="*80)
predict_drought_week(2030, week_number, scenario='realistic')

# Also show the full October 2030 prediction
print("\n" + "="*80)
print("FULL MONTH PREDICTION (October 2030)")
print("="*80)
predict_drought_month(2030, 10, scenario='realistic')

print("\n" + "="*80)
print("SUMMARY FOR OCTOBER 18, 2030")
print("="*80)
print(f"✓ Date: {day_of_week}, October 18, 2030")
print(f"✓ Falls in Week {week_number} of 2030")
print("✓ Prediction based on historical patterns (realistic scenario)")
print("✓ October is post-monsoon season (typically moderate rainfall)")
print("="*80)
