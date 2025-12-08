/**
 * Simple AgriUrbanAI Backend Server (No Database Dependencies)
 * For testing and demo purposes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data store
let demoUsers = [
  {
    id: 1,
    email: 'farmer@agriurban.ai',
    password: 'farmer123',
    role: 'farmer',
    name: 'Demo Farmer',
    token: 'demo-token-farmer'
  },
  {
    id: 2,
    email: 'urban@agriurban.ai',
    password: 'urban123',
    role: 'urban',
    name: 'Demo City Planner',
    token: 'demo-token-urban'
  },
  {
    id: 3,
    email: 'admin@agriurban.ai',
    password: 'admin123',
    role: 'admin',
    name: 'Demo Administrator',
    token: 'demo-token-admin'
  }
];

// Demo dashboard data
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
        { day: "Today", condition: "Partly Cloudy", rain_chance: 10, temp: 32, icon: "☁️", humidity: 65, wind: 12 },
        { day: "Tomorrow", condition: "Partly Cloudy", rain_chance: 25, temp: 32, icon: "🌤️", humidity: 70, wind: 15 },
        { day: "Friday", condition: "Scattered T-Storms", rain_chance: 40, temp: 33, icon: "⛈️", humidity: 85, wind: 20 },
        { day: "Saturday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 45, wind: 10 },
        { day: "Sunday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 40, wind: 8 },
        { day: "Monday", condition: "Sunny", rain_chance: 0, temp: 37, icon: "☀️", humidity: 38, wind: 9 },
        { day: "Tuesday", condition: "Sunny", rain_chance: 0, temp: 36, icon: "☀️", humidity: 42, wind: 11 }
      ]
    }
  },
  recentAlerts: [
    { title: 'Heavy Rainfall Warning', message: '40% chance of thunderstorms tomorrow', type: 'weather', priority: 'high' },
    { title: 'Crop Health Alert', message: 'Soil moisture levels dropping', type: 'crop', priority: 'medium' },
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

// Simple authentication middleware
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  const user = demoUsers.find(u => u.token === token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  req.user = user;
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0-simple'
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = demoUsers.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  res.json({
    success: true,
    message: 'Login successful',
    token: user.token,
    data: user
  });
});

// Dashboard data
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

// User profile
app.get('/api/auth/me', auth, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Logout
app.post('/api/auth/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Simple AgriUrbanAI Backend Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Available credentials:`);
  demoUsers.forEach(user => {
    console.log(`   ${user.role}: ${user.email} / ${user.password}`);
  });
});
