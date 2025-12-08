"""
Test drought prediction for May 2025 (pre-monsoon, high drought risk period)
"""

from drought_prediction import predict_drought_month

print("="*80)
print("TESTING DROUGHT PREDICTION")
print("Testing May 2025 (Pre-Monsoon Period - High Drought Risk)")
print("="*80)

# May is typically a drought-prone month (pre-monsoon)
predict_drought_month(2025, 5, 'realistic')

print("\n\n" + "="*80)
print("For comparison, testing August 2025 (Monsoon - Low Drought Risk)")
predict_drought_month(2025, 8, 'realistic')

print("\n" + "="*80)
print("TEST COMPLETE!")
print("="*80)
