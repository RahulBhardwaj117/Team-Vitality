/**
 * Logging Middleware
 * Handles request logging and application logging for AgriUrbanAI
 */

const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'agriurbanai-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    )
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusCategory = Math.floor(statusCode / 100);

    let level = 'info';
    if (statusCategory === 4) level = 'warn';
    if (statusCategory === 5) level = 'error';

    logger.log(level, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

// Security event logging
const logSecurityEvent = (type, details, req = null) => {
  logger.warn(`Security Event: ${type}`, {
    type,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    url: req?.url,
    timestamp: new Date().toISOString()
  });
};

// Authentication logging
const logAuthEvent = (event, userId, details = {}, req = null) => {
  logger.info(`Auth Event: ${event}`, {
    event,
    userId,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

// API usage logging
const logApiUsage = (endpoint, method, userId, responseTime, statusCode, req) => {
  logger.info('API Usage', {
    endpoint,
    method,
    userId,
    responseTime: `${responseTime}ms`,
    statusCode,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
};

// Error logging utility
const logError = (error, context = {}, req = null) => {
  logger.error('Application Error', {
    error: error.message || error,
    stack: error.stack,
    context,
    ip: req?.ip,
    url: req?.url,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

// Performance logging
const logPerformance = (operation, duration, details = {}) => {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString()
  });
};

// Database operation logging
const logDatabaseOperation = (operation, collection, duration, details = {}) => {
  logger.debug(`Database: ${operation}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString()
  });
};

// Weather service logging
const logWeatherService = (operation, location, status, details = {}) => {
  logger.info(`Weather Service: ${operation}`, {
    operation,
    location,
    status,
    details,
    timestamp: new Date().toISOString()
  });
};

// Alert system logging
const logAlertSystem = (event, alertId, details = {}) => {
  logger.info(`Alert System: ${event}`, {
    event,
    alertId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Log rotation and cleanup
const cleanupOldLogs = () => {
  const logFiles = [
    path.join(logsDir, 'combined.log'),
    path.join(logsDir, 'error.log')
  ];

  logFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtime.getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (age > maxAge) {
        // Create backup and clear file
        const backupPath = `${filePath}.${Date.now()}.bak`;
        fs.renameSync(filePath, backupPath);
        logger.info(`Log file rotated: ${filePath} -> ${backupPath}`);
      }
    }
  });
};

// Schedule log cleanup (run daily)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // Daily
}

module.exports = {
  logger,
  requestLogger,
  logSecurityEvent,
  logAuthEvent,
  logApiUsage,
  logError,
  logPerformance,
  logDatabaseOperation,
  logWeatherService,
  logAlertSystem,
  cleanupOldLogs
};
