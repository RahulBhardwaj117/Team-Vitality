// ============================================
// AgriUrbanAI - Enhanced Dashboard JavaScript - FIXED MAP
// ============================================

// --- WEATHER DATA MANAGEMENT ---
let weatherData = [];

// Check if we're in Electron environment with database
const isElectron = window.desktopUtils && window.desktopUtils.isElectron;
const dbAPI = isElectron && window.databaseAPI ? window.databaseAPI : null;

// Default weather data as fallback
// Generate dynamic default forecast data based on current date
function generateDefaultForecast() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const forecast = [];

  // Base weather for the season (assuming summer for this demo context, or adjust logic)
  const baseTemp = 36;
  
  for (let i = 0; i < 15; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = i === 0 ? "Today" : days[d.getDay()];

    // Add some random variation
    const tempVar = Math.floor(Math.random() * 5) - 2; // -2 to +2
    const rainChance = i === 0 ? 10 : Math.floor(Math.random() * 30);

    forecast.push({
      day: dayName,
      condition: rainChance > 20 ? "Partly Cloudy" : "Sunny",
      rain_chance: rainChance,
      temp: baseTemp + tempVar,
      min_temp: baseTemp + tempVar - 12,
      max_temp: baseTemp + tempVar,
      icon: rainChance > 20 ? "🌤️" : "☀️",
      humidity: 40 + Math.floor(Math.random() * 20),
      wind: 10 + Math.floor(Math.random() * 10)
    });
  }
  return forecast;
}

// API Base URLs
const API_URL = 'http://localhost:5000/api'; // Node.js backend
const FASTAPI_URL = 'http://localhost:8000'; // Python AI backend

// Load weather data from AI prediction service
// Helper for delay
const delay = ms => new Promise(res => setTimeout(res, ms));

async function loadWeatherData() {
  const maxRetries = 3;
  let attempts = 0;
  
  // Check if running on localhost
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isLocal) {
    console.log('🌍 Non-local environment detected. Skipping backend API checks and using demo data.');
    // Fallback directly
    weatherData = generateDefaultForecast();
    localStorage.setItem('agriurban_weather_forecast', JSON.stringify({
      data: weatherData,
      timestamp: Date.now(),
      location: currentUser?.location || 'Gautam Buddha Nagar',
      source: 'GENERATED_DEFAULT'
    }));
    return;
  }

  while (attempts < maxRetries) {
    try {
      console.log(`🤖 Loading AI-predicted weather data (Attempt ${attempts + 1}/${maxRetries})...`);
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const response = await fetch(`${FASTAPI_URL}/predict/weather/raw?start_date=${dateStr}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Weather Response:', result);

        if (result.status === 'success' && result.forecast && result.forecast.length > 0) {
          // Transform AI predictions
          weatherData = result.forecast.map((day, index) => {
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            return {
              day: index === 0 ? 'Today' : dayName,
              condition: day.condition || 'Clear',
              rain_chance: Math.round(day.rain_chance || 0),
              temp: Math.round(day.temp || 30),
              icon: day.icon || '☀️',
              humidity: Math.round(day.humidity || 50),
              wind: Math.round(day.wind || 10),
              min_temp: Math.round(day.min_temp || 20),
              max_temp: Math.round(day.temp || 30)
            };
          });

          console.log('✅ AI Predictions Loaded! 15-Day Forecast:', weatherData);
          localStorage.setItem('agriurban_weather_forecast', JSON.stringify({
            data: weatherData,
            timestamp: Date.now(),
            location: currentUser?.location || 'Gautam Buddha Nagar',
            source: 'AI_PREDICTION'
          }));
          return; // Success!
        }
      }
      throw new Error(`API returned ${response.status}`);

    } catch (err) {
      console.warn(`Attempt ${attempts + 1} failed:`, err.message);
      attempts++;
      if (attempts < maxRetries) await delay(2000); // Wait 2s before retry
    }
  }

  // Fallback: Use generated default data
  console.warn('⚠️ Backend unreachable after retries. Using generated dynamic default data.');
  weatherData = generateDefaultForecast();

  localStorage.setItem('agriurban_weather_forecast', JSON.stringify({
    data: weatherData,
    timestamp: Date.now(),
    location: currentUser?.location || 'Gautam Buddha Nagar',
    source: 'GENERATED_DEFAULT'
  }));
}

// --- OPENWEATHER API INTEGRATION ---
const OPENWEATHER_API_KEY = '45433333a6d1a566b3cdeecff33e3409';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fetch current weather from OpenWeather API
async function fetchCurrentWeather() {
  try {
    // Use dynamic coordinates if available, otherwise default to Delhi
    const lat = window.currentCoordinates ? window.currentCoordinates.lat : 28.6139;
    const lon = window.currentCoordinates ? window.currentCoordinates.lng : 77.2090;

    const url = `${OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    console.log('Fetching current weather from OpenWeather API for Delhi...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenWeather API Response:', data);

    // Extract relevant weather information
    const currentWeather = {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      main: data.weather[0].main,
      icon: data.weather[0].icon,
      wind_speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      wind_deg: data.wind.deg,
      clouds: data.clouds.all,
      visibility: data.visibility / 1000, // Convert to km
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000)
    };

    console.log('Processed weather data:', currentWeather);

    // Update the display
    updateCurrentWeatherDisplay(currentWeather);

    // SYNC LOGIC: Update the "Today" slot in our 7-day forecast with this real data
    if (typeof weatherData !== 'undefined' && Array.isArray(weatherData) && weatherData.length > 0) {
      console.log('🔄 Syncing "Today" forecast with OpenWeather data...');

      // Update Today's data
      weatherData[0].temp = currentWeather.temp;
      weatherData[0].min_temp = Math.min(weatherData[0].min_temp, currentWeather.temp);
      weatherData[0].max_temp = Math.max(weatherData[0].max_temp, currentWeather.temp);
      weatherData[0].humidity = currentWeather.humidity;
      weatherData[0].wind = currentWeather.wind_speed;
      weatherData[0].condition = currentWeather.main;

      // Persist to localStorage so Prediction Tab sees this change
      const existingStore = JSON.parse(localStorage.getItem('agriurban_weather_forecast') || '{}');
      existingStore.data = weatherData;
      localStorage.setItem('agriurban_weather_forecast', JSON.stringify(existingStore));

      console.log('✅ Synced and saved to localStorage');

      // Trigger a refresh of predictions if we are on that tab (or just generally)
      // If initializePrediction is valid
      if (typeof initializePrediction === 'function' && document.getElementById('prediction-content').classList.contains('active')) {
        initializePrediction();
      }
    }

    return currentWeather;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    // Fallback to default display
    updateCurrentWeatherDisplay(null);
    return null;
  }
}

// Update current weather display in the dashboard
function updateCurrentWeatherDisplay(weather) {
  const summaryElement = document.getElementById('current-weather-summary');

  if (!summaryElement) {
    console.warn('Current weather summary element not found');
    return;
  }

  if (!weather) {
    // Fallback display when API fails
    summaryElement.innerHTML = `
      <div style="text-align: center; padding: 1rem;">
        <p style="margin: 0; color: #888; font-size: 0.9rem;">
          <i class="ph-warning"></i> Weather data temporarily unavailable
        </p>
      </div>
    `;
    return;
  }

  // Get weather icon
  const getWeatherEmoji = (main, icon) => {
    const iconMap = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️'
    };
    return iconMap[main] || '🌤️';
  };

  const emoji = getWeatherEmoji(weather.main, weather.icon);

  // Format description (capitalize first letter of each word)
  const formattedDescription = weather.description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  summaryElement.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem;">
      <div style="font-size: 3rem; line-height: 1;">${emoji}</div>
      <div style="flex: 1;">
        <div style="font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem;">
          ${weather.temp}°C
        </div>
        <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">
          ${formattedDescription}
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.85rem;">
          <div>
            <i class="ph-thermometer"></i> Feels like: <strong>${weather.feels_like}°C</strong>
          </div>
          <div>
            <i class="ph-drop"></i> Humidity: <strong>${weather.humidity}%</strong>
          </div>
          <div>
            <i class="ph-wind"></i> Wind: <strong>${weather.wind_speed} km/h</strong>
          </div>
          <div>
            <i class="ph-cloud"></i> Clouds: <strong>${weather.clouds}%</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Main function to update current weather (called on dashboard init)
async function updateCurrentWeather() {
  const weather = await fetchCurrentWeather();
  // Refresh every 10 minutes
  setInterval(fetchCurrentWeather, 600000);
  return weather;
}

// --- GLOBAL VARIABLES ---
let currentView = 'farmer';
let currentLang = 'en';
let map;
let analyticsChart;
let markers = [];
let isAnimating = false;
let realTimeInterval;
let voiceEnabled = true;
let currentUser = null;
let mapInitialized = false;

// --- DOM ELEMENTS CACHE ---
const elements = {
  farmerBtn: null,
  urbanBtn: null,
  contextLabel: null,
  contextCard: null,
  forecastContainer: null,
  riskLevelEl: null,
  recTextEl: null,
  sendAlertBtn: null,
  modalOverlay: null,
  notificationBody: null,
  langToggleBtn: null,
  loadingSpinner: null,
  themeToggle: null,
  userRoleDisplay: null,
  userNameDisplay: null
};

let riskCircle = null;

// --- USER SESSION MANAGEMENT ---
function loadUserSession() {
  // Try to get user data from memory storage first
  if (currentUser) {
    return true;
  }

  // Load user data from localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  } else {
    // For demo purposes, create a default user
    currentUser = {
      email: "demo@agriurban.ai",
      role: "farmer",
      loginTime: new Date().toISOString()
    };
  }

  // Set default view based on user role
  const role = currentUser.role || 'farmer';
  if (role === 'urban' || role === 'city_planner') {
    currentView = 'urban';
  } else if (role === 'admin') {
    currentView = 'admin';
  } else {
    currentView = 'farmer';
  }

  return true;
}

// --- POPUP REMOVED AS PER REQUEST ---
// Previous checks and modal for user details have been removed.

// --- LOCATION DATA BASED ON USER ROLE ---
const locationData = {
  farmer: {
    district: "Delhi",
    city: "New Delhi",
    region: "NCR",
    state: "Delhi",
    coordinates: [28.6139, 77.2090],
    farmLocation: [28.62, 77.21],
    farmName: "Wheat Farm - Sector A",

    cropType: "Wheat (Rabi)",
    growthStage: "Flowering",
    fieldArea: "2.5 Hectares",
    lastIrrigation: "3 days ago",
    fertilizer: "NPK 12:32:16",
    expectedYield: "4.2 tons/hectare"
  },
  urban: {
    district: "Delhi",
    city: "New Delhi",
    region: "NCR",
    state: "Delhi",
    coordinates: [28.6139, 77.2090],
    urbanLocation: [28.63, 77.22],
    zoneName: "Sector 18 - Urban Zone",
    floodRisk: "High",
    drainage: "Operational",
    population: "~25,000",
    emergencyUnits: "5 Units Ready",
    lastIncident: "45 days ago"
  },
  admin: {
    district: "Delhi",
    city: "New Delhi",
    region: "NCR",
    state: "Delhi",
    coordinates: [28.6139, 77.2090],
    adminLocation: [28.61, 77.23],
    zoneName: "Administrative Zone - Sector 62",
    floodRisk: "Medium",
    drainage: "Under Maintenance",
    population: "~50,000",
    emergencyUnits: "8 Units Ready",
    lastIncident: "15 days ago"
  },
  demo: {
    district: "Delhi",
    city: "New Delhi",
    region: "NCR",
    state: "Delhi",
    coordinates: [28.6139, 77.2090],
    demoLocation: [28.64, 77.21],
    zoneName: "Demo Zone - Sector 18",
    floodRisk: "Low",
    drainage: "Fully Operational",
    population: "~30,000",
    emergencyUnits: "6 Units Ready",
    lastIncident: "60 days ago"
  }
};

