
import sys
import os

# Add path
sys.path.append(os.path.abspath(r"d:\Python\change5\TeamVitality\AU\backend\fastapi\training"))

try:
    import train_drought_model_improved
    print("✅ Import successful!")
    if hasattr(train_drought_model_improved, 'predict_drought_risk'):
        print("✅ predict_drought_risk function found!")
    else:
        print("❌ predict_drought_risk function NOT found!")
except Exception as e:
    print(f"❌ Import failed: {e}")
