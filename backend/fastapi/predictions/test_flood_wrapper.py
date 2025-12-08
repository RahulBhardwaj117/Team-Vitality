import sys
import io
from flood_prediction import predict_flood_risk
from datetime import datetime

# Redirect stdout to a file
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test():
    start_date = datetime(2024, 9, 20)
    end_date = datetime(2024, 9, 20)
    
    with open('prediction_2024_09_20.txt', 'w', encoding='utf-8') as f:
        # Redirect stdout to file
        original_stdout = sys.stdout
        sys.stdout = f
        
        try:
            predict_flood_risk(start_date, end_date)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            sys.stdout = original_stdout

if __name__ == "__main__":
    test()
