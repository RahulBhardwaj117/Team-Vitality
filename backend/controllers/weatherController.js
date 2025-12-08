/**
 * Weather Controller
 * Handles weather data operations and external API integrations
 */

const axios = require('axios');
const Weather = require('../models/Weather');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { logger, logWeatherService } = require('../middleware/loggingMiddleware');
const { getComprehensivePrediction } = require('../services/aiService');
const { evaluateRules } = require('../services/ruleEngine');

// Default locations for demo purposes
const DEFAULT_LOCATIONS = {
  'gautam-buddha-nagar': {
    name: 'Gautam Buddha Nagar',
    coordinates: [77.3910, 28.5355], // Noida coordinates
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  'noida': {
    name: 'Noida',
    coordinates: [77.3910, 28.5355],
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  'sector-18': {
    name: 'Sector 18, Noida',
    coordinates: [77.3250, 28.5680],
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  }
};

/**
 * @desc    Get current weather for user's location
 * @route   GET /api/weather/current
 * @access  Private
 */
const getCurrentWeather = async (req, res, next) => {
  try {
    const user = req.user;

    // Determine location based on user role and profile
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
        coordinates: [77.3250, 28.5680], // Default urban coordinates
        district: user.urbanProfile.jurisdiction || 'Gautam Buddha Nagar',
        state: 'Uttar Pradesh'
      };
    } else {
      // Default location for demo users
      location = DEFAULT_LOCATIONS['gautam-buddha-nagar'];
    }

    // Try to get weather from database first
    let weatherData = await Weather.findOne({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates
          },
          $maxDistance: 10000 // 10km
        }
      }
    }).sort({ 'metadata.lastUpdated': -1 });

    if (!weatherData) {
      // If no data found, return mock data for now instead of erroring
      // This ensures the dashboard always has something to show
      weatherData = {
        location: {
          name: location.name,
          coordinates: { type: 'Point', coordinates: location.coordinates }
        },
        current: {
          temperature: { value: 32, unit: 'celsius' },
          humidity: 65,
          windSpeed: { value: 12, unit: 'kmh' },
          condition: 'Partly Cloudy',
          icon: '☁️'
        },
        alerts: [],
        metadata: { lastUpdated: new Date() }
      };
    }

    // Get relevant alerts for the user
    // const alerts = await Alert.findActiveForUser(user); // Commented out until Alert model static is verified
    const alerts = [];

    // --- AI & Rule Engine Integration ---
    let aiData = null;
    let ruleBasedInsights = [];

    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      // Fetch comprehensive predictions from Python AI
      aiData = await getComprehensivePrediction(today, nextWeek, location.district);

      if (aiData) {
        // Generate insights using Rule Engine
        const ruleType = user.role === 'urban' ? 'urban' : 'agriculture';
        ruleBasedInsights = evaluateRules(aiData, ruleType);
        logger.info(`Generated ${ruleBasedInsights.length} rule-based insights for ${user.role}`);
      }
    } catch (err) {
      logger.error('Failed to generate AI insights:', err);
    }

    // Add agricultural insights for farmers
    let agriculturalInsights = null;
    if (user.role === 'farmer') {
      // Combine legacy insights with new rule-based insights
      const legacyInsights = generateAgriculturalInsights(weatherData, user);
      agriculturalInsights = [...legacyInsights, ...ruleBasedInsights];
    }

    // Add urban insights for city planners
    let urbanInsights = null;
    if (user.role === 'urban') {
      const legacyInsights = generateUrbanInsights(weatherData, user);
      urbanInsights = [...legacyInsights, ...ruleBasedInsights];
    }

    res.status(200).json({
      success: true,
      data: {
        weather: weatherData,
        alerts: alerts,
        insights: {
          agricultural: agriculturalInsights,
          urban: urbanInsights
        },
        location: location
      }
    });
  } catch (error) {
    logger.error('Error getting current weather:', error);
    next(error);
  }
};

/**
 * @desc    Get weather forecast
 * @route   GET /api/weather/forecast
 * @access  Private
 */
