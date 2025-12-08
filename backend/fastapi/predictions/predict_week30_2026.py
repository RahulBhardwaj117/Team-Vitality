"""
Prediction for Week 30, 2026
Testing future date prediction capability
"""

from predict_flood_future import predict_week

print("\n" + "="*80)
print("FLOOD PREDICTION: Week 30, 2026")
print("="*80 + "\n")

# Predict with realistic scenario
predict_week(2026, 30, 'realistic')

print("\n" + "="*80)
print("Prediction Complete!")
print("="*80)
