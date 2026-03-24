import os

file_path = r"d:\Python\change4\TeamVitality\AU\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target string to replace
target = """              <div class="risk-meter high">
                <span class="label">Risk Level</span>
                <span class="value">High</span>
              </div>
              <p>River levels rising. Potential flooding in low-lying areas within 48 hours.</p>
              <ul class="prediction-list">
                <li><span>Expected Rise:</span> <strong>2.5m</strong></li>
                <li><span>Affected Areas:</span> <strong>Sector 15, 16</strong></li>
                <li><span>Confidence:</span> <strong>85%</strong></li>
              </ul>"""

# Replacement string
replacement = """              <div class="risk-meter">
                <span class="label">Risk Level</span>
                <span class="value">Loading...</span>
              </div>
              <p>Analyzing current weather patterns...</p>
              <ul class="prediction-list">
                <li><span>Expected Rise:</span> <strong>--</strong></li>
                <li><span>Affected Areas:</span> <strong>--</strong></li>
                <li><span>Confidence:</span> <strong>--</strong></li>
              </ul>"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced content.")
else:
    print("Target content not found. Trying partial replacement...")
    # Fallback: Replace just the risk meter part
    target_partial = """<div class="risk-meter high">
                <span class="label">Risk Level</span>
                <span class="value">High</span>
              </div>"""
    if target_partial in content:
         print("Found partial match, replacing...")
         content = content.replace(target_partial, """<div class="risk-meter">
                <span class="label">Risk Level</span>
                <span class="value">Loading...</span>
              </div>""")
         with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print("Could not find target content.")
        # Print surrounding lines to debug
        start_idx = content.find("flood-section")
        if start_idx != -1:
            print("Context around flood-section:")
            print(content[start_idx:start_idx+500])