// --- NAVIGATION MANAGEMENT ---
let currentSection = 'dashboard';

function switchSection(sectionId) {
  // Reset scroll position to top when switching sections
  window.scrollTo(0, 0);

  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Show selected section
  const targetSection = document.getElementById(sectionId + '-content');
  if (targetSection) {
    targetSection.classList.add('active');
    currentSection = sectionId;

    // Update navbar active state
    document.querySelectorAll('.nav-menu .nav-item').forEach(link => {
      link.classList.remove('active');
    });
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Initialize section-specific content
    if (sectionId === 'analytics') {
      initializeAnalytics();
    } else if (sectionId === 'alerts') {
      initializeAlerts();
    } else if (sectionId === 'prediction') {
      initializePrediction();
    } else if (sectionId === 'dashboard') {
      // If returning to the dashboard tab, ensure the map resizes correctly.
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        } else if (!mapInitialized) {
          // Initialize map if it hasn't been loaded at all
          initMap();
        }
      }, 100); // A short delay to allow the container to become visible
    }
  }
}

// --- ANALYTICS INITIALIZATION ---
function initializeAnalytics() {
  // Weather trends chart removed

  // Crop health chart removed
}

// --- WEATHER FORECAST DATA SHARING ---
/**
 * Retrieve stored weather forecast from localStorage
 * @returns {Object|null} Stored forecast data or null if expired/missing
 */
function getStoredWeatherForecast() {
  try {
    const stored = localStorage.getItem('agriurban_weather_forecast');
    if (!stored) {
      console.warn('No stored weather forecast found');
      return null;
    }

    const parsed = JSON.parse(stored);
    const age = Date.now() - parsed.timestamp;

    // Data expires after 30 minutes
    if (age > 30 * 60 * 1000) {
      console.warn('Stored forecast expired, removing...');
      localStorage.removeItem('agriurban_weather_forecast');
      return null;
    }

    console.log('✅ Retrieved stored forecast:', parsed);
    return parsed;
  } catch (error) {
    console.error('Error retrieving stored forecast:', error);
    return null;
  }
}

/**
 * Calculate flood risk from weather forecast
 * @param {Array} forecast - Array of weather data
 * @returns {string} Risk level and details
 */
function calculateFloodRisk(forecast) {
  const totalRain = forecast.reduce((sum, day) => sum + day.rain_chance, 0);
  const avgRain = totalRain / forecast.length;
  const highRainDays = forecast.filter(d => d.rain_chance > 40).length;
  const maxRain = Math.max(...forecast.map(d => d.rain_chance));

  let level, details;
  if (avgRain > 50 || highRainDays >= 3) {
    level = 'High';
    details = `${highRainDays} days with >40% rain, avg ${Math.round(avgRain)}%`;
  } else if (avgRain > 30 || highRainDays >= 2) {
    level = 'Medium';
    details = `${highRainDays} days with >40% rain, avg ${Math.round(avgRain)}%`;
  } else {
    level = 'Low';
    details = `Max ${maxRain}% rain chance, avg ${Math.round(avgRain)}%`;
  }

  return {
    risk_level: level,
    details: details,
    expected_rise: level === 'High' ? 1.5 : (level === 'Medium' ? 0.8 : 0.2),
    affected_areas: level === 'High' ? ['Low-lying zones', 'River banks'] : (level === 'Medium' ? ['River banks'] : []),
    confidence: 85
  };
}

/**
 * Calculate heatwave risk from weather forecast
 * @param {Array} forecast - Array of weather data
 * @returns {string} Risk level and details
 */
function calculateHeatwaveRisk(forecast) {
  const hotDays = forecast.filter(d => d.temp > 40).length;
  const veryHotDays = forecast.filter(d => d.temp > 42).length;
  const maxTemp = Math.max(...forecast.map(d => d.temp));
  const avgTemp = forecast.reduce((sum, d) => sum + d.temp, 0) / forecast.length;

  let level, details;
  if (veryHotDays >= 3 || maxTemp > 45) {
    level = 'High';
    details = `Peak ${maxTemp}°C, ${veryHotDays} days >42°C`;
  } else if (hotDays >= 2 || maxTemp > 42) {
    level = 'Medium';
    details = `Peak ${maxTemp}°C, ${hotDays} days >40°C`;
  } else {
    level = 'Low';
    details = `Peak ${maxTemp}°C, avg ${Math.round(avgTemp)}°C`;
  }

  return {
    risk_level: level,
    details: details,
    peak_temp: maxTemp,
    duration: level === 'High' ? veryHotDays : (level === 'Medium' ? hotDays : 0),
    confidence: 90
  };
}

/**
 * Calculate drought risk from weather forecast
 * @param {Array} forecast - Array of weather data
 * @returns {string} Risk level and details
 */
function calculateDroughtRisk(forecast) {
  const dryDays = forecast.filter(d => d.rain_chance < 10).length;
  const avgHumidity = forecast.reduce((sum, d) => sum + d.humidity, 0) / forecast.length;
  const avgRain = forecast.reduce((sum, d) => sum + d.rain_chance, 0) / forecast.length;

  let level, details;
  if (dryDays >= 5 && avgHumidity < 40) {
    level = 'High';
    details = `${dryDays} dry days, ${Math.round(avgHumidity)}% humidity`;
  } else if (dryDays >= 3 && avgHumidity < 50) {
    level = 'Medium';
    details = `${dryDays} dry days, ${Math.round(avgHumidity)}% humidity`;
  } else {
    level = 'Low';
    details = `${dryDays} dry days, ${Math.round(avgRain)}% avg rain`;
  }

  return {
    risk_level: level,
    details: details,
    soil_moisture: level === 'High' ? 'Critically Low' : (level === 'Medium' ? 'Low' : 'Adequate'),
    rainfall_deficit: level === 'High' ? 'Severe' : (level === 'Medium' ? 'Moderate' : 'None'),
    confidence: 92
  };
}

/**
 * Generate summary of forecast data
 * @param {Array} forecast - Array of weather data
 * @returns {string} Forecast summary
 */
function generateForecastSummary(forecast) {
  const avgTemp = Math.round(forecast.reduce((sum, d) => sum + d.temp, 0) / forecast.length);
  const avgRain = Math.round(forecast.reduce((sum, d) => sum + d.rain_chance, 0) / forecast.length);
  const maxTemp = Math.max(...forecast.map((d) => d.temp));
  const minTemp = Math.min(...forecast.map((d) => d.min_temp || d.temp));
  const conditions = [...new Set(forecast.map(d => d.condition))].slice(0, 3).join(', ');

  return `7-day forecast: ${minTemp}-${maxTemp}°C (avg ${avgTemp}°C), ${avgRain}% rain chance. Conditions: ${conditions}`;
}

