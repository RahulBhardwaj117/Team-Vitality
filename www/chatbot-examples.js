/**
 * Example Chatbot Conversations
 * Demonstrates various use cases and expected bot behavior
 */

// ============================================
// EXAMPLE 1: Weather Forecast Query
// ============================================
const weatherExample = {
  scenario: "Farmer asks about weather forecast",
  conversation: [
    {
      user: "What's the weather forecast for tomorrow?",
      bot: "Based on current data for your location in Noida, Uttar Pradesh:\n\n" +
           "🌤️ Tomorrow's Forecast:\n" +
           "- Temperature: 28-32°C\n" +
           "- Humidity: 65%\n" +
           "- Rainfall Probability: 30%\n" +
           "- Wind: Light breeze (10 km/h)\n\n" +
           "Good conditions for field work. No irrigation needed if you watered recently.",
      intent: "weather"
    },
    {
      user: "Will it rain this week?",
      bot: "Here's the 7-day rainfall forecast for your area:\n\n" +
           "📅 This Week:\n" +
           "- Mon-Wed: Clear skies, no rain expected\n" +
           "- Thu-Fri: 40% chance of light showers (5-10mm)\n" +
           "- Sat-Sun: Partly cloudy, 20% rain chance\n\n" +
           "Plan your irrigation accordingly. Heavy rain is not expected this week.",
      intent: "weather"
    }
  ]
};

// ============================================
// EXAMPLE 2: Irrigation Advice
// ============================================
const irrigationExample = {
  scenario: "Farmer needs irrigation guidance",
  conversation: [
    {
      user: "Should I irrigate my wheat field today?",
      bot: "Let me check the conditions for your wheat crop:\n\n" +
           "Current Status:\n" +
           "- Soil Moisture: Moderate\n" +
           "- Last Rainfall: 3 days ago (15mm)\n" +
           "- Forecast: No rain for next 4 days\n" +
           "- Crop Stage: Tillering\n\n" +
           "✅ Recommendation: Yes, irrigate today or tomorrow.\n" +
           "Wheat at tillering stage needs consistent moisture. Apply 40-50mm water.",
      intent: "irrigation"
    },
    {
      user: "How often should I water maize in summer?",
      bot: "For maize crops in summer months:\n\n" +
           "💧 Irrigation Schedule:\n" +
           "- Vegetative Stage: Every 7-10 days\n" +
           "- Flowering Stage: Every 5-7 days (critical!)\n" +
           "- Grain Filling: Every 7-10 days\n\n" +
           "Water Requirement: 50-75mm per irrigation\n" +
           "Best Time: Early morning (6-8 AM) or evening (5-7 PM)\n\n" +
           "💡 Tip: Increase frequency during hot, dry spells.",
      intent: "irrigation"
    }
  ]
};

// ============================================
// EXAMPLE 3: Fertilizer Recommendations
// ============================================
const fertilizerExample = {
  scenario: "Farmer asks about fertilizer application",
  conversation: [
    {
      user: "What fertilizer should I use for rice?",
      bot: "For rice cultivation, here's the recommended fertilizer schedule:\n\n" +
           "🌾 Rice Fertilizer Plan (per acre):\n\n" +
           "1️⃣ Basal Application (at transplanting):\n" +
           "   - Urea: 10 kg\n" +
           "   - DAP: 25 kg\n" +
           "   - Potash: 15 kg\n\n" +
           "2️⃣ First Top Dressing (20-25 days):\n" +
           "   - Urea: 15 kg\n\n" +
           "3️⃣ Second Top Dressing (40-45 days):\n" +
           "   - Urea: 15 kg\n\n" +
           "💡 Apply when soil is moist. Avoid over-fertilization.",
      intent: "fertilizer"
    },
    {
      user: "My wheat leaves are turning yellow. What should I do?",
      bot: "Yellow leaves in wheat often indicate nitrogen deficiency. Here's what to do:\n\n" +
           "🔍 Diagnosis: Nitrogen Deficiency\n\n" +
           "✅ Immediate Action:\n" +
           "1. Apply Urea: 20-25 kg per acre\n" +
           "2. Ensure adequate irrigation before application\n" +
           "3. Apply in split doses if severe\n\n" +
           "📋 Prevention:\n" +
           "- Follow recommended fertilizer schedule\n" +
           "- Add organic matter (compost/FYM)\n" +
           "- Check soil pH (ideal: 6.0-7.5)\n\n" +
           "Results should be visible in 7-10 days.",
      intent: "crop_advice"
    }
  ]
};

