const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// Keep a global reference of the window object
let mainWindow;
let isDev = process.argv.includes('--dev');

// Enable live reload for development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('electron-reload not found, skipping...');
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    backgroundColor: '#ffffff'
  });

  // Load the app - Fixed path to find renderer/index.html
  const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  // Check if file exists before loading
  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath);
  } else {
    console.error('HTML file not found at:', htmlPath);
    console.log('Current __dirname:', __dirname);
    console.log('Looking for files in parent directories...');
    
    // Try alternative paths
    const alternativePaths = [
      path.join(__dirname, 'renderer', 'index.html'),
      path.join(__dirname, '..', '..', 'renderer', 'index.html'),
      path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html')
    ];
    
    let foundPath = null;
    for (const altPath of alternativePaths) {
      console.log('Trying:', altPath);
      if (fs.existsSync(altPath)) {
        foundPath = altPath;
        console.log('Found HTML at:', altPath);
        break;
      }
    }
    
    if (foundPath) {
      mainWindow.loadFile(foundPath);
    } else {
      // Create a simple error page
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PostWoman - File Not Found</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f5f5f5; 
                }
                .error-container { 
                    text-align: center; 
                    background: white; 
                    padding: 2rem; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                }
                .error-icon { font-size: 3rem; margin-bottom: 1rem; }
                h1 { color: #e74c3c; margin-bottom: 1rem; }
                p { color: #666; margin-bottom: 1rem; }
                .path { 
                    background: #f8f9fa; 
                    padding: 0.5rem; 
                    border-radius: 4px; 
                    font-family: monospace; 
                    font-size: 0.9rem; 
                    margin: 0.5rem 0;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">🌊</div>
                <h1>PostWoman</h1>
                <h2>Renderer files not found</h2>
                <p>The application could not find the renderer/index.html file.</p>
                <p>Please ensure your project structure is correct:</p>
                <div class="path">src/renderer/index.html</div>
                <p>Current search path:</p>
                <div class="path">${htmlPath}</div>
                <p>Please check your file structure and restart the application.</p>
            </div>
        </body>
        </html>
      `;
      
      const tempHtmlPath = path.join(__dirname, 'temp-error.html');
      fs.writeFileSync(tempHtmlPath, errorHtml);
      mainWindow.loadFile(tempHtmlPath);
    }
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on the window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();

  // Handle app updates (if using electron-updater)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.log('electron-updater not available');
    }
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Request',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            sendMenuAction('new-request');
          }
        },
        {
          label: 'Save Request',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            sendMenuAction('save-request');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Collection...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                mainWindow.webContents.send('import-file', {
                  content: fileContent,
                  filename: path.basename(filePath)
                });
              } catch (error) {
                dialog.showErrorBox('Import Error', `Failed to read file: ${error.message}`);
              }
            }
          }
        },
        {
          label: 'Export Collection...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            sendMenuAction('export-collection');
          }
        },
        { type: 'separator' },
        ...(!isDarwin() ? [
          {
            label: 'Preferences',
            accelerator: 'Ctrl+,',
            click: () => {
              sendMenuAction('show-settings');
            }
          },
          { type: 'separator' }
        ] : []),
        {
          label: 'Quit',
          accelerator: isDarwin() ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Workspace',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            sendMenuAction('show-workspace');
          }
        },
        {
          label: 'Collections',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            sendMenuAction('show-collections');
          }
        },
        {
          label: 'History',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            sendMenuAction('show-history');
          }
        },
        {
          label: 'Environments',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            sendMenuAction('manage-environments');
          }
        },
        {
          label: 'Teams',
          accelerator: 'CmdOrCtrl+5',
          click: () => {
            sendMenuAction('show-teams');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Request',
      submenu: [
        {
          label: 'Send Request',
          accelerator: 'CmdOrCtrl+Return',
          click: () => {
            sendMenuAction('send-request');
          }
        },
        {
          label: 'Clear Form',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            sendMenuAction('clear-form');
          }
        },
        { type: 'separator' },
        {
          label: 'Focus URL',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            sendMenuAction('focus-url');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isDarwin() ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PostWoman',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PostWoman',
              message: 'PostWoman',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\n\nA powerful API testing tool for developers.`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            sendMenuAction('show-shortcuts');
          }
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/yourusername/postwoman');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/yourusername/postwoman/issues');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (isDarwin()) {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => {
            sendMenuAction('show-settings');
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[5].submenu = [
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

function sendMenuAction(action) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('menu-action', { type: action });
  }
}

function isDarwin() {
  return process.platform === 'darwin';
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (!isDarwin()) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('platform', () => {
  return process.platform;
});
// Add these IPC handlers to your existing main.js file
// Place them after your existing IPC handlers

// Window controls
ipcMain.on('toggle-dev-tools', () => {
  if (mainWindow && mainWindow.webContents) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// Store operations (if you want to use electron-store)
// You can install electron-store: npm install electron-store
// Uncomment below if you have electron-store installed:

/*
const Store = require('electron-store');
const store = new Store();

ipcMain.handle('store-get', (event, key, defaultValue) => {
  return store.get(key, defaultValue);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-remove', (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store-clear', () => {
  store.clear();
  return true;
});
*/

// Alternative simple store implementation using JSON files


// Simple JSON-based store for settings
const storePath = path.join(os.homedir(), '.postwoman-settings.json');

function loadStore() {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading store:', error);
  }
  return {};
}

function saveStore(data) {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving store:', error);
    return false;
  }
}

ipcMain.handle('store-get', (event, key, defaultValue) => {
  const store = loadStore();
  return store[key] !== undefined ? store[key] : defaultValue;
});

ipcMain.handle('store-set', (event, key, value) => {
  const store = loadStore();
  store[key] = value;
  return saveStore(store);
});

ipcMain.handle('store-remove', (event, key) => {
  const store = loadStore();
  delete store[key];
  return saveStore(store);
});

ipcMain.handle('store-clear', () => {
  return saveStore({});
});

// External URL handler
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
  return true;
});

// System notification handler
ipcMain.handle('show-system-notification', (event, title, body, options = {}) => {
  try {
    const { Notification } = require('electron');
    
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: options.icon || path.join(__dirname, '..', 'build', 'icon.png'),
        silent: options.silent || false
      });
      
      notification.show();
      
      if (options.onClick) {
        notification.on('click', () => {
          if (mainWindow) {
            mainWindow.focus();
          }
        });
      }
      
      return { success: true };
    } else {
      return { success: false, error: 'Notifications not supported' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Enhanced error handling and logging
ipcMain.handle('log-error', (event, error, context = {}) => {
  console.error('Renderer error reported:', error, context);
  
  // You could implement crash reporting here
  // For example, send to Sentry, Bugsnag, etc.
  
  return true;
});

// App information handlers
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    isDevelopment: isDev,
    userDataPath: app.getPath('userData'),
    appPath: app.getAppPath()
  };
});

// Memory and performance monitoring
ipcMain.handle('get-system-info', () => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    platform: {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      uptime: process.uptime()
    }
  };
});