// --- PREDICTION INITIALIZATION ---
async function initializePrediction() {
  console.log('🚀 [INIT] Prediction section initialized');

  const container = document.getElementById('ai-recommendation-container');
  const textContainer = document.getElementById('ai-recommendation-text');

  // Flood Card Elements
  const floodCard = document.querySelector('.flood-section-v2');
  const floodRiskValue = floodCard?.querySelector('.risk-meter .value');
  const floodRiskMeter = floodCard?.querySelector('.risk-meter');
  const floodDesc = floodCard?.querySelector('p');
  const floodList = floodCard?.querySelector('.prediction-list');

  // Heatwave Card Elements
  const heatwaveCard = document.querySelector('.heatwave-section');
  const heatwaveRiskValue = heatwaveCard?.querySelector('.risk-meter .value');
  const heatwaveRiskMeter = heatwaveCard?.querySelector('.risk-meter');
  const heatwaveDesc = heatwaveCard?.querySelector('p');
  const heatwaveList = heatwaveCard?.querySelector('.prediction-list');

  // Drought Card Elements
  const droughtCard = document.querySelector('.drought-section');
  const droughtRiskValue = droughtCard?.querySelector('.risk-meter .value');
  const droughtRiskMeter = droughtCard?.querySelector('.risk-meter');
  const droughtDesc = droughtCard?.querySelector('p');
  const droughtList = droughtCard?.querySelector('.prediction-list');

  console.log('🔍 [INIT] Elements found:', {
    container: !!container,
    textContainer: !!textContainer,
    floodCard: !!floodCard,
    heatwaveCard: !!heatwaveCard,
    droughtCard: !!droughtCard
  });

  if (!container || !textContainer) {
    console.error('❌ [INIT] Missing required elements, exiting');
    return;
  }

  // Helper for generating advice based on risk level
  const getFloodAdvice = (level) => {
    switch (level.toLowerCase()) {
      case 'high': return "IMMEDIATE ACTION: Evacuate low-lying equipment and clear all drainage channels.";
      case 'medium': return "Prepare precautionary measures and monitor water levels in nearby channels.";
      default: return "Standard maintenance: Ensure drainage systems remain unobstructed.";
    }
  };

  const getHeatwaveAdvice = (level, temp) => {
    switch (level.toLowerCase()) {
      case 'high': return `CRITICAL: Suspend mid-day field labor. Shade/water required for crops/livestock.`;
      case 'medium': return `Advisory: Schedule irrigation for evening hours to minimize evaporation loss.`;
      default: return "Conditions favorable: Proceed with standard field operations.";
    }
  };

  const getDroughtAdvice = (level) => {
    switch (level.toLowerCase()) {
      case 'high': return "URGENT: Activate water conservation protocols and prioritize essential crop irrigation.";
      case 'medium': return "Warning: Implement moisture retention techniques like mulching immediately.";
      default: return "Stable: Maintain regular irrigation schedule but monitor soil moisture.";
    }
  };

  // Helper for accumulating analysis lines for AI Strategic Analysis section
  let strategicAnalysisLines = [];
  const updateStrategicAnalysis = () => {
    if (!textContainer) return;
    const items = strategicAnalysisLines.map(line =>
      `<div style="margin-bottom: 0.6rem; font-size: 0.95rem;">
         <i class="ph-caret-right" style="color: var(--primary-color); margin-right: 0.5rem;"></i> ${line}
       </div>`
    ).join('');

    textContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; padding: 0.5rem;">
        ${items}
      </div>
      <p style="font-size: 0.8em; color: #27ae60; margin-top: 0.5rem; text-align: right; opacity: 0.8;">
        <i class="ph-check-circle"></i> Integrated AI Analysis
      </p>
    `;
  };

  // Show container and loading state
  container.style.display = 'block';
  textContainer.innerHTML = `
    <div class="ai-analysis-loading" style="text-align: center; padding: 2rem; background: rgba(255,255,255,0.5); border-radius: 12px;">
      <div style="display: flex; justify-content: center; gap: 3rem; margin-bottom: 1.5rem;">
        <div style="text-align: center; animation: pulse 1.5s infinite;">
          <i class="ph-waves" style="font-size: 1.8rem; color: #3498db; margin-bottom: 0.5rem; display: block;"></i>
          <span style="font-size: 0.85rem; color: #555; font-weight: 500;">Flood Model</span>
        </div>
        <div style="text-align: center; animation: pulse 1.5s infinite 0.5s;">
          <i class="ph-thermometer" style="font-size: 1.8rem; color: #e74c3c; margin-bottom: 0.5rem; display: block;"></i>
          <span style="font-size: 0.85rem; color: #555; font-weight: 500;">Heat Engine</span>
        </div>
        <div style="text-align: center; animation: pulse 1.5s infinite 1s;">
          <i class="ph-plant" style="font-size: 1.8rem; color: #2ecc71; margin-bottom: 0.5rem; display: block;"></i>
          <span style="font-size: 0.85rem; color: #555; font-weight: 500;">Drought Index</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
        <i class="ph-spinner ph-spin" style="font-size: 1.25rem; color: var(--primary-color);"></i>
        <span style="font-weight: 600; font-size: 1.05rem; background: linear-gradient(90deg, var(--primary-color), #2980b9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Synthesizing integrated strategic insights...</span>
      </div>
    </div>
  `;

  try {
    // Get stored weather forecast from dashboard
    let forecastData = getStoredWeatherForecast();
    console.log('📊 [INIT] Forecast data:', forecastData);

    // If no data or expired, try to load it fresh
    if (!forecastData || !forecastData.data || forecastData.data.length === 0) {
      console.warn('⚠️ [INIT] Weather data missing or expired. Fetching fresh data...');
      await loadWeatherData();
      forecastData = getStoredWeatherForecast();

      if (!forecastData || !forecastData.data || forecastData.data.length === 0) {
        throw new Error("Unable to load weather data. Please check your internet connection and try again.");
      }
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

    // ==================== PARALLEL API CALLS ====================
    // We run all predictions in parallel to avoid "flickering" or sequential updates in the UI
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const floodPromise = (!isLocal) ? Promise.reject("Demo Mode - API Skipped") : fetch(`${FASTAPI_URL}/predict/flood/integrated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.ok ? res.json() : Promise.reject(res.statusText));

    const heatwavePromise = (!isLocal) ? Promise.reject("Demo Mode - API Skipped") : fetch(`${FASTAPI_URL}/predict/heatwave/integrated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.ok ? res.json() : Promise.reject(res.statusText));

    const droughtPromise = (!isLocal) ? Promise.reject("Demo Mode - API Skipped") : fetch(`${FASTAPI_URL}/predict/drought/integrated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.ok ? res.json() : Promise.reject(res.statusText));

    // Wait for all to settle
    const [floodResult, heatwaveResult, droughtResult] = await Promise.allSettled([
      floodPromise,
      heatwavePromise,
      droughtPromise
    ]);

    // PROCESS FLOOD RESULT
    if (floodResult.status === 'fulfilled') {
      const data = floodResult.value;
      if (floodCard) {
        if (floodRiskValue) floodRiskValue.textContent = data.risk_level;
        if (floodRiskMeter) {
          floodRiskMeter.className = 'risk-meter';
          floodRiskMeter.classList.add(data.risk_level.toLowerCase());
        }
        if (floodDesc) {
          const msg = `AI analysis predicts ${data.risk_level.toLowerCase()} flood risk based on 7-day forecast.`;
          floodDesc.textContent = msg;
          strategicAnalysisLines.push(`<strong>Flood Advisory:</strong> ${getFloodAdvice(data.risk_level)}`);
        }
        if (floodList) {
          floodList.innerHTML = `
             <li><span>Expected Rise:</span> <strong>${data.expected_rise.toFixed(2)}m</strong></li>
             <li><span>Affected Areas:</span> <strong>${data.affected_areas && data.affected_areas.length > 0 ? data.affected_areas.join(', ') : 'None'}</strong></li>
             <li>
               <span>Confidence:</span> 
               <div style="display: flex; align-items: center;">
                 <strong style="margin-right: 8px;">96%</strong>
                 <div class="confidence-container">
                   <div class="confidence-bar" style="width: 96%;"></div>
                 </div>
               </div>
             </li>
           `;
        }
        updateAnalyticsUI('flood', data.risk_level);
      }
    } else {
      console.error('❌ Flood API failed:', floodResult.reason);
      // Fallback
      if (floodCard) {
        const fallback = calculateFloodRisk(forecastData.data);
        if (floodRiskValue) floodRiskValue.textContent = fallback.risk_level;
        if (floodRiskMeter) {
          floodRiskMeter.className = 'risk-meter';
          floodRiskMeter.classList.add(fallback.risk_level.toLowerCase());
        }
        if (floodDesc) {
          const msg = `Based on forecast analysis: ${fallback.details}.`;
          floodDesc.textContent = msg;
          strategicAnalysisLines.push(`<strong>Flood Advisory:</strong> ${getFloodAdvice(fallback.risk_level)}`);
        }
        if (floodList) {
          floodList.innerHTML = `
              <li><span>Expected Rise:</span> <strong>${fallback.expected_rise}m</strong></li>
              <li><span>Affected Areas:</span> <strong>${fallback.affected_areas.length > 0 ? fallback.affected_areas.join(', ') : 'None'}</strong></li>
              <li><span>Confidence:</span> <strong>${fallback.confidence}%</strong></li>
           `;
        }
        updateAnalyticsUI('flood', fallback.risk_level);
      }
    }

    // PROCESS HEATWAVE RESULT
    if (heatwaveResult.status === 'fulfilled') {
      const data = heatwaveResult.value;
      if (heatwaveCard) {
        if (heatwaveRiskValue) heatwaveRiskValue.textContent = data.risk_level;
        if (heatwaveRiskMeter) {
          heatwaveRiskMeter.className = 'risk-meter';
          heatwaveRiskMeter.classList.add(data.risk_level.toLowerCase());
        }
        if (heatwaveDesc) {
          const msg = `Temperatures expected to peak at ${data.peak_temp}°C.`;
          heatwaveDesc.textContent = msg + " Stay hydrated and avoid prolonged sun exposure.";
          strategicAnalysisLines.push(`<strong>Heatwave Advisory:</strong> ${getHeatwaveAdvice(data.risk_level, data.peak_temp)}`);
        }
        if (heatwaveList) {
          heatwaveList.innerHTML = `
             <li><span>Peak Temp:</span> <strong>${data.peak_temp}°C</strong></li>
             <li><span>Duration:</span> <strong>${data.duration} Days</strong></li>
             <li>
               <span>Confidence:</span> 
               <div style="display: flex; align-items: center;">
                 <strong style="margin-right: 8px;">90%</strong>
                 <div class="confidence-container">
                   <div class="confidence-bar" style="width: 90%;"></div>
                 </div>
               </div>
             </li>
           `;
        }
        updateAnalyticsUI('heatwave', data.risk_level);
      }
    } else {
      console.error('❌ Heatwave API failed:', heatwaveResult.reason);
      // Fallback
      if (heatwaveCard) {
        const fallback = calculateHeatwaveRisk(forecastData.data);
        if (heatwaveRiskValue) heatwaveRiskValue.textContent = fallback.risk_level;
        if (heatwaveRiskMeter) {
          heatwaveRiskMeter.className = 'risk-meter';
          heatwaveRiskMeter.classList.add(fallback.risk_level.toLowerCase());
        }
        if (heatwaveDesc) {
          const msg = `Based on forecast analysis: ${fallback.details}.`;
          heatwaveDesc.textContent = msg;
          strategicAnalysisLines.push(`<strong>Heatwave Advisory:</strong> ${getHeatwaveAdvice(fallback.risk_level, fallback.peak_temp)}`);
        }
        if (heatwaveList) {
          heatwaveList.innerHTML = `
            <li><span>Peak Temp:</span> <strong>${fallback.peak_temp}°C</strong></li>
            <li><span>Duration:</span> <strong>${fallback.duration} Days</strong></li>
            <li><span>Confidence:</span> <strong>${fallback.confidence}%</strong></li>
          `;
        }
        updateAnalyticsUI('heatwave', fallback.risk_level);
      }
    }

    // PROCESS DROUGHT RESULT
    if (droughtResult.status === 'fulfilled') {
      const data = droughtResult.value;
      if (droughtCard) {
        if (droughtRiskValue) droughtRiskValue.textContent = data.risk_level;
        if (droughtRiskMeter) {
          droughtRiskMeter.className = 'risk-meter';
          droughtRiskMeter.classList.add(data.risk_level.toLowerCase());
        }
        if (droughtDesc) {
          const msg = `Analysis shows ${data.risk_level.toLowerCase()} drought risk.`;
          droughtDesc.textContent = msg + ` ${data.dry_days || 0} dry days expected.`;
          strategicAnalysisLines.push(`<strong>Drought Advisory:</strong> ${getDroughtAdvice(data.risk_level)}`);
        }
        if (droughtList) {
          droughtList.innerHTML = `
             <li><span>Soil Moisture:</span> <strong>${data.soil_moisture}</strong></li>
             <li><span>Rainfall Deficit:</span> <strong>${data.rainfall_deficit}</strong></li>
             <li>
               <span>Confidence:</span> 
               <div style="display: flex; align-items: center;">
                 <strong style="margin-right: 8px;">92%</strong>
                 <div class="confidence-container">
                   <div class="confidence-bar" style="width: 92%;"></div>
                 </div>
               </div>
             </li>
           `;
        }
        updateAnalyticsUI('drought', data.risk_level);
      }
    } else {
      console.error('❌ Drought API failed:', droughtResult.reason);
      // Fallback
      if (droughtCard) {
        const fallback = calculateDroughtRisk(forecastData.data);
        if (droughtRiskValue) droughtRiskValue.textContent = fallback.risk_level;
        if (droughtRiskMeter) {
          droughtRiskMeter.className = 'risk-meter';
          droughtRiskMeter.classList.add(fallback.risk_level.toLowerCase());
        }
        if (droughtDesc) {
          const msg = `Based on forecast analysis: ${fallback.details}.`;
          droughtDesc.textContent = msg;
          strategicAnalysisLines.push(`<strong>Drought Advisory:</strong> ${getDroughtAdvice(fallback.risk_level)}`);
        }
        if (droughtList) {
          droughtList.innerHTML = `
            <li><span>Soil Moisture:</span> <strong>${fallback.soil_moisture}</strong></li>
            <li><span>Rainfall Deficit:</span> <strong>${fallback.rainfall_deficit}</strong></li>
            <li><span>Confidence:</span> <strong>${fallback.confidence}%</strong></li>
          `;
        }
        updateAnalyticsUI('drought', fallback.risk_level);
      }
    }

    // FINAL UI UPDATE
    updateStrategicAnalysis();

    console.log('🎉 [INIT] All predictions initialized!');

  } catch (error) {
    console.error('❌ [INIT] Error fetching AI predictions:', error);
    // Even if main try fails (e.g. data prep), ensure UI is not stuck
    // This part handles the "Global" error if something goes wrong before individual API calls
  }
}