// ============================================
// EXAMPLE 4: Pest Control Advice
// ============================================
const pestControlExample = {
  scenario: "Farmer reports pest problem",
  conversation: [
    {
      user: "I see small holes in my tomato leaves. What is it?",
      bot: "Small holes in tomato leaves are likely caused by leaf-eating caterpillars or beetles.\n\n" +
           "🐛 Common Pests:\n" +
           "- Tomato Fruit Borer\n" +
           "- Leaf Miner\n" +
           "- Tobacco Caterpillar\n\n" +
           "🛡️ Control Measures:\n\n" +
           "Organic:\n" +
           "- Neem oil spray (5ml per liter)\n" +
           "- Handpick visible caterpillars\n" +
           "- Install pheromone traps\n\n" +
           "Chemical (if severe):\n" +
           "- Chlorantraniliprole 18.5% SC (0.3ml/liter)\n" +
           "- Spray in evening hours\n\n" +
           "Repeat after 10-12 days if needed.",
      intent: "pest_control"
    }
  ]
};

// ============================================
// EXAMPLE 5: Proactive Weather Alerts
// ============================================
const alertExamples = {
  scenario: "System sends proactive alerts",
  alerts: [
    {
      type: "heavy_rain",
      message: "⚠️ Heavy Rainfall Alert\n\n" +
               "80mm rainfall expected in next 12 hours in your area.\n\n" +
               "Action Required:\n" +
               "✓ Ensure proper drainage in fields\n" +
               "✓ Protect young seedlings\n" +
               "✓ Postpone fertilizer application\n" +
               "✓ Harvest mature crops if possible\n\n" +
               "Stay safe and monitor weather updates."
    },
    {
      type: "heatwave",
      message: "⚠️ Heatwave Warning\n\n" +
               "Temperature expected to reach 42°C for next 3 days.\n\n" +
               "Crop Protection:\n" +
               "✓ Increase irrigation frequency\n" +
               "✓ Irrigate early morning/late evening\n" +
               "✓ Mulch around plants to retain moisture\n" +
               "✓ Provide shade for sensitive crops\n\n" +
               "Stay hydrated while working in fields."
    },
    {
      type: "frost",
      message: "⚠️ Frost Warning\n\n" +
               "Temperature may drop to 2°C tonight. Frost likely.\n\n" +
               "Immediate Actions:\n" +
               "✓ Cover sensitive crops with plastic sheets\n" +
               "✓ Light irrigation before sunset (prevents freezing)\n" +
               "✓ Use smoke/smudge pots if available\n" +
               "✓ Harvest mature vegetables\n\n" +
               "Frost can damage crops severely. Take precautions now."
    },
    {
      type: "drought",
      message: "⚠️ Drought Alert\n\n" +
               "No significant rainfall expected for next 15 days.\n\n" +
               "Water Conservation:\n" +
               "✓ Switch to drip irrigation if possible\n" +
               "✓ Mulch heavily to reduce evaporation\n" +
               "✓ Irrigate during cooler hours only\n" +
               "✓ Prioritize high-value crops\n" +
               "✓ Consider drought-resistant varieties for next season\n\n" +
               "Plan water usage carefully."
    }
  ]
};

