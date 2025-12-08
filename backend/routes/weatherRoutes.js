/**
 * Weather Routes
 * Handles weather data retrieval and management
 */

const express = require('express');
const {
  getCurrentWeather,
  getWeatherForecast,
  getWeatherByLocation,
  getWeatherHistory,
  updateWeatherData,
  getWeatherAlerts,
  createWeatherAlert,
  getWeatherStats,
  getAIRecommendations
} = require('../controllers/weatherController');

const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { logger } = require('../middleware/loggingMiddleware');

const router = express.Router();

/**
 * @route   GET /api/weather/current
 * @desc    Get current weather for user's location
 * @access  Private
 */
router.get('/current', protect, getCurrentWeather);

/**
 * @route   GET /api/weather/forecast
 * @desc    Get weather forecast for user's location
 * @access  Private
 */
router.get('/forecast', protect, getWeatherForecast);

/**
 * @route   GET /api/weather/location/:lat/:lng
 * @desc    Get weather data for specific coordinates
 * @access  Private
 */
router.get('/location/:lat/:lng', protect, getWeatherByLocation);

/**
 * @route   GET /api/weather/history
 * @desc    Get historical weather data
 * @access  Private
 */
router.get('/history', protect, getWeatherHistory);

/**
 * @route   GET /api/weather/alerts
 * @desc    Get active weather alerts
 * @access  Private
 */
router.get('/alerts', protect, getWeatherAlerts);

/**
 * @route   POST /api/weather/alerts
 * @desc    Create weather alert (Admin only)
 * @access  Private/Admin
 */
router.post('/alerts', protect, authorize('admin'), createWeatherAlert);

/**
 * @route   GET /api/weather/stats
 * @desc    Get weather statistics
 * @access  Private/Admin
 */
router.get('/stats', protect, authorize('admin'), getWeatherStats);

/**
 * @route   PUT /api/weather/update
 * @desc    Update weather data (System only)
 * @access  Private/Admin
 */
router.put('/update', protect, authorize('admin'), updateWeatherData);

/**
 * @route   POST /api/weather/recommendations
 * @desc    Get AI recommendations based on risk data
 * @access  Private
 */
router.post('/recommendations', protect, getAIRecommendations);

// Public weather endpoints (for demo purposes)
if (process.env.DEMO_MODE === 'true') {
  /**
   * @route   GET /api/weather/public/current/:district
   * @desc    Get current weather for district (Public)
   * @access  Public
   */
  router.get('/public/current/:district', optionalAuth, (req, res, next) => {
    // Set a default user for demo purposes
    if (!req.user) {
      req.user = {
        _id: 'demo-user',
        role: 'demo',
        farm: {
          location: {
            coordinates: [77.3910, 28.5355] // Noida coordinates
          }
        }
      };
    }
    next();
  }, getCurrentWeather);

  /**
   * @route   GET /api/weather/public/forecast/:district
   * @desc    Get weather forecast for district (Public)
   * @access  Public
   */
  router.get('/public/forecast/:district', optionalAuth, (req, res, next) => {
    if (!req.user) {
      req.user = {
        _id: 'demo-user',
        role: 'demo',
        farm: {
          location: {
            coordinates: [77.3910, 28.5355]
          }
        }
      };
    }
    next();
  }, getWeatherForecast);
}

module.exports = router;
