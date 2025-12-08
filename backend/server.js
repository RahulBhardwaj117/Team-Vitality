/**
 * AgriUrbanAI Backend Server
 * Main entry point for the AgriUrbanAI platform API
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'env.env') });
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const socketIo = require('socket.io');
const http = require('http');

// Import custom middleware and routes
const { errorHandler } = require('./middleware/errorMiddleware');
const { logger, requestLogger } = require('./middleware/loggingMiddleware');
const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const userRoutes = require('./routes/userRoutes');
const farmRoutes = require('./routes/farmRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Import services
const { initializeWeatherService } = require('./services/weatherService');
const { initializeSocketService } = require('./services/socketService');
const { scheduleJobs } = require('./services/schedulerService');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
// Connect to MongoDB
const connectDB = async () => {
  try {
    const formattedUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agriurbanai';
    const maskedUri = formattedUri.replace(/:([^:@]+)@/, ':****@');
    console.log('DEBUG: Attempting to connect to:', maskedUri);

    const conn = await mongoose.connect(formattedUri, {
      serverSelectionTimeoutMS: 5000,
      family: 4 // Force IPv4
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('DEBUG: Full Connection Error:', error);
    logger.error('Database connection error:', error.message);
    logger.warn('Running in offline mode (no database connection)');
    // process.exit(1); // Don't exit, allow server to run without DB
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://api.openweathermap.org", "wss:", "ws:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Compression middleware
app.use(compression());

// CORS configuration - Allow all origins in development (including file://)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Documentation
if (process.env.NODE_ENV === 'development') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swaggerConfig');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatbotRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize weather service
    try {
      await initializeWeatherService();
      logger.info('Weather service initialized');
    } catch (error) {
      logger.error('Weather service initialization failed:', error.message);
      logger.warn('Continuing without weather service...');
    }

    // Initialize socket service
    try {
      initializeSocketService(io);
      logger.info('Socket service initialized');
    } catch (error) {
      logger.error('Socket service initialization failed:', error.message);
      logger.warn('Continuing without socket service...');
    }

    // Schedule background jobs
    try {
      scheduleJobs();
      logger.info('Scheduler initialized');
    } catch (error) {
      logger.error('Scheduler initialization failed:', error.message);
      logger.warn('Continuing without scheduler...');
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Error initializing services:', error);
    // Don't exit - allow server to run even if some services fail
    logger.warn('Server starting with limited functionality');
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
    name: err.name
  });
  console.error('Full error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  initializeServices().then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
        logger.info(`Try: PORT=5001 npm start`);
      } else {
        logger.error('Server startup error:', err);
      }
      process.exit(1);
    });
  }).catch((err) => {
    logger.error('Failed to initialize services:', err);
    process.exit(1);
  });
}

module.exports = { app, server, io };
