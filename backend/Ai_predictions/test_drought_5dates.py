"""
Test drought prediction with 5 random future dates
"""
import subprocess
import sys

# Test dates
test_dates = [
    "2027-02-04",  # February 2027
    "2028-07-15",  # July 2028 (monsoon)
    "2030-11-20",  # November 2030
    "2026-05-10",  # May 2026 (pre-monsoon)
    "2029-09-25"   # September 2029 (post-monsoon)
]

print("="*80)
print("TESTING DROUGHT PREDICTION MODEL WITH 5 RANDOM FUTURE DATES")
print("="*80)

for i, date in enumerate(test_dates, 1):
    print(f"\n{'='*80}")
    print(f"TEST {i}/5: {date}")
    print("="*80)
    
    try:
        result = subprocess.run(
            ["python", "drought_prediction.py", date, "realistic"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print(result.stdout)
            print(f"\n[SUCCESS] Test {i} completed successfully")
        else:
            print(f"[ERROR] Test {i} failed with return code: {result.returncode}")
            if result.stderr:
                print("STDERR:", result.stderr[:500])
    except subprocess.TimeoutExpired:
        print(f"[TIMEOUT] Test {i} timed out after 60 seconds")
    except Exception as e:
        print(f"[EXCEPTION] Test {i} raised exception: {e}")
    
    print()

print("\n" + "="*80)
print("ALL TESTS COMPLETED")
print("="*80)
