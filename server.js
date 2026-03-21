/**
 * AgriUrbanAI Backend Server
 * Integrated with MongoDB and Auth Controller
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', 'env.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getDatabase } = require('./database');
const authController = require('./auth.controller');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Database
const db = getDatabase();

// Authentication Middleware
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // In a real app, verify JWT here. 
    // For now, we'll validate it via the controller's logic or just pass through if we trust the token structure.
    // But better to use a proper JWT verification middleware.
    // Let's use a simple check for now, assuming the token contains the user ID.
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    req.userId = decoded.id;
    
    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0-mongo',
    dbConnected: db.isConnected
  });
});

// Auth Routes
app.post('/api/auth/login', authController.login);
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/logout', authController.logout);
app.get('/api/auth/me', auth, authController.getProfile);
app.post('/api/auth/change-password', auth, authController.changePassword);

// Demo login (special endpoint for quick access - keeps compatibility)
app.post('/api/auth/demo-login', async (req, res) => {
  const { email, role } = req.body;
  
  // Try to find user in DB
  let user = await db.authenticateUser(email, "demo"); // Assuming demo password for demo users
  
  if (!user) {
     // If not found, try to find any user with the role
     // This is a bit hacky, but preserves the "demo" feel if needed.
     // Better to just fail if not found.
     return res.status(401).json({
         success: false,
         error: 'Demo user not found. Please signup.'
     });
  }

  const token = require('./generateTokens').generateAccessToken(user.id);

  res.json({
    success: true,
    message: 'Demo login successful',
    token: token,
    data: user
  });
});

// Dashboard data (Mock data for now, can be moved to DB later)
const demoDashboardData = {
  overview: {
    farms: {
      totalFarms: 1,
      totalArea: 2.5,
      avgYield: 4.2
    },
    alerts: {
      active: 3,
      emergency: 1,
      total: 12
    },
    weather: {
      avgTemp: 28,
      avgHumidity: 65,
      rainfall: 12,
      forecast: [
        { day: "Today", condition: "Partly Cloudy", rain_chance: 10, temp: 38, icon: "☁️", humidity: 65, wind: 12 },
        { day: "Tomorrow", condition: "Partly Cloudy", rain_chance: 85, temp: 32, icon: "⛈️", humidity: 70, wind: 15 },
        { day: "Friday", condition: "Scattered T-Storms", rain_chance: 40, temp: 33, icon: "⛈️", humidity: 85, wind: 20 },
        { day: "Saturday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 45, wind: 10 },
        { day: "Sunday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 40, wind: 8 },
        { day: "Monday", condition: "Sunny", rain_chance: 0, temp: 37, icon: "☀️", humidity: 38, wind: 9 },
        { day: "Tuesday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 42, wind: 11 }
      ]
    }
  },
  recentAlerts: [
    { title: 'Severe Heatwave', message: 'Temperature exceeding 38°C today. Stay hydrated.', type: 'weather', priority: 'high' },
    { title: 'Heavy Rainfall Warning', message: '85% chance of thunderstorms tomorrow', type: 'weather', priority: 'high' },
    { title: 'Crop Health Alert', message: 'Soil moisture levels dropping in South Sector', type: 'crop', priority: 'medium' },
    { title: 'Urban Flood Risk', message: 'Sector 18 underpass at high risk', type: 'urban', priority: 'high' }
  ],
  charts: {
    cropHealth: {
      labels: ['Healthy', 'At Risk', 'Critical'],
      data: [75, 20, 5]
    },
    weatherTrends: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      temperature: [25, 28, 30, 29, 27, 26, 28],
      rainfall: [0, 0, 10, 5, 0, 0, 0]
    }
  }
};

app.get('/api/analytics/dashboard', auth, (req, res) => {
  res.json({
    status: 'success',
    data: demoDashboardData
  });
});

// Weather trends
app.get('/api/analytics/weather-trends', auth, (req, res) => {
  res.json({
    status: 'success',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Temperature (°C)',
        data: [25, 28, 32, 35, 38, 36, 34],
        borderColor: '#E74C3C',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
      }, {
        label: 'Rainfall (mm)',
        data: [12, 8, 15, 22, 18, 25, 20],
        borderColor: '#3498DB',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
      }]
    }
  });
});

// Crop health analytics
app.get('/api/analytics/crop-health', auth, (req, res) => {
  res.json({
    status: 'success',
    data: {
      labels: ['Healthy', 'At Risk', 'Critical'],
      datasets: [{
        data: [75, 20, 5],
        backgroundColor: ['#2ECC71', '#F39C12', '#E74C3C'],
      }]
    }
  });
});

// Alert Routes
app.post('/api/alerts/trigger', auth, async (req, res) => {
  const { exec } = require('child_process');
  const path = require('path');
  
  // Try to find alerts.py - check multiple locations for robustness
  const locations = [
    path.join(__dirname, 'backend', 'Alert', 'alerts.py'),
    path.join(__dirname, 'backend', 'alerts.py'),
    path.join(__dirname, 'Alert', 'alerts.py')
  ];
  
  let scriptPath = '';
  const fs = require('fs');
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      scriptPath = loc;
      break;
    }
  }

  if (!scriptPath) {
    console.error('❌ alert script NOT found in any location:', locations);
    // Fallback if script missing: return simulated success for demo
    return res.status(200).json({
      success: true,
      message: 'Demo mode: Alert script not found, simulating success.',
      output: JSON.stringify({ status: 'processed', risk: 'flood', details: [{user: 'Demo User', status: 'queued'}] })
    });
  }

  const scriptDir = path.dirname(scriptPath);
  console.log(`Executing alert script: ${scriptPath}`);

  exec(`python "${path.basename(scriptPath)}"`, { cwd: scriptDir }, async (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ success: false, error: 'Failed to execute alert script', details: error.message });
    }
    
    if (stderr) console.warn(`stderr: ${stderr}`);
    
    // Save to DB if possible
    try {
      const pyResult = JSON.parse(stdout);
      await db.createAlert(req.userId || 'demo-user', {
        title: `Emergency ${pyResult.risk || 'Alert'}`,
        message: `Broadcast sent to ${pyResult.details ? pyResult.details.length : 0} recipients.`,
        type: 'system',
        priority: 'high',
        risk_level: (pyResult.risk || 'high').charAt(0).toUpperCase() + (pyResult.risk || 'high').slice(1)
      });
    } catch(e) {
      console.warn("Failed to parse script output or save to DB:", e);
    }

    res.json({
      success: true,
      message: 'Emergency alert sequence initiated.',
      output: stdout
    });
  });
});

// Get user alerts
app.get('/api/alerts/user', auth, async (req, res) => {
  try {
    const alerts = await db.getActiveAlerts(req.userId);
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// Disaster Report Routes
app.post('/api/disaster-reports', async (req, res) => {
  try {
    const reportData = req.body;
    
    // Validate required fields (basic validation)
    if (!reportData.severity && !reportData.resources && !reportData.sos) {
       return res.status(400).json({ success: false, error: 'Missing report details' });
    }

    const reportId = await db.createDisasterReport(reportData);
    
    res.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: reportId
    });
  } catch (error) {
    console.error('Error submitting disaster report:', error);
    res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
});

app.get('/api/disaster-reports', auth, async (req, res) => {
  try {
    const reports = await db.getActiveDisasterReports();
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching disaster reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

app.post('/api/disaster-reports/archive', auth, async (req, res) => {
  try {
    // Optional: Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'demo') { // Allowing demo for testing
         return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await db.archiveAllDisasterReports();
    res.json({
      success: true,
      message: 'All reports archived'
    });
  } catch (error) {
    console.error('Error archiving reports:', error);
    res.status(500).json({ success: false, error: 'Failed to archive reports' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AgriUrbanAI Backend Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database Status: ${db.isConnected ? 'Connected' : 'Connecting...'}`);
});

module.exports = app;

