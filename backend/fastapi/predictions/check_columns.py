import pandas as pd
df = pd.read_csv("weatherdata.csv")
with open("columns_info.txt", "w") as f:
    f.write(str(df.columns.tolist()))
