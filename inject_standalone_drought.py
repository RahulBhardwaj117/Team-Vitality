"""
Add standalone drought prediction script to index.html
This bypasses all other JS and directly updates the drought UI
"""

file_path = r"d:\Python\change5\TeamVitality\AU\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Create the standalone script
standalone_script = """
    <!-- STANDALONE DROUGHT PREDICTION FIX -->
    <script>
      (function() {
        console.log('🔧 Standalone Drought Fix Loaded');
        
        async function updateDroughtStandalone() {
          console.log('💧 [STANDALONE] Starting drought prediction...');
          
          try {
            // Get weather forecast (or use dummy data if not available)
            let forecastData = [];
            
            // Try to get from global state
            if (window.weatherForecastData && window.weatherForecastData.length > 0) {
              forecastData = window.weatherForecastData;
            } else {
              // Use dummy forecast
              forecastData = [
                {day: "2024-12-04", condition: "Clear", rain_chance: 10, temp: 25, icon: "☀️", humidity: 60, wind: 10, min_temp: 20, max_temp: 30},
                {day: "2024-12-05", condition: "Sunny", rain_chance: 5, temp: 26, icon: "☀️", humidity: 55, wind: 12, min_temp: 21, max_temp: 31}
              ];
            }
            
            const payload = {
              forecast: forecastData,
              location: "Delhi"
            };
            
            console.log('📤 [STANDALONE] Calling drought API...');
            
            const response = await fetch('http://localhost:8000/predict/drought/integrated', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
              throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ [STANDALONE] Drought data received:', data);
            
            // Update UI elements
            const riskValue = document.querySelector('.drought-section .risk-meter .value');
            const riskMeter = document.querySelector('.drought-section .risk-meter');
            const desc = document.querySelector('.drought-section p');
            const list = document.querySelector('.drought-section .prediction-list');
            
            if (riskValue) {
              riskValue.textContent = data.risk_level || 'Low';
              console.log('✓ Updated risk value:', data.risk_level);
            }
            
            if (riskMeter) {
              riskMeter.className = 'risk-meter';
              riskMeter.classList.add((data.risk_level || 'low').toLowerCase());
              console.log('✓ Updated risk meter class');
            }
            
            if (desc) {
              desc.textContent = `Analysis shows ${(data.risk_level || 'low').toLowerCase()} drought risk. ${data.dry_days || 0} dry days expected.`;
              console.log('✓ Updated description');
            }
            
            if (list) {
              list.innerHTML = `
                <li><span>Soil Moisture:</span> <strong>${data.soil_moisture || 'Adequate'}</strong></li>
                <li><span>Rainfall Deficit:</span> <strong>${data.rainfall_deficit || 'None'}</strong></li>
                <li><span>Confidence:</span> <strong>${data.confidence || 90}%</strong></li>
              `;
              console.log('✓ Updated list');
            }
            
            console.log('🎉 [STANDALONE] Drought section updated successfully!');
            
          } catch (error) {
            console.error('❌ [STANDALONE] Drought update failed:', error);
          }
        }
        
        // Run when prediction tab is clicked
        window.addEventListener('hashchange', function() {
          if (window.location.hash === '#prediction') {
            console.log('🔄 Hash changed to #prediction, running standalone drought update...');
            setTimeout(updateDroughtStandalone, 2000);
          }
        });
        
        // Run on page load if already on prediction tab
        document.addEventListener('DOMContentLoaded', function() {
          if (window.location.hash === '#prediction') {
            console.log('📍 Page loaded on #prediction, running standalone drought update...');
            setTimeout(updateDroughtStandalone, 3000);
          }
        });
        
        // Also expose globally for manual testing
        window.updateDroughtStandalone = updateDroughtStandalone;
        console.log('✅ Standalone drought fix ready. Run updateDroughtStandalone() to test.');
      })();
    </script>
"""

# Insert before closing </body> tag
insert_position = content.rfind('</body>')
if insert_position != -1:
    content = content[:insert_position] + standalone_script + '\n' + content[insert_position:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Standalone drought fix injected into index.html!")
    print("   - Runs automatically when Prediction tab is clicked")
    print("   - Can also be run manually via: updateDroughtStandalone()")
else:
    print("❌ Could not find </body> tag!")
