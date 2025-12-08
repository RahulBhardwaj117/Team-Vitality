import os

file_path = r"d:\Python\change4\TeamVitality\AU\index.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add runHeatwavePrediction function
flood_func_end = """    async function runFloodPrediction() {"""
# We'll insert BEFORE this function to keep them together, or AFTER.
# Let's insert AFTER the closing brace of runFloodPrediction.
# Finding the end of runFloodPrediction is hard with regex.
# Let's insert BEFORE `// Hook into the existing navigation system`

marker = "    // Hook into the existing navigation system"
new_code = """    // ===== HEATWAVE PREDICTION LOGIC =====
    async function runHeatwavePrediction() {
      const FASTAPI_URL = 'http://localhost:8002';
      const riskMeter = document.querySelector('.heatwave-section .risk-meter');
      const riskValue = document.querySelector('.heatwave-section .risk-meter .value');
      const heatDesc = document.querySelector('.heatwave-section p');
      const heatList = document.querySelector('.heatwave-section .prediction-list');

      if (!riskMeter || !riskValue) return;

      riskValue.textContent = 'Init...';

      try {
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

        const heatResponse = await fetch(`${FASTAPI_URL}/predict/heatwave/integrated`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!heatResponse.ok) throw new Error('Heatwave API failed');
        const result = await heatResponse.json();

        riskValue.textContent = result.risk_level;
        riskMeter.className = 'risk-meter ' + result.risk_level.toLowerCase();
        if (heatDesc) heatDesc.innerHTML = result.recommendation || 'AI analysis complete.';
        if (heatList) {
          heatList.innerHTML = `<li><span>Peak Temp:</span> <strong>${result.peak_temp.toFixed(1)}°C</strong></li><li><span>Duration:</span> <strong>${result.duration} Days</strong></li><li><span>Confidence:</span> <strong>${result.confidence}%</strong></li>`;
        }
        console.log('✅ Heatwave prediction updated:', result);
      } catch (error) {
        console.error('❌ Heatwave prediction error:', error);
        riskValue.textContent = 'Error';
      }
    }

"""

if marker in content:
    content = content.replace(marker, new_code + marker)

# 2. Update the hook
hook_code = """      // Trigger our flood prediction if entering prediction section
      if (sectionId === 'prediction') {
        console.log('🌊 Entering prediction section, triggering flood logic...');
        setTimeout(() => runFloodPrediction(), 500);
      }"""

new_hook_code = """      // Trigger our flood prediction if entering prediction section
      if (sectionId === 'prediction') {
        console.log('🌊 Entering prediction section, triggering AI logic...');
        setTimeout(() => runFloodPrediction(), 500);
        setTimeout(() => runHeatwavePrediction(), 1000);
      }"""

if hook_code in content:
    content = content.replace(hook_code, new_hook_code)
else:
    print("Could not find hook code")
    # Try to find a substring if exact match fails (whitespace issues)
    # ...

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully updated index.html")