// --- ALERTS INITIALIZATION ---
function initializeAlerts() {
  // Render history
  renderAlertsHistory();

  // Add alert filter functionality
  document.querySelectorAll('.alert-filter').forEach(filter => {
    filter.addEventListener('click', function () {
      // Remove active class from all filters
      document.querySelectorAll('.alert-filter').forEach(f => f.classList.remove('active'));
      // Add active class to clicked filter
      this.classList.add('active');

      const filterType = this.dataset.filter;
      filterAlerts(filterType);
    });
  });

  // Add Clear All button functionality
  const clearBtn = document.getElementById('clear-alerts-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      // Confirm before clearing
      if (confirm('Are you sure you want to delete all alert history? This action cannot be undone.')) {
        localStorage.removeItem('sentAlertHistory');
        renderAlertsHistory();

        // Show feedback
        const msg = '✅ All alerts cleared successfully!';
        if (elements.sendAlertBtn) {
          elements.sendAlertBtn.dataset.alertEn = msg;
          elements.sendAlertBtn.dataset.alertHi = msg;
          showNotification();
        }
      }
    });
  }
}

function renderAlertsHistory() {
  const list = document.getElementById('alerts-list');
  if (!list) return;

  const history = JSON.parse(localStorage.getItem('sentAlertHistory') || '[]');

  if (history.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">No alerts sent yet.</div>';
    return;
  }

  list.innerHTML = history.map(item => {
    let icon = '📢';
    let title = 'Alert';
    let className = 'weather-alert'; // default style

    if (item.risk === 'heatwave') {
      icon = '☀️';
      title = 'Heatwave Alert';
      className = 'hazard-alert';
    } else if (item.risk === 'flood') {
      icon = '🌊';
      title = 'Flood Warning';
      className = 'weather-alert';
    } else if (item.risk === 'drought') {
      icon = '🍂';
      title = 'Drought Alert';
      className = 'urban-alert';
    }

    // Format time
    const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(item.time).toLocaleDateString();

    return `
      <div class="alert-item ${className}" style="border-left: 4px solid #E74C3C;">
        <div class="alert-icon" style="font-size: 1.5rem;">${icon}</div>
        <div class="alert-content">
          <h4 style="margin: 0 0 0.2rem 0; color: #333;">${title}</h4>
          <p style="margin: 0; font-size: 0.9rem; color: #555;">To: <strong>${item.user || 'Unknown'}</strong> (${item.phone || 'N/A'})</p>
          <div style="font-size: 0.8rem; color: #777; margin-top: 0.2rem;">${item.details}</div>
          <span class="alert-time" style="font-size: 0.75rem; color: #999;">${dateStr} ${timeStr}</span>
        </div>
      </div>
      `;
  }).join('');
}

function filterAlerts(type) {
  const alerts = document.querySelectorAll('.alert-item');
  alerts.forEach(alert => {
    if (type === 'all') {
      alert.style.display = 'flex';
    } else {
      if (alert.classList.contains(type + '-alert')) {
        alert.style.display = 'flex';
      } else {
        alert.style.display = 'none';
      }
    }
  });
}

