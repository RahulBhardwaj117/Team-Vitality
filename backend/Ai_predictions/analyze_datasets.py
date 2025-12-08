import pandas as pd
import os

files = [
    "delhi.csv",
    "testset.csv",
    "delhi_weather.csv",
    "weatherdata.csv"
]

for f in files:
    print(f"\n{'='*20} {f} {'='*20}")
    if not os.path.exists(f):
        print("File not found.")
        continue
        
    try:
        # Try reading with default encoding
        df = pd.read_csv(f)
    except:
        try:
            # Try reading with mixed types or errors
            df = pd.read_csv(f, on_bad_lines='skip', low_memory=False)
        except Exception as e:
            print(f"Error reading {f}: {e}")
            continue
            
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    # Identify date column
    date_col = None
    for col in df.columns:
        if 'date' in col.lower() or 'time' in col.lower():
            date_col = col
            break
            
    if date_col:
        print(f"Date Column: {date_col}")
        try:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            print(f"Date Range: {df[date_col].min()} to {df[date_col].max()}")
        except:
            print("Could not parse dates.")
    else:
        print("No date column found.")
        
    # Missing values
    print("Missing Values:\n", df.isnull().sum()[df.isnull().sum() > 0])
