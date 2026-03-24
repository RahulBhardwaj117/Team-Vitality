"""
Update inline scripts to sync Analytics page with Prediction page
"""

html_file = 'd:\\Python\\change5\\TeamVitality\\AU\\index.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the helper function
helper_function = '''
      // ===== ANALYTICS SYNC LOGIC =====
      function updateAnalytics(type, riskLevel, confidence) {
        const valueId = `analytics-${type}-value`;
        const barId = `analytics-${type}-bar`;
        
        const valueEl = document.getElementById(valueId);
        const barEl = document.getElementById(barId);
        
        if (valueEl && barEl) {
          // Map risk level to percentage
          let percentage = 15;
          let colorClass = 'low';
          
          const risk = riskLevel.toLowerCase();
          if (risk === 'high' || risk === 'severe') {
            percentage = 85;
            colorClass = 'high';
          } else if (risk === 'medium' || risk === 'moderate') {
            percentage = 50;
            colorClass = 'medium';
          } else {
            percentage = 15;
            colorClass = 'low';
          }
          
          // Update text
          valueEl.textContent = `${riskLevel} (${confidence}%)`;
          valueEl.className = `risk-value ${colorClass}`;
          
          // Update bar
          barEl.style.width = `${percentage}%`;
          barEl.className = `progress ${colorClass}`;
          
          console.log(`📊 Updated ${type} analytics: ${riskLevel} (${percentage}%)`);
        }
      }
'''

# Insert helper function before runFloodPrediction
insert_pos = content.find("async function runFloodPrediction()")
content = content[:insert_pos] + helper_function + content[insert_pos:]

# 2. Update Flood Prediction to call helper
flood_update = "updateAnalytics('flood', result.risk_level || 'Low', result.confidence || 85);"
flood_marker = "console.log('🎉 Flood prediction updated successfully!');"
flood_pos = content.find(flood_marker)
if flood_pos != -1:
    content = content[:flood_pos] + flood_update + "\n          " + content[flood_pos:]

# 3. Update Heatwave Prediction to call helper
heatwave_update = "updateAnalytics('heatwave', result.risk_level, result.confidence);"
heatwave_marker = "console.log('🎉 Heatwave prediction updated successfully!');"
heatwave_pos = content.find(heatwave_marker)
if heatwave_pos != -1:
    content = content[:heatwave_pos] + heatwave_update + "\n          " + content[heatwave_pos:]

# 4. Update Drought Prediction to call helper
drought_update = "updateAnalytics('drought', result.risk_level, result.confidence);"
drought_marker = "console.log('🎉 Drought updated!');"
drought_pos = content.find(drought_marker)
if drought_pos != -1:
    content = content[:drought_pos] + drought_update + "\n          " + content[drought_pos:]

# Write back
with open(html_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Analytics sync logic added!")
