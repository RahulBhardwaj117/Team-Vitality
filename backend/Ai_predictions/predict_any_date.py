"""
Universal Drought Prediction Script
Predict drought for ANY date, week, or month - past or future
No code modifications needed!

Usage:
  python predict_any_date.py                    # Interactive mode
  python predict_any_date.py 2030-10-18         # Specific date
  python predict_any_date.py 2028-11            # Specific month
  python predict_any_date.py week 2026 20       # Specific week
"""

import sys
from datetime import datetime
from drought_prediction import predict_drought_week, predict_drought_month, predict_date_range

def predict_specific_date(date_str, scenario='realistic'):
    """Predict for a specific date (YYYY-MM-DD)"""
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        print(f"❌ Invalid date format. Use YYYY-MM-DD (e.g., 2030-10-18)")
        return
    
    week_number = target_date.isocalendar()[1]
    day_of_week = target_date.strftime('%A')
    month_name = target_date.strftime('%B')
    
    print("="*80)
    print(f"DROUGHT PREDICTION FOR {target_date.strftime('%B %d, %Y')}")
    print(f"Day: {day_of_week} | Week {week_number} of {target_date.year}")
    print("="*80)
    
    # Predict the week containing this date
    predict_drought_week(target_date.year, week_number, scenario)

def predict_month_from_string(month_str, scenario='realistic'):
    """Predict for a specific month (YYYY-MM)"""
    try:
        parts = month_str.split('-')
        year = int(parts[0])
        month = int(parts[1])
    except (ValueError, IndexError):
        print(f"❌ Invalid month format. Use YYYY-MM (e.g., 2028-11)")
        return
    
    predict_drought_month(year, month, scenario)

def interactive_mode():
    """Interactive mode for predictions"""
    print("\n" + "="*80)
    print("   UNIVERSAL DROUGHT PREDICTION TOOL")
    print("   Predict for ANY past or future date!")
    print("="*80)
    
    while True:
        print("\n" + "-"*80)
        print("SELECT PREDICTION TYPE:")
        print("  1 - Specific Date (e.g., October 18, 2030)")
        print("  2 - Specific Week (e.g., Week 20 of 2026)")
        print("  3 - Entire Month (e.g., November 2028)")
        print("  4 - Exit")
        print("-"*80)
        
        choice = input("\nYour choice (1-4): ").strip()
        
        if choice == '1':
            # Specific date
            print("\n📅 PREDICT FOR SPECIFIC DATE")
            date_input = input("Enter date (YYYY-MM-DD) e.g., 2030-10-18: ").strip()
            scenario = input("Scenario (optimistic/realistic/pessimistic) [realistic]: ").strip() or 'realistic'
            predict_specific_date(date_input, scenario)
            
        elif choice == '2':
            # Specific week
            print("\n📅 PREDICT FOR SPECIFIC WEEK")
            year = int(input("Enter year (e.g., 2026): ").strip())
            week = int(input("Enter week number (1-52): ").strip())
            scenario = input("Scenario (optimistic/realistic/pessimistic) [realistic]: ").strip() or 'realistic'
            predict_drought_week(year, week, scenario)
            
        elif choice == '3':
            # Entire month
            print("\n📅 PREDICT FOR ENTIRE MONTH")
            year = int(input("Enter year (e.g., 2028): ").strip())
            month = int(input("Enter month (1-12): ").strip())
            scenario = input("Scenario (optimistic/realistic/pessimistic) [realistic]: ").strip() or 'realistic'
            predict_drought_month(year, month, scenario)
            
        elif choice == '4':
            print("\n✅ Goodbye!")
            break
        else:
            print("\n❌ Invalid choice. Please select 1-4.")

def main():
    """Main function to handle command-line or interactive mode"""
    
    # Check for command-line arguments
    if len(sys.argv) > 1:
        # Command-line mode
        arg1 = sys.argv[1].lower()
        
        if arg1 == 'week' and len(sys.argv) >= 4:
            # Week prediction: python predict_any_date.py week 2026 20
            year = int(sys.argv[2])
            week = int(sys.argv[3])
            scenario = sys.argv[4] if len(sys.argv) > 4 else 'realistic'
            predict_drought_week(year, week, scenario)
            
        elif '-' in arg1 and len(arg1) == 10:
            # Specific date: python predict_any_date.py 2030-10-18
            scenario = sys.argv[2] if len(sys.argv) > 2 else 'realistic'
            predict_specific_date(arg1, scenario)
            
        elif '-' in arg1 and len(arg1) == 7:
            # Month: python predict_any_date.py 2028-11
            scenario = sys.argv[2] if len(sys.argv) > 2 else 'realistic'
            predict_month_from_string(arg1, scenario)
            
        else:
            print("❌ Invalid format!")
            print("\nUSAGE EXAMPLES:")
            print("  python predict_any_date.py 2030-10-18          # Specific date")
            print("  python predict_any_date.py 2028-11             # Month")
            print("  python predict_any_date.py week 2026 20        # Week")
            print("  python predict_any_date.py                     # Interactive mode")
    else:
        # Interactive mode (no command-line args)
        interactive_mode()

if __name__ == "__main__":
    main()
