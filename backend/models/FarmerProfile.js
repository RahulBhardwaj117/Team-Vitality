/**
 * FarmerProfile Model
 * Extended user profile specifically for farmers with agricultural data
 */

const mongoose = require('mongoose');

const farmerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  personalInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa'],
      default: 'en'
    }
  },
  location: {
    village: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  farmDetails: {
    totalLandArea: {
      type: Number, // in acres
      min: 0
    },
    crops: [{
      cropType: {
        type: String,
        required: true
      },
      area: Number, // in acres
      sowingDate: Date,
      expectedHarvestDate: Date,
      variety: String
    }],
    soilType: {
      type: String,
      enum: ['clay', 'sandy', 'loamy', 'silt', 'peaty', 'chalky', 'mixed', 'unknown'],
      default: 'unknown'
    },
    irrigationType: {
      type: String,
      enum: ['drip', 'sprinkler', 'flood', 'rainfed', 'mixed'],
      default: 'rainfed'
    },
    waterSource: {
      type: String,
      enum: ['borewell', 'canal', 'river', 'pond', 'rainwater', 'multiple']
    }
  },
  preferences: {
    alertTypes: [{
      type: String,
      enum: ['weather', 'irrigation', 'fertilizer', 'pest', 'disease', 'market', 'all']
    }],
    notificationTime: {
      type: String,
      default: '08:00' // Preferred time for daily alerts
    },
    communicationChannel: {
      type: String,
      enum: ['app', 'sms', 'whatsapp', 'all'],
      default: 'app'
    }
  },
  chatbotContext: {
    lastInteraction: Date,
    preferredTopics: [String],
    commonQueries: [String],
    savedResponses: [{
      query: String,
      response: String,
      savedAt: Date
    }]
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Pre-save hook to check if profile is complete
farmerProfileSchema.pre('save', function(next) {
  const requiredFields = [
    this.personalInfo.name,
    this.location.district,
    this.location.state,
    this.farmDetails.totalLandArea,
    this.farmDetails.soilType
  ];
  
  this.isProfileComplete = requiredFields.every(field => field !== undefined && field !== null && field !== '');
  next();
});

// Method to get complete profile with user data
farmerProfileSchema.methods.getCompleteProfile = async function() {
  await this.populate('userId', 'email username');
  return this;
};

// Static method to find or create profile
farmerProfileSchema.statics.findOrCreate = async function(userId, profileData) {
  let profile = await this.findOne({ userId });
  
  if (!profile) {
    profile = new this({ userId, ...profileData });
    await profile.save();
  }
  
  return profile;
};

const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);

module.exports = FarmerProfile;