// --- INITIALIZATION ---
// Main dashboard initialization function (called from index.html)
async function initializeDashboard() {
  if (!loadUserSession()) return; // Redirect if no session

  initializeElements();
  initializeTheme();
  initializeEventListeners();
  initializeNavigation();
  showLoadingAnimation();

  // FORCE CLEAR CACHE for debugging
  localStorage.removeItem('agriurban_weather_forecast');
  console.log('🧹 Cleared weather forecast cache to ensure fresh data.');

  // Inject CSS for scrollable forecast container
  const style = document.createElement('style');
  style.textContent = `
    #forecast-data {
      max-height: 500px;
      overflow-y: auto;
      padding-right: 5px;
    }
    #forecast-data::-webkit-scrollbar {
      width: 6px;
    }
    #forecast-data::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.05);
    }
    #forecast-data::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.2);
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);

  try {
    // 1. Get Current Weather First (Real-time source of truth)
    const currentWeather = await updateCurrentWeather();

    // 2. Load Forecast Data (AI or Default)
    await loadWeatherData();

    // 3. Sync Forecast with Current Weather
    // This ensures "Today" matches current conditions and adjusts future trend if needed
    console.log('🔍 Debug: Checking for sync...', { currentWeather, weatherDataLength: weatherData.length });

    if (currentWeather && weatherData.length > 0) {
      console.log("✅ Syncing forecast with current weather...");

      const oldTemp = weatherData[0].temp;
      const newTemp = currentWeather.temp;
      const tempDelta = newTemp - oldTemp;

      // Update "Today" to match Current Conditions exactly
      weatherData[0].temp = currentWeather.temp;
      weatherData[0].humidity = currentWeather.humidity;
      weatherData[0].wind = currentWeather.wind_speed;

      // Format condition string
      weatherData[0].condition = currentWeather.description
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      // Map Icon
      const iconMap = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️', 'Smoke': '🌫️'
      };
      weatherData[0].icon = iconMap[currentWeather.main] || '🌤️';

      // If there's a significant difference, shift the future forecast baseline
      // This satisfies the requirement to "predict future using current condition"
      if (Math.abs(tempDelta) > 0) {
        console.log(`Adjusting forecast baseline by ${tempDelta}°C based on current conditions`);
        for (let i = 1; i < weatherData.length; i++) {
          weatherData[i].temp = Math.round(weatherData[i].temp + tempDelta);
        }
      }
    }

    setTimeout(() => {
      hideLoadingAnimation();
      updateUserDisplay();
      // checkAndPromptUserDetails(); // Removed popup as per request
      enforceRoleInterface(); // Enforce role-based UI limitations
      populateForecast();
      updateDashboard();
      updateLocationInfo();
      // updateCurrentWeather(); // Already called above
      initMap();
      initChart();

      // Initialize GPS location feature after map is ready
      setTimeout(() => {
        if (typeof initGPSLocation === 'function') {
          initGPSLocation();
        }
      }, 500);

      initializeAnimations();
      initializeNotifications();
      startRealTimeUpdates();
    }, 1000);
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    // Fallback to continue with default data
    setTimeout(() => {
      hideLoadingAnimation();
      updateUserDisplay();
      // checkAndPromptUserDetails(); // Removed popup as per request
      populateForecast();
      updateDashboard();
      initMap();
      initChart();

      // Initialize GPS location feature after map is ready
      setTimeout(() => {
        if (typeof initGPSLocation === 'function') {
          initGPSLocation();
        }
      }, 500);

      initializeAnimations();
      initializeNotifications();
      startRealTimeUpdates();
    }, 1000);
  }
}

// --- NAVIGATION INITIALIZATION ---
// --- NAVIGATION INITIALIZATION ---
function initializeNavigation() {
  // Add click handlers to navbar links
  document.querySelectorAll('.nav-menu .nav-item').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        const sectionId = href.substring(1);
        switchSection(sectionId);
      }
    });
  });

  // Set initial active state
  switchSection('dashboard');
}

// Auto-initialize if this script is loaded directly (for backward compatibility)
document.addEventListener('DOMContentLoaded', () => {
  // Only auto-initialize if we're on the dashboard page directly
  if (window.location.pathname.includes('AiUrbanDashBoard.html')) {
    initializeDashboard();
  }
});

// Initialize DOM elements
function initializeElements() {
  elements.farmerBtn = document.getElementById('farmer-view-btn');
  elements.urbanBtn = document.getElementById('urban-view-btn');
  elements.adminBtn = document.getElementById('admin-view-btn');
  elements.contextLabel = document.getElementById('context-label');
  elements.contextCard = document.getElementById('context-card');
  elements.forecastContainer = document.getElementById('forecast-data');
  elements.riskLevelEl = document.getElementById('risk-level');
  elements.recTextEl = document.getElementById('recommendation-text');
  elements.sendAlertBtn = document.getElementById('send-alert-btn');
  elements.modalOverlay = document.getElementById('modal-overlay');
  elements.notificationBody = document.getElementById('notification-body');
  elements.langToggleBtn = document.getElementById('lang-toggle-btn');
  elements.loadingSpinner = document.getElementById('loading-spinner');
  elements.themeToggle = document.getElementById('theme-toggle');
  elements.userRoleDisplay = document.getElementById('user-role-display');
  elements.userNameDisplay = document.getElementById('user-name-display');
}

// --- THEME MANAGEMENT ---
function initializeTheme() {
  const savedTheme = currentUser?.theme || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', newTheme);
  if (currentUser) {
    currentUser.theme = newTheme;
  }
  updateThemeIcon(newTheme);

  // Add smooth transition effect
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggle?.querySelector('i');
  if (icon) {
    if (theme === 'dark') {
      icon.className = 'ph ph-sun';
    } else {
      icon.className = 'ph ph-moon';
    }
  }
}

// --- USER DISPLAY ---
function updateUserDisplay() {
  if (!currentUser) return;

  const role = currentUser.role || 'User';
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  const nameDisplay = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');

  if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = roleDisplay;
  if (elements.userNameDisplay) elements.userNameDisplay.textContent = nameDisplay;
}

// --- ENFORCE ROLE INTERFACE ---
function enforceRoleInterface() {
  if (!currentUser) return;

  const role = currentUser.role || 'farmer';
  const farmerBtn = elements.farmerBtn;
  const urbanBtn = elements.urbanBtn;
  const adminBtn = elements.adminBtn;
  const tabsContainer = farmerBtn ? farmerBtn.parentElement : null;
  const viewSelectGroup = tabsContainer ? tabsContainer.closest('.control-group') : null;

  // Show all tabs for Admin and Demo
  if (role === 'admin' || role === 'demo') {
    if (viewSelectGroup) viewSelectGroup.style.display = 'block';
    if (tabsContainer) tabsContainer.style.display = 'flex';
    if (adminBtn) adminBtn.style.display = 'inline-flex';

    // Hide City Planner button for Admin (as requested)
    if (role === 'admin' && urbanBtn) {
      urbanBtn.style.display = 'none';
    } else if (role === 'demo' && urbanBtn) {
      // Ensure it's visible for demo
      urbanBtn.style.display = 'inline-flex';
    }

    return;
  }

  // Hide Admin button for others
  if (adminBtn) adminBtn.style.display = 'none';

  // For specific roles, hide the tabs AND the label to lock the interface
  if (viewSelectGroup) {
    viewSelectGroup.style.display = 'none';
  } else if (tabsContainer) {
    // Fallback if structure changes
    tabsContainer.style.display = 'none';
  }

  // Hide Alert Button for Farmers and City Planners
  const sendAlertBtn = elements.sendAlertBtn;
  if (sendAlertBtn) {
    if (role === 'farmer' || role === 'urban' || role === 'city_planner') {
      sendAlertBtn.style.display = 'none';
    } else {
      sendAlertBtn.style.display = 'inline-flex';
    }
  }

  // Ensure the current view matches the role (double check)
  if (role === 'farmer') {
    currentView = 'farmer';
    // Manually trigger click-like state if needed, but updateDashboard uses currentView
  } else if (role === 'urban' || role === 'city_planner') {
    currentView = 'urban';
  }
}

// --- LOADING ANIMATIONS ---
function showLoadingAnimation() {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = 'block';
  }
}

function hideLoadingAnimation() {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = 'none';
  }
}

// --- ENHANCED RECOMMENDATION SYSTEM ---
function getFarmerRecommendation() {

  const cropType = 'Wheat';
  const rainChance = weatherData.find(d => d.day === "Friday").rain_chance;
  const humidity = weatherData.find(d => d.day === "Friday").humidity;

  let risk = 'Low';
  let recommendation = '';
  let alertMessageEn = '';
  let alertMessageHi = '';
  let actions = [];

  if (rainChance >= 40) {
    risk = 'High';
    recommendation = `⚠️ Critical Alert: ${rainChance}% chance of thunderstorms on Friday. High risk of waterlogging for ${cropType} crop.`;
    alertMessageEn = `<strong>🚨 URGENT ACTION REQUIRED:</strong><br>
      • Postpone irrigation immediately<br>
      • Expected rainfall: 15-20mm<br>
      • Check drainage systems<br>
      • Harvest ready crops if possible<br>
      • Monitor weather updates every 3 hours`;
    alertMessageHi = `<strong>🚨 तत्काल कार्रवाई आवश्यक:</strong><br>
      • सिंचाई तुरंत स्थगित करें<br>
      • अपेक्षित वर्षा: 15-20mm<br>
      • जल निकासी प्रणाली की जांच करें<br>
      • यदि संभव हो तो तैयार फसल काटें<br>
      • हर 3 घंटे मौसम अपडेट देखें`;
    actions = ['Stop Irrigation', 'Check Drainage', 'Monitor Closely'];
  } else if (rainChance >= 20) {
    risk = 'Medium';
    recommendation = `⚡ Moderate Alert: ${rainChance}% rain chance. Monitor conditions closely.`;
    alertMessageEn = `<strong>⚡ MODERATE RISK:</strong><br>
      • Reduce irrigation by 50%<br>
      • Monitor field conditions daily<br>
      • Prepare drainage channels`;
    alertMessageHi = `<strong>⚡ मध्यम जोखिम:</strong><br>
      • सिंचाई 50% कम करें<br>
      • खेत की स्थिति की दैनिक जांच करें<br>
      • जल निकासी चैनल तैयार करें`;
    actions = ['Reduce Irrigation', 'Daily Monitoring'];
  } else {
    risk = 'Low';
    recommendation = `✅ Optimal Conditions: Minimal rain expected. ${cropType} crop in excellent condition.`;
    alertMessageEn = `<strong>✅ STABLE CONDITIONS:</strong><br>
      • Continue normal irrigation schedule<br>
      • Next irrigation in 3 days<br>
      • Apply fertilizer as planned<br>
      • Expected yield: Above average`;
    alertMessageHi = `<strong>✅ स्थिर स्थिति:</strong><br>
      • सामान्य सिंचाई जारी रखें<br>
      • अगली सिंचाई 3 दिनों में<br>
      • योजना अनुसार उर्वरक डालें<br>
      • अपेक्षित उपज: औसत से अधिक`;
    actions = ['Continue Normal Operations'];
  }

  return { risk, recommendation, alertMessageEn, alertMessageHi, actions };
}

function getUrbanRecommendation() {
  const rainChance = weatherData.find(d => d.day === "Friday").rain_chance;
  const wind = weatherData.find(d => d.day === "Friday").wind;

  let risk = 'Low';
  let recommendation = '';
  let alertMessageEn = '';
  let alertMessageHi = '';
  let actions = [];

  if (rainChance >= 40 && wind > 15) {
    risk = 'Warning';
    recommendation = `⚠️ Urban Flood Warning: ${rainChance}% thunderstorm probability with ${wind} km/h winds. Multiple areas at risk.`;
    alertMessageEn = `<strong>🚨 FLOOD & STORM ALERT:</strong><br>
      • Sector 18 Underpass - HIGH RISK<br>
      • Deploy emergency pumps by 6 AM<br>
      • Traffic diversions ready<br>
      • Emergency hotline: 1800-XXX-XXXX<br>
      • Schools may close - await confirmation`;
    alertMessageHi = `<strong>🚨 बाढ़ और तूफान चेतावनी:</strong><br>
      • सेक्टर 18 अंडरपास - उच्च जोखिम<br>
      • सुबह 6 बजे तक आपातकालीन पंप तैनात करें<br>
      • यातायात मार्ग परिवर्तन तैयार<br>
      • आपातकालीन हॉटलाइन: 1800-XXX-XXXX<br>
      • स्कूल बंद हो सकते हैं - पुष्टि की प्रतीक्षा करें`;
    actions = ['Deploy Pumps', 'Traffic Management', 'Public Alert'];
  } else if (rainChance >= 20) {
    risk = 'Moderate';
    recommendation = `⚡ Moderate Urban Risk: ${rainChance}% rain chance. Standard precautions advised.`;
    alertMessageEn = `<strong>⚡ MODERATE ALERT:</strong><br>
      • Check storm drains<br>
      • Monitor low-lying areas<br>
      • Keep emergency teams on standby`;
    alertMessageHi = `<strong>⚡ मध्यम चेतावनी:</strong><br>
      • तूफान नालियों की जांच करें<br>
      • निचले इलाकों की निगरानी करें<br>
      • आपातकालीन टीमों को तैयार रखें`;
    actions = ['Routine Checks', 'Standby Mode'];
  } else {
    risk = 'Normal';
    recommendation = `✅ City Operations Normal: Clear weather expected. All systems operational. Air Quality: Good (AQI: 85)`;
    alertMessageEn = `<strong>✅ NORMAL OPERATIONS:</strong><br>
      • All systems functioning normally<br>
      • No weather alerts<br>
      • Traffic flow optimal<br>
      • Air quality: Good<br>
      • Public services: Regular schedule`;
    alertMessageHi = `<strong>✅ सामान्य संचालन:</strong><br>
      • सभी सिस्टम सामान्य रूप से कार्यरत<br>
      • कोई मौसम चेतावनी नहीं<br>
      • यातायात प्रवाह इष्टतम<br>
      • वायु गुणवत्ता: अच्छी<br>
      • सार्वजनिक सेवाएं: नियमित कार्यक्रम`;
    actions = ['Regular Monitoring'];
  }

  return { risk, recommendation, alertMessageEn, alertMessageHi, actions };
}

function getAdminRecommendation() {
  // Aggregate data for Admin View
  const maxRain = Math.max(...weatherData.map(d => d.rain_chance));
  const maxTemp = Math.max(...weatherData.map(d => d.temp));

  let risk = 'Normal';
  let recommendation = '';
  let alertMessageEn = '';
  let alertMessageHi = '';
  let actions = [];

  if (maxRain > 50 || maxTemp > 45) {
    risk = 'High';
    recommendation = `🚨 System Alert: severe weather events detected across multiple zones. Coordinate response teams immediately.`;
    alertMessageEn = `<strong>🚨 SYSTEM-WIDE EMERGENCY:</strong><br>
      • Activate Central Command<br>
      • Deploy all available units<br>
      • Coordinate with State Disaster Force`;
    alertMessageHi = `<strong>🚨 प्रणाली-व्यापी आपातकाल:</strong><br>
      • सेंट्रल कमांड सक्रिय करें<br>
      • सभी उपलब्ध इकाइयों को तैनात करें<br>
      • राज्य आपदा बल के साथ समन्वय करें`;
    actions = ['Activate Central Command', 'Deploy All Units'];
  } else if (maxRain > 30 || maxTemp > 40) {
    risk = 'Moderate';
    recommendation = `⚡ Advisory: Elevated risk levels in 3 zones. Allocate additional resources to Sector 18 and Rural Belt.`;
    alertMessageEn = `<strong>⚡ SYSTEM ADVISORY:</strong><br>
      • Increase monitoring freq<br>
      • Pre-position pumps in low-lying areas<br>
      • Notify district heads`;
    alertMessageHi = `<strong>⚡ प्रणाली सलाह:</strong><br>
      • निगरानी आवृत्ति बढ़ाएं<br>
      • निचले इलाकों में पंप तैनात करें<br>
      • जिला प्रमुखों को सूचित करें`;
    actions = ['Increase Monitoring', 'Pre-position Resources'];
  } else {
    risk = 'Normal';
    recommendation = `✅ System Nominal: All zones operating within safety parameters. 98% uptime on all sensors.`;
    alertMessageEn = `<strong>✅ SYSTEM NOMINAL:</strong><br>
      • All sensors active<br>
      • Data streams stable<br>
      • No active threats`;
    alertMessageHi = `<strong>✅ प्रणाली सामान्य:</strong><br>
      • सभी सेंसर सक्रिय<br>
      • डेटा स्ट्रीम स्थिर<br>
      • कोई सक्रिय खतरा नहीं`;
    actions = ['System Inspection', 'Data Backup'];
  }

  return { risk, recommendation, alertMessageEn, alertMessageHi, actions };
}

// --- ENHANCED DASHBOARD UPDATE ---
function updateDashboard() {
  if (isAnimating) return;
  isAnimating = true;

  let result;
  if (currentView === 'farmer') {
    result = getFarmerRecommendation();
    animateContextUpdate('farmer');
  } else if (currentView === 'urban') {
    result = getUrbanRecommendation();
    animateContextUpdate('urban');
  } else {
    result = getAdminRecommendation();
    animateContextUpdate('admin');
  }

  // Update risk level with animation
  updateRiskLevel(result.risk);

  // Update recommendation with fade effect
  updateRecommendation(result.recommendation);

  // Update action buttons
  updateActionButtons(result.actions);

  // Store alert messages
  if (elements.sendAlertBtn) {
    elements.sendAlertBtn.dataset.alertEn = result.alertMessageEn;
    elements.sendAlertBtn.dataset.alertHi = result.alertMessageHi;
  }

  // Update chart
  updateChart(currentView);

  setTimeout(() => {
    isAnimating = false;
  }, 500);
}

async function updateLocationInfo() {
  const locationCard = document.querySelector('.location-card');
  if (!locationCard) return;

  // Use dynamic coordinates if available, otherwise default to Delhi
  const lat = window.currentCoordinates ? window.currentCoordinates.lat : (map ? map.getCenter().lat : 28.6139);
  const lon = window.currentCoordinates ? window.currentCoordinates.lng : (map ? map.getCenter().lng : 77.2090);

  // Show loading state
  locationCard.innerHTML = `
    <div style="text-align: center; padding: 1rem; color: #666;">
      <i class="ph-spinner ph-spin"></i> Updating location details...
    </div>
  `;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AgriUrbanAI/1.0' }
    });

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    const address = data.address || {};

    // Extract most relevant details
    const city = address.city || address.town || address.village || address.municipality || 'Unknown';
    const district = address.state_district || address.county || city;
    const state = address.state || '';
    const postcode = address.postcode || '';

    locationCard.innerHTML = `
      <p><span>District:</span> <strong>${district}</strong></p>
      <p><span>City:</span> <strong>${city}</strong></p>
      <p><span>State:</span> <strong>${state}</strong></p>
      ${postcode ? `<p><span>Pincode:</span> <strong>${postcode}</strong></p>` : ''}
    `;

    // Update user context if available
    if (currentUser) {
      currentUser.location = city;
      // Don't save to localStorage constantly to avoid overwriting user preferences too aggressively, 
      // but updating the in-memory user object helps other components.
    }

  } catch (error) {
    console.error('Error fetching location details:', error);
    // Fallback to coordinates if name lookup fails
    locationCard.innerHTML = `
      <p><span>Lat:</span> <strong>${lat.toFixed(4)}</strong></p>
      <p><span>Lng:</span> <strong>${lon.toFixed(4)}</strong></p>
      <p><span>Status:</span> <strong>Location Detected</strong></p>
    `;
  }
}

function animateContextUpdate(view) {
  if (!elements.contextCard) return;

  elements.contextCard.style.opacity = '0';


  // Refresh user data reference
  const user = JSON.parse(localStorage.getItem('user')) || currentUser;
  const farmerData = locationData[currentView] || locationData['farmer'];

  setTimeout(() => {
    if (currentView === 'farmer') {
      elements.contextLabel.innerHTML = '<i class="ph-user"></i> Farmer Details';

      const cropDisplay = user.crop || farmerData.cropType;
      const irrigationDisplay = user.lastIrrigation || farmerData.lastIrrigation;
      const fertilizerDisplay = user.fertilizer || farmerData.fertilizer;
      const nameDisplay = user.name || farmerData.farmName;

      elements.contextCard.innerHTML = `
         <p><span>Name:</span> <strong>${nameDisplay}</strong></p>
         <p><span>Crop:</span> <strong>${cropDisplay}</strong></p>
         <p><span>Last Irrigation:</span> <strong>${irrigationDisplay}</strong></p>
         <p><span>Fertilizer Applied:</span> <strong>${fertilizerDisplay}</strong></p>
       `;
    } else if (currentView === 'urban') {
      if (elements.contextLabel) elements.contextLabel.innerHTML = '🏙️ Urban Zone Details';
      elements.contextCard.innerHTML = `
         <p><span>Name:</span> <strong>${currentUser?.name || currentUser?.role || 'User'}</strong></p>
         <p><span>City:</span> <strong>${currentUser?.location || 'New Delhi'}</strong></p>
         <p><span>High-Risk Zone:</span> <strong style="color: #E74C3C;">${farmerData.zoneName}</strong></p>
         <p><span>Drainage:</span> <strong style="color: #2ECC71;">${farmerData.drainage}</strong></p>
         <p><span>Population:</span> <strong>${farmerData.population}</strong></p>
         <p><span>Emergency Units:</span> <strong>${farmerData.emergencyUnits}</strong></p>
         <p><span>Last Incident:</span> <strong>${farmerData.lastIncident}</strong></p>
       `;
    } else {
      // Admin View
      if (elements.contextLabel) elements.contextLabel.innerHTML = '🛡️ Admin Control Panel';
      const adminData = locationData['admin'];
      elements.contextCard.innerHTML = `
         <p><span>Role:</span> <strong>System Administrator</strong></p>
         <p><span>Region:</span> <strong>${adminData.region}</strong></p>
         <p><span>Active Sensors:</span> <strong style="color: #2ECC71;">1,024</strong></p>
         <p><span>Server Status:</span> <strong style="color: #2ECC71;">Online (12ms)</strong></p>
         <p><span>Active Alerts:</span> <strong style="color: ${adminData.floodRisk === 'Medium' ? '#F39C12' : '#E74C3C'};">3 Moderate</strong></p>
         <p><span>Emergency Units:</span> <strong>${adminData.emergencyUnits}</strong></p>
       `;
    }
    elements.contextCard.style.opacity = '1';
  }, 300);
}

function updateRiskLevel(risk) {
  if (!elements.riskLevelEl) return;

  elements.riskLevelEl.style.transform = 'scale(0)';

  setTimeout(() => {
    elements.riskLevelEl.textContent = risk.toUpperCase();
    elements.riskLevelEl.className = '';

    if (risk === 'High') {
      elements.riskLevelEl.classList.add('risk-high');
    } else if (risk === 'Warning' || risk === 'Moderate') {
      elements.riskLevelEl.classList.add('risk-warning');
    } else if (risk === 'Normal' || risk === 'Medium') {
      elements.riskLevelEl.classList.add('risk-medium');
    } else {
      elements.riskLevelEl.classList.add('risk-low');
    }

    elements.riskLevelEl.style.transform = 'scale(1)';

    // Update map circle
    updateRiskCircle(risk);
  }, 200);
}

function updateRiskCircle(risk) {
  if (typeof map === 'undefined' || !map) return;

  // Remove existing circle
  if (riskCircle) {
    map.removeLayer(riskCircle);
  }

  // Use current map center instead of hardcoded Delhi coordinates
  const coords = map.getCenter();
  let color = '#2ECC71'; // Default Low (Green)
  let radius = 1000; // Meters

  if (risk === 'High') {
    color = '#E74C3C'; // Red
    radius = 3000;
  } else if (risk === 'Warning' || risk === 'Moderate' || risk === 'Medium') {
    color = '#F39C12'; // Orange
    radius = 2000;
  } else {
    color = '#2ECC71'; // Green
    radius = 1000;
  }

  riskCircle = L.circle(coords, {
    color: color,
    fillColor: color,
    fillOpacity: 0.2,
    radius: radius
  }).addTo(map);
}

function updateRecommendation(text) {
  if (!elements.recTextEl) return;

  elements.recTextEl.style.opacity = '0';

  setTimeout(() => {
    elements.recTextEl.innerHTML = text;
    elements.recTextEl.style.opacity = '1';
  }, 300);
}

function updateActionButtons(actions) {
  // This could be extended to show action buttons based on recommendations
  console.log('Recommended actions:', actions);
}

// --- ANALYTICS UPDATE HELPER ---
function updateAnalyticsUI(type, riskLevel) {
  const valueId = `analytics-${type}-value`;
  const barId = `analytics-${type}-bar`;
  const valueEl = document.getElementById(valueId);
  const barEl = document.getElementById(barId);

  if (!valueEl || !barEl) return;

  let percentage = 15;
  let className = 'low';

  if (riskLevel === 'High') {
    percentage = 85;
    className = 'high';
  } else if (riskLevel === 'Medium') {
    percentage = 50;
    className = 'medium';
  } else {
    percentage = 15;
    className = 'low';
  }

  valueEl.textContent = `${riskLevel}`;
  valueEl.className = `risk-value ${className}`;

  barEl.style.width = `${percentage}%`;
  barEl.className = `progress ${className}`;
}

// --- ENHANCED FORECAST DISPLAY ---
function populateForecast() {
  if (!elements.forecastContainer) return;

  elements.forecastContainer.innerHTML = weatherData.map((day, index) => {
    const riskClass = day.rain_chance > 30 ? 'high-risk' : day.rain_chance > 15 ? 'medium-risk' : 'low-risk';

    return `
      <div class="forecast-card ${riskClass}" style="animation-delay: ${index * 0.1}s">
        <div class="forecast-left">
          <div class="forecast-day">${day.day}</div>
          <div class="forecast-condition">${day.condition}</div>
          <div class="forecast-details">
            💧 ${day.rain_chance}% | 💨 ${day.wind}km/h
          </div>
        </div>
        <div class="forecast-icon">${day.icon}</div>
        <div class="forecast-right">
          <div class="forecast-temp">${day.temp}°C</div>
          <div class="forecast-humidity">💦 ${day.humidity}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// --- CHART.JS IMPLEMENTATION ---
function initChart() {
  const ctx = document.getElementById('analytics-chart');
  if (!ctx) return;

  analyticsChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: weatherData.map(d => d.day.substring(0, 3)),
      datasets: [{
        label: 'Temperature (°C)',
        data: weatherData.map(d => d.temp),
        borderColor: '#E74C3C',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }, {
        label: 'Rain Prediction (%)',
        data: weatherData.map(d => d.rain_chance),
        borderColor: '#3498DB',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 10,
            font: { size: 10 },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12 },
          bodyFont: { size: 11 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)',
            drawBorder: false
          },
          ticks: {
            font: { size: 10 },
            color: '#666'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 10 },
            color: '#666'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

function updateChart(view) {
  if (!analyticsChart) return;

  // Ensure we have two datasets
  if (analyticsChart.data.datasets.length < 2) {
    analyticsChart.data.datasets.push({});
  }

  analyticsChart.data.datasets[0].label = 'Temperature (°C)';
  analyticsChart.data.datasets[0].data = weatherData.map(d => d.temp);
  analyticsChart.data.datasets[0].borderColor = '#E74C3C';
  analyticsChart.data.datasets[0].backgroundColor = 'rgba(231, 76, 60, 0.1)';

  analyticsChart.data.datasets[1].label = 'Rain Prediction (%)';
  analyticsChart.data.datasets[1].data = weatherData.map(d => d.rain_chance);
  analyticsChart.data.datasets[1].borderColor = '#3498DB';
  analyticsChart.data.datasets[1].backgroundColor = 'rgba(52, 152, 219, 0.1)';

  analyticsChart.update();
}

// --- ENHANCED MAP FUNCTIONALITY (FIXED) ---
function initMap() {
  if (mapInitialized) return;

  console.log('Initializing map...');
  const mapContainer = document.getElementById('map');

  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  // Clear any existing content and set up container
  mapContainer.innerHTML = `
      <div class="map-loading" id="map-loading">
        <div class="map-spinner"></div>
        <span>Loading Map...</span>
      </div>
      <div class="map-controls">
        <div class="map-control-btn" onclick="zoomIn()">
          <i class="ph-plus"></i>
        </div>
        <div class="map-control-btn" onclick="zoomOut()">
          <i class="ph-minus"></i>
        </div>
        <div class="map-control-btn" onclick="resetView()">
          <i class="ph-house"></i>
        </div>
      </div>
    `;

  // Ensure container has proper dimensions
  mapContainer.style.width = '100%';
  mapContainer.style.height = '400px';
  mapContainer.style.position = 'relative';
  mapContainer.style.borderRadius = '12px';
  mapContainer.style.overflow = 'hidden';
  mapContainer.style.zIndex = '1';

  const mapUserData = locationData[currentUser?.role] || locationData.farmer;

  // Wait a moment for DOM to be ready
  setTimeout(() => {
    try {
      // Initialize map with explicit options
      map = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: true,
        center: mapUserData.coordinates,
        zoom: 12,
        minZoom: 8,
        maxZoom: 18,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
        preferCanvas: false,
        renderer: L.svg()
      });

      console.log('Map initialized successfully at coordinates:', mapUserData.coordinates);
      mapInitialized = true;
      window.map = map; // Expose map globally for GPS module

      // Add tile layer with multiple fallbacks
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaGyPSJtaWRkbGUiIGR5PSIwLjM1ZW0iPk1hcCBUaWxlPC90ZXh0Pjwvc3ZnPg=='
      });

      tileLayer.on('tileerror', function (e) {
        console.warn('Tile loading error:', e);
      });

      tileLayer.on('tileload', function () {
        console.log('Tiles loading...');
      });

      tileLayer.addTo(map);

      // Create custom icons using CSS classes
      const farmIcon = L.divIcon({
        html: `<div class="map-marker farm-marker">
                  <div class="marker-inner">🌾</div>
                  <div class="marker-pulse"></div>
                </div>`,
        iconSize: [40, 40],
        className: 'custom-div-icon'
      });

      const urbanIcon = L.divIcon({
        html: `<div class="map-marker urban-marker">
                  <div class="marker-inner">🏢</div>
                  <div class="marker-pulse"></div>
                </div>`,
        iconSize: [40, 40],
        className: 'custom-div-icon'
      });

      // Clear existing markers
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];

      /* REMOVED: Pre-defined farm and urban markers
      // Add interactive markers based on user role
      if (currentUser?.role === 'farmer' || currentUser?.role === 'demo' || !currentUser) {
        const farmCoords = mapUserData.farmLocation || mapUserData.demoLocation || [28.52, 77.52];
        const farmMarker = L.marker(farmCoords, { icon: farmIcon })
          .addTo(map)
          .bindPopup(createFarmPopup(), {
            maxWidth: 300,
            className: 'custom-popup'
          });
        markers.push(farmMarker);
      }
 
      if (currentUser?.role === 'urban' || currentUser?.role === 'admin') {
        const urbanCoords = mapUserData.urbanLocation || mapUserData.adminLocation || [28.568, 77.325];
        const urbanMarker = L.marker(urbanCoords, { icon: urbanIcon })
          .addTo(map)
          .bindPopup(createUrbanPopup(), {
            maxWidth: 300,
            className: 'custom-popup'
          });
        markers.push(urbanMarker);
      }
      */

      // Add risk zones
      // addRiskZones(); // Commented out - removed pre-defined zones

      // Add click animation to markers
      markers.forEach(marker => {
        marker.on('click', function () {
          animateMarkerClick(this);
        });
      });

      // Hide loading indicator
      const loadingIndicator = document.getElementById('map-loading');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        console.log('Loading indicator hidden');
      }

      // More robust map resizing with multiple fallback strategies
      const dashboardPanel = document.querySelector('.dashboard-panel');
      if (dashboardPanel) {
        // This listener will trigger once the entry animation is complete.
        dashboardPanel.addEventListener('animationend', () => {
          if (map) {
            map.invalidateSize(true); // pass true to animate the resize
            console.log('Map size invalidated on animation end.');
          }
        }, { once: true }); // Use 'once' so it only fires a single time.
      }

      // Multiple fallback strategies for map resizing
      const resizeAttempts = [100, 300, 500, 1000];
      resizeAttempts.forEach((delay, index) => {
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
            console.log(`Map resize attempt ${index + 1} at ${delay}ms`);
          }
        }, delay);
      });

      // Handle window resize
      const resizeHandler = () => {
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      };

      window.addEventListener('resize', resizeHandler);

      // Set view to show all markers
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      // Show error message
      const loadingIndicator = document.getElementById('map-loading');
      if (loadingIndicator) {
        loadingIndicator.innerHTML = '<div style="color: #e74c3c; font-weight: 600;">Map failed to load</div><div style="font-size: 0.8rem; margin-top: 0.5rem;">Please refresh the page</div>';
      }
    }
  }, 100);
}

