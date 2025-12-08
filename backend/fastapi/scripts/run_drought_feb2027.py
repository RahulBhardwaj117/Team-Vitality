import subprocess
import sys

# Set output encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Run the prediction
result = subprocess.run(
    ["python", "drought_prediction.py", "2027-02-04"],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

print(result.stdout)
if result.stderr:
    print("Errors:", result.stderr)
