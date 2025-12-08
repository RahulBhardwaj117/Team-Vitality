import pandas as pd

try:
    print("\n--- Reading soil data ---")
    soil = pd.read_csv("sm_Delhi_2020.csv")
    soil['Date'] = pd.to_datetime(soil['Date'])
    soil['Month'] = soil['Date'].dt.month
    monthly_soil_moisture = soil.groupby('Month')['Average Soilmoisture Level (at 15cm)'].mean()
    print("Monthly Soil Moisture:\n", monthly_soil_moisture)
    print("Values shape:", monthly_soil_moisture.values.shape)
except Exception as e:
    print("Error reading soil data:", e)
