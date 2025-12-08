import pandas as pd
df = pd.read_csv("weatherdata.csv")
# Strip columns
df.columns = df.columns.str.strip()
print("Max Precip:", df['Total Precipitation'].max())
print("Non-zero count:", (df['Total Precipitation'] > 0).sum())
print("Top 10 Precip values:")
print(df['Total Precipitation'].sort_values(ascending=False).head(10))
