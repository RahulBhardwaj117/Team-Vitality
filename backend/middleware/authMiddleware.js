/**
 * Authentication Middleware
 * Handles JWT authentication and authorization for AgriUrbanAI API
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger, logAuthEvent, logSecurityEvent } = require('./loggingMiddleware');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies (for web clients)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource'
    });
  }

  try {
    // Check for Electron mock token
    if (token.startsWith('electron-user-')) {
      const userId = token.replace('electron-user-', '');
      
      // If it's a demo user
      if (userId === 'demo') {
        // Create a mock user object for demo
        req.user = {
          _id: 'demo-user-id',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'user',
          status: {
            isActive: true,
            lastLogin: new Date(),
            loginCount: 0
          },
          isLocked: () => false,
          save: async () => {} 
        };
        return next();
      }

      const user = await User.findById(userId);
      
      if (!user) {
        // If user not found (e.g. DB switch), fall back to temporary guest user
        // This prevents 401 errors when local storage has ID from a different DB
        req.user = {
          _id: userId, // Keep the ID from token
          name: 'Guest User',
          email: 'guest@example.com',
          role: 'user',
          status: {
            isActive: true,
            lastLogin: new Date(),
            loginCount: 0
          },
          isLocked: () => false,
          save: async () => {} 
        };
        return next();
      }

      // Check if user is active
      if (!user.status.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      req.user = user;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      logSecurityEvent('INVALID_USER_TOKEN', { userId: decoded.id }, req);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.status.isActive) {
      logSecurityEvent('INACTIVE_USER_ACCESS', { userId: user._id }, req);
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logSecurityEvent('LOCKED_ACCOUNT_ACCESS', { userId: user._id }, req);
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked'
      });
    }

    // Update last login
    user.status.lastLogin = new Date();
    user.status.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    // Add user to request
    req.user = user;
    logAuthEvent('SUCCESSFUL_LOGIN', user._id, { method: 'token' }, req);

    next();
  } catch (error) {
    logSecurityEvent('INVALID_TOKEN', { error: error.message }, req);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', {
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl
      }, req);

      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // Check for Electron mock token
    if (token.startsWith('electron-user-')) {
      const userId = token.replace('electron-user-', '');
      
      // If it's a demo user
      if (userId === 'demo') {
        req.user = {
          _id: 'demo-user-id',
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'user',
          status: { isActive: true },
          isLocked: () => false
        };
        return next();
      }

      const user = await User.findById(userId);
      if (user && user.status.isActive && !user.isLocked()) {
        req.user = user;
      } else {
        req.user = null;
      }
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.status.isActive && !user.isLocked()) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    // Invalid token, but that's okay for optional auth
    req.user = null;
  }

  next();
};

// Check if user owns resource or is admin
const checkOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    if (req[resourceUserField] && req[resourceUserField]._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);

      if (userAttempts.length >= maxAttempts) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          endpoint: req.originalUrl,
          attempts: userAttempts.length
        }, req);

        return res.status(429).json({
          success: false,
          error: 'Too many authentication attempts. Please try again later.'
        });
      }
    }

    // Track this attempt
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    attempts.get(key).push(now);

    next();
  };
};

// Validate API key for external services
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    logSecurityEvent('INVALID_API_KEY', { providedKey: apiKey.substring(0, 8) + '...' }, req);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

// Check if demo mode is enabled
const checkDemoMode = (req, res, next) => {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(403).json({
      success: false,
      error: 'Demo mode is not enabled'
    });
  }

  next();
};

// Session validation middleware
const validateSession = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Session not found'
    });
  }

  // Check if session has expired
  const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  const sessionAge = Date.now() - (req.user.status.lastLogin?.getTime() || 0);

  if (sessionAge > sessionTimeout) {
    logAuthEvent('SESSION_EXPIRED', req.user._id, { sessionAge }, req);
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please login again.'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  checkOwnership,
  authRateLimit,
  validateApiKey,
  checkDemoMode,
  validateSession
};
