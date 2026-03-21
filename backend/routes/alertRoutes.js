/**
 * Alert Routes
 * API endpoints for weather alerts and notifications
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
  markAlertAsRead,
  getUserAlerts,
  triggerEmergencyAlert
} = require('../controllers/alertController');

// @route   POST /api/alerts/trigger
// @desc    Trigger emergency alert script
// @access  Public (for demo purposes)
router.post('/trigger', triggerEmergencyAlert);

// All routes require authentication
router.use(protect);

// @route   GET /api/alerts
// @desc    Get all alerts (admin/urban)
// @access  Private (Admin, Urban)
router.get('/', authorize('admin', 'urban'), getAlerts);

// @route   GET /api/alerts/user
// @desc    Get alerts for current user
// @access  Private
router.get('/user', getUserAlerts);

// @route   POST /api/alerts
// @desc    Create new alert
// @access  Private (Admin, Urban)
router.post('/', authorize('admin', 'urban'), createAlert);

// @route   GET /api/alerts/:id
// @desc    Get alert by ID
// @access  Private
router.get('/:id', getAlertById);

// @route   PUT /api/alerts/:id
// @desc    Update alert
// @access  Private (Admin, Urban)
router.put('/:id', authorize('admin', 'urban'), updateAlert);

// @route   DELETE /api/alerts/:id
// @desc    Delete alert
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), deleteAlert);

// @route   PATCH /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.patch('/:id/read', markAlertAsRead);

module.exports = router;
