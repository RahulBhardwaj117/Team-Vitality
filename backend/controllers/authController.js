/**
 * Authentication Controller
 * Handles all authentication-related operations
 */

const crypto = require('crypto');
const User = require('../models/User');
const { logger, logAuthEvent, logSecurityEvent } = require('../middleware/loggingMiddleware');

// Demo users for quick testing
const DEMO_USERS = [
  {
    email: 'farmer@agriurban.ai',
    password: 'farmer123',
    role: 'farmer',
    name: 'Demo Farmer',
    profile: {
      address: {
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301'
      }
    },
    farm: {
      name: 'Demo Wheat Farm',
      cropType: ['Wheat', 'Rice'],
      area: { value: 2.5, unit: 'hectares' }
    }
  },
  {
    email: 'urban@agriurban.ai',
    password: 'urban123',
    role: 'urban',
    name: 'Demo City Planner',
    urbanProfile: {
      zone: 'Sector 18',
      department: 'Urban Planning',
      jurisdiction: 'Gautam Buddha Nagar'
    }
  },
  {
    email: 'admin@agriurban.ai',
    password: 'admin123',
    role: 'admin',
    name: 'Demo Administrator'
  }
];

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, location, crop_type, land_area } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Prepare user data
    const userData = {
      name,
      email,
      password,
      role: role || 'farmer',
      phone,
      status: {
        isActive: true,
        isVerified: false
      },
      verification: {
        emailToken: crypto.randomBytes(32).toString('hex'),
        emailTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    // Add location to profile if provided
    if (location) {
      userData.profile = {
        address: {
          city: location,
          country: 'India'
        }
      };
    }

    // Add farm details if farmer
    if (role === 'farmer' && (crop_type || land_area)) {
      userData.farm = {
        cropType: crop_type ? [crop_type] : [],
        area: {
          value: land_area ? parseFloat(land_area) : 0,
          unit: 'hectares'
        }
      };
    }

    // Create user
    const user = await User.create(userData);

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Remove password from response
    user.password = undefined;

    logAuthEvent('USER_REGISTERED', user._id, { role: user.role }, req);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: user
    });
  } catch (error) {
    logSecurityEvent('REGISTRATION_FAILED', { error: error.message, email: req.body.email }, req);
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findByEmail(email);
    if (!user) {
      logSecurityEvent('LOGIN_FAILED_INVALID_EMAIL', { email }, req);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', { userId: user._id }, req);
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', {
        userId: user._id,
        attempts: user.security.loginAttempts
      }, req);

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.status.lastLogin = new Date();
    user.status.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Remove password from response
    user.password = undefined;

    logAuthEvent('USER_LOGGED_IN', user._id, { role: user.role }, req);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: user
    });
  } catch (error) {
    logSecurityEvent('LOGIN_ERROR', { error: error.message, email: req.body.email }, req);
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    logAuthEvent('USER_LOGGED_OUT', req.user._id, {}, req);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      'preferences.language': req.body.preferences?.language,
      'preferences.theme': req.body.preferences?.theme,
      'preferences.units': req.body.preferences?.units
    };

    // Handle profile updates
    if (req.body.profile) {
      fieldsToUpdate.profile = req.body.profile;
    }

    // Handle farm updates (farmers only)
    if (req.user.role === 'farmer' && req.body.farm) {
      fieldsToUpdate.farm = req.body.farm;
    }

    // Handle urban profile updates (urban planners only)
    if (req.user.role === 'urban' && req.body.urbanProfile) {
      fieldsToUpdate.urbanProfile = req.body.urbanProfile;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logAuthEvent('PASSWORD_CHANGED', user._id, {}, req);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // In a real application, you would send an email here
    // For demo purposes, we'll just log the token
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // Hash token to match stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      'security.passwordResetToken': resetPasswordToken,
      'security.passwordResetExpires': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();

    // Generate new JWT token
    const jwtToken = user.getSignedJwtToken();

    logAuthEvent('PASSWORD_RESET', user._id, {}, req);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: jwtToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      'verification.emailToken': token,
      'verification.emailTokenExpires': { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    user.verification.isEmailVerified = true;
    user.verification.emailToken = undefined;
    user.verification.emailTokenExpires = undefined;
    await user.save();

    logAuthEvent('EMAIL_VERIFIED', user._id, {}, req);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
const resendVerification = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.verification.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    user.verification.emailToken = crypto.randomBytes(32).toString('hex');
    user.verification.emailTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // In a real application, you would send an email here
    logger.info(`Verification email resent to ${user.email}. Token: ${user.verification.emailToken}`);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Demo login (development only)
 * @route   POST /api/auth/demo-login
 * @access  Public
 */
const demoLogin = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    // Find demo user or create default one
    let demoUser = DEMO_USERS.find(u =>
      u.email === email || (role && u.role === role)
    );

    if (!demoUser) {
      demoUser = DEMO_USERS[0]; // Default to farmer
    }

    // Check if demo user exists in database
    let user = await User.findOne({ email: demoUser.email });

    if (!user) {
      // Create demo user
      user = await User.create({
        ...demoUser,
        status: {
          isActive: true,
          isVerified: true
        },
        verification: {
          isEmailVerified: true,
          isPhoneVerified: true
        }
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Update last login
    user.status.lastLogin = new Date();
    user.status.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    // Remove password from response
    user.password = undefined;

    logAuthEvent('DEMO_LOGIN', user._id, { role: user.role }, req);

    res.status(200).json({
      success: true,
      message: 'Demo login successful',
      token,
      data: user
    });
  } catch (error) {
    logSecurityEvent('DEMO_LOGIN_ERROR', { error: error.message }, req);
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  demoLogin
};
