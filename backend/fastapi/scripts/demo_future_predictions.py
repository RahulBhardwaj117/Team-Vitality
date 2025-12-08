"""
Demonstrate future drought predictions with the improved model
"""
from drought_prediction import predict_drought_week, predict_drought_month

print("="*80)
print("FUTURE DROUGHT PREDICTIONS - IMPROVED MODEL DEMO")
print("="*80)

# Example 1: Week 20, 2026 (May 2026)
print("\n1. Predicting Week 20, 2026:")
predict_drought_week(2026, 20, scenario='realistic')

# Example 2: December 2026 (Winter month)
print("\n2. Predicting December 2026:")
predict_drought_month(2026, 12, scenario='realistic')

# Example 3: Summer 2027
print("\n3. Predicting Week 30, 2027 (July 2027):")
predict_drought_week(2027, 30, scenario='realistic')

print("\n" + "="*80)
print("DEMO COMPLETE!")
print("="*80)
print("\nNOTE: Future predictions use historical weather patterns.")
print("You can try different scenarios: 'optimistic', 'realistic', 'pessimistic'")
print("="*80)
