import pandas as pd

try:
    print("--- Reading gw_draft ---")
    gw_draft = pd.read_csv("District_wise_Ground_Water_Draft_Data_of_Delhi_State_(In_ham)_of_Year_2020.csv", header=1)
    print("Columns:", gw_draft.columns.tolist())
    print("Head:\n", gw_draft.head())
    print("Dtypes:\n", gw_draft.dtypes)
except Exception as e:
    print("Error reading gw_draft:", e)

try:
    print("\n--- Reading gw_recharge ---")
    gw_recharge = pd.read_csv("a3b95b28-5e80-4c66-af85-78c2a7e9283e.csv")
    print("Columns:", gw_recharge.columns.tolist())
    print("Head:\n", gw_recharge.head())
    print("Dtypes:\n", gw_recharge.dtypes)
except Exception as e:
    print("Error reading gw_recharge:", e)
