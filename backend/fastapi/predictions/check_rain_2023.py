import pandas as pd
df = pd.read_csv("final_weather.csv")
df['Date'] = pd.to_datetime(df['Date'])
df_2023 = df[df['Date'].dt.year == 2023]
print("Max Rainfall 2023:", df_2023['Rainfall'].max())
print("Top 10 Rainfall 2023:")
print(df_2023[['Date', 'Rainfall']].sort_values('Rainfall', ascending=False).head(10))
