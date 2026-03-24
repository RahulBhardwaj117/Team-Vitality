
file_path = r'd:\Python\change4\TeamVitality\AU\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Adjust line numbers to 0-indexed
# Remove 1458-1463 (indices 1457-1463)
# Remove 1499-1547 (indices 1498-1547)

# We need to be careful about shifting indices.
# It's better to filter based on content markers to be robust.

new_lines = []
skip = False
skip_nav_call = False

for line in lines:
    # Marker for initializeNavigation call in showDashboard
    if "Initialize navigation after dashboard is shown" in line:
        skip_nav_call = True
    
    if skip_nav_call:
        if "}, 100);" in line:
            skip_nav_call = False
            continue # Skip the closing line too
        continue

    # Marker for duplicate code block start
    if "// Handle hash changes (back/forward navigation)" in line:
        skip = True
    
    # Marker for duplicate code block end (end of initializeNavigation function)
    # The block ends with "    }" at line 1547, followed by "</script>" at 1548.
    # We can detect the end of initializeNavigation function.
    
    if skip:
        # We need a robust way to stop skipping.
        # The block ends before </script>
        if "</script>" in line:
            skip = False
            new_lines.append(line) # Keep </script>
            continue
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully cleaned index.html")