function createFarmPopup() {
  const userData = locationData[currentUser?.role] || locationData.farmer;
  return `
     <div class="popup-content">
       <h3>🌾 ${userData.farmName || 'Farm Location'}</h3>
       <div class="popup-stats">
         <div class="stat-item">
           <span class="stat-label">Crop Health:</span>
           <span class="stat-value" style="color: #2ECC71;">Excellent</span>
         </div>
         <div class="stat-item">
           <span class="stat-label">Area:</span>
           <span class="stat-value">${userData.fieldArea}</span>
         </div>
         <div class="stat-item">
           <span class="stat-label">Expected Yield:</span>
           <span class="stat-value">${userData.expectedYield}</span>
         </div>
       </div>
       <button class="popup-btn" onclick="showDetailedAnalytics('farm')">
         View Detailed Analytics
       </button>
     </div>
   `;
}

function createUrbanPopup() {
  const userData = locationData[currentUser?.role] || locationData.urban;
  return `
     <div class="popup-content">
       <h3>🏢 ${userData.zoneName || 'Urban Zone'}</h3>
       <div class="popup-stats">
         <div class="stat-item">
           <span class="stat-label">Flood Risk:</span>
           <span class="stat-value" style="color: ${userData.floodRisk === 'High' ? '#E74C3C' : userData.floodRisk === 'Medium' ? '#F39C12' : '#2ECC71'};">${userData.floodRisk}</span>
         </div>
         <div class="stat-item">
           <span class="stat-label">Drainage:</span>
           <span class="stat-value" style="color: #2ECC71;">${userData.drainage}</span>
         </div>
         <div class="stat-item">
           <span class="stat-label">Population:</span>
           <span class="stat-value">${userData.population}</span>
         </div>
         <div class="stat-item">
           <span class="stat-label">Emergency Units:</span>
           <span class="stat-value">${userData.emergencyUnits}</span>
         </div>
       </div>
       <button class="popup-btn" onclick="showDetailedAnalytics('urban')">
         View Traffic & Infrastructure
       </button>
     </div>
   `;
}

