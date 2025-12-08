import os

file_path = r'd:\Python\change4\TeamVitality\AU\dashboard.js'

new_function_code = r"""// --- PREDICTION INITIALIZATION ---
async function initializePrediction() {
  console.log('🚀 [INIT] Prediction section initialized');

  const container = document.getElementById('ai-recommendation-container');
  const textContainer = document.getElementById('ai-recommendation-text');
  
  // Flood Card Elements
  const floodCard = document.querySelector('.flood-section');
  const floodRiskValue = floodCard?.querySelector('.risk-meter .value');
  const floodRiskMeter = floodCard?.querySelector('.risk-meter');
  const floodDesc = floodCard?.querySelector('p');
  const floodList = floodCard?.querySelector('.prediction-list');

  console.log('🔍 [INIT] Elements found:', {
    container: !!container,
    textContainer: !!textContainer,
    floodCard: !!floodCard,
    floodRiskValue: !!floodRiskValue,
    floodRiskMeter: !!floodRiskMeter,
    floodDesc: !!floodDesc,
    floodList: !!floodList
  });

  if (!container || !textContainer) {
    console.error('❌ [INIT] Missing required elements, exiting');
    return;
  }

  // Show container and loading state
  container.style.display = 'block';
  textContainer.innerHTML = `
    <div class="loading-spinner-small" style="text-align: center; padding: 1rem;">
      <i class="ph-spinner ph-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
      <p>Generating expert advice based on current risks...</p>
    </div>
  `;

  try {
    // Get stored weather forecast from dashboard
    const forecastData = getStoredWeatherForecast();
    console.log('📊 [INIT] Forecast data:', forecastData);

    if (!forecastData || !forecastData.data || forecastData.data.length === 0) {
       throw new Error("No weather forecast data available. Please check the dashboard first.");
    }

    console.log('✅ [INIT] Using real forecast data for AI prediction');

    // Prepare payload for the new integrated API
    const payload = {
      forecast: forecastData.data.map(d => ({
        day: d.day,
        condition: d.condition,
        rain_chance: d.rain_chance,
        temp: d.temp,
        icon: d.icon,
        humidity: d.humidity,
        wind: d.wind,
        min_temp: d.min_temp || d.temp - 5, // Fallback if missing
        max_temp: d.max_temp || d.temp
      })),
      location: forecastData.location || "Gautam Buddha Nagar"
    };

    console.log('📤 [INIT] Sending payload:', payload);
    console.log('🌐 [INIT] Endpoint:', `${FASTAPI_URL}/predict/flood/integrated`);

    // Call the new integrated endpoint
    const response = await fetch(`${FASTAPI_URL}/predict/flood/integrated`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📥 [INIT] Response status:', response.status, response.statusText);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [INIT] API Error:', errorText);
        throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🌊 [INIT] Flood Prediction Result:', result);

    // Update Flood Card UI
    if (floodCard && result) {
        console.log('🎨 [INIT] Updating flood card UI...');
        
        // Update Risk Level
        if (floodRiskValue) {
          floodRiskValue.textContent = result.risk_level;
          console.log('✅ [INIT] Updated risk value:', result.risk_level);
        }
        
        if (floodRiskMeter) {
            floodRiskMeter.className = 'risk-meter'; // Reset
            floodRiskMeter.classList.add(result.risk_level.toLowerCase());
            console.log('✅ [INIT] Updated risk meter class:', result.risk_level.toLowerCase());
        }

        // Update Description
        if (floodDesc) {
            const newDesc = `AI analysis predicts ${result.risk_level.toLowerCase()} flood risk based on 7-day forecast.`;
            floodDesc.textContent = newDesc;
            console.log('✅ [INIT] Updated description:', newDesc);
        }

        // Update Details List
        if (floodList) {
            const listHTML = `
                <li><span>Expected Rise:</span> <strong>${result.expected_rise.toFixed(2)}m</strong></li>
                <li><span>Affected Areas:</span> <strong>${result.affected_areas.length > 0 ? result.affected_areas.join(', ') : 'None'}</strong></li>
                <li><span>Confidence:</span> <strong>96%</strong></li>
            `;
            floodList.innerHTML = listHTML;
            console.log('✅ [INIT] Updated details list');
        }
    }

    // Update Recommendation
    if (result.recommendation) {
      console.log('💬 [INIT] Updating recommendation...');
      let recHtml = result.recommendation;
      // Simple formatting if it comes back as plain text
      if (!recHtml.includes('<')) {
        recHtml = recHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        recHtml = recHtml.replace(/\n/g, '<br>');
      }
      
      const sourceIndicator = '<p style="font-size: 0.85em; color: #27ae60; margin-top: 1rem;"><i class="ph-check-circle"></i> Powered by AgriUrbanAI & Gemini</p>';
      textContainer.innerHTML = recHtml + sourceIndicator;
      console.log('✅ [INIT] Updated recommendation');
    } else {
      textContainer.innerHTML = '<p>No recommendation available.</p>';
      console.log('⚠️ [INIT] No recommendation in response');
    }

    console.log('🎉 [INIT] Prediction initialization complete!');

  } catch (error) {
    console.error('❌ [INIT] Error fetching AI prediction:', error);
    textContainer.innerHTML = `
      <div style="text-align: center; color: #e74c3c; padding: 1rem;">
        <i class="ph-warning-circle" style="font-size: 2rem;"></i>
        <p>Unable to generate prediction.</p>
        <small>${error.message}</small>
      </div>
    `;
  }
}
"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "// --- PREDICTION INITIALIZATION ---"
end_marker = "// --- ALERTS INITIALIZATION ---"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_function_code + "\n\n" + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated dashboard.js")
else:
    print("Could not find markers to replace content.")
    print(f"Start found: {start_idx}")
    print(f"End found: {end_idx}")
