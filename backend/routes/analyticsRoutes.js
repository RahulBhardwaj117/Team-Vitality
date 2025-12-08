/**
 * Analytics Routes
 * API endpoints for analytics and predictive data
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAnalyticsDashboard,
  getWeatherTrends,
  getCropHealthAnalytics,
  getFloodPrediction,
  getYieldPrediction,
  getHistoricalData
} = require('../controllers/analyticsController');

// All routes require authentication
router.use(protect);

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private
router.get('/dashboard', getAnalyticsDashboard);

// @route   GET /api/analytics/weather-trends
// @desc    Get weather trend analytics
// @access  Private
router.get('/weather-trends', getWeatherTrends);

// @route   GET /api/analytics/crop-health
// @desc    Get crop health analytics
// @access  Private (Farmer, Admin)
router.get('/crop-health', authorize('farmer', 'admin'), getCropHealthAnalytics);

// @route   GET /api/analytics/flood-prediction
// @desc    Get flood prediction data
// @access  Private (Urban, Admin)
router.get('/flood-prediction', authorize('urban', 'admin'), getFloodPrediction);

// @route   GET /api/analytics/yield-prediction
// @desc    Get yield prediction for crops
// @access  Private (Farmer, Admin)
router.get('/yield-prediction', authorize('farmer', 'admin'), getYieldPrediction);

// @route   GET /api/analytics/historical
// @desc    Get historical weather/crop data
// @access  Private
router.get('/historical', getHistoricalData);

module.exports = router;
