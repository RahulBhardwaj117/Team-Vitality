const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { getDatabase } = require('./database');

// Keep a global reference of the window object
let mainWindow;

// Create the browser window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // We'll add this later
    title: 'AgriUrbanAI',
    backgroundColor: '#667eea',
    show: false, // Don't show until ready-to-show

    // Custom window properties
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin', // Use custom titlebar on macOS
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Auto-open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Set up application menu
  setupApplicationMenu();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Set up application menu
function setupApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
          click: () => {
            // Clear localStorage and reload
            mainWindow.webContents.executeJavaScript('localStorage.clear(); location.reload();');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Refresh',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0);
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 1);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 1);
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.minimize();
          }
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AgriUrbanAI',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AgriUrbanAI',
              message: 'AgriUrbanAI Desktop',
              detail: 'Version 1.0.0\n\nAI-powered platform for smart agriculture and urban planning with real-time weather monitoring and predictive analytics.'
            });
          }
        },
        {
          label: 'Open Logs',
          click: () => {
            // In a real app, you'd open log files
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Application Logs',
              message: 'Log files are located in the application data directory.',
              detail: 'Check the console (F12) for detailed application logs.'
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for enhanced functionality
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('open-external', (event, url) => {
  require('electron').shell.openExternal(url);
});

// Handle app updates (basic notification)
ipcMain.handle('check-for-updates', () => {
  // In a real app, you'd implement auto-updater logic here
  return {
    updateAvailable: false,
    currentVersion: app.getVersion()
  };
});

// Database IPC handlers
ipcMain.handle('db-authenticate-user', async (event, email, password) => {
  const db = getDatabase();
  try {
    return await db.authenticateUser(email, password);
  } catch (error) {
    console.error('Database authenticate error:', error);
    return null;
  }
});

ipcMain.handle('db-create-user', async (event, userData) => {
  const db = getDatabase();
  try {
    return await db.createUser(userData);
  } catch (error) {
    console.error('Database create user error:', error);
    return null;
  }
});

ipcMain.handle('db-update-user', async (event, userId, updateData) => {
  const db = getDatabase();
  try {
    return await db.updateUser(userId, updateData);
  } catch (error) {
    console.error('Database update user error:', error);
    return false;
  }
});

ipcMain.handle('db-get-user-by-id', async (event, userId) => {
  const db = getDatabase();
  try {
    return await db.getUserById(userId);
  } catch (error) {
    console.error('Database get user error:', error);
    return null;
  }
});

ipcMain.handle('db-get-weather-forecasts', async () => {
  const db = getDatabase();
  try {
    return await db.getWeatherForecasts();
  } catch (error) {
    console.error('Database get weather error:', error);
    return [];
  }
});

ipcMain.handle('db-update-weather-forecast', async (event, day, data) => {
  const db = getDatabase();
  try {
    return await db.updateWeatherForecast(day, data);
  } catch (error) {
    console.error('Database update weather error:', error);
    return false;
  }
});

ipcMain.handle('db-create-location', async (event, userId, locationData) => {
  const db = getDatabase();
  try {
    return await db.createLocation(userId, locationData);
  } catch (error) {
    console.error('Database create location error:', error);
    return null;
  }
});

ipcMain.handle('db-get-user-locations', async (event, userId) => {
  const db = getDatabase();
  try {
    return await db.getUserLocations(userId);
  } catch (error) {
    console.error('Database get locations error:', error);
    return [];
  }
});

ipcMain.handle('db-create-alert', async (event, userId, alertData) => {
  const db = getDatabase();
  try {
    return await db.createAlert(userId, alertData);
  } catch (error) {
    console.error('Database create alert error:', error);
    return null;
  }
});

ipcMain.handle('db-get-active-alerts', async (event, userId) => {
  const db = getDatabase();
  try {
    return await db.getActiveAlerts(userId);
  } catch (error) {
    console.error('Database get alerts error:', error);
    return [];
  }
});

ipcMain.handle('db-acknowledge-alert', async (event, alertId) => {
  const db = getDatabase();
  try {
    return await db.acknowledgeAlert(alertId);
  } catch (error) {
    console.error('Database acknowledge alert error:', error);
    return false;
  }
});

ipcMain.handle('db-insert-analytics', async (event, userId, dataType, value, date, location, notes) => {
  const db = getDatabase();
  try {
    return await db.insertAnalyticsData(userId, dataType, value, date, location, notes);
  } catch (error) {
    console.error('Database insert analytics error:', error);
    return null;
  }
});

ipcMain.handle('db-get-analytics', async (event, userId, dataType, startDate, endDate) => {
  const db = getDatabase();
  try {
    return await db.getAnalyticsData(userId, dataType, startDate, endDate);
  } catch (error) {
    console.error('Database get analytics error:', error);
    return [];
  }
});

ipcMain.handle('db-get-setting', async (event, key) => {
  const db = getDatabase();
  try {
    return await db.getSetting(key);
  } catch (error) {
    console.error('Database get setting error:', error);
    return null;
  }
});

ipcMain.handle('db-set-setting', async (event, key, value) => {
  const db = getDatabase();
  try {
    return await db.setSetting(key, value);
  } catch (error) {
    console.error('Database set setting error:', error);
    return false;
  }
});

ipcMain.handle('db-export-data', async () => {
  const db = getDatabase();
  try {
    return await db.exportData();
  } catch (error) {
    console.error('Database export error:', error);
    return null;
  }
});

ipcMain.handle('db-backup-database', async () => {
  const db = getDatabase();
  try {
    const backupPath = await db.backupDatabase();
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Database Backup',
      message: `Database backup created successfully at:\n${backupPath}`,
      buttons: ['OK']
    });
    return backupPath;
  } catch (error) {
    console.error('Database backup error:', error);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Backup Failed',
      message: 'Failed to create database backup.',
      detail: error.message
    });
    return null;
  }
});

// Get user data directory for storing files
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// Export for preload script
module.exports = { mainWindow };
