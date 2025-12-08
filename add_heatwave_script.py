"""
Add heatwave prediction inline script to HTML
"""

html_file = 'd:\\Python\\change5\\TeamVitality\\AU\\index.html'

# Read the file
with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the heatwave prediction script before the closing script tag
heatwave_script = '''
      // ===== HEATWAVE PREDICTION LOGIC (INLINED) =====
      async function runHeatwavePrediction() {
        const FASTAPI_URL = 'http://localhost:8000';
        const heatwaveCard = document.querySelector('.heatwave-section');
        if (!heatwaveCard) {
          console.error('❌ Heatwave card not found');
          return;
        }

        const riskMeter = heatwaveCard.querySelector('.risk-meter');
        const riskValue = heatwaveCard.querySelector('.risk-meter .value');
        const desc = heatwaveCard.querySelector('p');
        const list = heatwaveCard.querySelector('.prediction-list');

        console.log('🌡️ Starting heatwave prediction...');
        
        try {
          // Get weather forecast
          const today = new Date().toISOString().split('T')[0];
          const weatherResponse = await fetch(`${FASTAPI_URL}/predict/weather/raw?start_date=${today}`);
          if (!weatherResponse.ok) throw new Error('Weather API failed');
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

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            throw new Error(`API returned ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ Heatwave Result:', result);

          // Update UI
          if (riskValue) riskValue.textContent = result.risk_level;
          if (riskMeter) {
            riskMeter.className = 'risk-meter';
            riskMeter.classList.add(result.risk_level.toLowerCase());
          }
          if (desc) {
            desc.textContent = `Temperatures expected to peak at ${result.peak_temp}°C. Stay hydrated and avoid prolonged sun exposure.`;
          }
          if (list) {
            list.innerHTML = `
              <li><span>Peak Temp:</span> <strong>${result.peak_temp}°C</strong></li>
              <li><span>Duration:</span> <strong>${result.duration} Days</strong></li>
              <li><span>Confidence:</span> <strong>${result.confidence}%</strong></li>
            `;
          }

          console.log('🎉 Heatwave prediction updated successfully!');
        } catch (error) {
          console.error('❌ Heatwave prediction error:', error);
          if (riskValue) riskValue.textContent = 'ERROR';
          if (riskMeter) riskMeter.className = 'risk-meter medium';
        }
      }

      // Run predictions when prediction tab is clicked
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#prediction') {
          console.log('🚀 Prediction tab opened, running predictions...');
          setTimeout(() => {
            runFloodPrediction();
            runHeatwavePrediction();
          }, 500);
        }
      });

      // Also run if already on prediction tab
      if (window.location.hash === '#prediction') {
        setTimeout(() => {
          runFloodPrediction();
          runHeatwavePrediction();
        }, 1000);
      }
'''

# Insert before the closing script tag
insert_point = content.rfind('</script>')
if insert_point != -1:
    content = content[:insert_point] + heatwave_script + '\n    ' + content[insert_point:]
    print('✅ Added heatwave prediction script')
    
    # Write back
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'✅ File updated! New size: {len(content)} bytes')
else:
    print('❌ Could not find </script> tag')

print('\n=== HEATWAVE SCRIPT ADDED ===')