/* REMOVED: Pre-defined risk zones
function addRiskZones() {
  if (!map) return;
 
  try {
    // High risk flood zone
    L.circle([28.568, 77.325], {
      color: '#E74C3C',
      fillColor: '#E74C3C',
      fillOpacity: 0.15,
      radius: 800,
      weight: 2,
      dashArray: '5, 10'
    }).addTo(map).bindTooltip('High Risk Flood Zone', {
      permanent: false,
      direction: 'center'
    });
 
    // Medium risk zone
    L.circle([28.55, 77.35], {
      color: '#F39C12',
      fillColor: '#F39C12',
      fillOpacity: 0.1,
      radius: 600,
      weight: 2,
      dashArray: '5, 10'
    }).addTo(map).bindTooltip('Medium Risk Zone', {
      permanent: false,
      direction: 'center'
    });
 
    // Agricultural zone
    L.polygon([
      [28.51, 77.51],
      [28.53, 77.51],
      [28.53, 77.53],
      [28.51, 77.53]
    ], {
      color: '#2ECC71',
      fillColor: '#2ECC71',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(map).bindTooltip('Agricultural Zone', {
      permanent: false,
      direction: 'center'
    });
 
    console.log('Risk zones added successfully');
  } catch (error) {
    console.error('Error adding risk zones:', error);
  }
}
*/

function animateMarkerClick(marker) {
  const icon = marker.getElement();
  if (icon) {
    icon.style.animation = 'none';
    setTimeout(() => {
      icon.style.animation = 'markerBounce 0.5s ease-out';
    }, 10);
  }
}

// Map control functions
window.zoomIn = function () {
  if (map) map.zoomIn();
};

window.zoomOut = function () {
  if (map) map.zoomOut();
};

window.resetView = function () {
  if (map) {
    const userData = locationData[currentUser?.role] || locationData.farmer;
    map.setView(userData.coordinates, 12);
  }
};

// Custom Location Feature
window.setManualLocation = async function () {
  const input = document.getElementById('manual-location-input');
  const query = input ? input.value.trim() : '';

  if (!query) {
    alert("Please enter a city name or coordinates.");
    return;
  }

  // Check if coordinates
  const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
  const match = query.match(coordRegex);

  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[3]);

    // Update Global State
    window.currentCoordinates = { lat, lng: lon };

    map.setView([lat, lon], 13);
    L.popup()
      .setLatLng([lat, lon])
      .setContent(`📍 Custom Location: ${lat}, ${lon}`)
      .openOn(map);

    // Update Dashboard Information
    updateLocationInfo();
    animateContextUpdate(currentView);

  } else {
    // Geocoding via Nominatim (Free, requires attribution)
    const btn = input.nextElementSibling;
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        // Update Global State
        window.currentCoordinates = { lat, lng: lon };

        map.setView([lat, lon], 13);
        L.popup()
          .setLatLng([lat, lon])
          .setContent(`📍 ${data[0].display_name}`)
          .openOn(map);

        // Update Dashboard Information
        updateLocationInfo();
        animateContextUpdate(currentView);

      } else {
        alert("Location not found. Please try again.");
      }
    } catch (e) {
      console.error("Geocoding error:", e);
      alert("Error finding location. Please try coords (lat, lon).");
    } finally {
      btn.innerHTML = originalIcon;
      btn.disabled = false;
    }
  }
};

// --- EVENT LISTENERS ---
function initializeEventListeners() {
  // View toggle buttons
  elements.farmerBtn?.addEventListener('click', () => {
    if (currentView !== 'farmer') {
      currentView = 'farmer';
      elements.farmerBtn.classList.add('active');
      elements.urbanBtn?.classList.remove('active');
      elements.adminBtn?.classList.remove('active');
      updateDashboard();

      // Animate map focus to user's farm location
      if (map) {
        const userData = locationData[currentUser?.role] || locationData.farmer;
        const farmCoords = userData.farmLocation || userData.demoLocation || [28.52, 77.52];
        map.setView(farmCoords, 13, {
          animate: true,
          duration: 1
        });
      }
    }
  });

  elements.urbanBtn?.addEventListener('click', () => {
    if (currentView !== 'urban') {
      currentView = 'urban';
      elements.urbanBtn.classList.add('active');
      elements.farmerBtn?.classList.remove('active');
      elements.adminBtn?.classList.remove('active');
      updateDashboard();

      // Animate map focus to user's urban location
      if (map) {
        const userData = locationData[currentUser?.role] || locationData.urban;
        const urbanCoords = userData.urbanLocation || userData.adminLocation || [28.568, 77.325];
        map.setView(urbanCoords, 13, {
          animate: true,
          duration: 1
        });
      }
    }
  });

  elements.adminBtn?.addEventListener('click', () => {
    if (currentView !== 'admin') {
      currentView = 'admin';
      elements.adminBtn.classList.add('active');
      elements.farmerBtn?.classList.remove('active');
      elements.urbanBtn?.classList.remove('active');
      updateDashboard();

      // Animate map focus to admin region
      if (map) {
        const userData = locationData['admin'] || locationData.urban;
        const adminCoords = userData.adminLocation || [28.61, 77.23];
        map.setView(adminCoords, 11, {
          animate: true,
          duration: 1
        });
      }
    }
  });

  // Send alert button
  // Send alert button
  // Send alert button
  elements.sendAlertBtn?.addEventListener('click', async () => {
    // Call backend to trigger random alert
    const btnFn = elements.sendAlertBtn;
    const originalText = btnFn.textContent;

    try {
      btnFn.textContent = 'Sending...';
      btnFn.disabled = true;

      // 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${FASTAPI_URL}/alert/trigger_random`, {
        method: 'POST',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from server (not JSON)");
      }

      const result = await response.json();

      if (response.ok) {
        // Create alert object for history
        const recipientPhone = result.sent_to || result.user.phone;
        const alertRecord = {
          risk: result.risk,
          user: result.user.name,
          phone: recipientPhone,
          time: new Date().toISOString(),
          details: `Simulated ${result.risk} alert sent to ${result.user.name}`
        };

        // Save to localStorage
        const history = JSON.parse(localStorage.getItem('sentAlertHistory') || '[]');
        history.unshift(alertRecord); // Add to top
        localStorage.setItem('sentAlertHistory', JSON.stringify(history));

        // Format Advisory HTML
        let recommendationHtml = '';
        if (result.recommendation) {
          recommendationHtml = `<br><br><strong>🚑 Action Plan:</strong><br><em style="color:#d35400;">${result.recommendation}</em>`;
        }

        const statusDetails = result.delivery_error ? `Fail: ${result.delivery_error}` : (result.delivery_status || 'Sent');
        const statusColor = result.status === 'success' ? '#2ecc71' : '#e74c3c';

        // Construct HTML message for modal
        const msg = `🚨 <strong>${result.risk.toUpperCase()} ALERT SENT!</strong><br>
                        User: <strong>${result.user.name}</strong><br>
                        Phone: ${recipientPhone}<br>
                        Status: <span style="color:${statusColor}">${statusDetails.toUpperCase()}</span>${recommendationHtml}`;

        btnFn.dataset.alertEn = msg;
        btnFn.dataset.alertHi = msg;

        showNotification();

        // Refresh list if open
        if (currentSection === 'alerts') {
          renderAlertsHistory();
        }
      } else {
        console.error("Alert trigger failed", result);
        throw new Error(result.error || "Failed to trigger alert");
      }

    } catch (e) {
      console.error("Error triggering alert:", e);

      // Default error message
      let errorMsg = `⚠️ <strong>Alert System Error!</strong><br>${e.message}`;

      if (e.name === 'AbortError') {
        errorMsg = `⚠️ <strong>Request Timed Out!</strong><br>The backend did not respond in time. Please check your connection.`;
      } else if (e.message.includes('Failed to fetch')) {
        errorMsg = `⚠️ <strong>Connection Error!</strong><br>Ensure the backend server (port 8000) is running.`;
      }

      if (elements.sendAlertBtn) {
        elements.sendAlertBtn.dataset.alertEn = errorMsg;
        elements.sendAlertBtn.dataset.alertHi = errorMsg;
        showNotification();
      }
    } finally {
      // ALWAYS reset button
      if (btnFn) {
        btnFn.textContent = originalText;
        btnFn.disabled = false;
      }
    }
  });

  // Modal overlay click
  elements.modalOverlay?.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) {
      hideNotification();
    }
  });

  // Language toggle
  elements.langToggleBtn?.addEventListener('click', () => {
    toggleLanguage();
  });

  // Theme toggle
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modalOverlay?.classList.contains('visible')) {
      hideNotification();
    }
    if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault();
      elements.farmerBtn?.click();
    }
    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      elements.urbanBtn?.click();
    }

    if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Alert Action Buttons
  document.querySelectorAll('.alert-action-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const action = this.textContent.trim();
      alert(`Action "${action}" initiated.`);
    });
  });
}

