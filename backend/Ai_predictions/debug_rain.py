import pandas as pd

try:
    print("\n--- Reading rain data ---")
    rain = pd.read_csv("delhi-monthly-rains_n.csv")
    print("Columns:", rain.columns.tolist())
    print("Head:\n", rain.head())
    
    rain_2020 = rain[rain['Year'] == 2020]
    print("\nRain 2020:\n", rain_2020)
except Exception as e:
    print("Error reading rain data:", e)
