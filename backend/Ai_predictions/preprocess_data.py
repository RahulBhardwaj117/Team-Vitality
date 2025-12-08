import pandas as pd
import numpy as np

def preprocess():
    print("Loading delhi.csv...")
    try:
        df = pd.read_csv("delhi.csv")
        df['time'] = pd.to_datetime(df['time'])
        print(f"Date Range: {df['time'].min()} to {df['time'].max()}")
        print(f"Total Days: {len(df)}")
        
        # Check for missing values
        print("Missing values:\n", df.isnull().sum())
        
        # Rename columns for clarity
        df = df.rename(columns={
            'time': 'Date',
            'rain_sum': 'Rainfall',
            'temperature_2m_max': 'MaxTemp',
            'temperature_2m_min': 'MinTemp',
            'et0_fao_evapotranspiration': 'Evapotranspiration'
        })
        
        # Fill missing rainfall with 0 (safe assumption for weather data if gaps are small, but better to check)
        # If many missing, we might need interpolation
        if df['Rainfall'].isnull().sum() > 0:
            print("Filling missing rainfall with 0")
            df['Rainfall'] = df['Rainfall'].fillna(0)
            
        # Save cleaned data
        df.to_csv("final_weather.csv", index=False)
        print("Saved final_weather.csv")
        
    except Exception as e:
        print(f"Error processing delhi.csv: {e}")

if __name__ == "__main__":
    preprocess()
