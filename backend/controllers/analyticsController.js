const catchAsync = require('../utils/catchAsync');

const Farm = require('../models/Farm');
const Alert = require('../models/Alert');
const Weather = require('../models/Weather');

exports.getAnalyticsDashboard = catchAsync(async (req, res) => {
  // Get farm statistics
  const farmStats = await Farm.aggregate([
    {
      $group: {
        _id: null,
        totalFarms: { $sum: 1 },
        totalArea: { $sum: '$area' },
        avgYield: { $avg: '$yield.amount' }
      }
    }
  ]);

  // Get alert statistics
  const alertStats = await Alert.getStats();

  // Get recent active alerts
  const recentAlerts = await Alert.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title message type priority createdAt');

  // Get weather summary (mocked for now as it depends on location)
  const weatherSummary = {
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
  };

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        farms: farmStats[0] || { totalFarms: 0, totalArea: 0, avgYield: 0 },
        alerts: {
          active: alertStats.active,
          emergency: alertStats.emergency,
          total: alertStats.total
        },
        weather: weatherSummary
      },
      recentAlerts,
      charts: {
        cropHealth: {
          labels: ['Healthy', 'At Risk', 'Critical'],
          data: [75, 20, 5]
        },
        weatherTrends: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          temperature: [25, 28, 30, 29, 27, 26, 28],
          rainfall: [0, 0, 10, 5, 0, 0, 0]
        }
      }
    }
  });
});

exports.getWeatherTrends = catchAsync(async (req, res) => {
  const data = {
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
  };

  res.status(200).json({
    status: 'success',
    data
  });
});

exports.getCropHealthAnalytics = catchAsync(async (req, res) => {
  const data = {
    labels: ['Healthy', 'At Risk', 'Critical'],
    datasets: [{
      data: [75, 20, 5],
      backgroundColor: ['#2ECC71', '#F39C12', '#E74C3C'],
    }]
  };

  res.status(200).json({
    status: 'success',
    data
  });
});

exports.getFloodPrediction = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      riskLevel: 'Low',
      probability: 15
    }
  });
});

exports.getYieldPrediction = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      expectedYield: '4.2 tons/hectare',
      confidence: 85
    }
  });
});

exports.getHistoricalData = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: []
  });
});
