/**
 * AgriUrbanAI Backend Server
 * Main entry point for the AgriUrbanAI platform API
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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
const { protect } = require('./middleware/authMiddleware'); // Added: Protect middleware
const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const userRoutes = require('./routes/userRoutes');
const farmRoutes = require('./routes/farmRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

// Import Models
const DisasterReport = require('./models/DisasterReport');

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

// --- Disaster Report Routes (Inline for now) ---
// Temporary memory store for offline mode
global.mockReports = [];
app.post('/api/disaster-reports', protect, async (req, res) => {
  try {
    const reportData = req.body;
    // Basic validation
    if (!reportData.severity && !reportData.resources && !reportData.sos) {
       return res.status(400).json({ success: false, error: 'Missing report details' });
    }
    
    if (mongoose.connection.readyState !== 1) {
       const mockReport = { ...reportData, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), status: 'active' };
       global.mockReports.push(mockReport);
       logger.info('Saved report offline');
       return res.json({ success: true, message: 'Report submitted successfully (Offline mode)', reportId: mockReport._id });
    }

    const report = await DisasterReport.create(reportData);
    res.json({ success: true, message: 'Report submitted successfully', reportId: report._id });
  } catch (error) {
    logger.error('Error submitting disaster report:', error);
    res.status(500).json({ success: false, error: 'Database Error: ' + error.message });
  }
});

app.get('/api/disaster-reports', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
       return res.json({ success: true, data: global.mockReports });
    }
    const reports = await DisasterReport.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    logger.error('Error fetching disaster reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

app.post('/api/disaster-reports/archive', protect, async (req, res) => {
  try {
     // Check admin
     if (req.user.role !== 'admin' && req.user.role !== 'demo') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
     }
     if (mongoose.connection.readyState !== 1) {
        global.mockReports = [];
        return res.json({ success: true, message: 'All offline reports archived' });
     }
     await DisasterReport.updateMany({ status: 'active' }, { status: 'archived' });
     res.json({ success: true, message: 'All reports archived' });
  } catch (error) {
    logger.error('Error archiving reports:', error);
    res.status(500).json({ success: false, error: 'Failed to archive reports' });
  }
});

// --- Community Report Routes (Inline for now) ---
const CommunityReport = require('./models/CommunityReport');
global.mockCommunityReports = [];

app.post('/api/community-reports', async (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData.type || !reportData.description) {
      return res.status(400).json({ success: false, error: 'Missing report details' });
    }

    if (mongoose.connection.readyState !== 1) {
      const mockReport = { ...reportData, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), status: 'active' };
      global.mockCommunityReports.push(mockReport);
      logger.info('Saved community report offline');
      return res.json({ success: true, message: 'Report submitted successfully (Offline mode)', reportId: mockReport._id });
    }

    const report = await CommunityReport.create(reportData);
    res.json({ success: true, message: 'Report submitted successfully', reportId: report._id });
  } catch (error) {
    logger.error('Error submitting community report:', error);
    res.status(500).json({ success: false, error: 'Database Error: ' + error.message });
  }
});

app.get('/api/community-reports', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(global.mockCommunityReports.slice(-20).reverse());
    }
    const reports = await CommunityReport.find({ status: 'active' }).sort({ createdAt: -1 }).limit(20);
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching community reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

app.post('/api/community-reports/archive', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'demo') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (mongoose.connection.readyState !== 1) {
      global.mockCommunityReports = [];
      return res.json({ success: true, message: 'All offline community reports archived' });
    }
    await CommunityReport.updateMany({ status: 'active' }, { status: 'archived' });
    res.json({ success: true, message: 'All community reports archived' });
  } catch (error) {
    logger.error('Error archiving community reports:', error);
    res.status(500).json({ success: false, error: 'Failed to archive reports' });
  }
});


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
