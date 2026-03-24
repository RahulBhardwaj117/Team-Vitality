import os

file_path = r"d:\Python\change4\TeamVitality\AU\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken part to find
broken_part = """    // Function to show landing page
    function showLanding() {
    });

    if (window.location.hash === '#prediction') {
      setTimeout(() => runFloodPrediction(), 1000);
    }"""

# The correct replacement
replacement = """    // Function to show landing page
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

    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#prediction') {
        setTimeout(() => runFloodPrediction(), 500);
      }
    });

    if (window.location.hash === '#prediction') {
      setTimeout(() => runFloodPrediction(), 1000);
    }"""

if broken_part in content:
    new_content = content.replace(broken_part, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed index.html")
else:
    print("Could not find broken part. Dumping last 500 chars:")
    print(content[-500:])
