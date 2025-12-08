"""
Quick demo showing enhanced day-of-week output
"""
from drought_prediction import predict_drought_week, predict_drought_month

print("\n" + "="*80)
print("DEMO: Enhanced Day-of-Week Display")
print("="*80)

# Week prediction showing day of week
print("\n1. Week 25, 2026 (with day-of-week labels):")
predict_drought_week(2026, 25, scenario='realistic')

# Month prediction showing day ranges
print("\n2. June 2027 (shows which days the month spans):")
predict_drought_month(2027, 6, scenario='realistic')

print("\n" + "="*80)
print("Notice the improvements:")
print("  ✓ Week shows: 'Days: Monday - Sunday'")
print("  ✓ Daily table shows full day names: 'Monday', 'Tuesday', etc.")
print("  ✓ Monthly breakdown shows: 'Jun 01(Mon)-Jun 07(Sun)'")
print("="*80)