// Theme and appearance
ipcMain.handle('get-system-theme', () => {
  if (process.platform === 'darwin') {
    try {
      const { systemPreferences } = require('electron');
      return systemPreferences.isDarkMode() ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }
  return 'light'; // Default for other platforms
});

// Update window title
ipcMain.handle('set-window-title', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
    return true;
  }
  return false;
});

// Badge management (macOS)
ipcMain.handle('set-badge-count', (event, count) => {
  if (process.platform === 'darwin') {
    app.setBadgeCount(count);
    return true;
  }
  return false;
});

// Focus window
ipcMain.handle('focus-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    return true;
  }
  return false;
});

// Get window state
ipcMain.handle('get-window-state', () => {
  if (mainWindow) {
    return {
      isMaximized: mainWindow.isMaximized(),
      isMinimized: mainWindow.isMinimized(),
      isFullScreen: mainWindow.isFullScreen(),
      bounds: mainWindow.getBounds(),
      isAlwaysOnTop: mainWindow.isAlwaysOnTop()
    };
  }
  return null;
});

// Set window state
ipcMain.handle('set-window-state', (event, state) => {
  if (!mainWindow) return false;
  
  try {
    if (state.bounds) {
      mainWindow.setBounds(state.bounds);
    }
    
    if (state.isMaximized && !mainWindow.isMaximized()) {
      mainWindow.maximize();
    } else if (!state.isMaximized && mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    
    if (state.isAlwaysOnTop !== undefined) {
      mainWindow.setAlwaysOnTop(state.isAlwaysOnTop);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting window state:', error);
    return false;
  }
});

// Advanced file operations
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-file-exists', (event, filePath) => {
  return fs.existsSync(filePath);
});

// Directory operations
ipcMain.handle('create-directory', (event, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-directory', (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return {
      success: true,
      files: files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        isFile: file.isFile()
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Network status monitoring
let networkStatus = true;

function checkNetworkStatus() {
  const dns = require('dns');
  
  dns.lookup('google.com', (err) => {
    const isOnline = !err;
    
    if (isOnline !== networkStatus) {
      networkStatus = isOnline;
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('network-status-changed', isOnline);
      }
    }
  });
}

// Check network status every 30 seconds
setInterval(checkNetworkStatus, 30000);
checkNetworkStatus(); // Initial check

ipcMain.handle('get-network-status', () => {
  return networkStatus;
});

// Cleanup function to be called when app is closing
function cleanup() {
  console.log('Cleaning up main process...');
  // Add any cleanup logic here
}

// Add cleanup to app events
app.on('before-quit', cleanup);
app.on('will-quit', cleanup);

// Export cleanup function for external use if needed
module.exports = { cleanup };

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Auto-updater events (if using electron-updater)
if (!isDev) {
  try {
    const { autoUpdater } = require('electron-updater');
    
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Update available.');
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
      }
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available.');
    });
    
    autoUpdater.on('error', (err) => {
      console.log('Error in auto-updater. ' + err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded');
      autoUpdater.quitAndInstall();
    });
  } catch (error) {
    console.log('Auto-updater not available:', error.message);
  }
}