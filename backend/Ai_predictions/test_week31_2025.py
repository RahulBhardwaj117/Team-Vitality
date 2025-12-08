"""
Test script for Week 31, 2025 flood prediction
Demonstrates future date prediction capability
"""

from predict_flood_future import predict_week

print("="*80)
print("TESTING: Week 31, 2025 Flood Prediction")
print("="*80)

# Test realistic scenario
print("\n1. REALISTIC SCENARIO (Most likely outcome)")
predict_week(2025, 31, 'realistic')

print("\n\n2. PESSIMISTIC SCENARIO (Worst case - heavy rainfall)")
predict_week(2025, 31, 'pessimistic')

print("\n\n3. OPTIMISTIC SCENARIO (Best case - dry conditions)")
predict_week(2025, 31, 'optimistic')

print("\n" + "="*80)
print("TEST COMPLETE!")
print("="*80)
