/**
 * Weather Service
 * Handles background weather data fetching and updates
 */

const axios = require('axios');
const Weather = require('../models/Weather');
const Alert = require('../models/Alert');
const { logger, logWeatherService } = require('../middleware/loggingMiddleware');

// Default locations to monitor
const MONITORED_LOCATIONS = [
  {
    name: 'Gautam Buddha Nagar',
    coordinates: [77.3910, 28.5355],
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    priority: 'high'
  },
  {
    name: 'Sector 18, Noida',
    coordinates: [77.3250, 28.5680],
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    priority: 'high'
  },
  {
    name: 'Greater Noida',
    coordinates: [77.5040, 28.4740],
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    priority: 'medium'
  }
];

/**
 * Initialize weather service
 */
const mongoose = require('mongoose');

/**
 * Initialize weather service
 */
const initializeWeatherService = async () => {
  try {
    logger.info('Initializing weather service...');

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Database not connected. Weather service starting in offline mode (no updates).');
      return;
    }

    // Start periodic weather updates
    startWeatherUpdates();

    // Generate initial weather data for monitored locations
    await generateInitialWeatherData();

    logger.info('Weather service initialized successfully');
  } catch (error) {
    logger.error('Error initializing weather service:', error);
    // Don't throw error to allow server to start
  }
};

/**
 * Start periodic weather updates
 */
const startWeatherUpdates = () => {
  const updateInterval = parseInt(process.env.WEATHER_UPDATE_INTERVAL) || 30 * 60 * 1000; // 30 minutes default

  // Update weather data every interval
  setInterval(async () => {
    try {
      await updateAllWeatherData();
    } catch (error) {
      logger.error('Error in periodic weather update:', error);
    }
  }, updateInterval);

  // Check for weather alerts every 5 minutes
  setInterval(async () => {
    try {
      await checkWeatherAlerts();
    } catch (error) {
      logger.error('Error checking weather alerts:', error);
    }
  }, 5 * 60 * 1000);

  logger.info(`Weather service started with ${updateInterval}ms update interval`);
};

/**
 * Update weather data for all monitored locations
 */
const updateAllWeatherData = async () => {
  logger.info('Starting weather data update for all locations...');

  for (const location of MONITORED_LOCATIONS) {
    try {
      await updateWeatherForLocation(location);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    } catch (error) {
      logger.error(`Error updating weather for ${location.name}:`, error);
    }
  }

  logger.info('Weather data update completed');
};

/**
 * Update weather data for a specific location
 */
const updateWeatherForLocation = async (location) => {
  try {
    // Check if we need to update (avoid too frequent updates)
    const existingWeather = await Weather.findOne({
      'location.coordinates.coordinates': location.coordinates
    }).sort({ 'metadata.lastUpdated': -1 });

    const updateFrequency = location.priority === 'high' ? 15 * 60 * 1000 : 30 * 60 * 1000; // 15min for high priority
    const shouldUpdate = !existingWeather ||
      (Date.now() - existingWeather.metadata.lastUpdated.getTime()) > updateFrequency;

    if (!shouldUpdate) {
      return;
    }

    // Fetch fresh weather data
    const weatherData = await fetchWeatherFromAPI(location);

    if (weatherData) {
      // Update or create weather record
      await Weather.findOneAndUpdate(
        { 'location.coordinates.coordinates': location.coordinates },
        weatherData,
        { upsert: true, new: true, runValidators: true }
      );

      logWeatherService('WEATHER_UPDATED', location.name, 'success', {
        source: 'scheduled',
        priority: location.priority
      });

      // Check if alerts should be generated
      await checkForWeatherAlerts(weatherData);
    }
  } catch (error) {
    logWeatherService('WEATHER_UPDATE_ERROR', location.name, 'error', {
      error: error.message
    });
  }
};

/**
 * Fetch weather data from external API
 */
const fetchWeatherFromAPI = async (location) => {
  try {
    const [longitude, latitude] = location.coordinates;

    // For demo purposes, generate mock weather data
    // In production, this would integrate with OpenWeatherMap API
    const weatherData = generateMockWeatherData(location);

    return weatherData;
  } catch (error) {
    logger.error(`Error fetching weather from API for ${location.name}:`, error);
    return null;
  }
};

/**
 * Generate mock weather data for demo purposes
 */
