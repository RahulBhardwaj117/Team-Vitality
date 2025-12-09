const mongoose = require('mongoose');

const DisasterReportSchema = new mongoose.Schema({
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

module.exports = mongoose.model('DisasterReport', DisasterReportSchema);
