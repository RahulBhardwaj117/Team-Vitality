/**
 * Weather Model
 * Handles weather data storage and management
 */

const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
  location: {
    name: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere'
      }
    },
    district: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  current: {
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    humidity: {
      type: Number,
      min: 0,
      max: 100
    },
    pressure: {
      value: Number,
      unit: {
        type: String,
        enum: ['hPa', 'mb', 'atm'],
        default: 'hPa'
      }
    },
    windSpeed: {
      value: Number,
      unit: {
        type: String,
        enum: ['kmh', 'mph', 'ms'],
        default: 'kmh'
      }
    },
    windDirection: {
      type: Number, // degrees
      min: 0,
      max: 360
    },
    visibility: {
      value: Number,
      unit: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km'
      }
    },
    uvIndex: {
      type: Number,
      min: 0,
      max: 11
    },
    condition: {
      type: String,
      enum: [
        'clear', 'partly-cloudy', 'cloudy', 'overcast',
        'rain', 'drizzle', 'heavy-rain', 'thunderstorm',
        'snow', 'sleet', 'hail', 'fog', 'mist'
      ]
    },
    icon: String,
    description: String,
    feelsLike: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    dewPoint: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    }
  },
  forecast: [{
    date: {
      type: Date,
      required: true
    },
    temperature: {
      min: {
        value: Number,
        unit: {
          type: String,
          enum: ['celsius', 'fahrenheit'],
          default: 'celsius'
        }
      },
      max: {
        value: Number,
        unit: {
          type: String,
          enum: ['celsius', 'fahrenheit'],
          default: 'celsius'
        }
      },
      feelsLike: {
        min: {
          value: Number,
          unit: {
            type: String,
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius'
          }
        },
        max: {
          value: Number,
          unit: {
            type: String,
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius'
          }
        }
      }
    },
    humidity: {
      type: Number,
      min: 0,
      max: 100
    },
    pressure: {
      value: Number,
      unit: {
        type: String,
        enum: ['hPa', 'mb', 'atm'],
        default: 'hPa'
      }
    },
    windSpeed: {
      value: Number,
      unit: {
        type: String,
        enum: ['kmh', 'mph', 'ms'],
        default: 'kmh'
      }
    },
    windDirection: {
      type: Number,
      min: 0,
      max: 360
    },
    precipitation: {
      probability: {
        type: Number,
        min: 0,
        max: 100
      },
      amount: {
        value: Number,
        unit: {
          type: String,
          enum: ['mm', 'inches'],
          default: 'mm'
        }
      },
      type: {
        type: String,
        enum: ['rain', 'snow', 'sleet', 'hail', 'none']
      }
    },
    condition: {
      type: String,
      enum: [
        'clear', 'partly-cloudy', 'cloudy', 'overcast',
        'rain', 'drizzle', 'heavy-rain', 'thunderstorm',
        'snow', 'sleet', 'hail', 'fog', 'mist'
      ]
    },
    icon: String,
    description: String,
    uvIndex: {
      type: Number,
      min: 0,
      max: 11
    }
  }],
  alerts: [{
    type: {
      type: String,
      enum: [
        'heat', 'cold', 'wind', 'rain', 'storm', 'flood',
        'drought', 'frost', 'hail', 'snow', 'fog'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'extreme'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    areas: [String],
    certainty: {
      type: String,
      enum: ['possible', 'likely', 'observed'],
      default: 'possible'
    },
    urgency: {
      type: String,
      enum: ['past', 'future', 'expected', 'immediate'],
      default: 'expected'
    },
    source: String,
    instructions: String,
    tags: [String]
  }],
  airQuality: {
    index: {
      type: Number,
      min: 0,
      max: 500
    },
    category: {
      type: String,
      enum: [
        'good', 'moderate', 'unhealthy-sensitive',
        'unhealthy', 'very-unhealthy', 'hazardous'
      ]
    },
    pollutants: {
      pm25: Number,
      pm10: Number,
      o3: Number,
      no2: Number,
      so2: Number,
      co: Number
    },
    lastUpdated: Date
  },
  soil: {
    moisture: {
      type: Number,
      min: 0,
      max: 100
    },
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    ph: {
      type: Number,
      min: 0,
      max: 14
    },
    nutrients: {
      nitrogen: {
        type: Number,
        min: 0,
        max: 100
      },
      phosphorus: {
        type: Number,
        min: 0,
        max: 100
      },
      potassium: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  },
  agriculture: {
    evapotranspiration: {
      value: Number,
      unit: {
        type: String,
        enum: ['mm', 'inches'],
        default: 'mm'
      }
    },
    growingDegreeDays: Number,
    cropWaterNeed: {
      value: Number,
      unit: {
        type: String,
        enum: ['mm', 'inches'],
        default: 'mm'
      }
    },
    diseaseRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'extreme']
    },
    pestRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'extreme']
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['openweathermap', 'weatherapi', 'accuweather', 'custom', 'sensor'],
      default: 'openweathermap'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updateFrequency: {
      type: Number, // minutes
      default: 30
    },
    dataQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
weatherSchema.index({ 'location.coordinates': '2dsphere' });
weatherSchema.index({ 'location.district': 1 });
weatherSchema.index({ 'location.state': 1 });
weatherSchema.index({ 'metadata.lastUpdated': -1 });
weatherSchema.index({ 'forecast.date': 1 });

// Virtual for location name
weatherSchema.virtual('locationName').get(function() {
  return this.location.name || `${this.location.district}, ${this.location.state}`;
});

// Virtual for current condition summary
weatherSchema.virtual('currentSummary').get(function() {
  if (!this.current) return '';
  const temp = this.current.temperature?.value || 'N/A';
  const condition = this.current.condition || 'unknown';
  const humidity = this.current.humidity || 'N/A';
  return `${temp}°C, ${condition}, ${humidity}% humidity`;
});

// Instance methods
weatherSchema.methods = {
  // Get forecast for specific date
  getForecastForDate: function(date) {
    return this.forecast.find(f =>
      f.date.toDateString() === date.toDateString()
    );
  },

  // Get active alerts
  getActiveAlerts: function() {
    const now = new Date();
    return this.alerts.filter(alert =>
      alert.startTime <= now && (!alert.endTime || alert.endTime >= now)
    );
  },

  // Check if location is in alert area
  isInAlertArea: function(alertType, userLocation) {
    const alert = this.alerts.find(a =>
      a.type === alertType && a.areas && a.areas.length > 0
    );

    if (!alert) return false;

    // Simple distance-based check (can be enhanced with proper geospatial queries)
    const distance = this.calculateDistance(
      this.location.coordinates.coordinates,
      userLocation.coordinates
    );

    return distance <= 50; // Within 50km
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance: function(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  // Get weather risk level for agriculture
  getAgriculturalRisk: function() {
    const alerts = this.getActiveAlerts();
    const forecast = this.forecast.slice(0, 3); // Next 3 days

    let riskScore = 0;

    // Check for severe weather alerts
    const severeAlerts = alerts.filter(a => a.severity === 'severe' || a.severity === 'extreme');
    riskScore += severeAlerts.length * 3;

    // Check forecast for extreme conditions
    forecast.forEach(day => {
      if (day.precipitation?.probability > 70) riskScore += 2;
      if (day.temperature?.max?.value > 40) riskScore += 2;
      if (day.temperature?.min?.value < 5) riskScore += 2;
      if (day.windSpeed?.value > 50) riskScore += 1;
    });

    // Check current conditions
    if (this.current) {
      if (this.current.temperature?.value > 40 || this.current.temperature?.value < 5) riskScore += 1;
      if (this.current.humidity < 20 || this.current.humidity > 90) riskScore += 1;
      if (this.current.windSpeed?.value > 40) riskScore += 1;
    }

    if (riskScore >= 8) return 'extreme';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
};

// Static methods
weatherSchema.statics = {
  // Find weather data for a location
  findByLocation: function(latitude, longitude, maxDistance = 50) {
    return this.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    }).sort({ 'metadata.lastUpdated': -1 });
  },

  // Find weather data by district
  findByDistrict: function(district, state = 'Uttar Pradesh') {
    return this.find({
      'location.district': new RegExp(district, 'i'),
      'location.state': new RegExp(state, 'i')
    }).sort({ 'metadata.lastUpdated': -1 });
  },

  // Get weather statistics
  getStats: async function() {
    const stats = await this.aggregate([
      {
        $group: {
          _id: {
            district: '$location.district',
            state: '$location.state'
          },
          count: { $sum: 1 },
          avgTemp: { $avg: '$current.temperature.value' },
          lastUpdated: { $max: '$metadata.lastUpdated' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalRecords = await this.countDocuments();
    const activeAlerts = await this.countDocuments({
      'alerts': { $exists: true, $ne: [] }
    });

    return {
      totalRecords,
      activeAlerts,
      byLocation: stats,
      coverage: {
        districts: stats.length,
        states: [...new Set(stats.map(s => s._id.state))].length
      }
    };
  },

  // Clean old weather data
  cleanOldData: async function(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({
      'metadata.lastUpdated': { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
};

// Pre-save middleware
weatherSchema.pre('save', function(next) {
  // Update metadata
  this.metadata.lastUpdated = new Date();

  // Set data quality based on available data
  let qualityScore = 0;
  if (this.current) {
    if (this.current.temperature) qualityScore += 25;
    if (this.current.humidity) qualityScore += 25;
    if (this.current.condition) qualityScore += 25;
    if (this.current.windSpeed) qualityScore += 25;
  }

  if (this.forecast && this.forecast.length > 0) {
    qualityScore += 20;
  }

  if (this.alerts && this.alerts.length > 0) {
    qualityScore += 10;
  }

  if (qualityScore >= 80) {
    this.metadata.dataQuality = 'excellent';
  } else if (qualityScore >= 60) {
    this.metadata.dataQuality = 'good';
  } else if (qualityScore >= 40) {
    this.metadata.dataQuality = 'fair';
  } else {
    this.metadata.dataQuality = 'poor';
  }

  next();
});

module.exports = mongoose.model('Weather', weatherSchema);
