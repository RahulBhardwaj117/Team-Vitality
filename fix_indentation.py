
import os

file_path = r"d:\Python\change5\TeamVitality\AU\backend\fastapi\training\train_drought_model_improved.py"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line where "if __name__ == \"__main__\":" starts
start_index = -1
for i, line in enumerate(lines):
    if 'if __name__ == "__main__":' in line:
        start_index = i
        break

if start_index != -1:
    # Keep lines up to start_index + 1 (the print statements I added)
    # Actually, let's look at the file content from the previous view_file
    # Line 161 is the if statement.
    # Lines 162-166 are comments/prints/pass.
    # Line 168 is where the code starts that needs indenting.
    
    # We want to indent everything from line 168 (index 167) to the end.
    
    new_lines = lines[:167] # Keep up to "pass"
    
    # Remove the "pass" line if it exists to avoid clutter
    if "pass" in new_lines[-1]:
        new_lines.pop()
        
    # Add the code that needs indenting
    for line in lines[167:]:
        new_lines.append("    " + line)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
        
    print("✅ Successfully indented training logic.")
else:
    print("❌ Could not find main block.")
