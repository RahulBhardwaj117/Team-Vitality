/**
 * Database Seeding Script
 * Seeds the database with initial data for development and testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Weather = require('../models/Weather');
const Alert = require('../models/Alert');
const { logger } = require('../middleware/loggingMiddleware');

// Demo users data
const DEMO_USERS = [
  {
    name: 'Demo Farmer',
    email: 'farmer@agriurban.ai',
    password: 'farmer123',
    role: 'farmer',
    phone: '+919876543210',
    profile: {
      address: {
        street: '123 Farm Road',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        country: 'India'
      },
      emergencyContact: {
        name: 'Rajesh Kumar',
        phone: '+919876543211',
        relationship: 'Brother'
      }
    },
    farm: {
      name: 'Green Valley Wheat Farm',
      location: {
        type: 'Point',
        coordinates: [77.52, 28.52]
      },
      area: {
        value: 2.5,
        unit: 'hectares'
      },
      cropType: ['Wheat', 'Rice', 'Sugarcane'],
      soilType: 'Alluvial',
      irrigationType: 'Drip Irrigation',
      farmingMethod: 'modern'
    },
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: {
        email: true,
        sms: true,
        push: true,
        weather: true,
        alerts: true
      },
      units: {
        temperature: 'celsius',
        area: 'hectares',
        rainfall: 'mm'
      }
    },
    status: {
      isActive: true,
      isVerified: true
    },
    verification: {
      isEmailVerified: true,
      isPhoneVerified: true
    }
  },
  {
    name: 'Demo City Planner',
    email: 'urban@agriurban.ai',
    password: 'urban123',
    role: 'urban',
    phone: '+919876543220',
    urbanProfile: {
      zone: 'Sector 18',
      department: 'Urban Planning & Development',
      jurisdiction: 'Gautam Buddha Nagar',
      emergencyContact: '+911800123456',
      reportingAuthority: 'Municipal Commissioner'
    },
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: {
        email: true,
        sms: true,
        push: true,
        weather: true,
        alerts: true
      }
    },
    status: {
      isActive: true,
      isVerified: true
    },
    verification: {
      isEmailVerified: true,
      isPhoneVerified: true
    }
  },
  {
    name: 'Demo Administrator',
    email: 'admin@agriurban.ai',
    password: 'admin123',
    role: 'admin',
    phone: '+919876543230',
    preferences: {
      language: 'en',
      theme: 'dark',
      notifications: {
        email: true,
        sms: true,
        push: true,
        weather: true,
        alerts: true
      }
    },
    status: {
      isActive: true,
      isVerified: true
    },
    verification: {
      isEmailVerified: true,
      isPhoneVerified: true
    }
  }
];

// Initial weather data for monitored locations
const INITIAL_WEATHER_DATA = [
  {
    location: {
      name: 'Gautam Buddha Nagar',
      coordinates: {
        type: 'Point',
        coordinates: [77.3910, 28.5355]
      },
      district: 'Gautam Buddha Nagar',
      state: 'Uttar Pradesh',
      country: 'India'
    },
    current: {
      temperature: {
        value: 28.5,
        unit: 'celsius'
      },
      humidity: 65,
      pressure: {
        value: 1013,
        unit: 'hPa'
      },
      windSpeed: {
        value: 12,
        unit: 'kmh'
      },
      windDirection: 180,
      visibility: {
        value: 10,
        unit: 'km'
      },
      uvIndex: 6,
      condition: 'partly-cloudy',
      icon: '⛅',
      description: 'Partly cloudy',
      feelsLike: {
        value: 31,
        unit: 'celsius'
      }
    },
    forecast: [],
    metadata: {
      source: 'seed-data',
      lastUpdated: new Date(),
      updateFrequency: 30,
      dataQuality: 'good',
      confidence: 90
    }
  },
  {
    location: {
      name: 'Sector 18, Noida',
      coordinates: {
        type: 'Point',
        coordinates: [77.3250, 28.5680]
      },
      district: 'Gautam Buddha Nagar',
      state: 'Uttar Pradesh',
      country: 'India'
    },
    current: {
      temperature: {
        value: 29.2,
        unit: 'celsius'
      },
      humidity: 68,
      pressure: {
        value: 1012,
        unit: 'hPa'
      },
      windSpeed: {
        value: 8,
        unit: 'kmh'
      },
      windDirection: 200,
      visibility: {
        value: 9,
        unit: 'km'
      },
      uvIndex: 7,
      condition: 'clear',
      icon: '☀️',
      description: 'Clear sky',
      feelsLike: {
        value: 32,
        unit: 'celsius'
      }
    },
    forecast: [],
    metadata: {
      source: 'seed-data',
      lastUpdated: new Date(),
      updateFrequency: 30,
      dataQuality: 'good',
      confidence: 90
    }
  }
];

// Sample alerts for demonstration
const SAMPLE_ALERTS = [
  {
    title: 'Weather Advisory: Moderate Rain Expected',
    message: 'Moderate rainfall expected in the next 24 hours. Farmers should check drainage systems and postpone fertilizer application.',
    type: 'weather',
    category: 'farmer',
    priority: 'medium',
    severity: 'info',
    status: 'active',
    target: {
      roles: ['farmer'],
      locations: [{
        district: 'Gautam Buddha Nagar',
        state: 'Uttar Pradesh',
        coordinates: {
          type: 'Point',
          coordinates: [77.3910, 28.5355]
        },
        radius: 50
      }]
    },
    trigger: {
      source: 'automated',
      autoGenerated: true
    },
    schedule: {
      startTime: new Date(),
      duration: 1440 // 24 hours
    },
    delivery: {
      channels: [
        {
          type: 'email',
          enabled: true,
          language: 'en'
        },
        {
          type: 'push',
          enabled: true,
          language: 'en'
        }
      ]
    }
  },
  {
    title: 'Urban Flood Monitoring Alert',
    message: 'Heavy rainfall may cause waterlogging in low-lying areas. City maintenance teams should be on standby.',
    type: 'flood',
    category: 'urban',
    priority: 'high',
    severity: 'warning',
    status: 'active',
    target: {
      roles: ['urban'],
      locations: [{
        district: 'Gautam Buddha Nagar',
        state: 'Uttar Pradesh',
        coordinates: {
          type: 'Point',
          coordinates: [77.3250, 28.5680]
        },
        radius: 25
      }]
    },
    trigger: {
      source: 'automated',
      autoGenerated: true
    },
    schedule: {
      startTime: new Date(),
      duration: 480 // 8 hours
    },
    delivery: {
      channels: [
        {
          type: 'sms',
          enabled: true,
          language: 'en'
        },
        {
          type: 'push',
          enabled: true,
          language: 'en'
        }
      ]
    }
  }
];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agriurbanai', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Clear existing data
 */
