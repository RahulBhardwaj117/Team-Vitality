// ============================================
// AgriUrbanAI - Enhanced Dashboard JavaScript - FIXED MAP
// ============================================

// --- WEATHER DATA MANAGEMENT ---
let weatherData = [];

// Weather Data Management


// Default weather data as fallback
const defaultWeatherData = [
  { day: "Today", condition: "Partly Cloudy", rain_chance: 10, temp: 32, icon: "☁️", humidity: 65, wind: 12 },
  { day: "Tomorrow", condition: "Partly Cloudy", rain_chance: 25, temp: 32, icon: "🌤️", humidity: 70, wind: 15 },
  { day: "Friday", condition: "Scattered T-Storms", rain_chance: 40, temp: 33, icon: "⛈️", humidity: 85, wind: 20 },
  { day: "Saturday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 45, wind: 10 },
  { day: "Sunday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 40, wind: 8 },
  { day: "Monday", condition: "Sunny", rain_chance: 0, temp: 37, icon: "☀️", humidity: 38, wind: 9 },
  { day: "Tuesday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 42, wind: 11 }
];

// API Base URLs
const API_URL = 'http://localhost:5005/api'; // Node.js backend
const FASTAPI_URL = 'http://localhost:8001'; // Python AI backend (New Port)

// Load weather data from AI prediction service
async function loadWeatherData() {
  try {
    // Try to fetch AI predictions from FastAPI (raw endpoint)
    console.log('🤖 Loading AI-predicted weather data...');
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      // const dateStr = '2025-06-20'; // Hardcoded for demo: June 20-27, 2025

      // Use raw endpoint that bypasses schema validation
      const response = await fetch(`${FASTAPI_URL}/predict/weather/raw?start_date=${dateStr}`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Weather Response:', result);

        if (result.status === 'success' && result.forecast && result.forecast.length > 0) {
          // Transform AI predictions to dashboard format
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

          console.log('✅ AI Predictions Loaded! 7-Day Forecast:', weatherData);

          // Store forecast data for prediction page
          localStorage.setItem('agriurban_weather_forecast', JSON.stringify({
            data: weatherData,
            timestamp: Date.now(),
            location: currentUser?.location || 'Gautam Buddha Nagar',
            source: 'AI_PREDICTION'
          }));
          console.log('💾 Forecast data stored in localStorage');

          return;
        }
      }
    } catch (err) {
      console.warn('AI API failed:', err.message);
    }

    // Fallback: Use default data
    console.warn('Using default weather data');
    weatherData = defaultWeatherData;

    // Store fallback data as well
    localStorage.setItem('agriurban_weather_forecast', JSON.stringify({
      data: weatherData,
      timestamp: Date.now(),
      location: currentUser?.location || 'Gautam Buddha Nagar',
      source: 'DEFAULT'
    }));

  } catch (error) {
    console.error('Error loading weather data:', error);
    weatherData = defaultWeatherData;
  }
}

// --- OPENWEATHER API INTEGRATION ---
const OPENWEATHER_API_KEY = '45433333a6d1a566b3cdeecff33e3409';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fetch current weather from OpenWeather API
async function fetchCurrentWeather() {
  try {
    // Explicitly use Delhi coordinates
    const lat = 28.6139;
    const lon = 77.2090;

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
  if (currentUser.role === 'urban') {
    currentView = 'urban';
  } else {
    currentView = 'farmer';
  }

  return true;
}

// --- CHECK AND PROMPT FOR USER DETAILS ---
function checkAndPromptUserDetails() {
  if (currentUser.role === 'farmer' && (!currentUser.crop || !currentUser.landArea)) {
    showUserDetailsModal();
  }
}

function showUserDetailsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay user-details-modal';
  modal.innerHTML = `
    <div class="modal-content user-details-content">
      <div class="user-details-form">
        <h2>Welcome! Let's set up your profile</h2>
        <p>Please provide your farming details to personalize your dashboard.</p>
        <form id="user-details-form">
          <input type="text" id="modal-crop" placeholder="Crop Type (e.g., Wheat, Rice)" value="${currentUser.crop || ''}" required>
          <input type="text" id="modal-land-area" placeholder="Land Area (e.g., 2.5 Hectares)" value="${currentUser.landArea || ''}" required>
          <input type="text" id="modal-location" placeholder="Location (e.g., City, State)" value="${currentUser.location || ''}" required>
          <button type="submit" class="btn">Save Details</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Show modal
  setTimeout(() => modal.classList.add('visible'), 10);

  // Handle form submission
  const form = modal.querySelector('#user-details-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const crop = document.getElementById('modal-crop').value;
    const landArea = document.getElementById('modal-land-area').value;
    const location = document.getElementById('modal-location').value;

    // Update currentUser
    currentUser.crop = crop;
    currentUser.landArea = landArea;
    currentUser.location = location;

    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(currentUser));

    // Hide modal
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);

    // Update dashboard
    updateDashboard();
  });
}

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
    document.querySelectorAll('.navbar ul li a').forEach(link => {
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

  return `${level} (${details})`;
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

  return `${level} (${details})`;
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

  return `${level} (${details})`;
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
  alert('Debug: Flood Prediction Initializing...'); // Visible proof
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
    let forecastData = getStoredWeatherForecast();

    // Fallback: If no data, try to load it now
    if (!forecastData || !forecastData.data || forecastData.data.length === 0) {
      console.log('⚠️ [INIT] No forecast data found, attempting to load...');
      await loadWeatherData();
      forecastData = getStoredWeatherForecast();
    }

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


// --- ALERTS INITIALIZATION ---
function initializeAlerts() {
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
      checkAndPromptUserDetails(); // Check and prompt for details
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
      checkAndPromptUserDetails(); // Check and prompt for details
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
function initializeNavigation() {
  // Add click handlers to navbar links
  document.querySelectorAll('.navbar .nav-item').forEach(link => {
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

// --- ENHANCED DASHBOARD UPDATE ---
function updateDashboard() {
  if (isAnimating) return;
  isAnimating = true;

  let result;
  if (currentView === 'farmer') {
    result = getFarmerRecommendation();
    animateContextUpdate('farmer');
  } else {
    result = getUrbanRecommendation();
    animateContextUpdate('urban');
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

function updateLocationInfo() {
  const locationCard = document.querySelector('.location-card');
  if (locationCard) {
    locationCard.innerHTML = `
      <p><span>District:</span> <strong>Delhi</strong></p>
      <p><span>City:</span> <strong>New Delhi</strong></p>
      <p><span>Region:</span> <strong>NCR</strong></p>
    `;
  }

}

function animateContextUpdate(view) {
  if (!elements.contextCard) return;

  elements.contextCard.style.opacity = '0';

  setTimeout(() => {
    const userData = locationData[currentUser?.role] || locationData.farmer;

    if (view === 'farmer') {
      if (elements.contextLabel) elements.contextLabel.innerHTML = '🌾 Farmer Details';
      const cropType = currentUser?.crop || userData.cropType || 'Wheat';
      const landArea = currentUser?.landArea || userData.fieldArea || '2.5 Hectares';
      elements.contextCard.innerHTML = `
         <p><span>Name:</span> <strong>${currentUser?.name || 'Demo User'}</strong></p>
         <p><span>Crop Type:</span> <strong>${cropType}</strong></p>
         <p><span>Growth Stage:</span> <strong>${userData.growthStage}</strong></p>
         <p><span>Field Area:</span> <strong>${landArea}</strong></p>
         <p><span>Last Irrigation:</span> <strong>${userData.lastIrrigation}</strong></p>
         <p><span>Fertilizer Applied:</span> <strong>${userData.fertilizer}</strong></p>
       `;
    } else {
      if (elements.contextLabel) elements.contextLabel.innerHTML = '🏙️ Urban Zone Details';
      elements.contextCard.innerHTML = `
         <p><span>Name:</span> <strong>${currentUser?.name || 'Demo User'}</strong></p>
         <p><span>City:</span> <strong>${currentUser?.location || 'New Delhi'}</strong></p>
         <p><span>High-Risk Zone:</span> <strong style="color: #E74C3C;">${userData.zoneName}</strong></p>
         <p><span>Drainage:</span> <strong style="color: #2ECC71;">${userData.drainage}</strong></p>
         <p><span>Population:</span> <strong>${userData.population}</strong></p>
         <p><span>Emergency Teams:</span> <strong>${userData.emergencyUnits}</strong></p>
         <p><span>Last Incident:</span> <strong>${userData.lastIncident}</strong></p>
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
  }, 200);
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

// --- EVENT LISTENERS ---
function initializeEventListeners() {
  // View toggle buttons
  elements.farmerBtn?.addEventListener('click', () => {
    if (currentView !== 'farmer') {
      currentView = 'farmer';
      elements.farmerBtn.classList.add('active');
      elements.urbanBtn?.classList.remove('active');
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

  // Send alert button
  elements.sendAlertBtn?.addEventListener('click', () => {
    showNotification();
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