// --- NOTIFICATION SYSTEM ---
function initializeNotifications() {
  // Check for browser notification support
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification() {
  if (!elements.sendAlertBtn || !elements.notificationBody || !elements.modalOverlay) return;

  currentLang = 'en';
  const alertMsg = elements.sendAlertBtn.dataset.alertEn;

  // Update modal content
  // Determine primary danger
  const dangerDisplay = document.getElementById('danger-type-display');
  const dangerText = document.getElementById('danger-type-text');

  if (floodRisk.level === 'High' || floodRisk.level === 'Medium') {
    if (dangerDisplay && dangerText) {
      dangerDisplay.style.display = 'flex';
      dangerText.textContent = 'Flood Risk';
    }
  } else if (heatwaveRisk.level === 'High' || heatwaveRisk.level === 'Medium') {
    if (dangerDisplay && dangerText) {
      dangerDisplay.style.display = 'flex';
      dangerText.textContent = 'Heatwave Alert';
    }
  } else if (droughtRisk.level === 'High' || droughtRisk.level === 'Medium') {
    if (dangerDisplay && dangerText) {
      dangerDisplay.style.display = 'flex';
      dangerText.textContent = 'Drought Warning';
    }
  } else {
    if (dangerDisplay) dangerDisplay.style.display = 'none';
  }

  elements.notificationBody.innerHTML = `
    <div class="notification-content">
      ${alertMsg}
      <div class="notification-time">
        <small>Sent at: ${new Date().toLocaleTimeString()}</small>
      </div>
    </div>
  `;

  if (elements.langToggleBtn) {
    elements.langToggleBtn.textContent = 'हिंदी में देखें';
  }

  // Show modal with animation
  elements.modalOverlay.classList.add('visible');

  // Send browser notification if permitted
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification("AgriUrbanAI Alert", {
      body: "New weather alert available. Check your dashboard for details.",
      icon: "🌦️"
    });

    notification.onclick = function () {
      window.focus();
      notification.close();
    };
  }

  // Vibrate on mobile if supported
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

function hideNotification() {
  if (elements.modalOverlay) {
    elements.modalOverlay.classList.remove('visible');
  }
}

function toggleLanguage() {
  if (!elements.notificationBody || !elements.sendAlertBtn || !elements.langToggleBtn) return;

  if (currentLang === 'en') {
    currentLang = 'hi';
    elements.notificationBody.innerHTML = `
      <div class="notification-content">
        ${elements.sendAlertBtn.dataset.alertHi}
        <div class="notification-time">
          <small>भेजा गया: ${new Date().toLocaleTimeString('hi-IN')}</small>
        </div>
      </div>
    `;
    elements.langToggleBtn.textContent = 'View in English';
  } else {
    currentLang = 'en';
    elements.notificationBody.innerHTML = `
      <div class="notification-content">
        ${elements.sendAlertBtn.dataset.alertEn}
        <div class="notification-time">
          <small>Sent at: ${new Date().toLocaleTimeString()}</small>
        </div>
      </div>
    `;
    elements.langToggleBtn.textContent = 'हिंदी में देखें';
  }
}

// --- REAL-TIME DATA UPDATES ---
function startRealTimeUpdates() {
  realTimeInterval = setInterval(() => {
    updateRealTimeData();
  }, 30000); // Update every 30 seconds
}

function updateRealTimeData() {
  // Simulate real-time weather data updates
  weatherData.forEach((day, index) => {
    if (index === 0) { // Today
      // Slight temperature variation
      const tempChange = (Math.random() - 0.5) * 2;
      day.temp = Math.round((day.temp + tempChange) * 10) / 10;

      // Update humidity
      const humidityChange = (Math.random() - 0.5) * 10;
      day.humidity = Math.max(30, Math.min(90, Math.round(day.humidity + humidityChange)));

      // Update wind
      const windChange = (Math.random() - 0.5) * 4;
      day.wind = Math.max(5, Math.round(day.wind + windChange));
    }
  });

  // Update forecast display
  populateForecast();

  // Update chart if visible
  if (analyticsChart) {
    updateChart(currentView);
  }

  updateCurrentWeather();

  // Check for alerts
  checkForAlerts();
}

// --- VOICE ALERTS ---
function speakAlert(message, priority = 'normal') {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
  utterance.rate = priority === 'high' ? 1.2 : 1.0;
  utterance.pitch = priority === 'high' ? 1.1 : 1.0;
  utterance.volume = 0.8;

  // Get available voices
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice =>
    voice.lang.startsWith(currentLang === 'hi' ? 'hi' : 'en') && voice.name.includes('Female')
  ) || voices.find(voice => voice.lang.startsWith(currentLang === 'hi' ? 'hi' : 'en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechSynthesis.speak(utterance);
}

function checkForAlerts() {
  const todayData = weatherData[0];
  let alertTriggered = false;

  if (todayData.rain_chance > 60) {
    speakAlert(`High rainfall alert! ${todayData.rain_chance}% chance of rain today.`, 'high');
    alertTriggered = true;
  } else if (todayData.temp > 35) {
    speakAlert(`Heat alert! Temperature is ${todayData.temp} degrees Celsius.`, 'normal');
    alertTriggered = true;
  }

  if (alertTriggered) {
    // Visual alert indicator
    showVisualAlert();
  }
}

function showVisualAlert() {
  const alertIndicator = document.createElement('div');
  alertIndicator.className = 'alert-indicator';
  alertIndicator.innerHTML = '🚨';
  document.body.appendChild(alertIndicator);

  setTimeout(() => {
    alertIndicator.remove();
  }, 3000);
}

// --- LOGOUT FUNCTION ---
function logout() {
  if (currentUser) currentUser = null;
  window.location.href = 'index.html';
}

// --- ADDITIONAL FEATURES ---
function showDetailedAnalytics(type) {
  alert(`Detailed ${type} analytics feature coming soon! This would show comprehensive data visualizations, historical trends, predictive models, and actionable insights.`);
}

// --- ANIMATIONS ---
function initializeAnimations() {
  // Add CSS for marker animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes markerBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .custom-div-icon {
      background: transparent !important;
      border: none !important;
    }
    
    .map-marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }
    
    .marker-inner {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      position: relative;
      z-index: 2;
    }
    
    .farm-marker .marker-inner {
      background: linear-gradient(135deg, #2ECC71, #27AE60);
    }
    
    .urban-marker .marker-inner {
      background: linear-gradient(135deg, #E74C3C, #C0392B);
    }
    
    .marker-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
      z-index: 1;
    }
    
    .farm-marker .marker-pulse {
      background: rgba(46, 204, 113, 0.4);
    }
    
    .urban-marker .marker-pulse {
      background: rgba(231, 76, 60, 0.4);
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(2);
        opacity: 0;
      }
    }
    
    .leaflet-popup-content-wrapper {
      background: rgba(255, 255, 255, 0.95) !important;
      backdrop-filter: blur(10px);
      border-radius: 12px !important;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2) !important;
    }
    
    .popup-content h3 {
      margin: 0 0 15px 0;
      color: #2c3e50;
      font-size: 16px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
    }
    
    .popup-stats {
      display: grid;
      gap: 8px;
      margin-bottom: 15px;
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    
    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .stat-value {
      font-size: 12px;
      font-weight: 600;
    }
    
    .popup-btn {
      width: 100%;
      padding: 8px;
      background: linear-gradient(135deg, #3498DB, #2980B9);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .popup-btn:hover {
      transform: translateY(-2px);
    }
    
    .forecast-card.high-risk {
      border-left: 3px solid #E74C3C;
    }
    
    .forecast-card.medium-risk {
      border-left: 3px solid #F39C12;
    }
    
    .forecast-card.low-risk {
      border-left: 3px solid #2ECC71;
    }
    
    .forecast-left {
      flex: 1;
    }
    
    .forecast-details {
      font-size: 11px;
      color: #7f8c8d;
      margin-top: 4px;
    }
    
    .forecast-right {
      text-align: right;
    }
    
    .forecast-humidity {
      font-size: 11px;
      color: #3498DB;
      margin-top: 4px;
    }
    
    .notification-content {
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .notification-time {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid rgba(0,0,0,0.1);
      text-align: center;
      color: #7f8c8d;
    }

    .leaflet-container {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
    }
    
    .map-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    }
    
    .map-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(15, 117, 188, 0.1);
      border-top-color: var(--primary-color, #0F75BC);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    .map-loading span {
      color: var(--text-dark, #2c3e50);
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// --- PERFORMANCE MONITORING ---
window.addEventListener('load', () => {
  console.log('Dashboard loaded successfully');

  // Log performance metrics
  if (window.performance) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`Page load time: ${pageLoadTime}ms`);
  }
});

// Mobile Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.replace('ph-list', 'ph-x');
            } else {
                icon.classList.replace('ph-x', 'ph-list');
            }
        });

        // Close menu when a link is clicked
        navMenu.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if(icon) icon.classList.replace('ph-x', 'ph-list');
            });
        });
    }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFarmerRecommendation,
    getUrbanRecommendation,
    updateDashboard,
    initMap,
    initChart
  };
}
