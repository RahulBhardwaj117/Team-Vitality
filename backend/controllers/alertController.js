const catchAsync = require('../utils/catchAsync');
const Alert = require('../models/Alert');

exports.getAlerts = catchAsync(async (req, res) => {
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100);

  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

exports.getAlertById = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { alert: { id: req.params.id, message: 'Mock Alert' } }
  });
});

exports.createAlert = catchAsync(async (req, res) => {
  const alert = await Alert.create(req.body);

  res.status(201).json({
    success: true,
    data: alert
  });
});

exports.updateAlert = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { alert: { ...req.body, id: req.params.id } }
  });
});

exports.deleteAlert = catchAsync(async (req, res) => {
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.markAlertAsRead = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { message: 'Marked as read' }
  });
});

exports.getUserAlerts = catchAsync(async (req, res) => {
  // Fetch all alerts from database, newest first
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
  
  res.status(200).json({
    success: true,
    data: alerts
  });
});

exports.triggerEmergencyAlert = catchAsync(async (req, res) => {
  const axios = require('axios');
  const AI_URL = process.env.AI_SERVICE_URL || 'https://team-vitality-2.onrender.com';
  
  logger.info(`🚨 Proxying alert trigger to cloud AI service: ${AI_URL}/alert/trigger_random`);

  try {
    const response = await axios.post(`${AI_URL}/alert/trigger_random`);
    
    // Log the successful trigger in our own DB
    try {
      await Alert.create({
        title: `Cloud Emergency Broadcast: DISPATCHED`,
        message: `A manual emergency alert has been successfully dispatched via the cloud AI microservice.`,
        type: 'emergency',
        priority: 'high',
        severity: 'critical',
        status: 'active',
        metadata: {
          source: 'Cloud Proxy Trigger',
          aiServiceResponse: response.data
        }
      });
    } catch (dbErr) {
      logger.error('Failed to log cloud alert to DB:', dbErr);
    }

    res.status(200).json({
      status: 'success',
      message: 'Emergency alert sequence initiated in the cloud.',
      data: response.data
    });
  } catch (error) {
    logger.error('Failed to trigger cloud alert:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Cloud AI service failed to trigger alert', 
      details: error.response?.data || error.message 
    });
  }
});
