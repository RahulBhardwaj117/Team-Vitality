// ============================================
// AgriUrbanAI - Database Module (MongoDB)
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Try to load from default .env
require('dotenv').config();

// If MONGODB_URI is not set, try loading from backend/.env
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.join(__dirname, 'backend', 'env.env') });
}

class AgriUrbanAIDatabase {
  constructor() {
    this.isConnected = false;
    this.connectDatabase();
    this.defineSchemas();
  }

  defineSchemas() {
    // User Schema
    this.UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, required: true, enum: ['farmer', 'city_planner', 'urban', 'admin'] },
      name: { type: String, required: true },
      location: { type: String, default: '' },
      crop_type: { type: String, default: null },
      land_area: { type: String, default: null },
      phone: { type: String, default: null },
      last_login: { type: Date },
      theme: { type: String, default: 'light' }
    }, { timestamps: true });

    // Weather Forecast Schema
    this.WeatherForecastSchema = new mongoose.Schema({
      day: { type: String, required: true },
      condition: { type: String, required: true },
      rain_chance: { type: Number, default: 0 },
      temperature: { type: Number, default: 0 },
      humidity: { type: Number, default: 0 },
      wind: { type: Number, default: 0 }
    }, { timestamps: true });

    // Location/Area Schema
    this.LocationSchema = new mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      type: { type: String, required: true, enum: ['farm', 'urban'] },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      district: { type: String },
      state: { type: String },
      risk_level: { type: String, default: 'Low' },
      soil_moisture: { type: Number, default: 0 },
      growth_stage: { type: String },
      area: { type: String },
      population: { type: Number },
      emergency_units: { type: Number }
    }, { timestamps: true });

    // Alert Schema
    this.AlertSchema = new mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      type: { type: String, required: true, enum: ['weather', 'crop', 'urban', 'system'] },
      priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
      risk_level: { type: String, default: 'Low', enum: ['Low', 'Medium', 'High'] },
      location: { type: String },
      status: { type: String, default: 'active', enum: ['active', 'acknowledged', 'resolved'] },
      acknowledged_at: { type: Date }
    }, { timestamps: true });

    // Analytics Data Schema
    this.AnalyticsSchema = new mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      data_type: { type: String, required: true },
      value: { type: Number, required: true },
      date_recorded: { type: Date, required: true },
      location: { type: String },
      notes: { type: String }
    }, { timestamps: true });

    // Settings Schema
    this.SettingsSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: String }
    }, { timestamps: true });

    // Disaster Report Schema
    this.DisasterReportSchema = new mongoose.Schema({
      user: { type: String, required: true },
      role: { type: String, required: true },
      location: { 
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
      },
      severity: { type: String, required: true },
      resources: { type: String },
      sos: { type: Boolean, default: false },
      status: { type: String, default: 'active', enum: ['active', 'archived'] }
    }, { timestamps: true });

    // Create models
    this.User = mongoose.model('User', this.UserSchema);
    this.WeatherForecast = mongoose.model('WeatherForecast', this.WeatherForecastSchema);
    this.Location = mongoose.model('Location', this.LocationSchema);
    this.Alert = mongoose.model('Alert', this.AlertSchema);
    this.Analytics = mongoose.model('Analytics', this.AnalyticsSchema);
    this.Settings = mongoose.model('Settings', this.SettingsSchema);
    this.DisasterReport = mongoose.model('DisasterReport', this.DisasterReportSchema);

    // Collection names for reference (all lowercase by default)
    this.User.collection.name = 'users';
    this.WeatherForecast.collection.name = 'weatherforecasts';
    this.Location.collection.name = 'locations';
    this.Alert.collection.name = 'alerts';
    this.Analytics.collection.name = 'analytics';
    this.Settings.collection.name = 'settings';
    this.DisasterReport.collection.name = 'disasterreports';
  }

  async connectDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/agriurbanai';
      
      // Log connection attempt (masking password)
      const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
      console.log(`Attempting to connect to MongoDB at: ${maskedUri}`);

      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 5000, // Fail after 5 seconds if server not found
          socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        console.log('✅ Connected to AgriUrbanAI MongoDB database');
        this.isConnected = true;
        this.initializeDefaultData();
      } else {
        console.log('MongoDB already connected');
        this.isConnected = true;
      }
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.error('Please check your internet connection and ensure your IP is whitelisted in MongoDB Atlas.');
      // Fallback to ensure app doesn't crash
      this.isConnected = false;
    }
  }

  // Initialize default data for demo
  async initializeDefaultData() {
    try {
      // Check if weather data exists
      const weatherCount = await this.WeatherForecast.countDocuments();
      if (weatherCount === 0) {
        await this.insertDefaultWeatherData();
      }

      // Check if users exist and create demo users for testing
      const userCount = await this.User.countDocuments();
      if (userCount === 0) {
        await this.insertDefaultUsers();
      }
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  async insertDefaultWeatherData() {
    const weatherData = [
      { day: 'Today', condition: 'Partly Cloudy', rain_chance: 10, temperature: 32, humidity: 65, wind: 12 },
      { day: 'Tomorrow', condition: 'Partly Cloudy', rain_chance: 25, temperature: 32, humidity: 70, wind: 15 },
      { day: 'Friday', condition: 'Scattered T-Storms', rain_chance: 40, temperature: 33, humidity: 85, wind: 20 },
      { day: 'Saturday', condition: 'Sunny', rain_chance: 0, temperature: 36, humidity: 45, wind: 10 },
      { day: 'Sunday', condition: 'Sunny', rain_chance: 0, temperature: 36, humidity: 40, wind: 8 },
      { day: 'Monday', condition: 'Sunny', rain_chance: 0, temperature: 37, humidity: 38, wind: 9 },
      { day: 'Tuesday', condition: 'Sunny', rain_chance: 0, temperature: 36, humidity: 42, wind: 11 }
    ];

    try {
      await this.WeatherForecast.insertMany(weatherData);
      console.log('Default weather data inserted');
    } catch (error) {
      console.error('Error inserting weather data:', error);
    }
  }

  async insertDefaultUsers() {
    const defaultUsers = [
      { email: 'demo@demo.com', rawPassword: 'demo', role: 'farmer', name: 'Demo User', location: 'Noida', crop_type: 'Rice', land_area: '3 Hectares' }
    ];

    for (const userData of defaultUsers) {
      try {
        const existingUser = await this.User.findOne({ email: userData.email });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(userData.rawPassword, 10);
          await this.User.create({
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            name: userData.name,
            location: userData.location,
            crop_type: userData.crop_type,
            land_area: userData.land_area
          });
          console.log(`Created demo user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`Error creating demo user ${userData.email}:`, error);
      }
    }
  }

  // User management methods
  async authenticateUser(email, password) {
    try {
      const user = await this.User.findOne({ email }).lean();
      if (user) {
        // Verify password if provided
        if (password) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return null;
          }
        }
        
        // Update last login
        await this.User.updateOne({ _id: user._id }, { last_login: new Date() });
        // Add id field for compatibility (MongoDB uses _id)
        return { ...user, id: user._id.toString() };
      }
      return null;
    } catch (error) {
      console.error('authenticateUser error:', error);
      return null;
    }
  }

  async createUser(userData) {
    try {
      const user = await this.User.create(userData);
      return { id: user._id.toString(), ...userData };
    } catch (error) {
      console.error('createUser error:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const result = await this.User.updateOne({ _id: userId }, { $set: updateData });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('updateUser error:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await this.User.findById(userId).lean();
      if (user) {
        return { ...user, id: user._id.toString() };
      }
      return null;
    } catch (error) {
      console.error('getUserById error:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await this.User.findOne({ email }).lean();
      if (user) {
        return { ...user, id: user._id.toString() };
      }
      return null;
    } catch (error) {
      console.error('getUserByEmail error:', error);
      return null;
    }
  }

  // Weather methods
  async getWeatherForecasts() {
    try {
      return await this.WeatherForecast.find({}).lean();
    } catch (error) {
      console.error('getWeatherForecasts error:', error);
      return [];
    }
  }

  async updateWeatherForecast(day, data) {
    try {
      const result = await this.WeatherForecast.updateOne(
        { day },
        {
          condition: data.condition,
          rain_chance: data.rain_chance,
          temperature: data.temperature,
          humidity: data.humidity,
          wind: data.wind
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('updateWeatherForecast error:', error);
      throw error;
    }
  }

  // Location methods
  async createLocation(userId, locationData) {
    try {
      const location = await this.Location.create({
        user_id: userId,
        name: locationData.name,
        type: locationData.type,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        district: locationData.district,
        state: locationData.state,
        risk_level: locationData.risk_level,
        soil_moisture: locationData.soil_moisture,
        growth_stage: locationData.growth_stage,
        area: locationData.area,
        population: locationData.population,
        emergency_units: locationData.emergency_units
      });
      return location._id.toString();
    } catch (error) {
      console.error('createLocation error:', error);
      throw error;
    }
  }

  async getUserLocations(userId) {
    try {
      return await this.Location.find({ user_id: userId }).lean();
    } catch (error) {
      console.error('getUserLocations error:', error);
      return [];
    }
  }

  // Alert methods
  async createAlert(userId, alertData) {
    try {
      const alert = await this.Alert.create({
        user_id: userId,
        title: alertData.title,
        message: alertData.message,
        type: alertData.type,
        priority: alertData.priority,
        risk_level: alertData.risk_level,
        location: alertData.location
      });
      return alert._id.toString();
    } catch (error) {
      console.error('createAlert error:', error);
      throw error;
    }
  }

  async getActiveAlerts(userId) {
    try {
      return await this.Alert.find({
        user_id: userId,
        status: 'active'
      }).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error('getActiveAlerts error:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId) {
    try {
      const result = await this.Alert.updateOne(
        { _id: alertId },
        {
          status: 'acknowledged',
          acknowledged_at: new Date()
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('acknowledgeAlert error:', error);
      throw error;
    }
  }

  // Analytics methods
  async insertAnalyticsData(userId, dataType, value, date, location = null, notes = null) {
    try {
      const analytic = await this.Analytics.create({
        user_id: userId,
        data_type: dataType,
        value: value,
        date_recorded: date,
        location: location,
        notes: notes
      });
      return analytic._id.toString();
    } catch (error) {
      console.error('insertAnalyticsData error:', error);
      throw error;
    }
  }

  async getAnalyticsData(userId, dataType, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return await this.Analytics.find({
        user_id: userId,
        data_type: dataType,
        date_recorded: { $gte: start, $lte: end }
      }).sort({ date_recorded: 1 }).lean();
    } catch (error) {
      console.error('getAnalyticsData error:', error);
      return [];
    }
  }

  // Settings methods
  async getSetting(key) {
    try {
      const setting = await this.Settings.findOne({ key }).lean();
      return setting ? setting.value : null;
    } catch (error) {
      console.error('getSetting error:', error);
      return null;
    }
  }

  async setSetting(key, value) {
    try {
      const result = await this.Settings.updateOne(
        { key },
        { value },
        { upsert: true }
      );
      return result.acknowledged;
    } catch (error) {
      console.error('setSetting error:', error);
      throw error;
    }
  }

  // Disaster Report methods
  async createDisasterReport(reportData) {
    try {
      const report = await this.DisasterReport.create(reportData);
      return report._id.toString();
    } catch (error) {
      console.error('createDisasterReport error:', error);
      throw error;
    }
  }

  async getActiveDisasterReports() {
    try {
      return await this.DisasterReport.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error('getActiveDisasterReports error:', error);
      return [];
    }
  }

  async archiveAllDisasterReports() {
    try {
      const result = await this.DisasterReport.updateMany(
        { status: 'active' },
        { status: 'archived' }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('archiveAllDisasterReports error:', error);
      throw error;
    }
  }

  // Utility methods
  async backupDatabase() {
    try {
      // MongoDB backup - simplified implementation
      const backupData = {
        timestamp: new Date().toISOString(),
        collections: {}
      };

      // Export each collection
      const collections = ['users', 'weatherforecasts', 'locations', 'alerts', 'analytics', 'settings', 'disasterreports'];
      for (const collectionName of collections) {
        backupData.collections[collectionName] = await this[collectionName.toLowerCase()].find({}).lean();
      }

      require('fs').writeFileSync('./mongodb-backup.json', JSON.stringify(backupData, null, 2));
      console.log('MongoDB backup completed');
      return './mongodb-backup.json';
    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  async exportData() {
    try {
      const exportData = {};

      // Export all collections
      exportData.users = await this.User.find({}).lean();
      exportData.weatherforecasts = await this.WeatherForecast.find({}).lean();
      exportData.locations = await this.Location.find({}).lean();
      exportData.alerts = await this.Alert.find({}).lean();
      exportData.analytics = await this.Analytics.find({}).lean();
      exportData.settings = await this.Settings.find({}).lean();
      exportData.disasterreports = await this.DisasterReport.find({}).lean();

      return exportData;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    try {
      if (mongoose.connection && mongoose.connection.readyState) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
    }
  }

// Create singleton instance
let database = null;

function getDatabase() {
  if (!database) {
    database = new AgriUrbanAIDatabase();
  }
  return database;
}

module.exports = { AgriUrbanAIDatabase, getDatabase };
