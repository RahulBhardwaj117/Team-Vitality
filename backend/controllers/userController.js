/**
 * User Controller
 * Handles user profile and dashboard operations
 */

const User = require('../models/User');
const Farm = require('../models/Farm');
const Alert = require('../models/Alert');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getUserProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateUserProfile = catchAsync(async (req, res) => {
  const { name, email, phone, location, crop, landArea, city } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Update fields if provided
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (location) user.location = location;
  if (crop) user.crop = crop;
  if (landArea) user.landArea = landArea;
  if (city) user.city = city;

  const updatedUser = await user.save();

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
    message: 'Profile updated successfully'
  });
});

/**
 * @desc    Get user-specific dashboard data
 * @route   GET /api/users/dashboard
 * @access  Private
 */
exports.getUserDashboard = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').lean();

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  let dashboardData = {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      theme: user.preferences?.theme || 'light',
      language: user.preferences?.language || 'en'
    }
  };

  // Add role-specific data
  if (user.role === 'farmer') {
    // Get farms for this user
    const farms = await Farm.find({ user: req.user.id, isActive: true });
    
    // Get active alerts
    const alerts = await Alert.find({ 
      user: req.user.id, 
      isActive: true,
      read: false 
    }).limit(5).sort({ createdAt: -1 });

    dashboardData.farmer = {
      crop: user.crop,
      landArea: user.landArea,
      farmCount: farms.length,
      farms: farms.map(farm => ({
        id: farm._id,
        name: farm.name,
        area: farm.area,
        currentCrop: farm.currentCrop,
        soilMoisture: farm.soil?.moisture,
        location: farm.location
      }))
    };
    
    dashboardData.alerts = alerts;
    dashboardData.stats = {
      totalFarms: farms.length,
      totalArea: farms.reduce((acc, farm) => acc + farm.area.value, 0),
      unreadAlerts: alerts.length
    };

  } else if (user.role === 'urban') {
    // Get alerts for urban planners
    const alerts = await Alert.find({ 
      type: { $in: ['flood', 'weather', 'emergency'] },
      isActive: true,
      read: false
    }).limit(10).sort({ createdAt: -1 });

    dashboardData.urban = {
      city: user.city,
      district: user.location
    };

    dashboardData.alerts = alerts;
    dashboardData.stats = {
      activeAlerts: alerts.filter(a => a.severity === 'high').length,
      unreadAlerts: alerts.length
    };
  } else if (user.role === 'admin') {
    // Get all recent alerts for admin
    const alerts = await Alert.find({ isActive: true })
      .limit(20)
      .sort({ createdAt: -1 });

    const userCount = await User.countDocuments();
    const farmCount = await Farm.countDocuments({ isActive: true });

    dashboardData.admin = {
      totalUsers: userCount,
      totalFarms: farmCount,
      activeAlerts: alerts.length
    };

    dashboardData.alerts = alerts;
    dashboardData.stats = {
      totalUsers: userCount,
      totalFarms: farmCount,
      activeAlerts: alerts.filter(a => a.severity === 'high').length
    };
  }

  res.status(200).json({
    status: 'success',
    data: dashboardData
  });
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
exports.updateUserPreferences = catchAsync(async (req, res) => {
  const { theme, language, notifications, units } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Initialize preferences if not exists
  if (!user.preferences) {
    user.preferences = {};
  }

  // Update preferences
  if (theme) user.preferences.theme = theme;
  if (language) user.preferences.language = language;
  if (notifications !== undefined) user.preferences.notifications = notifications;
  if (units) user.preferences.units = units;

  const updatedUser = await user.save();

  res.status(200).json({
    status: 'success',
    data: { preferences: updatedUser.preferences },
    message: 'Preferences updated successfully'
  });
});
