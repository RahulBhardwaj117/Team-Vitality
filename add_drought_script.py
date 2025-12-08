"""
Add drought prediction function to index.html
"""

html_file = 'd:\\Python\\change5\\TeamVitality\\AU\\index.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find where to insert the drought function (after heatwave function)
insert_marker = "console.log('🎉 Heatwave updated!');"
insert_position = content.find(insert_marker)

if insert_position == -1:
    print("❌ Could not find insertion point")
    exit(1)

# Find the end of the heatwave function's try-catch block
end_of_heatwave_catch = content.find("}", insert_position) + 1
# Find the next closing brace for the function
end_of_heatwave_function = content.find("\n      }", end_of_heatwave_catch) + len("\n      }")

drought_function = '''

      // ===== DROUGHT PREDICTION LOGIC =====
      async function runDroughtPrediction() {
        const FASTAPI_URL = 'http://localhost:8000';
        const droughtCard = document.querySelector('.drought-section');
        if (!droughtCard) return;

        const riskMeter = droughtCard.querySelector('.risk-meter');
        const riskValue = droughtCard.querySelector('.risk-meter .value');
        const desc = droughtCard.querySelector('p');
        const list = droughtCard.querySelector('.prediction-list');

        console.log('💧 Drought prediction starting...');
        
        try {
          const today = new Date().toISOString().split('T')[0];
          const weatherResponse = await fetch(`${FASTAPI_URL}/predict/weather/raw?start_date=${today}`);
          if (!weatherResponse.ok) throw new Error('Weather failed');
          const weatherResult = await weatherResponse.json();
          if (!weatherResult.forecast || weatherResult.forecast.length === 0) throw new Error('No forecast');

          const payload = {
            forecast: weatherResult.forecast.map(day => ({
              day: day.date, condition: day.condition || 'Clear', rain_chance: day.rain_chance || 0,
              temp: day.temp || 30, icon: day.icon || '☀️', humidity: day.humidity || 50,
              wind: day.wind || 10, min_temp: day.min_temp || 20, max_temp: day.temp || 30
            })),
            location: 'Delhi'
          };

          console.log('📤 Calling drought API...');
          const response = await fetch(`${FASTAPI_URL}/predict/drought/integrated`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`API ${response.status}`);
          const result = await response.json();
          console.log('✅ Drought:', result);

          if (riskValue) riskValue.textContent = result.risk_level;
          if (riskMeter) {
            riskMeter.className = 'risk-meter ' + result.risk_level.toLowerCase();
          }
          if (desc) desc.textContent = `Analysis shows ${result.risk_level.toLowerCase()} drought risk. ${result.dry_days} dry days expected.`;
          if (list) {
            list.innerHTML = `
              <li><span>Soil Moisture:</span> <strong>${result.soil_moisture}</strong></li>
              <li><span>Dry Days:</span> <strong>${result.dry_days} days</strong></li>
              <li><span>Avg Humidity:</span> <strong>${result.avg_humidity}%</strong></li>
            `;
          }
          console.log('🎉 Drought updated!');
        } catch (error) {
          console.error('❌ Drought error:', error);
          if (riskValue) riskValue.textContent = 'ERROR';
        }
      }'''

# Insert drought function
content = content[:end_of_heatwave_function] + drought_function + content[end_of_heatwave_function:]

# Now update the event listeners to include drought
# Find and replace the hash change listener
old_listener = '''runHeatwavePrediction();
          }, 500);'''

new_listener = '''runHeatwavePrediction();
            runDroughtPrediction();
          }, 500);'''

content = content.replace(old_listener, new_listener)

# Also update the if block
old_if_block = '''runHeatwavePrediction();
        }, 1000);'''

new_if_block = '''runHeatwavePrediction();
          runDroughtPrediction();
        }, 1000);'''

content = content.replace(old_if_block, new_if_block)

# Write back
with open(html_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Added drought prediction function")
print(f"✅ Updated event listeners")
print(f"✅ File size: {len(content)} bytes")
print("\n=== DROUGHT INTEGRATION COMPLETE ===")
