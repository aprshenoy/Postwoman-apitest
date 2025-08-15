const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: () => ipcRenderer.invoke('platform'),
  version: () => ipcRenderer.invoke('app-version'),

  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, data) => callback(data));
  },

  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Import/Export file handling
  onImportFile: (callback) => {
    ipcRenderer.on('import-file', (event, data) => callback(data));
  },

  // Notifications
  showNotification: (title, message, options = {}) => {
    if ('Notification' in window) {
      const notification = new Notification(title, {
        body: message,
        icon: options.icon || '../build/icon.png',
        silent: options.silent || false
      });
      
      if (options.onClick) {
        notification.onclick = options.onClick;
      }
      
      return notification;
    }
  },

  // System operations
  openExternal: (url) => {
    // This would need to be implemented via IPC if needed
    console.log('External URL:', url);
  },

  // App updates
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },

  // Development tools
  toggleDevTools: () => {
    ipcRenderer.send('toggle-dev-tools');
  },

  // Window controls
  minimize: () => {
    ipcRenderer.send('minimize-window');
  },

  maximize: () => {
    ipcRenderer.send('maximize-window');
  },

  close: () => {
    ipcRenderer.send('close-window');
  },

  // Quit application
  quit: () => {
    ipcRenderer.send('quit-app');
  },

  // Theme detection
  getSystemTheme: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  onSystemThemeChanged: (callback) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      callback(e.matches ? 'dark' : 'light');
    });
  },

  // Network status
  isOnline: () => navigator.onLine,

  onNetworkStatusChanged: (callback) => {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  },

  // Clipboard operations
  writeToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  readFromClipboard: async () => {
    try {
      const text = await navigator.clipboard.readText();
      return { success: true, text };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Local storage helpers (for settings sync)
  getStorageItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Storage read error:', error);
      return null;
    }
  },

  setStorageItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Storage write error:', error);
      return false;
    }
  },

  removeStorageItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },

  // Performance monitoring
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Error reporting
  reportError: (error, context = {}) => {
    console.error('Reported error:', error, context);
    // Could send to crash reporting service via IPC
  },

  // App information
  getAppInfo: async () => {
    const version = await ipcRenderer.invoke('app-version');
    const platform = await ipcRenderer.invoke('platform');
    
    return {
      version,
      platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine
    };
  },

  // Feature detection
  features: {
    notifications: 'Notification' in window,
    clipboard: 'clipboard' in navigator,
    webgl: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
      } catch (e) {
        return false;
      }
    })(),
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
    webWorkers: 'Worker' in window
  },

  // Security utilities
  sanitizeHTML: (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  // URL validation
  isValidURL: (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  },

  // Environment detection
  isDevelopment: () => {
    return process.env.NODE_ENV === 'development';
  },

  // Keyboard utilities
  getModifierKey: () => {
    return process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  }
});

// Additional security measures
// Remove Node.js globals in renderer if any leaked through
delete window.require;
delete window.exports;
delete window.module;

// Prevent eval and similar dangerous functions
window.eval = global.eval = () => {
  console.warn('eval() is disabled for security reasons');
};

// Log that preload script has loaded
console.log('PostWoman preload script loaded successfully');

// Set up error boundary for preload script
window.addEventListener('error', (event) => {
  console.error('Preload script error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Preload script unhandled rejection:', event.reason);
});