const generateMockWeatherData = (location) => {
  const now = new Date();
  const baseTemp = 25 + Math.random() * 15; // 25-40°C

  const weatherData = {
    location: {
      name: location.name,
      district: location.district,
      state: location.state,
      coordinates: {
        type: 'Point',
        coordinates: location.coordinates
      }
    },
    current: {
      temperature: {
        value: Math.round(baseTemp * 10) / 10,
        unit: 'celsius'
      },
      humidity: Math.floor(40 + Math.random() * 40), // 40-80%
      pressure: {
        value: 1000 + Math.random() * 50,
        unit: 'hPa'
      },
      windSpeed: {
        value: Math.floor(Math.random() * 20),
        unit: 'kmh'
      },
      windDirection: Math.floor(Math.random() * 360),
      visibility: {
        value: 8 + Math.random() * 4,
        unit: 'km'
      },
      uvIndex: Math.floor(Math.random() * 11),
      condition: ['clear', 'partly-cloudy', 'cloudy', 'rain'][Math.floor(Math.random() * 4)],
      icon: '☀️',
      description: 'Clear sky',
      feelsLike: {
        value: Math.round((baseTemp + Math.random() * 5) * 10) / 10,
        unit: 'celsius'
      }
    },
    forecast: [],
    metadata: {
      source: 'custom',
      lastUpdated: now,
      updateFrequency: 30,
      dataQuality: 'good',
      confidence: 85
    }
  };

  // Generate 7-day forecast
  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(now);
    forecastDate.setDate(forecastDate.getDate() + i);

    const tempVariation = (Math.random() - 0.5) * 10;
    const forecastTemp = baseTemp + tempVariation;

    weatherData.forecast.push({
      date: forecastDate,
      temperature: {
        min: {
          value: Math.round((forecastTemp - 5) * 10) / 10,
          unit: 'celsius'
        },
        max: {
          value: Math.round((forecastTemp + 5) * 10) / 10,
          unit: 'celsius'
        }
      },
      humidity: Math.floor(40 + Math.random() * 40),
      precipitation: {
        probability: Math.floor(Math.random() * 100),
        amount: {
          value: Math.random() * 10,
          unit: 'mm'
        },
        type: Math.random() > 0.7 ? 'rain' : 'none'
      },
      condition: ['clear', 'partly-cloudy', 'cloudy', 'rain'][Math.floor(Math.random() * 4)],
      icon: ['☀️', '⛅', '☁️', '🌧️'][Math.floor(Math.random() * 4)],
      description: 'Weather forecast'
    });
  }

  return weatherData;
};

/**
 * Generate initial weather data for all monitored locations
 */
const generateInitialWeatherData = async () => {
  logger.info('Generating initial weather data...');

  for (const location of MONITORED_LOCATIONS) {
    try {
      const weatherData = await fetchWeatherFromAPI(location);

      if (weatherData) {
        await Weather.findOneAndUpdate(
          { 'location.coordinates.coordinates': location.coordinates },
          weatherData,
          { upsert: true, new: true, runValidators: true }
        );

        logger.info(`Initial weather data created for ${location.name}`);
      }
    } catch (error) {
      logger.error(`Error creating initial weather data for ${location.name}:`, error);
    }
  }
};

/**
 * Check for weather alerts based on current conditions
 */
const checkForWeatherAlerts = async (weatherData) => {
  try {
    const alerts = generateWeatherAlerts(weatherData);

    for (const alertData of alerts) {
      await Alert.create(alertData);
      logger.info(`Weather alert created: ${alertData.title}`);
    }
  } catch (error) {
    logger.error('Error checking for weather alerts:', error);
  }
};

/**
 * Generate weather alerts based on conditions
 */
