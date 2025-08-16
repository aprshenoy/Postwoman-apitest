// Core Module - Foundation for PostWoman Application (Fixed Version)
class Core {
    constructor() {
        this.version = '1.0.0';
        this.events = new Map();
        this.storage = {
            local: {},
            session: {}
        };
        this.initialized = false;
        this.modules = new Map();
        
        // Initialize storage from localStorage if available
        this.initializeStorage();
        
        // Setup global error handling
        this.setupErrorHandling();
        
        console.log('🔧 Core module initialized');
    }

    // Initialize method to ensure proper setup
    init() {
        if (this.initialized) {
            console.warn('Core module already initialized');
            return this;
        }
        
        this.initialized = true;
        console.log('✅ Core module loaded and ready');
        return this;
    }

    // Event System (Simple Event Emitter)
    on(event, callback) {
        if (typeof event !== 'string' || typeof callback !== 'function') {
            console.error('Core.on: Invalid arguments. Expected (string, function)');
            return this;
        }
        
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        return this; // Allow chaining
    }

    off(event, callback) {
        if (!this.events.has(event)) return this;
        
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        return this; // Allow chaining
    }

    emit(event, data) {
        if (!this.events.has(event)) return this;
        
        const callbacks = this.events.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for "${event}":`, error);
                this.logError(error);
            }
        });
        return this; // Allow chaining
    }

    // Add once method for single-time event listeners
    once(event, callback) {
        const onceWrapper = (data) => {
            this.off(event, onceWrapper);
            callback(data);
        };
        this.on(event, onceWrapper);
        return this;
    }

    // ID Generation
    generateId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}_${timestamp}_${random}`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Storage Management
    initializeStorage() {
        try {
            // Load from localStorage if available
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('postwoman_storage');
                if (stored) {
                    this.storage.local = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
    }

    getStorage(key, defaultValue = null) {
        try {
            if (key in this.storage.local) {
                return this.storage.local[key];
            }
            return defaultValue;
        } catch (error) {
            console.error('Error getting storage:', error);
            return defaultValue;
        }
    }

    setStorage(key, value) {
        try {
            this.storage.local[key] = value;
            
            // Save to localStorage if available
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('postwoman_storage', JSON.stringify(this.storage.local));
            }
            
            this.emit('storageChanged', { key, value });
        } catch (error) {
            console.error('Error setting storage:', error);
        }
    }

    removeStorage(key) {
        try {
            delete this.storage.local[key];
            
            // Update localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('postwoman_storage', JSON.stringify(this.storage.local));
            }
            
            this.emit('storageChanged', { key, value: undefined });
        } catch (error) {
            console.error('Error removing storage:', error);
        }
    }

    clearStorage() {
        try {
            this.storage.local = {};
            
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('postwoman_storage');
            }
            
            this.emit('storageCleared');
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }

    // Session Storage (temporary, not persisted)
    getSessionStorage(key, defaultValue = null) {
        return this.storage.session[key] ?? defaultValue;
    }

    setSessionStorage(key, value) {
        this.storage.session[key] = value;
    }

    // Utility Functions
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Error cloning object:', error);
            return obj;
        }
    }

    deepClone(obj) {
        return this.clone(obj);
    }

    merge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    this.merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    // String utilities
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Date/Time utilities
    formatDate(date = new Date(), format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    getTimeAgo(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return this.formatDate(past, 'MM/DD/YYYY');
    }

    // File operations
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    downloadFile(data, filename, type = 'application/json') {
        try {
            const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Download', `File ${filename} downloaded successfully`);
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showNotification('Error', 'Failed to download file', { type: 'error' });
        }
    }

    // HTTP Request utilities
    async request(url, options = {}) {
        try {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const finalOptions = this.merge(defaultOptions, options);
            
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    // Validation utilities
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    isValidJson(string) {
        try {
            JSON.parse(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // String utilities
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    truncate(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    // File size formatting
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Notification system - Updated to work with UI module
    showNotification(title, message, options = {}) {
        const { type = 'info', duration = 5000 } = options;
        
        console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`);
        
        // Emit event for UI to handle
        this.emit('notification', {
            title,
            message,
            type,
            duration,
            timestamp: new Date().toISOString()
        });

        // Try to use UI module if available
        if (window.UI && typeof window.UI.showNotification === 'function') {
            window.UI.showNotification(title, message, options);
            return;
        }

        // If notification API is available
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/assets/icon.png'
            });
        }
    }

    // Modal utilities - Updated to work with UI module
    showModal(modalId) {
        if (window.UI && typeof window.UI.showModal === 'function') {
            window.UI.showModal(modalId);
            return;
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        if (window.UI && typeof window.UI.hideModal === 'function') {
            window.UI.hideModal(modalId);
            return;
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Error handling
    setupErrorHandling() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error);
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleUnhandledRejection(event.reason);
            });
        }
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.logError(error);
        this.emit('error', error);
    }

    handleUnhandledRejection(reason) {
        console.error('Unhandled promise rejection:', reason);
        this.logError(reason);
        this.emit('unhandledRejection', reason);
    }

    logError(error) {
        const errorLog = {
            message: error.message || String(error),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
            url: typeof window !== 'undefined' ? window.location.href : 'N/A'
        };

        console.error('Error logged:', error);
        
        // Store error in session for debugging
        const errors = this.getSessionStorage('errors', []);
        errors.push(errorLog);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        this.setSessionStorage('errors', errors);
    }

    getErrorLogs() {
        return this.getSessionStorage('errors', []);
    }

    clearErrorLogs() {
        this.setSessionStorage('errors', []);
    }

    // Performance monitoring
    startTimer(label) {
        const startTime = performance.now();
        this.setSessionStorage(`timer_${label}`, startTime);
        return startTime;
    }

    endTimer(label) {
        const startTime = this.getSessionStorage(`timer_${label}`);
        if (!startTime) {
            console.warn(`Timer "${label}" was not started`);
            return 0;
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        this.setSessionStorage(`timer_${label}`, null);
        
        return duration;
    }

    // Theme and UI utilities
    applyTheme(theme = 'light') {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        this.setStorage('theme', theme);
        this.emit('themeChanged', theme);
    }

    getTheme() {
        return this.getStorage('theme', 'light');
    }

    // Debug utilities
    debug(...args) {
        if (this.getStorage('debug_mode', false)) {
            console.log('🐛 DEBUG:', ...args);
        }
    }

    setDebugMode(enabled) {
        this.setStorage('debug_mode', enabled);
        console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Export/Import utilities
    exportData(includeSettings = true) {
        const data = {
            version: this.version,
            timestamp: new Date().toISOString(),
            storage: this.storage.local
        };

        if (!includeSettings) {
            const filteredStorage = { ...this.storage.local };
            delete filteredStorage.settings;
            delete filteredStorage.preferences;
            data.storage = filteredStorage;
        }

        return data;
    }

    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            if (data.storage) {
                this.storage.local = { ...this.storage.local, ...data.storage };
                
                // Save to localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('postwoman_storage', JSON.stringify(this.storage.local));
                }
            }

            this.emit('dataImported', data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            this.handleGlobalError(error);
            return false;
        }
    }

    // Module management
    registerModule(name, module) {
        if (!this.modules) {
            this.modules = new Map();
        }
        this.modules.set(name, module);
        this.emit('module-registered', { name, module });
        console.log(`📦 Module registered: ${name}`);
        return this;
    }

    getModule(name) {
        return this.modules ? this.modules.get(name) : null;
    }

    hasModule(name) {
        return this.modules ? this.modules.has(name) : false;
    }

    // Enhanced ready method
    ready() {
        return new Promise((resolve) => {
            if (this.initialized) {
                resolve(this);
            } else {
                this.once('ready', () => resolve(this));
                // Auto-initialize if not already done
                if (!this.initialized) {
                    this.init();
                    this.emit('ready');
                }
            }
        });
    }

    // Check if Core is properly initialized
    isInitialized() {
        return this.initialized;
    }

    // Health check
    healthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            version: this.version,
            initialized: this.initialized,
            storage: {
                local: Object.keys(this.storage.local).length,
                session: Object.keys(this.storage.session).length
            },
            events: this.events.size,
            modules: this.modules.size,
            errors: this.getErrorLogs().length,
            memory: typeof performance !== 'undefined' && performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null
        };

        console.log('💚 Health Check:', health);
        return health;
    }
}

// Create and initialize the global Core instance
const coreInstance = new Core();

// Ensure initialization
coreInstance.init();

// Enhanced error checking for method calls
const originalOn = coreInstance.on;
coreInstance.on = function(event, callback) {
    if (typeof event !== 'string' || typeof callback !== 'function') {
        console.error('Core.on: Invalid arguments. Expected (string, function)');
        return this;
    }
    return originalOn.call(this, event, callback);
};

const originalGenerateId = coreInstance.generateId;
coreInstance.generateId = function(prefix = 'id') {
    if (typeof prefix !== 'string') {
        console.warn('Core.generateId: prefix should be a string');
        prefix = 'id';
    }
    return originalGenerateId.call(this, prefix);
};

// Make it globally available in multiple ways for compatibility
if (typeof window !== 'undefined') {
    window.Core = coreInstance;
    window.core = coreInstance; // Also make available as lowercase
    
    // Set up a global ready promise
    window.CoreReady = coreInstance.ready();
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = coreInstance;
}

// ES6 module export
if (typeof exports !== 'undefined') {
    exports.Core = coreInstance;
    exports.default = coreInstance;
}

// Global assignment for immediate availability
if (typeof globalThis !== 'undefined') {
    globalThis.Core = coreInstance;
}

// Auto-apply saved theme when DOM is ready
if (typeof document !== 'undefined') {
    const initializeTheme = () => {
        const savedTheme = coreInstance.getTheme();
        coreInstance.applyTheme(savedTheme);
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTheme);
    } else {
        initializeTheme();
    }
}

// Emit ready event after a short delay to ensure all scripts are loaded
setTimeout(() => {
    coreInstance.emit('core-ready', coreInstance);
    coreInstance.emit('ready');
}, 10);

console.log('✅ Core module loaded and ready');