// ============================================
// EXAMPLE 6: Missing Information Handling
// ============================================
const missingInfoExample = {
  scenario: "Bot asks for missing context",
  conversation: [
    {
      user: "What fertilizer should I use?",
      bot: "I'd be happy to help with fertilizer recommendations!\n\n" +
           "To give you the best advice, I need some information:\n\n" +
           "1. What crop are you growing?\n" +
           "2. What is the current growth stage?\n" +
           "3. Have you done soil testing?\n\n" +
           "Please share these details, and I'll provide specific recommendations.",
      intent: "fertilizer"
    },
    {
      user: "I'm growing wheat, it's at tillering stage",
      bot: "Perfect! For wheat at tillering stage:\n\n" +
           "🌾 Fertilizer Recommendation:\n\n" +
           "Apply Nitrogen Top Dressing:\n" +
           "- Urea: 25-30 kg per acre\n" +
           "- Or CAN: 40-45 kg per acre\n\n" +
           "Application Tips:\n" +
           "✓ Apply when soil is moist\n" +
           "✓ Broadcast uniformly\n" +
           "✓ Irrigate within 2-3 days\n" +
           "✓ Best time: Early morning\n\n" +
           "This will boost tillering and increase yield potential.",
      intent: "fertilizer"
    }
  ]
};

// ============================================
// EXAMPLE 7: Crop Planning Advice
// ============================================
const cropPlanningExample = {
  scenario: "Farmer asks about crop selection",
  conversation: [
    {
      user: "What crop should I plant in October?",
      bot: "For October planting in North India, here are excellent options:\n\n" +
           "🌾 Rabi Season Crops:\n\n" +
           "1️⃣ Wheat (Recommended)\n" +
           "   - Duration: 120-150 days\n" +
           "   - Yield: 40-50 quintals/acre\n" +
           "   - Market: Stable demand\n\n" +
           "2️⃣ Mustard\n" +
           "   - Duration: 90-120 days\n" +
           "   - Yield: 8-12 quintals/acre\n" +
           "   - Good oil prices\n\n" +
           "3️⃣ Chickpea (Chana)\n" +
           "   - Duration: 100-120 days\n" +
           "   - Yield: 10-15 quintals/acre\n" +
           "   - High protein crop\n\n" +
           "4️⃣ Vegetables: Potato, Peas, Cauliflower\n\n" +
           "Which crop interests you? I can provide detailed cultivation tips.",
      intent: "crop_advice"
    }
  ]
};

// ============================================
// EXAMPLE 8: Market & Economics
// ============================================
const marketExample = {
  scenario: "Farmer asks about market prices",
  conversation: [
    {
      user: "What is the current wheat price?",
      bot: "Current Wheat Market Rates (as of today):\n\n" +
           "📊 Mandi Prices:\n" +
           "- MSP (Minimum Support Price): ₹2,125/quintal\n" +
           "- Market Price: ₹2,200-2,350/quintal\n" +
           "- Quality Premium: +₹100-150/quintal\n\n" +
           "💡 Selling Tips:\n" +
           "✓ Grade your wheat properly\n" +
           "✓ Ensure moisture < 12%\n" +
           "✓ Remove foreign matter\n" +
           "✓ Check multiple mandis for best price\n\n" +
           "Note: Prices vary by region and quality. Check your local mandi for exact rates.",
      intent: "general"
    }
  ]
};

// ============================================
// Export Examples
// ============================================
module.exports = {
  weatherExample,
  irrigationExample,
  fertilizerExample,
  pestControlExample,
  alertExamples,
  missingInfoExample,
  cropPlanningExample,
  marketExample
};

// ============================================
// Testing the Chatbot
// ============================================

/*
To test these conversations:

1. Start the backend server:
   node backend/server.js

2. Log in to the dashboard

3. Open the chatbot widget

4. Try these sample queries:
   - "What's the weather tomorrow?"
   - "Should I irrigate my wheat?"
   - "What fertilizer for rice?"
   - "Small holes in tomato leaves"
   - "What crop to plant in October?"

5. Check that bot responses are:
   - Relevant to the query
   - Actionable and specific
   - Context-aware (uses your profile data)
   - Professional but friendly
   - Properly formatted

6. Test edge cases:
   - Very long messages
   - Messages with special characters
   - Rapid consecutive messages
   - Network disconnection
   - Invalid session IDs
*/
