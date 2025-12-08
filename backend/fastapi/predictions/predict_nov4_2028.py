"""
Predict drought for November 4, 2028
"""
from drought_prediction import predict_drought_week, predict_drought_month
from datetime import datetime

# Find which week November 4, 2028 falls in
target_date = datetime(2028, 11, 4)
week_number = target_date.isocalendar()[1]
day_of_week = target_date.strftime('%A')

print("="*80)
print(f"DROUGHT PREDICTION FOR NOVEMBER 4, 2028")
print(f"Date: {target_date.strftime('%B %d, %Y')} ({day_of_week})")
print("="*80)

print(f"\n📍 November 4, 2028 falls in Week {week_number}")
print(f"   That's a {day_of_week}\n")

# Predict the specific week containing Nov 4
print("\n" + "="*80)
print(f"SPECIFIC WEEK PREDICTION (Week {week_number}, 2028)")
print("="*80)
predict_drought_week(2028, week_number, scenario='realistic')

# Also show the full November 2028 prediction
print("\n" + "="*80)
print("FULL MONTH PREDICTION (November 2028)")
print("="*80)
predict_drought_month(2028, 11, scenario='realistic')

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"✓ November 4, 2028 ({day_of_week}) prediction complete")
print(f"✓ Fell in Week {week_number} of 2028")
print("✓ Using realistic scenario based on historical patterns")
print("="*80)
