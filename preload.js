const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Get platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Open external links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Check for updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Handle app-specific events
  onMinimize: (callback) => ipcRenderer.on('minimize-window', callback),
  onMaximize: (callback) => ipcRenderer.on('maximize-window', callback),
  onClose: (callback) => ipcRenderer.on('close-window', callback),

  // Remove all listeners for cleanup
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event)
});

// Add desktop-specific utilities
contextBridge.exposeInMainWorld('desktopUtils', {
  // Detect if running in Electron
  isElectron: true,

  // Get user data path for storing files
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Show notification
  showNotification: (title, body, icon) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
  },

  // Platform detection for UI adjustments
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Database API for renderer processes
contextBridge.exposeInMainWorld('databaseAPI', {
  // User authentication
  authenticateUser: (email, password) => ipcRenderer.invoke('db-authenticate-user', email, password),
  createUser: (userData) => ipcRenderer.invoke('db-create-user', userData),
  updateUser: (userId, updateData) => ipcRenderer.invoke('db-update-user', userId, updateData),
  getUserById: (userId) => ipcRenderer.invoke('db-get-user-by-id', userId),

  // Weather data
  getWeatherForecasts: () => ipcRenderer.invoke('db-get-weather-forecasts'),
  updateWeatherForecast: (day, data) => ipcRenderer.invoke('db-update-weather-forecast', day, data),

  // Locations
  createLocation: (userId, locationData) => ipcRenderer.invoke('db-create-location', userId, locationData),
  getUserLocations: (userId) => ipcRenderer.invoke('db-get-user-locations', userId),

  // Alerts
  createAlert: (userId, alertData) => ipcRenderer.invoke('db-create-alert', userId, alertData),
  getActiveAlerts: (userId) => ipcRenderer.invoke('db-get-active-alerts', userId),
  acknowledgeAlert: (alertId) => ipcRenderer.invoke('db-acknowledge-alert', alertId),

  // Analytics
  insertAnalytics: (userId, dataType, value, date, location, notes) =>
    ipcRenderer.invoke('db-insert-analytics', userId, dataType, value, date, location, notes),
  getAnalytics: (userId, dataType, startDate, endDate) =>
    ipcRenderer.invoke('db-get-analytics', userId, dataType, startDate, endDate),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('db-get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),

  // Utility functions
  exportData: () => ipcRenderer.invoke('db-export-data'),
  backupDatabase: () => ipcRenderer.invoke('db-backup-database')
});