const getWeatherForecast = async (req, res, next) => {
  try {
    const user = req.user;
    const { days = 7 } = req.query;

    // Determine location (same logic as current weather)
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
      location = DEFAULT_LOCATIONS['gautam-buddha-nagar'];
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

    // Fallback if no data
    if (!weatherData || !weatherData.forecast) {
      // Mock forecast
      const forecast = [];
      const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        forecast.push({
          day: i === 0 ? 'Today' : daysList[d.getDay()],
          condition: 'Sunny',
          rain_chance: 0,
          temp: 30 + Math.floor(Math.random() * 5),
          icon: '☀️',
          humidity: 40,
          wind: 10
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          forecast: forecast,
          riskAssessment: { level: 'low', score: 0, factors: [] },
          location: location,
          lastUpdated: new Date()
        }
      });
    }

    // Filter forecast by days requested
    const forecast = weatherData.forecast.slice(0, parseInt(days));

    // Generate risk assessment
    const riskAssessment = assessWeatherRisk(forecast, user);

    res.status(200).json({
      success: true,
      data: {
        forecast: forecast,
        riskAssessment: riskAssessment,
        location: location,
        lastUpdated: weatherData.metadata.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error getting forecast:', error);
    next(error);
  }
};

/**
 * @desc    Get weather by specific coordinates
 * @route   GET /api/weather/location/:lat/:lng
 * @access  Private
 */
const getWeatherByLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    // Get weather data for the specified location
    let weatherData = await Weather.findOne({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000 // 5km
        }
      }
    }).sort({ 'metadata.lastUpdated': -1 });

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'Weather data not available for this location'
      });
    }

    res.status(200).json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get weather history
 * @route   GET /api/weather/history
 * @access  Private
 */
const getWeatherHistory = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { history: [], summary: {} }
  });
};

/**
 * @desc    Get active weather alerts
 * @route   GET /api/weather/alerts
 * @access  Private
 */
const getWeatherAlerts = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: []
  });
};

/**
 * @desc    Create weather alert (Admin only)
 * @route   POST /api/weather/alerts
 * @access  Private/Admin
 */
const createWeatherAlert = async (req, res, next) => {
  try {
    const alertData = {
      ...req.body,
      type: 'weather',
      metadata: {
        ...req.body.metadata,
        createdBy: req.user._id
      }
    };

    const alert = await Alert.create(alertData);

    res.status(201).json({
      success: true,
      message: 'Weather alert created successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get weather statistics (Admin only)
 * @route   GET /api/weather/stats
 * @access  Private/Admin
 */
const getWeatherStats = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
};

/**
 * @desc    Update weather data (System only)
 * @route   PUT /api/weather/update
 * @access  Private/Admin
 */
const updateWeatherData = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: req.body
  });
};

/**
 * @desc    Get AI Recommendations (Gemini)
 * @route   POST /api/weather/recommendations
 * @access  Private
 */
const getAIRecommendations = async (req, res, next) => {
  try {
    const { floodRisk, droughtRisk, heatwaveRisk, district } = req.body;
    const { getGeminiRecommendation } = require('../services/aiService');

    const recommendation = await getGeminiRecommendation({
      floodRisk,
      droughtRisk,
      heatwaveRisk,
      district: district || 'Gautam Buddha Nagar'
    });

    res.status(200).json({
      success: true,
      data: {
        recommendation
      }
    });
  } catch (error) {
    logger.error('Error getting AI recommendations:', error);
    next(error);
  }
};

// Helper functions

/**
 * Generate agricultural insights based on weather data
 */
const generateAgriculturalInsights = (weatherData, user) => {
  const insights = [];
  if (!weatherData.current) return insights;

  const current = weatherData.current;

  // Temperature analysis
  if (current.temperature && current.temperature.value > 35) {
    insights.push({
      type: 'warning',
      category: 'temperature',
      message: 'High temperature detected. Consider increasing irrigation frequency.',
      recommendation: 'Monitor crop stress and provide shade if possible.'
    });
  }

  return insights;
};

/**
 * Generate urban insights based on weather data
 */
const generateUrbanInsights = (weatherData, user) => {
  const insights = [];
  if (!weatherData.current) return insights;

  const current = weatherData.current;

  // Traffic impact analysis
  if (current.visibility && current.visibility.value < 2) {
    insights.push({
      type: 'warning',
      category: 'visibility',
      message: 'Poor visibility conditions. Traffic safety advisory recommended.',
      recommendation: 'Increase traffic monitoring and consider speed restrictions.'
    });
  }

  return insights;
};

/**
 * Assess weather risk for agricultural/urban planning
 */
const assessWeatherRisk = (forecast, user) => {
  let riskScore = 0;
  let riskFactors = [];

  // Simple mock risk assessment
  if (forecast.length > 0) {
    // Randomly assign some risk for demo
    if (Math.random() > 0.7) {
      riskScore = 5;
      riskFactors.push('High temperature');
    }
  }

  let riskLevel = 'low';
  if (riskScore >= 8) riskLevel = 'high';
  else if (riskScore >= 4) riskLevel = 'medium';

  return {
    level: riskLevel,
    score: riskScore,
    factors: riskFactors,
    recommendations: []
  };
};

module.exports = {
  getCurrentWeather,
  getWeatherForecast,
  getWeatherByLocation,
  getWeatherHistory,
  updateWeatherData,
  getWeatherAlerts,
  createWeatherAlert,
  getWeatherStats,
  getAIRecommendations
};
