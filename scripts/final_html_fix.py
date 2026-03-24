"""
FINAL FIX - Completely rewrite the script section of index.html
"""

html_file = 'd:\\Python\\change5\\TeamVitality\\AU\\index.html'

print("Reading HTML file...")
with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the entire malformed script section
# Look for the pattern from line 3112 onwards
old_pattern_start = '    <!-- Additional Scripts -->'
new_scripts = '''    <!-- Additional Scripts -->
    <script src="gps-location.js"></script>
    <script src="chatbot.js"></script>
    <script src="dashboard.js"></script>
    
    <!-- Inline Prediction Scripts -->
    <script>
      // ===== HEATWAVE PREDICTION LOGIC =====
      async function runHeatwavePrediction() {
        const FASTAPI_URL = 'http://localhost:8000';
        const heatwaveCard = document.querySelector('.heatwave-section');
        if (!heatwaveCard) return;

        const riskMeter = heatwaveCard.querySelector('.risk-meter');
        const riskValue = heatwaveCard.querySelector('.risk-meter .value');
        const desc = heatwaveCard.querySelector('p');
        const list = heatwaveCard.querySelector('.prediction-list');

        console.log('🌡️ Heatwave prediction starting...');
        
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

          console.log('📤 Calling heatwave API...');
          const response = await fetch(`${FASTAPI_URL}/predict/heatwave/integrated`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`API ${response.status}`);
          const result = await response.json();
          console.log('✅ Heatwave:', result);

          if (riskValue) riskValue.textContent = result.risk_level;
          if (riskMeter) {
            riskMeter.className = 'risk-meter ' + result.risk_level.toLowerCase();
          }
          if (desc) desc.textContent = `Temperatures expected to peak at ${result.peak_temp}°C. Stay hydrated.`;
          if (list) {
            list.innerHTML = `
              <li><span>Peak Temp:</span> <strong>${result.peak_temp}°C</strong></li>
              <li><span>Duration:</span> <strong>${result.duration} Days</strong></li>
              <li><span>Confidence:</span> <strong>${result.confidence}%</strong></li>
            `;
          }
          console.log('🎉 Heatwave updated!');
        } catch (error) {
          console.error('❌ Heatwave error:', error);
          if (riskValue) riskValue.textContent = 'ERROR';
        }
      }

      // Auto-run on prediction tab
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#prediction') {
          setTimeout(() => {
            if (typeof runFloodPrediction === 'function') runFloodPrediction();
            runHeatwavePrediction();
          }, 500);
        }
      });

      if (window.location.hash === '#prediction') {
        setTimeout(() => {
          if (typeof runFloodPrediction === 'function') runFloodPrediction();
          runHeatwavePrediction();
        }, 1000);
      }
    </script>
  </body>

</html>'''

# Find where to cut
cut_position = content.find(old_pattern_start)
if cut_position != -1:
    # Keep everything up to this point
    content = content[:cut_position] + new_scripts
    print(f"✅ Replaced script section starting at position {cut_position}")
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ File saved! New size: {len(content)} bytes")
else:
    print("❌ Could not find pattern")

print("\n=== HTML FIXED ===")
