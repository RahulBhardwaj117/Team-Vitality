/**
 * User Model
 * Handles user authentication and profile management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    match: [
      /^(\+91|91|0)?[6-9]\d{9}$/,
      'Please add a valid Indian phone number'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['farmer', 'urban', 'admin', 'demo', 'city_planner'],
    default: 'farmer'
  },
  profile: {
    avatar: {
      type: String,
      default: null
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  farm: {
    name: String,
    area: {
      value: Number,
      unit: {
        type: String,
        enum: ['hectares', 'acres', 'sq_meters'],
        default: 'hectares'
      }
    },
    cropType: [String],
    soilType: String,
    irrigationType: String,
    farmingMethod: {
      type: String,
      enum: ['traditional', 'organic', 'modern', 'mixed']
    }
  },
  urbanProfile: {
    zone: String,
    department: String,
    jurisdiction: String,
    emergencyContact: String,
    reportingAuthority: String
  },
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      weather: {
        type: Boolean,
        default: true
      },
      alerts: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    units: {
      temperature: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      },
      area: {
        type: String,
        enum: ['hectares', 'acres', 'sq_meters'],
        default: 'hectares'
      },
      rainfall: {
        type: String,
        enum: ['mm', 'inches'],
        default: 'mm'
      }
    }
  },
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0
    }
  },
  verification: {
    emailToken: String,
    emailTokenExpires: Date,
    phoneToken: String,
    phoneTokenExpires: Date,
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    }
  },
  security: {
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: String,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full address
userSchema.virtual('fullAddress').get(function () {
  if (this.profile && this.profile.address) {
    const address = this.profile.address;
    return `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.pincode || ''}`.trim().replace(/^,|,$/g, '');
  }
  return '';
});

// Virtual for account age
userSchema.virtual('accountAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Instance methods
userSchema.methods = {
  // Generate JWT token
  getSignedJwtToken: function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
  },

  // Match password
  matchPassword: async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  },

  // Generate password reset token
  getResetPasswordToken: function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.security.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
  },

  // Check if password was changed after token was issued
  changedPasswordAfter: function (JWTTimestamp) {
    if (this.security.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.security.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },

  // Increment login attempts
  incLoginAttempts: function () {
    this.security.loginAttempts += 1;

    // Lock account after 5 failed attempts for 2 hours
    if (this.security.loginAttempts >= 5) {
      this.security.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }

    return this.save({ validateBeforeSave: false });
  },

  // Reset login attempts
  resetLoginAttempts: function () {
    this.security.loginAttempts = 0;
    this.security.lockUntil = undefined;
    return this.save({ validateBeforeSave: false });
  },

  // Check if account is locked
  isLocked: function () {
    return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
  }
};

// Pre-save middleware
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

  // Initialize security object if it doesn't exist
  if (!this.security) {
    this.security = {};
  }

  // Set password changed timestamp
  this.security.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is valid

  next();
});

// Pre-save middleware for demo users
userSchema.pre('save', function (next) {
  if (this.role === 'demo' && process.env.DEMO_MODE === 'true') {
    // Set demo user properties
    this.status.isVerified = true;
    this.verification.isEmailVerified = true;
    this.verification.isPhoneVerified = true;
  }
  next();
});

// Static methods
userSchema.statics = {
  // Find user by email and include password
  findByEmail: function (email) {
    return this.findOne({ email }).select('+password');
  },

  // Find active users
  findActive: function () {
    return this.find({ 'status.isActive': true });
  },

  // Find users by role
  findByRole: function (role) {
    return this.find({ role });
  },

  // Get user statistics
  getStats: async function () {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalUsers = await this.countDocuments();
    const activeUsers = await this.countDocuments({ 'status.isActive': true });
    const verifiedUsers = await this.countDocuments({
      'verification.isEmailVerified': true
    });

    return {
      total: totalUsers,
      active: activeUsers,
      verified: verifiedUsers,
      byRole: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }
};

module.exports = mongoose.model('User', userSchema);
