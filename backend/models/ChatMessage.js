/**
 * ChatMessage Model
 * Stores chat conversation history between farmers and the AI chatbot
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
    description: 'Unique session identifier for grouping related messages'
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  context: {
    location: {
      village: String,
      district: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    cropType: String,
    soilType: String,
    fieldSize: Number,
    weatherData: {
      temperature: Number,
      humidity: Number,
      rainfall: Number,
      forecast: String
    }
  },
  intent: {
    type: String,
    enum: ['weather', 'irrigation', 'fertilizer', 'pest_control', 'crop_advice', 'alert', 'general', 'unknown'],
    default: 'general'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  metadata: {
    responseTime: Number, // in milliseconds
    aiModel: String,
    tokens: Number
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

// Virtual for formatted timestamp
chatMessageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  });
});

// Method to get conversation history
chatMessageSchema.statics.getConversationHistory = async function(userId, sessionId, limit = 50) {
  return this.find({ userId, sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

// Method to get recent sessions
chatMessageSchema.statics.getRecentSessions = async function(userId, limit = 10) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: '$sessionId',
      lastMessage: { $first: '$message' },
      lastMessageTime: { $first: '$createdAt' },
      messageCount: { $sum: 1 }
    }},
    { $sort: { lastMessageTime: -1 } },
    { $limit: limit }
  ]);
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
