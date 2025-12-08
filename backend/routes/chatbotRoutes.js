/**
 * Chatbot Routes
 * API endpoints for farmer chatbot interactions
 */

const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getChatHistory,
  getChatSessions,
  updateFarmerProfile,
  getFarmerProfile,
  getQuickReplies,
  sendAlert
} = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/chat/send
 * @desc    Send a message to the chatbot
 * @access  Private
 */
router.post('/send', sendMessage);

/**
 * @route   GET /api/chat/history/:sessionId
 * @desc    Get chat history for a specific session
 * @access  Private
 */
router.get('/history/:sessionId', getChatHistory);

/**
 * @route   GET /api/chat/sessions
 * @desc    Get all chat sessions for the authenticated user
 * @access  Private
 */
router.get('/sessions', getChatSessions);

/**
 * @route   POST /api/chat/profile
 * @desc    Create or update farmer profile
 * @access  Private
 */
router.post('/profile', updateFarmerProfile);

/**
 * @route   GET /api/chat/profile
 * @desc    Get farmer profile
 * @access  Private
 */
router.get('/profile', getFarmerProfile);

/**
 * @route   GET /api/chat/suggestions
 * @desc    Get quick reply suggestions
 * @access  Private
 */
router.get('/suggestions', getQuickReplies);

/**
 * @route   POST /api/chat/alert
 * @desc    Send proactive alert to user (Admin/System only)
 * @access  Private
 */
router.post('/alert', sendAlert);

module.exports = router;
