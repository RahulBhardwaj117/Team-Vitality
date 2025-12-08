import pandas as pd

try:
    print("\n--- Reading gw_recharge ---")
    gw_recharge = pd.read_csv("a3b95b28-5e80-4c66-af85-78c2a7e9283e.csv")
    print("Columns:", gw_recharge.columns.tolist())
    print("Head:\n", gw_recharge.head())
    print("Dtypes:\n", gw_recharge.dtypes)
except Exception as e:
    print("Error reading gw_recharge:", e)
