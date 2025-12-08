import pandas as pd

try:
    df = pd.read_csv("testset.csv", on_bad_lines='skip', low_memory=False)
    print("Columns:", df.columns)
    print("\n_rain value counts:")
    print(df['_rain'].value_counts())
    print("\n_precipm description:")
    print(df['_precipm'].describe())
    print("\n_precipm non-null count:", df['_precipm'].count())
except Exception as e:
    print(e)
