const mongoose = require('mongoose');

const CommunityReportSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['flood', 'crop_disease', 'storm', 'infrastructure', 'other']
  },
  description: { type: String, required: true },
  reporter: { type: String, required: true },
  location: { 
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
  },
  voice_transcript: { type: String },
  status: { type: String, default: 'active', enum: ['active', 'archived', 'resolved'] }
}, { timestamps: true });

module.exports = mongoose.model('CommunityReport', CommunityReportSchema);
