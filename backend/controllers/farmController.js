/**
 * Farm Controller
 * Handles farm and crop management operations
 */

const Farm = require('../models/Farm');
const catchAsync = require('../utils/catchAsync');
const { getWeatherByCoordinates } = require('../services/weatherService');

/**
 * @desc    Get all farms for user
 * @route   GET /api/farms
 * @access  Private (Farmer)
 */
exports.getFarms = catchAsync(async (req, res) => {
  const farms = await Farm.find({ user: req.user.id, isActive: true })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: farms.length,
    data: { farms }
  });
});

/**
 * @desc    Get farm by ID
 * @route   GET /api/farms/:id
 * @access  Private (Farmer)
 */
exports.getFarmById = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { farm }
  });
});

/**
 * @desc    Create new farm
 * @route   POST /api/farms
 * @access  Private (Farmer)
 */
exports.createFarm = catchAsync(async (req, res) => {
  // Add user ID to farm data
  const farmData = {
    ...req.body,
    user: req.user.id
  };

  const farm = await Farm.create(farmData);

  res.status(201).json({
    status: 'success',
    data: { farm },
    message: 'Farm created successfully'
  });
});

/**
 * @desc    Update farm
 * @route   PUT /api/farms/:id
 * @access  Private (Farmer)
 */
exports.updateFarm = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  // Update farm fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      farm[key] = req.body[key];
    }
  });

  await farm.save();

  res.status(200).json({
    status: 'success',
    data: { farm },
    message: 'Farm updated successfully'
  });
});

/**
 * @desc    Delete farm
 * @route   DELETE /api/farms/:id
 * @access  Private (Farmer)
 */
exports.deleteFarm = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  // Soft delete
  farm.isActive = false;
  await farm.save();

  res.status(200).json({
    status: 'success',
    data: null,
    message: 'Farm deleted successfully'
  });
});

/**
 * @desc    Get weather data for farm location
 * @route   GET /api/farms/:id/weather
 * @access  Private (Farmer)
 */
exports.getFarmWeatherData = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  // Get weather data for farm coordinates
  const [longitude, latitude] = farm.location.coordinates;
  const weatherData = await getWeatherByCoordinates(latitude, longitude);

  // Update farm weather data
  if (weatherData) {
    farm.weather = {
      temperatureMin: weatherData.main?.temp_min,
      temperatureMax: weatherData.main?.temp_max,
      humidity: weatherData.main?.humidity,
      rainfall: weatherData.rain?.['1h'] || 0,
      lastUpdated: new Date()
    };
    await farm.save();
  }

  res.status(200).json({
    status: 'success',
    data: { 
      weather: weatherData,
      farmWeather: farm.weather 
    }
  });
});

/**
 * @desc    Get soil data for farm
 * @route   GET /api/farms/:id/soil
 * @access  Private (Farmer)
 */
exports.getSoilData = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { 
      soil: farm.soil || {},
      irrigation: farm.irrigation || {},
      fertilizer: farm.fertilizer || {}
    }
  });
});

/**
 * @desc    Get crop data for farm
 * @route   GET /api/farms/:id/crop
 * @access  Private (Farmer)
 */
exports.getCropData = catchAsync(async (req, res) => {
  const farm = await Farm.findOne({ 
    _id: req.params.id, 
    user: req.user.id 
  });

  if (!farm) {
    return res.status(404).json({
      status: 'error',
      message: 'Farm not found'
    });
  }

  const currentCrops = farm.getCurrentSeasonCrop();
  const yieldData = farm.yield || {};

  res.status(200).json({
    status: 'success',
    data: { 
      crops: farm.crops || [],
      currentCrops,
      yield: yieldData,
      totalArea: farm.getTotalArea()
    }
  });
});
