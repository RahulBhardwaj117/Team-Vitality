/**
 * Socket Service
 * Handles real-time communication using Socket.IO
 */

const socketIo = require('socket.io');
const User = require('../models/User');
const Alert = require('../models/Alert');
const Weather = require('../models/Weather');
const { logger, logAuthEvent } = require('../middleware/loggingMiddleware');

/**
 * Initialize Socket.IO service
 */
const initializeSocketService = (io) => {
  logger.info('Initializing Socket.IO service...');

  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id);
      if (!user || !user.status.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user._id;
      socket.userRole = user.role;
      socket.userName = user.name;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userName} (${socket.userId})`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join user to role-based rooms
    socket.join(`role_${socket.userRole}`);
    socket.join('public_alerts');

    // Handle user joining location-based room
    socket.on('join-location', (locationData) => {
      const { district, state } = locationData;
      const locationRoom = `location_${district}_${state}`.replace(/\s+/g, '_');
      socket.join(locationRoom);
      logger.info(`User ${socket.userName} joined location room: ${locationRoom}`);
    });

    // Handle user leaving location-based room
    socket.on('leave-location', (locationData) => {
      const { district, state } = locationData;
      const locationRoom = `location_${district}_${state}`.replace(/\s+/g, '_');
      socket.leave(locationRoom);
      logger.info(`User ${socket.userName} left location room: ${locationRoom}`);
    });

    // Handle real-time weather updates subscription
    socket.on('subscribe-weather', (locationData) => {
      const { coordinates } = locationData;
      const weatherRoom = `weather_${coordinates[0]}_${coordinates[1]}`;
      socket.join(weatherRoom);
      logger.info(`User ${socket.userName} subscribed to weather updates: ${weatherRoom}`);

      // Send current weather data
      sendCurrentWeatherToUser(socket, coordinates);
    });

    // Handle weather updates unsubscription
    socket.on('unsubscribe-weather', (locationData) => {
      const { coordinates } = locationData;
      const weatherRoom = `weather_${coordinates[0]}_${coordinates[1]}`;
      socket.leave(weatherRoom);
      logger.info(`User ${socket.userName} unsubscribed from weather updates: ${weatherRoom}`);
    });

    // Handle alert acknowledgment
    socket.on('acknowledge-alert', async (alertId) => {
      try {
        const alert = await Alert.findById(alertId);
        if (alert) {
          await alert.recordResponse(socket.userId, 'acknowledged');
          socket.emit('alert-acknowledged', { alertId, success: true });
          logger.info(`Alert ${alertId} acknowledged by user ${socket.userName}`);
        }
      } catch (error) {
        logger.error('Error acknowledging alert:', error);
        socket.emit('alert-acknowledged', { alertId, success: false, error: error.message });
      }
    });

    // Handle user typing indicator (for chat features)
    socket.on('typing', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        typing: data.typing
      });
    });

    // Handle user status updates
    socket.on('update-status', (status) => {
      socket.userStatus = status;
      logger.info(`User ${socket.userName} status updated: ${status}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.userName} (${socket.userId}) - Reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userName}:`, error);
    });
  });

  // Set up periodic broadcasts
  setupPeriodicBroadcasts(io);

  logger.info('Socket.IO service initialized successfully');
};

/**
 * Send current weather data to a specific user
 */
const sendCurrentWeatherToUser = async (socket, coordinates) => {
  try {
    const weatherData = await Weather.findOne({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: 10000
        }
      }
    }).sort({ 'metadata.lastUpdated': -1 });

    if (weatherData) {
      socket.emit('weather-update', {
        type: 'current',
        data: weatherData,
        timestamp: new Date()
      });
    }
  } catch (error) {
    logger.error('Error sending weather data to user:', error);
  }
};

/**
 * Broadcast weather updates to all connected clients
 */
const broadcastWeatherUpdate = (weatherData) => {
  const io = global.io;
  if (!io) return;

  const weatherRoom = `weather_${weatherData.location.coordinates[0]}_${weatherData.location.coordinates[1]}`;

  io.to(weatherRoom).emit('weather-update', {
    type: 'update',
    data: weatherData,
    timestamp: new Date()
  });

  logger.info(`Weather update broadcasted to room: ${weatherRoom}`);
};

/**
 * Broadcast alert to relevant users
 */
const broadcastAlert = (alert) => {
  const io = global.io;
  if (!io) return;

  // Send to users in target locations
  if (alert.target.locations) {
    alert.target.locations.forEach(location => {
      const locationRoom = `location_${location.district}_${location.state}`.replace(/\s+/g, '_');
      io.to(locationRoom).emit('new-alert', {
        type: 'weather-alert',
        data: alert,
        timestamp: new Date()
      });
    });
  }

  // Send to users with specific roles
  if (alert.target.roles) {
    alert.target.roles.forEach(role => {
      io.to(`role_${role}`).emit('new-alert', {
        type: 'role-alert',
        data: alert,
        timestamp: new Date()
      });
    });
  }

  // Send to specific users
  if (alert.target.users) {
    alert.target.users.forEach(userId => {
      io.to(`user_${userId}`).emit('new-alert', {
        type: 'personal-alert',
        data: alert,
        timestamp: new Date()
      });
    });
  }

  // Send to public alerts room
  io.to('public_alerts').emit('new-alert', {
    type: 'public-alert',
    data: alert,
    timestamp: new Date()
  });

  logger.info(`Alert broadcasted: ${alert.title} (${alert._id})`);
};

/**
 * Send notification to specific user
 */
const sendNotificationToUser = (userId, notification) => {
  const io = global.io;
  if (!io) return;

  io.to(`user_${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date()
  });

  logger.info(`Notification sent to user ${userId}: ${notification.title}`);
};

