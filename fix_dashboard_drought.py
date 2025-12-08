"""
Fix dashboard.js to use drought API instead of non-existent function
"""

file_path = r"d:\Python\change5\TeamVitality\AU\dashboard.js"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the drought prediction section
old_code = """    // ==================== DROUGHT PREDICTION ====================
    console.log('💧 [INIT] Calculating drought risk...');
    try {
      // Use rule-based calculation for drought (no API endpoint yet)
      const droughtRisk = calculateDroughtRisk(forecastData.data);
      const parts = droughtRisk.match(/^(\\w+)\\s*\\((.*)\\)$/);
      
      if (droughtCard && parts) {
        if (droughtRiskValue) droughtRiskValue.textContent = parts[1];
        if (droughtRiskMeter) {
          droughtRiskMeter.className = 'risk-meter';
          droughtRiskMeter.classList.add(parts[1].toLowerCase());
        }
        if (droughtDesc) {
          droughtDesc.textContent = `Analysis shows ${parts[1].toLowerCase()} drought risk. ${parts[2]}`;
        }
        if (droughtList) {
          const dryDays = forecastData.data.filter(d => d.rain_chance < 10).length;
          const avgHumidity = Math.round(forecastData.data.reduce((sum, d) => sum + d.humidity, 0) / forecastData.data.length);
          droughtList.innerHTML = `
            <li><span>Soil Moisture:</span> <strong>${parts[1] === 'Low' ? 'Adequate' : parts[1] === 'High' ? 'Critical' : 'Moderate'}</strong></li>
            <li><span>Dry Days:</span> <strong>${dryDays} days</strong></li>
            <li><span>Avg Humidity:</span> <strong>${avgHumidity}%</strong></li>
          `;
        }
      }
    } catch (err) {
      console.error('❌ [INIT] Drought calculation error:', err);
    }"""

new_code = """    // ==================== DROUGHT PREDICTION ====================
    console.log('💧 [INIT] Fetching drought prediction...');
    try {
      const droughtResponse = await fetch(`${FASTAPI_URL}/predict/drought/integrated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (droughtResponse.ok) {
        const droughtResult = await droughtResponse.json();
        console.log('💧 [INIT] Drought Result:', droughtResult);

        if (droughtCard && droughtResult) {
          if (droughtRiskValue) droughtRiskValue.textContent = droughtResult.risk_level;
          if (droughtRiskMeter) {
            droughtRiskMeter.className = 'risk-meter';
            droughtRiskMeter.classList.add(droughtResult.risk_level.toLowerCase());
          }
          if (droughtDesc) {
            droughtDesc.textContent = `Analysis shows ${droughtResult.risk_level.toLowerCase()} drought risk. ${droughtResult.dry_days} dry days expected.`;
          }
          if (droughtList) {
            droughtList.innerHTML = `
              <li><span>Soil Moisture:</span> <strong>${droughtResult.soil_moisture}</strong></li>
              <li><span>Rainfall Deficit:</span> <strong>${droughtResult.rainfall_deficit}</strong></li>
              <li><span>Confidence:</span> <strong>${droughtResult.confidence}%</strong></li>
            `;
          }
        }
      } else {
        console.error('❌ [INIT] Drought API Error:', droughtResponse.statusText);
      }
    } catch (err) {
      console.error('❌ [INIT] Drought fetch error:', err);
    }"""

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed dashboard.js drought prediction!")
