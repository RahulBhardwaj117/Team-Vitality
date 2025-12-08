/**
 * User Routes
 * API endpoints for user management
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  updateUserProfile,
  getUserDashboard,
  updateUserPreferences
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateUserProfile);

// @route   GET /api/users/dashboard
// @desc    Get user-specific dashboard data
// @access  Private
router.get('/dashboard', getUserDashboard);

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', updateUserPreferences);

module.exports = router;