/**
 * Broadcast system status
 */
const broadcastSystemStatus = (status) => {
  const io = global.io;
  if (!io) return;

  io.emit('system-status', {
    ...status,
    timestamp: new Date()
  });

  logger.info('System status broadcasted');
};

/**
 * Set up periodic broadcasts
 */
const setupPeriodicBroadcasts = (io) => {
  // Broadcast system status every 5 minutes
  setInterval(async () => {
    try {
      const systemStatus = await getSystemStatus();
      broadcastSystemStatus(systemStatus);
    } catch (error) {
      logger.error('Error broadcasting system status:', error);
    }
  }, 5 * 60 * 1000);

  // Clean up inactive connections every 10 minutes
  setInterval(() => {
    const connectedSockets = io.sockets.sockets;
    let inactiveCount = 0;

    connectedSockets.forEach(socket => {
      if (!socket.userStatus || socket.userStatus === 'away') {
        inactiveCount++;
      }
    });

    logger.info(`Socket cleanup: ${connectedSockets.size} total connections, ${inactiveCount} inactive`);
  }, 10 * 60 * 1000);
};

/**
 * Get system status for broadcasting
 */
const getSystemStatus = async () => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalAlerts,
      activeAlerts,
      totalWeatherRecords
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'status.isActive': true }),
      Alert.countDocuments(),
      Alert.countDocuments({ status: 'active' }),
      Weather.countDocuments()
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      alerts: {
        total: totalAlerts,
        active: activeAlerts
      },
      weather: {
        records: totalWeatherRecords
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      }
    };
  } catch (error) {
    logger.error('Error getting system status:', error);
    return {
      error: 'Unable to retrieve system status',
      timestamp: new Date()
    };
  }
};

/**
 * Handle user login (emit to other sessions)
 */
const handleUserLogin = (userId) => {
  const io = global.io;
  if (!io) return;

  io.to(`user_${userId}`).emit('user-login', {
    userId,
    timestamp: new Date()
  });

  logger.info(`User login broadcasted: ${userId}`);
};

/**
 * Handle user logout (emit to other sessions)
 */
const handleUserLogout = (userId) => {
  const io = global.io;
  if (!io) return;

  io.to(`user_${userId}`).emit('user-logout', {
    userId,
    timestamp: new Date()
  });

  logger.info(`User logout broadcasted: ${userId}`);
};

/**
 * Send real-time weather update to subscribers
 */
const sendWeatherUpdate = (location, weatherData) => {
  const io = global.io;
  if (!io) return;

  const weatherRoom = `weather_${location.coordinates[0]}_${location.coordinates[1]}`;

  io.to(weatherRoom).emit('weather-update', {
    type: 'realtime-update',
    data: weatherData,
    location: location,
    timestamp: new Date()
  });

  logger.info(`Real-time weather update sent to room: ${weatherRoom}`);
};

/**
 * Send emergency alert to all users
 */
const sendEmergencyAlert = (alertData) => {
  const io = global.io;
  if (!io) return;

  io.emit('emergency-alert', {
    ...alertData,
    timestamp: new Date(),
    priority: 'emergency'
  });

  logger.warn(`Emergency alert broadcasted: ${alertData.title}`);
};

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => {
  const io = global.io;
  if (!io) return 0;

  return io.sockets.sockets.size;
};

/**
 * Get users in specific room
 */
const getUsersInRoom = (roomName) => {
  const io = global.io;
  if (!io) return [];

  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? Array.from(room) : [];
};

module.exports = {
  initializeSocketService,
  broadcastWeatherUpdate,
  broadcastAlert,
  sendNotificationToUser,
  broadcastSystemStatus,
  handleUserLogin,
  handleUserLogout,
  sendWeatherUpdate,
  sendEmergencyAlert,
  getConnectedUsersCount,
  getUsersInRoom
};
