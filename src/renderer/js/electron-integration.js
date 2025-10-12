// Electron Integration Helper
// Add this to your core.js or create as a separate electron-integration.js file

class ElectronIntegration {
    constructor(core) {
        this.core = core;
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.electronAPI = this.isElectron ? window.electronAPI : null;
        
        if (this.isElectron) {
            this.setupElectronIntegration();
            console.log('⚡ Electron integration initialized');
        } else {
            console.log('🌐 Running in browser mode');
        }
    }

    setupElectronIntegration() {
        // Menu action handling
        if (this.electronAPI.onMenuAction) {
            this.electronAPI.onMenuAction((action) => {
                this.core.emit('menu-action', action);
            });
        }

        // File import handling
        if (this.electronAPI.onImportFile) {
            this.electronAPI.onImportFile((data) => {
                this.core.emit('file-import', data);
            });
        }

        // Update notifications
        if (this.electronAPI.onUpdateAvailable) {
            this.electronAPI.onUpdateAvailable((info) => {
                this.core.showNotification('Update Available', 'A new version is ready to download.', {
                    type: 'info',
                    duration: 10000
                });
                this.core.emit('update-available', info);
            });
        }

        if (this.electronAPI.onUpdateDownloaded) {
            this.electronAPI.onUpdateDownloaded((info) => {
                this.core.showNotification('Update Ready', 'Update downloaded. Restart to apply.', {
                    type: 'success',
                    duration: 15000
                });
                this.core.emit('update-downloaded', info);
            });
        }

        // System theme detection
        if (this.electronAPI.onSystemThemeChanged) {
            this.electronAPI.onSystemThemeChanged((theme) => {
                if (this.core.getStorage('autoTheme', true)) {
                    this.core.applyTheme(theme);
                }
            });
        }

        // Network status monitoring
        if (this.electronAPI.onNetworkStatusChanged) {
            this.electronAPI.onNetworkStatusChanged((isOnline) => {
                this.core.emit('network-status-changed', isOnline);
                
                this.core.showNotification(
                    'Network Status', 
                    isOnline ? 'Back online' : 'Connection lost', 
                    { type: isOnline ? 'success' : 'warning' }
                );
            });
        }

        // Initialize system theme
        this.initializeTheme();
    }

    async initializeTheme() {
        try {
            if (this.electronAPI.getSystemTheme) {
                const systemTheme = this.electronAPI.getSystemTheme();
                const autoTheme = this.core.getStorage('autoTheme', true);
                
                if (autoTheme) {
                    this.core.applyTheme(systemTheme);
                }
            }
        } catch (error) {
            console.warn('Failed to initialize system theme:', error);
        }
    }

    // Enhanced storage with Electron persistence
    async setStorage(key, value) {
        // Use Core's storage first
        this.core.setStorage(key, value);
        
        // Also persist in Electron store if available
        if (this.isElectron && this.electronAPI.setStorageItem) {
            try {
                await this.electronAPI.setStorageItem(`posterboy_${key}`, JSON.stringify(value));
            } catch (error) {
                console.warn('Failed to persist to Electron store:', error);
            }
        }
    }

    async getStorage(key, defaultValue = null) {
        // Try Core storage first
        let value = this.core.getStorage(key, null);
        
        if (value === null && this.isElectron && this.electronAPI.getStorageItem) {
            try {
                const electronValue = await this.electronAPI.getStorageItem(`posterboy_${key}`);
                if (electronValue !== null) {
                    value = JSON.parse(electronValue);
                    // Sync back to Core storage
                    this.core.setStorage(key, value);
                }
            } catch (error) {
                console.warn('Failed to read from Electron store:', error);
            }
        }
        
        return value !== null ? value : defaultValue;
    }

