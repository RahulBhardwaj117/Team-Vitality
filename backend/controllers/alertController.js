const catchAsync = require('../utils/catchAsync');

exports.getAlerts = catchAsync(async (req, res) => {
  const alerts = [
    {
      id: 1,
      type: 'weather',
      severity: 'high',
      message: 'Heavy rain expected in 2 hours',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      type: 'crop',
      severity: 'medium',
      message: 'Soil moisture low in Sector A',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  res.status(200).json({
    status: 'success',
    results: alerts.length,
    data: { alerts }
  });
});

exports.getAlertById = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { alert: { id: req.params.id, message: 'Mock Alert' } }
  });
});

exports.createAlert = catchAsync(async (req, res) => {
  const newAlert = {
    id: Date.now(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  res.status(201).json({
    status: 'success',
    data: { alert: newAlert }
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
  res.status(200).json({
    status: 'success',
    data: { alerts: [] }
  });
});
