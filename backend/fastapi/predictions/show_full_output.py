"""
Generate full prediction output for November 23, 2025 and save to file
"""

import sys
from datetime import datetime
from predict_flood_future import predict_week

# Redirect output to file
target_date = datetime(2025, 11, 23)
week_number = target_date.isocalendar()[1]

output_file = "nov23_2025_full_prediction.txt"

with open(output_file, 'w', encoding='utf-8') as f:
    # Redirect stdout
    original_stdout = sys.stdout
    sys.stdout = f
    
    print("="*80)
    print(f"FLOOD PREDICTION FOR NOVEMBER 23, 2025")
    print(f"Week {week_number}, 2025 (November 16-22, 2025)")
    print("="*80)
    print()
    
    # Run prediction
    predict_week(2025, week_number, 'realistic')
    
    # Restore stdout
    sys.stdout = original_stdout

print(f"Full prediction saved to: {output_file}")

# Also print the file content to console
print("\n" + "="*80)
print("FULL PREDICTION OUTPUT:")
print("="*80 + "\n")

with open(output_file, 'r', encoding='utf-8') as f:
    print(f.read())
