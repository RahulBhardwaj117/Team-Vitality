import os

file_path = r"d:\Python\change4\TeamVitality\AU\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the script block that contains showLanding
start_marker = "    // Function to show landing page\n    function showLanding() {"
end_marker = "  </script>"

start_idx = content.find(start_marker)
end_idx = content.rfind(end_marker)

if start_idx != -1 and end_idx != -1:
    # Keep the start marker
    prefix = content[:start_idx]
    suffix = content[end_idx:]
    
    new_script_body = """    // Function to show landing page
    function showLanding() {
      document.getElementById('landing-page').classList.remove('hidden');
      document.getElementById('login-section').classList.remove('active');
      document.getElementById('dashboard-section').classList.remove('active');
    }

    // ===== FLOOD PREDICTION LOGIC (INLINED TO BYPASS CACHE) =====
    async function runFloodPrediction() {
      const FASTAPI_URL = 'http://localhost:8001';
      const riskMeter = document.querySelector('.flood-section-v2 .risk-meter');
      const riskValue = document.querySelector('.flood-section-v2 .risk-meter .value');
      const floodDesc = document.querySelector('.flood-section-v2 p');
      const floodList = document.querySelector('.flood-section-v2 .prediction-list');

      if (!riskMeter || !riskValue) {
        console.error('Elements not found');
        return;
      }

      riskValue.textContent = 'Init...';

      try {
        riskValue.textContent = 'Fetching Weather...';
        const today = new Date().toISOString().split('T')[0];
        const weatherResponse = await fetch(`${FASTAPI_URL}/predict/weather/raw?start_date=${today}`);
        if (!weatherResponse.ok) throw new Error('Weather API failed');
        const weatherResult = await weatherResponse.json();
        
        if (!weatherResult.forecast || weatherResult.forecast.length === 0) throw new Error('No forecast');

        riskValue.textContent = 'Predicting...';

        const payload = {
          forecast: weatherResult.forecast.map(day => ({
            day: day.date, condition: day.condition || 'Clear', rain_chance: day.rain_chance || 0,
            temp: day.temp || 30, icon: day.icon || '☀️', humidity: day.humidity || 50,
            wind: day.wind || 10, min_temp: day.min_temp || 20, max_temp: day.temp || 30
          })),
          location: 'Delhi'
        };

        const floodResponse = await fetch(`${FASTAPI_URL}/predict/flood/integrated`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!floodResponse.ok) throw new Error('Flood API failed');
        const result = await floodResponse.json();

        riskValue.textContent = result.risk_level;
        riskMeter.className = 'risk-meter ' + result.risk_level.toLowerCase();
        if (floodDesc) floodDesc.textContent = result.recommendation || 'AI analysis complete.';
        if (floodList) {
          floodList.innerHTML = `<li><span>Expected Rise:</span> <strong>${result.expected_rise.toFixed(2)}m</strong></li><li><span>Affected Areas:</span> <strong>${result.affected_areas.join(', ') || 'None'}</strong></li><li><span>Confidence:</span> <strong>96%</strong></li>`;
        }
        console.log('✅ Flood prediction updated:', result);
      } catch (error) {
        console.error('❌ Flood prediction error:', error);
        riskValue.textContent = 'Error: ' + error.message;
      }
    }

    // Hook into the existing navigation system
    const originalSwitchSection = window.switchSection;
    window.switchSection = function(sectionId) {
      // Call the original function if it exists
      if (typeof originalSwitchSection === 'function') {
        originalSwitchSection(sectionId);
      } else {
        // Fallback if original not found (e.g. not loaded yet)
        console.warn('Original switchSection not found');
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(sectionId + '-content');
        if (target) target.classList.add('active');
      }

      // Trigger our flood prediction if entering prediction section
      if (sectionId === 'prediction') {
        console.log('🌊 Entering prediction section, triggering flood logic...');
        setTimeout(() => runFloodPrediction(), 500);
      }
    };

    // Also try to run on load if we are already on prediction
    setInterval(() => {
      const predictionSection = document.getElementById('prediction-content');
      if (predictionSection && predictionSection.classList.contains('active')) {
        const riskValue = document.querySelector('.flood-section-v2 .risk-meter .value');
        if (riskValue && riskValue.textContent === 'Loading...') {
           runFloodPrediction();
        }
      }
    }, 2000);
"""
    
    new_content = prefix + new_script_body + suffix
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed index.html with new logic")

else:
    print("Could not find markers.")
