import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os
import warnings

warnings.filterwarnings('ignore')

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Prediction Modules
try:
    import flood_prediction
    import drought_prediction
    import heatwave_prediction
    import groundwater_forcast
except ImportError as e:
    print(f"Error importing prediction modules: {e}")
    print("Ensure flood_prediction.py, drought_prediction.py, heatwave_prediction.py, and groundwater_forcast.py are in the same directory.")
    sys.exit(1)

class IntegratedPredictor:
    def __init__(self):
        print("\n" + "="*80)
        print("   AGRI-URBAN AI: INTEGRATED PREDICTION SYSTEM")
        print("="*80)
        print("Initializing sub-models...")
        
        # Heatwave model is a class that needs instantiation
        self.heatwave_model = heatwave_prediction.HeatwaveForecaster()
        print("✓ Integrated System Ready")

    def predict_flood(self, start_date, end_date):
        print(f"\n>>> RUNNING FLOOD PREDICTION MODULE...")
        return flood_prediction.predict_flood_risk(start_date, end_date)

    def predict_drought(self, start_date, end_date):
        print(f"\n>>> RUNNING DROUGHT PREDICTION MODULE...")
        # Determine if future
        is_future = start_date > datetime.now() # Simplified check
        # Use the module's function
        # Note: drought_prediction.predict_date_range returns a DataFrame
        df = drought_prediction.predict_date_range(start_date, end_date, scenario='realistic', is_future=True)
        
        if df is not None:
            # Print summary similar to the module's own output
            avg_severity = df['DroughtSeverity'].mean()
            max_severity = df['DroughtSeverity'].max()
            print(f"\n[Drought Summary]")
            print(f"  Average Severity Index: {avg_severity:.2f}")
            print(f"  Max Severity Index: {max_severity}")
            
            # Show daily breakdown if short period
            if len(df) <= 10:
                print(f"  Daily Severities: {df['DroughtSeverity'].values}")
        return df

    def predict_heatwave(self, start_date, end_date):
        print(f"\n>>> RUNNING HEATWAVE PREDICTION MODULE...")
        df = self.heatwave_model.predict_period(start_date, end_date, scenario='realistic')
        heatwave_prediction.print_forecast(df)
        return df

    def predict_groundwater(self, district=None):
        print(f"\n>>> RUNNING GROUNDWATER PREDICTION MODULE...")
        if district:
            result = groundwater_forcast.predict_for_district(district)
            groundwater_forcast.display_prediction(result)
        else:
            groundwater_forcast.predict_all_districts()

    def generate_comprehensive_report(self, start_date, end_date, district=None):
        print("\n" + "#"*80)
        print(f"COMPREHENSIVE ENVIRONMENTAL RISK REPORT")
        print(f"Period: {start_date.date()} to {end_date.date()}")
        if district:
            print(f"Location: {district} (for Groundwater)")
        print("#"*80 + "\n")

        # 1. Flood
        self.predict_flood(start_date, end_date)

        # 2. Drought
        self.predict_drought(start_date, end_date)

        # 3. Heatwave
        self.predict_heatwave(start_date, end_date)

        # 4. Groundwater
        self.predict_groundwater(district)

        print("\n" + "#"*80)
        print("REPORT GENERATION COMPLETE")
        print("#"*80 + "\n")

def parse_date(date_str):
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    raise ValueError("Invalid date format")

def main():
    predictor = IntegratedPredictor()

    while True:
        print("\n" + "-"*40)
        print("MAIN MENU")
        print("-" * 40)
        print("1. Comprehensive Report (All Models)")
        print("2. Flood Prediction Only")
        print("3. Drought Prediction Only")
        print("4. Heatwave Prediction Only")
        print("5. Groundwater Prediction Only")
        print("q. Quit")
        
        choice = input("\nEnter choice: ").strip().lower()

        if choice == 'q':
            break

        try:
            if choice in ['1', '2', '3', '4']:
                start_str = input("Enter Start Date (YYYY-MM-DD): ").strip()
                start_date = parse_date(start_str)
                
                end_str = input("Enter End Date (YYYY-MM-DD): ").strip()
                end_date = parse_date(end_str)

                if end_date < start_date:
                    print("Error: End date must be after start date.")
                    continue

            if choice == '1':
                district = input("Enter District Name for Groundwater (or press Enter for All): ").strip()
                if not district: district = None
                predictor.generate_comprehensive_report(start_date, end_date, district)
            
            elif choice == '2':
                predictor.predict_flood(start_date, end_date)
            
            elif choice == '3':
                predictor.predict_drought(start_date, end_date)
            
            elif choice == '4':
                predictor.predict_heatwave(start_date, end_date)
            
            elif choice == '5':
                district = input("Enter District Name (or press Enter for All): ").strip()
                if not district: district = None
                predictor.predict_groundwater(district)
                
        except ValueError as e:
            print(f"Input Error: {e}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
