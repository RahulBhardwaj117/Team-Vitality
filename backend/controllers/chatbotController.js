/**
 * Chatbot Controller
 * Handles HTTP requests for chatbot interactions
 */

const chatbotService = require('../services/chatbotService');
const FarmerProfile = require('../models/FarmerProfile');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Send a message to the chatbot
 * @route   POST /api/chat/send
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || uuidv4();

    // Process message through chatbot service
    const result = await chatbotService.processMessage(
      userId,
      chatSessionId,
      message.trim()
    );

    res.status(200).json({
      success: true,
      data: {
        sessionId: chatSessionId,
        userMessage: {
          id: result.userMessage._id,
          message: result.userMessage.message,
          timestamp: result.userMessage.createdAt,
          sender: 'user'
        },
        botMessage: {
          id: result.botMessage._id,
          message: result.botMessage.message,
          timestamp: result.botMessage.createdAt,
          sender: 'bot',
          intent: result.intent
        }
      }
    });

  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
};

/**
 * @desc    Get chat history for a session
 * @route   GET /api/chat/history/:sessionId
 * @access  Private
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;

    const history = await chatbotService.getHistory(userId, sessionId, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history.map(msg => ({
        id: msg._id,
        message: msg.message,
        sender: msg.sender,
        timestamp: msg.createdAt,
        intent: msg.intent
      }))
    });

  } catch (error) {
    console.error('Get Chat History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
      message: error.message
    });
  }
};

/**
 * @desc    Get all chat sessions for a user
 * @route   GET /api/chat/sessions
 * @access  Private
 */
exports.getChatSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const ChatMessage = require('../models/ChatMessage');

    const sessions = await ChatMessage.getRecentSessions(userId, 20);

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions.map(session => ({
        sessionId: session._id,
        lastMessage: session.lastMessage,
        lastMessageTime: session.lastMessageTime,
        messageCount: session.messageCount
      }))
    });

  } catch (error) {
    console.error('Get Chat Sessions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions',
      message: error.message
    });
  }
};

/**
 * @desc    Create or update farmer profile
 * @route   POST /api/chat/profile
 * @access  Private
 */
exports.updateFarmerProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const profileData = req.body;

    // Find existing profile or create new one
    let profile = await FarmerProfile.findOne({ userId });

    if (profile) {
      // Update existing profile
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== undefined) {
          profile[key] = profileData[key];
        }
      });
      await profile.save();
    } else {
      // Create new profile
      profile = await FarmerProfile.create({
        userId,
        ...profileData
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Update Farmer Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update farmer profile',
      message: error.message
    });
  }
};

/**
 * @desc    Get farmer profile
 * @route   GET /api/chat/profile
 * @access  Private
 */
exports.getFarmerProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    let profile = await FarmerProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get Farmer Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farmer profile',
      message: error.message
    });
  }
};

/**
 * @desc    Get quick reply suggestions
 * @route   GET /api/chat/suggestions
 * @access  Private
 */
exports.getQuickReplies = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get farmer context to personalize suggestions
    const profile = await FarmerProfile.findOne({ userId });

    const suggestions = [
      { id: 1, text: "What's the weather forecast?", icon: "☀️", intent: "weather" },
      { id: 2, text: "Should I irrigate today?", icon: "💧", intent: "irrigation" },
      { id: 3, text: "Fertilizer recommendations", icon: "🌱", intent: "fertilizer" },
      { id: 4, text: "Pest control advice", icon: "🐛", intent: "pest_control" },
      { id: 5, text: "Crop planting guide", icon: "🌾", intent: "crop_advice" }
    ];

    // Personalize based on profile
    if (profile?.farmDetails?.crops?.length > 0) {
      const cropType = profile.farmDetails.crops[0].cropType;
      suggestions.push({
        id: 6,
        text: `${cropType} care tips`,
        icon: "🌿",
        intent: "crop_advice"
      });
    }

    res.status(200).json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Get Quick Replies Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions',
      message: error.message
    });
  }
};

/**
 * @desc    Send proactive alert
 * @route   POST /api/chat/alert
 * @access  Private (Admin/System)
 */
exports.sendAlert = async (req, res) => {
  try {
    const { userId, alertType, alertData } = req.body;

    const alertMessage = await chatbotService.generateAlert(userId, alertType, alertData);

    // Create a new session for alerts
    const sessionId = `alert-${Date.now()}`;
    const ChatMessage = require('../models/ChatMessage');

    const alert = await ChatMessage.create({
      userId,
      sessionId,
      message: alertMessage,
      sender: 'bot',
      intent: 'alert',
      context: { alertType, alertData }
    });

    res.status(200).json({
      success: true,
      data: {
        alertId: alert._id,
        message: alertMessage,
        timestamp: alert.createdAt
      }
    });

  } catch (error) {
    console.error('Send Alert Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send alert',
      message: error.message
    });
  }
};
