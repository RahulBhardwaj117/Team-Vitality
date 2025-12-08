/**
 * Farm Routes
 * API endpoints for farm/crop management
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getFarms,
    getFarmById,
    createFarm,
    updateFarm,
    deleteFarm,
    getFarmWeatherData,
    getSoilData,
    getCropData
} = require('../controllers/farmController');

// All routes require authentication
router.use(protect);

// @route   GET /api/farms
// @desc    Get all farms for user
// @access  Private (Farmer)
router.get('/', authorize('farmer', 'admin'), getFarms);

// @route   POST /api/farms
// @desc    Create new farm
// @access  Private (Farmer)
router.post('/', authorize('farmer', 'admin'), createFarm);

// @route   GET /api/farms/:id
// @desc    Get farm by ID
// @access  Private (Farmer)
router.get('/:id', authorize('farmer', 'admin'), getFarmById);

// @route   PUT /api/farms/:id
// @desc    Update farm
// @access  Private (Farmer)
router.put('/:id', authorize('farmer', 'admin'), updateFarm);

// @route   DELETE /api/farms/:id
// @desc    Delete farm
// @access  Private (Farmer)
router.delete('/:id', authorize('farmer', 'admin'), deleteFarm);

// @route   GET /api/farms/:id/weather
// @desc    Get weather data for farm location
// @access  Private (Farmer)
router.get('/:id/weather', authorize('farmer', 'admin'), getFarmWeatherData);

// @route   GET /api/farms/:id/soil
// @desc    Get soil data for farm
// @access  Private (Farmer)
router.get('/:id/soil', authorize('farmer', 'admin'), getSoilData);

// @route   GET /api/farms/:id/crop
// @desc    Get crop data for farm
// @access  Private (Farmer)
router.get('/:id/crop', authorize('farmer', 'admin'), getCropData);

module.exports = router;
