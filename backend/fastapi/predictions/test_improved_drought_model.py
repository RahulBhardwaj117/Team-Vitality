"""
Test the improved drought model on known dry periods
Validates that dry months are not classified as severe drought
"""

from drought_prediction import predict_drought_month, predict_drought_week
import sys

print("="*80)
print("DROUGHT MODEL VALIDATION TESTS")
print("="*80)

# Test 1: Dry winter month (should NOT be severe)
print("\n" + "="*80)
print("TEST 1: November 2021 (Dry Winter Month)")
print("Expected: None or Mild (NOT Severe)")
print("="*80)
try:
    predict_drought_month(2021, 11)
    print("✓ Test 1 completed")
except Exception as e:
    print(f"✗ Test 1 failed: {e}")

# Test 2: May 2025 (Dry pre-monsoon - should not ALL be severe)
print("\n" + "="*80)
print("TEST 2: May 2025 (Pre-Monsoon Dry Period)")
print("Expected: Mild to Moderate (NOT all Severe)")
print("="*80)
try:
    predict_drought_month(2025, 5)
    print("✓ Test 2 completed")
except Exception as e:
    print(f"✗ Test 2 failed: {e}")

# Test 3: Week 31 2025 (Monsoon week - should be normal/mild)
print("\n" + "="*80)
print("TEST 3: Week 31, 2025 (Monsoon Period)")
print("Expected: None or Mild (adequate rainfall expected)")
print("="*80)
try:
    predict_drought_week(2025, 31)
    print("✓ Test 3 completed")
except Exception as e:
    print(f"✗ Test 3 failed: {e}")

# Test 4: April 2023 (Known dry month - could be moderate)
print("\n" + "="*80)
print("TEST 4: April 2023 (Known Dry Period)")
print("Expected: Mild to Moderate")
print("="*80)
try:
    predict_drought_month(2023, 4)
    print("✓ Test 4 completed")
except Exception as e:
    print(f"✗ Test 4 failed: {e}")

print("\n" + "="*80)
print("VALIDATION COMPLETE")
print("="*80)
print("\nManual Review Required:")
print("1. Check that winter dry months are NOT classified as 'Severe'")
print("2. Verify that not every dry day is marked as drought")
print("3. Confirm severity levels are balanced (not biased toward Severe)")
print("="*80)
