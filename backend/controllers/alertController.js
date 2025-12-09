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

exports.triggerEmergencyAlert = catchAsync(async (req, res) => {
  const { exec } = require('child_process');
  const path = require('path');
  
  const scriptPath = path.join(__dirname, '../Alert/alerts.py');
  const scriptDir = path.dirname(scriptPath);
  
  console.log(`Executing alert script in: ${scriptDir}`);

  // Execute from the script directory so imports work
  exec(`python alerts.py`, { cwd: scriptDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ status: 'error', message: 'Failed to execute alert script', error: error.message });
    }
    
    console.log(`stdout: ${stdout}`);
    if (stderr) console.error(`stderr: ${stderr}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Emergency alert sequence initiated.',
      output: stdout
    });
  });
});
