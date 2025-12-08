/**
 * Farm Model
 * Mongoose schema for farm/crop management
 */

const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farm must belong to a user']
  },
  name: {
    type: String,
    required: [true, 'Please provide farm name'],
    trim: true,
    maxlength: [100, 'Farm name cannot be more than 100 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Please provide farm coordinates']
    },
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  area: {
    value: {
      type: Number,
      required: [true, 'Please provide farm area']
    },
    unit: {
      type: String,
      enum: ['acres', 'hectares', 'square meters'],
      default: 'hectares'
    }
  },
  crops: [{
    name: {
      type: String,
      required: true
    },
    variety: String,
    plantedDate: Date,
    expectedHarvestDate: Date,
    status: {
      type: String,
      enum: ['planted', 'growing', 'flowering', 'harvesting', 'harvested'],
      default: 'growing'
    },
    area: {
      value: Number,
      unit: String
    }
  }],
  soil: {
    type: {
      type: String,
      enum: ['clay', 'sandy', 'loam', 'silt', 'chalky', 'peat']
    },
    pH: {
      type: Number,
      min: 0,
      max: 14
    },
    moisture: {
      type: Number,
      min: 0,
      max: 100
    },
    nitrogenLevel: String,
    phosphorusLevel: String,
    potassiumLevel: String,
    lastTested: Date
  },
  irrigation: {
    type: {
      type: String,
      enum: ['drip', 'sprinkler', 'flood', 'manual', 'rainfed']
    },
    lastIrrigated: Date,
    frequency: String,
    waterSource: String
  },
  fertilizer: {
    lastApplied: Date,
    type: String,
    npkRatio: String,
    nextScheduled: Date
  },
  pestControl: {
    lastApplied: Date,
    type: String,
    nextScheduled: Date
  },
  weather: {
    temperatureMin: Number,
    temperatureMax: Number,
    humidity: Number,
    rainfall: Number,
    lastUpdated: Date
  },
  yield: {
    expected: {
      value: Number,
      unit: String
    },
    actual: {
      value: Number,
      unit: String
    },
    history: [{
      season: String,
      year: Number,
      crop: String,
      yield: Number
    }]
  },
  sensors: [{
    type: {
      type: String,
      enum: ['soil-moisture', 'temperature', 'humidity', 'pH']
    },
    deviceId: String,
    lastReading: {
      value: Number,
      timestamp: Date
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active'
    }
  }],
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
farmSchema.index({ location: '2dsphere' });
farmSchema.index({ user: 1, isActive: 1 });
farmSchema.index({ 'crops.name': 1 });

// Virtual for current crop
farmSchema.virtual('currentCrop').get(function() {
  return this.crops.find(crop => crop.status === 'growing' || crop.status === 'flowering');
});

// Update the updatedAt timestamp before saving
farmSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get farms by user
farmSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId, isActive: true });
};

// Instance method to calculate total area
farmSchema.methods.getTotalArea = function() {
  return this.area.value;
};

// Instance method to get current season crop
farmSchema.methods.getCurrentSeasonCrop = function() {
  return this.crops.filter(crop => 
    crop.status === 'growing' || 
    crop.status === 'flowering' || 
    crop.status === 'planted'
  );
};

const Farm = mongoose.model('Farm', farmSchema);

module.exports = Farm;
