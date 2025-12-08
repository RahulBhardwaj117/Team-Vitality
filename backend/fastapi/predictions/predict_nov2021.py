"""
Drought prediction for November 2021
"""

import sys
from drought_prediction import predict_drought_month

output_file = "november_2021_drought_prediction.txt"

with open(output_file, 'w', encoding='utf-8') as f:
    original_stdout = sys.stdout
    sys.stdout = f
    
    predict_drought_month(2021, 11)
    
    sys.stdout = original_stdout

print(f"Prediction saved to: {output_file}")
print("\nDisplaying results:\n")

with open(output_file, 'r', encoding='utf-8') as f:
    content = f.read()
    print(content)