const clearExistingData = async () => {
  logger.info('Clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Weather.deleteMany({}),
    Alert.deleteMany({})
  ]);

  logger.info('Existing data cleared');
};

/**
 * Seed users
 */
const seedUsers = async () => {
  logger.info('Seeding users...');

  for (const userData of DEMO_USERS) {
    try {
      const user = await User.create(userData);
      logger.info(`Created user: ${user.name} (${user.email})`);
    } catch (error) {
      logger.error(`Error creating user ${userData.email}:`, error.message);
    }
  }
};

/**
 * Seed weather data
 */
const seedWeatherData = async () => {
  logger.info('Seeding weather data...');

  for (const weatherData of INITIAL_WEATHER_DATA) {
    try {
      // Generate 7-day forecast for each location
      weatherData.forecast = generateForecast(weatherData.current.temperature.value);

      const weather = await Weather.create(weatherData);
      logger.info(`Created weather data for: ${weather.location.name}`);
    } catch (error) {
      logger.error(`Error creating weather data for ${weatherData.location.name}:`, error.message);
    }
  }
};

/**
 * Generate forecast data
 */
const generateForecast = (baseTemp) => {
  const forecast = [];

  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const tempVariation = (Math.random() - 0.5) * 8; // ±4°C variation
    const forecastTemp = baseTemp + tempVariation;

    forecast.push({
      date: date,
      temperature: {
        min: {
          value: Math.round((forecastTemp - 3) * 10) / 10,
          unit: 'celsius'
        },
        max: {
          value: Math.round((forecastTemp + 3) * 10) / 10,
          unit: 'celsius'
        }
      },
      humidity: Math.floor(50 + Math.random() * 30),
      precipitation: {
        probability: Math.floor(Math.random() * 80),
        amount: {
          value: Math.random() * 15,
          unit: 'mm'
        },
        type: Math.random() > 0.6 ? 'rain' : 'none'
      },
      condition: ['clear', 'partly-cloudy', 'cloudy', 'rain'][Math.floor(Math.random() * 4)],
      icon: ['☀️', '⛅', '☁️', '🌧️'][Math.floor(Math.random() * 4)],
      description: 'Weather forecast'
    });
  }

  return forecast;
};

/**
 * Seed alerts
 */
const seedAlerts = async () => {
  logger.info('Seeding alerts...');

  for (const alertData of SAMPLE_ALERTS) {
    try {
      const alert = await Alert.create(alertData);
      logger.info(`Created alert: ${alert.title}`);
    } catch (error) {
      logger.error(`Error creating alert ${alertData.title}:`, error.message);
    }
  }
};

/**
 * Generate statistics
 */
const generateStats = async () => {
  const stats = {
    users: await User.countDocuments(),
    weatherRecords: await Weather.countDocuments(),
    alerts: await Alert.countDocuments(),
    activeAlerts: await Alert.countDocuments({ status: 'active' }),
    timestamp: new Date()
  };

  logger.info('Database statistics:', stats);
  return stats;
};

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data (optional)
    if (process.argv.includes('--clear')) {
      await clearExistingData();
    }

    // Seed data
    await seedUsers();
    await seedWeatherData();
    await seedAlerts();

    // Generate final statistics
    const stats = await generateStats();

    logger.info('Database seeding completed successfully!');
    logger.info('Final statistics:', stats);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Statistics:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   Weather Records: ${stats.weatherRecords}`);
    console.log(`   Alerts: ${stats.alerts}`);
    console.log(`   Active Alerts: ${stats.activeAlerts}`);

    console.log('\n🔑 Demo Credentials:');
    console.log('   Farmer: farmer@agriurban.ai / farmer123');
    console.log('   Urban Planner: urban@agriurban.ai / urban123');
    console.log('   Admin: admin@agriurban.ai / admin123');

    console.log('\n🚀 You can now start the server with: npm start');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
};

/**
 * Reset database (clear all data and reseed)
 */
const resetDatabase = async () => {
  process.argv.push('--clear');
  await seedDatabase();
};

// Handle command line arguments
if (process.argv.includes('--reset')) {
  resetDatabase();
} else {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  resetDatabase,
  clearExistingData,
  seedUsers,
  seedWeatherData,
  seedAlerts
};