const generateWeatherAlerts = (weatherData) => {
  const alerts = [];
  const current = weatherData.current;
  const forecast = weatherData.forecast.slice(0, 3);

  // High temperature alert
  if (current.temperature.value > 40) {
    alerts.push({
      title: 'Extreme Heat Warning',
      message: `Temperature has reached ${current.temperature.value}°C. Take necessary precautions.`,
      type: 'weather',
      priority: 'high',
      severity: 'warning',
      target: {
        locations: [{
          district: weatherData.location.district,
          state: weatherData.location.state,
          coordinates: weatherData.location.coordinates,
          radius: 50
        }]
      },
      trigger: {
        source: 'automated',
        autoGenerated: true
      },
      schedule: {
        startTime: new Date(),
        duration: 240 // 4 hours
      }
    });
  }

  // Heavy rainfall alert
  const heavyRainDays = forecast.filter(f => f.precipitation.probability > 70);
  if (heavyRainDays.length > 0) {
    alerts.push({
      title: 'Heavy Rainfall Warning',
      message: `Heavy rainfall expected in the next ${heavyRainDays.length} days. Probability up to ${Math.max(...heavyRainDays.map(d => d.precipitation.probability))}%`,
      type: 'weather',
      priority: 'high',
      severity: 'warning',
      target: {
        locations: [{
          district: weatherData.location.district,
          state: weatherData.location.state,
          coordinates: weatherData.location.coordinates,
          radius: 100
        }]
      },
      trigger: {
        source: 'automated',
        autoGenerated: true
      },
      schedule: {
        startTime: new Date(),
        duration: heavyRainDays.length * 24 * 60 // Duration in minutes
      }
    });
  }

  // Flood risk alert
  if (current.condition === 'heavy-rain' || forecast.some(f => f.precipitation.amount.value > 50)) {
    alerts.push({
      title: 'Flood Risk Alert',
      message: 'High flood risk due to heavy precipitation. Monitor water levels and prepare emergency measures.',
      type: 'flood',
      priority: 'critical',
      severity: 'error',
      target: {
        locations: [{
          district: weatherData.location.district,
          state: weatherData.location.state,
          coordinates: weatherData.location.coordinates,
          radius: 75
        }]
      },
      trigger: {
        source: 'automated',
        autoGenerated: true
      },
      schedule: {
        startTime: new Date(),
        duration: 480 // 8 hours
      }
    });
  }

  return alerts;
};

/**
 * Check for weather alerts periodically
 */
const checkWeatherAlerts = async () => {
  try {
    // Clean up expired alerts
    await Alert.cleanExpired();

    // Check current weather conditions for all monitored locations
    for (const location of MONITORED_LOCATIONS) {
      const weatherData = await Weather.findOne({
        'location.coordinates.coordinates': location.coordinates
      }).sort({ 'metadata.lastUpdated': -1 });

      if (weatherData) {
        await checkForWeatherAlerts(weatherData);
      }
    }
  } catch (error) {
    logger.error('Error in periodic alert check:', error);
  }
};

/**
 * Get weather data for a specific user location
 */
const getWeatherForUser = async (user) => {
  try {
    let location = null;

    if (user.role === 'farmer' && user.farm?.location?.coordinates) {
      location = {
        name: user.farm.name || 'Farm Location',
        coordinates: user.farm.location.coordinates,
        district: user.profile?.address?.city || 'Gautam Buddha Nagar',
        state: user.profile?.address?.state || 'Uttar Pradesh'
      };
    } else if (user.role === 'urban' && user.urbanProfile) {
      location = {
        name: user.urbanProfile.zone || 'Urban Zone',
        coordinates: [77.3250, 28.5680],
        district: user.urbanProfile.jurisdiction || 'Gautam Buddha Nagar',
        state: 'Uttar Pradesh'
      };
    } else {
      location = MONITORED_LOCATIONS[0]; // Default location
    }

    // Get or fetch weather data
    let weatherData = await Weather.findOne({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates
          },
          $maxDistance: 10000
        }
      }
    }).sort({ 'metadata.lastUpdated': -1 });

    if (!weatherData) {
      weatherData = await fetchWeatherFromAPI(location);
      if (weatherData) {
        weatherData = await Weather.create(weatherData);
      }
    }

    return weatherData;
  } catch (error) {
    logger.error(`Error getting weather for user ${user._id}:`, error);
    return null;
  }
};

/**
 * Clean old weather data
 */
const cleanOldWeatherData = async (daysToKeep = 30) => {
  try {
    const deletedCount = await Weather.cleanOldData(daysToKeep);
    logger.info(`Cleaned ${deletedCount} old weather records`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning old weather data:', error);
    return 0;
  }
};

module.exports = {
  initializeWeatherService,
  updateAllWeatherData,
  updateWeatherForLocation,
  getWeatherForUser,
  cleanOldWeatherData,
  checkWeatherAlerts
};