    // File operations with Electron integration
    async saveFile(data, filename, options = {}) {
        if (this.isElectron && this.electronAPI.showSaveDialog && this.electronAPI.saveFile) {
            try {
                const result = await this.electronAPI.showSaveDialog({
                    defaultPath: filename,
                    filters: options.filters || [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                    const saveResult = await this.electronAPI.saveFile(result.filePath, content);
                    
                    if (saveResult.success) {
                        this.core.showNotification('File Saved', `Successfully saved ${filename}`, { type: 'success' });
                        return { success: true, filePath: result.filePath };
                    } else {
                        throw new Error(saveResult.error);
                    }
                }
                
                return { success: false, canceled: true };
            } catch (error) {
                console.error('Electron save failed:', error);
                this.core.showNotification('Save Failed', error.message, { type: 'error' });
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to browser download
            this.core.downloadFile(data, filename, options.type);
            return { success: true, method: 'download' };
        }
    }

    async openFile(options = {}) {
        if (this.isElectron && this.electronAPI.showOpenDialog && this.electronAPI.readFile) {
            try {
                const result = await this.electronAPI.showOpenDialog({
                    properties: ['openFile'],
                    filters: options.filters || [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const readResult = await this.electronAPI.readFile(filePath);
                    
                    if (readResult.success) {
                        return {
                            success: true,
                            content: readResult.content,
                            filePath: filePath,
                            filename: require('path').basename(filePath)
                        };
                    } else {
                        throw new Error(readResult.error);
                    }
                }
                
                return { success: false, canceled: true };
            } catch (error) {
                console.error('Electron open failed:', error);
                this.core.showNotification('Open Failed', error.message, { type: 'error' });
                return { success: false, error: error.message };
            }
        } else {
            // Return a promise that resolves when file is selected via HTML input
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = options.accept || '.json';
                
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        try {
                            const content = await this.core.readFile(file);
                            resolve({
                                success: true,
                                content: content,
                                filename: file.name,
                                size: file.size
                            });
                        } catch (error) {
                            resolve({ success: false, error: error.message });
                        }
                    } else {
                        resolve({ success: false, canceled: true });
                    }
                };
                
                input.click();
            });
        }
    }

    // Clipboard operations
    async copyToClipboard(text) {
        if (this.isElectron && this.electronAPI.writeToClipboard) {
            return await this.electronAPI.writeToClipboard(text);
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    }

    async readFromClipboard() {
        if (this.isElectron && this.electronAPI.readFromClipboard) {
            return await this.electronAPI.readFromClipboard();
        } else if (navigator.clipboard) {
            try {
                const text = await navigator.clipboard.readText();
                return { success: true, text };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'Clipboard read not supported' };
        }
    }

    // System information
    async getSystemInfo() {
        if (this.isElectron && this.electronAPI.getAppInfo) {
            return await this.electronAPI.getAppInfo();
        } else {
            return {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                online: navigator.onLine,
                cookieEnabled: navigator.cookieEnabled
            };
        }
    }

    // Window controls
    minimizeWindow() {
        if (this.isElectron && this.electronAPI.minimize) {
            this.electronAPI.minimize();
        }
    }

    maximizeWindow() {
        if (this.isElectron && this.electronAPI.maximize) {
            this.electronAPI.maximize();
        }
    }

    closeWindow() {
        if (this.isElectron && this.electronAPI.close) {
            this.electronAPI.close();
        } else {
            window.close();
        }
    }

    quitApp() {
        if (this.isElectron && this.electronAPI.quit) {
            this.electronAPI.quit();
        }
    }

    // Feature detection
    getFeatures() {
        const baseFeatures = {
            electron: this.isElectron,
            fileSystem: this.isElectron,
            notifications: 'Notification' in window,
            clipboard: 'clipboard' in navigator || this.isElectron,
            webgl: (() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
                } catch (e) {
                    return false;
                }
            })()
        };

        if (this.isElectron && this.electronAPI.features) {
            return { ...baseFeatures, ...this.electronAPI.features };
        }

        return baseFeatures;
    }
}

// Auto-initialize with Core when available
if (typeof window !== 'undefined' && window.Core) {
    window.Core.electron = new ElectronIntegration(window.Core);
} else {
    // Wait for Core to be available
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.Core) {
                window.Core.electron = new ElectronIntegration(window.Core);
            }
        }, 100);
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElectronIntegration;
}