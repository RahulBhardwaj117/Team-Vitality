"""
Quick test of 5 dates and save results
"""
import subprocess

dates = [
    ("2027-02-04", "Feb 2027"),
    ("2028-07-15", "Jul 2028 (Monsoon)"),
    ("2030-11-20", "Nov 2030"),
    ("2026-05-10", "May 2026"),
    ("2029-09-25", "Sep 2029")
]

print("TESTING DROUGHT PREDICTION MODEL")
print("="*80)

results = []
for date, label in dates:
    try:
        result = subprocess.run(
            ["python", "drought_prediction.py", date, "realistic"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            # Extract key info from output
            output_lines = result.stdout.split('\n')
            status = "[OK]" if "DROUGHT PREDICTION" in result.stdout else "[PARTIAL]"
            results.append(f"{label:20} {status}")
        else:
            results.append(f"{label:20} [FAIL]")
    except Exception as e:
        results.append(f"{label:20} [ERROR]")

print("\nRESULTS:")
print("-"*80)
for r in results:
    print(r)
    
print("\nAll tests completed!")
