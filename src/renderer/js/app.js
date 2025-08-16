// PostWoman Application Main Entry Point (Fixed Version)
class PostWomanApp {
    constructor() {
        this.version = '1.0.0';
        this.modules = new Map();
        this.initializationPromise = null;
        this.isInitialized = false;
        
        // Define modules to initialize in correct order
        this.moduleConfigs = [
            { name: 'core', instance: () => window.Core },
            { name: 'ui', instance: () => window.UI },
            { name: 'userManager', instance: () => window.UserManager },
            { name: 'environmentManager', instance: () => window.EnvironmentManager },
            { name: 'collectionManager', instance: () => window.CollectionManager },
            { name: 'historyManager', instance: () => window.HistoryManager },
            { name: 'requestManager', instance: () => window.RequestManager },
            { name: 'teamsManager', instance: () => window.TeamsManager },
            { name: 'importManager', instance: () => window.ImportManager }
        ];
        
        console.log('🌊 Initializing PostWoman v' + this.version);
        
        // Start initialization process
        this.initialize();
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    async performInitialization() {
        try {
            console.log('🔧 Starting application initialization...');
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Wait for Core to be available
            await this.waitForCore();
            
            // Setup global error handling
            this.setupGlobalErrorHandling();
            
            // Wait a bit more for all scripts to load and modules to initialize
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('⚙️ Registering modules...');
            
            // Register all available modules
            await this.registerModules();
            
            // Setup cross-module event handlers
            this.setupEventHandlers();
            
            // Setup Electron specific events if available
            this.setupElectronEvents();
            
            // Initialize UI components
            this.initializeUI();
            
            // Initialize default state
            this.initializeDefaultState();
            
            this.isInitialized = true;
            console.log('✅ PostWoman initialized successfully');
            
            // Emit initialization complete event
            if (window.Core) {
                window.Core.emit('app-initialized', this);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize PostWoman:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    async waitForCore() {
        // Wait for Core to be available and ready
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        
        while (attempts < maxAttempts) {
            if (typeof window !== 'undefined' && 
                window.Core && 
                typeof window.Core.on === 'function' && 
                typeof window.Core.generateId === 'function' &&
                window.Core.isInitialized()) {
                
                console.log('🔧 Core module found and ready');
                
                // Wait for Core to be fully initialized
                if (window.CoreReady) {
                    await window.CoreReady;
                }
                
                return;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        }
        
        throw new Error('Core module failed to load after 10 seconds');
    }

    setupGlobalErrorHandling() {
        if (!window.Core) {
            console.error('Core module not available for error handling setup');
            return;
        }

        // Set up global error handling
        window.Core.on('error', (error) => {
            console.error('Application error:', error);
            this.handleApplicationError(error);
        });

        window.Core.on('unhandledRejection', (reason) => {
            console.error('Unhandled promise rejection:', reason);
            this.handleApplicationError(reason);
        });

        console.log('✅ Global error handling configured');
    }

    async registerModules() {
        const loadedModules = [];
        const failedModules = [];

        for (const config of this.moduleConfigs) {
            try {
                const moduleInstance = await this.getModuleInstance(config);
                if (moduleInstance) {
                    this.modules.set(config.name, moduleInstance);
                    
                    // Register with Core if available
                    if (window.Core && typeof window.Core.registerModule === 'function') {
                        window.Core.registerModule(config.name, moduleInstance);
                    }
                    
                    loadedModules.push(config.name);
                    console.log(`✅ Module ${config.name} registered successfully`);
                } else {
                    throw new Error(`Module instance not found: ${config.name}`);
                }
            } catch (error) {
                console.error(`❌ Failed to register ${config.name}:`, error);
                failedModules.push({ name: config.name, error: error.message });
            }
        }

        // Store module status
        this.modules.set('loaded', loadedModules);
        this.modules.set('failed', failedModules);

        console.log(`📦 Module registration complete: ${loadedModules.length} loaded, ${failedModules.length} failed`);
        
        if (failedModules.length > 0) {
            console.warn('⚠️ Some modules failed to load:', failedModules);
        }
    }

    async getModuleInstance(config) {
        if (config.instance && typeof config.instance === 'function') {
            return config.instance();
        }
        
        // Fallback to global window object
        const globalName = config.name.charAt(0).toUpperCase() + config.name.slice(1);
        return window[globalName] || window[config.name];
    }

    setupEventHandlers() {
        if (!window.Core) return;

        // Listen for environment changes and update request manager
        window.Core.on('environmentChanged', (envName) => {
            console.log(`Environment changed to: ${envName}`);
            if (window.RequestManager && window.RequestManager.updateCurlCommand) {
                window.RequestManager.updateCurlCommand();
            }
        });

        // Listen for theme changes
        window.Core.on('themeChanged', (theme) => {
            console.log(`Theme changed to: ${theme}`);
            document.documentElement.setAttribute('data-theme', theme);
        });

        // Listen for module initialization events
        window.Core.on('ui-initialized', () => {
            console.log('UI module ready, setting up interface');
            this.initializeUIElements();
        });

        // Listen for user tracking events
        window.Core.on('request-sent', () => {
            if (window.UserManager && window.UserManager.trackActivity) {
                window.UserManager.trackActivity('request_sent');
            }
        });

        window.Core.on('collection-created', () => {
            if (window.UserManager && window.UserManager.trackActivity) {
                window.UserManager.trackActivity('collection_created');
            }
        });

        window.Core.on('environment-created', () => {
            if (window.UserManager && window.UserManager.trackActivity) {
                window.UserManager.trackActivity('environment_created');
            }
        });

        console.log('✅ Event handlers configured');
    }

    initializeUI() {
        console.log('⚡ Setting up UI components');
        
        // Ensure UI module is available and initialized
        if (window.UI && window.UI.initialized) {
            this.initializeUIElements();
        } else {
            // Wait for UI to be ready
            if (window.Core) {
                window.Core.once('ui-initialized', () => {
                    this.initializeUIElements();
                });
            }
        }
    }

    initializeUIElements() {
        try {
            // Set up environment selector
            this.initializeEnvironmentSelector();
            
            // Initialize default form state
            this.initializeFormState();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            console.log('✅ UI elements initialized');
        } catch (error) {
            console.error('Error initializing UI elements:', error);
        }
    }

    initializeEnvironmentSelector() {
        const envSelect = document.getElementById('currentEnvironment');
        if (envSelect && window.EnvironmentManager) {
            // Add change event listener
            envSelect.addEventListener('change', (e) => {
                if (window.EnvironmentManager.setCurrentEnvironment) {
                    window.EnvironmentManager.setCurrentEnvironment(e.target.value);
                }
            });
            
            // Update the selector with available environments
            if (window.EnvironmentManager.updateEnvironmentSelect) {
                window.EnvironmentManager.updateEnvironmentSelect();
            }
        }
    }

    initializeFormState() {
        // Set default method to GET
        const methodSelect = document.getElementById('method');
        if (methodSelect) {
            methodSelect.value = 'GET';
        }

        // Initialize empty rows for key-value pairs
        if (window.RequestManager) {
            setTimeout(() => {
                if (window.RequestManager.addParamRow) window.RequestManager.addParamRow();
                if (window.RequestManager.addHeaderRow) window.RequestManager.addHeaderRow();
                if (window.RequestManager.addCookieRow) window.RequestManager.addCookieRow();
                if (window.RequestManager.addFormDataRow) window.RequestManager.addFormDataRow();
            }, 100);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const modifier = e.metaKey || e.ctrlKey;
            
            if (modifier) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.sendRequest();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveRequest();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newRequest();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.focusUrlInput();
                        break;
                }
            }
        });
    }

    initializeDefaultState() {
        // Show workspace section by default
        if (window.UI && window.UI.showSection) {
            window.UI.showSection('workspace');
        }

        // Set default environment if none selected
        if (window.EnvironmentManager) {
            const currentEnv = window.EnvironmentManager.getCurrentEnvironment();
            if (!currentEnv && Object.keys(window.EnvironmentManager.environments).length > 0) {
                const firstEnv = Object.keys(window.EnvironmentManager.environments)[0];
                window.EnvironmentManager.setCurrentEnvironment(firstEnv);
            }
        }
    }

    setupElectronEvents() {
        // Check if we're running in Electron
        if (typeof window !== 'undefined' && window.electronAPI) {
            console.log('⚡ Setting up Electron events');
            
            // Handle menu actions
            if (window.electronAPI.onMenuAction) {
                window.electronAPI.onMenuAction((action) => {
                    this.handleMenuAction(action);
                });
            }
            
            // Handle file imports
            if (window.electronAPI.onImportFile) {
                window.electronAPI.onImportFile((data) => {
                    this.handleFileImport(data);
                });
            }
            
            // Handle app updates
            if (window.electronAPI.onUpdateAvailable) {
                window.electronAPI.onUpdateAvailable((info) => {
                    this.handleUpdateAvailable(info);
                });
            }
        }
    }

    handleMenuAction(action) {
        console.log('Menu action received:', action.type);
        
        // Emit event through Core
        if (window.Core) {
            window.Core.emit('menu-action', action);
        }
        
        // Handle specific menu actions
        switch (action.type) {
            case 'new-request':
                this.newRequest();
                break;
            case 'save-request':
                this.saveRequest();
                break;
            case 'send-request':
                this.sendRequest();
                break;
            case 'show-workspace':
                this.showSection('workspace');
                break;
            case 'show-collections':
                this.showSection('collections');
                break;
            case 'show-history':
                this.showSection('history');
                break;
            case 'manage-environments':
                this.showSection('environments');
                break;
            case 'show-teams':
                this.showSection('teams');
                break;
            case 'focus-url':
                this.focusUrlInput();
                break;
            case 'clear-form':
                this.clearForm();
                break;
            default:
                console.log('Unhandled menu action:', action.type);
        }
    }

    handleFileImport(data) {
        if (window.ImportManager && window.ImportManager.handleFileImport) {
            window.ImportManager.handleFileImport({
                target: {
                    files: [{
                        name: data.filename,
                        text: () => Promise.resolve(data.content)
                    }]
                }
            });
        }
    }

    handleUpdateAvailable(info) {
        if (window.Core) {
            window.Core.showNotification('Update Available', 'A new version is ready to install.', {
                type: 'info',
                duration: 10000
            });
        }
    }

    // Menu action implementations
    newRequest() {
        this.showSection('workspace');
        this.clearForm();
    }

    saveRequest() {
        if (window.CollectionManager && window.CollectionManager.saveCurrentRequest) {
            window.CollectionManager.saveCurrentRequest();
        }
    }

    sendRequest() {
        if (window.RequestManager && window.RequestManager.sendRequest) {
            window.RequestManager.sendRequest();
        }
    }

    showSection(sectionName) {
        if (window.UI && window.UI.showSection) {
            window.UI.showSection(sectionName);
        }
    }

    focusUrlInput() {
        const urlInput = document.getElementById('url');
        if (urlInput) {
            urlInput.focus();
            urlInput.select();
        }
    }

    clearForm() {
        if (window.UI && window.UI.clearForm) {
            window.UI.clearForm();
        }
    }

    // Error handling
    handleApplicationError(error) {
        console.error('Application error handled:', error);
        
        // Show user-friendly error notification
        if (window.Core) {
            window.Core.showNotification('Application Error', 'An error occurred. Please check the console for details.', {
                type: 'error',
                duration: 5000
            });
        }
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Show initialization error to user
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🌊</div>
                    <h1>PostWoman</h1>
                    <h2 style="color: #e74c3c;">Initialization Error</h2>
                    <p style="color: #666; margin-bottom: 1rem;">Failed to initialize the application properly.</p>
                    <p style="background: #f8f9fa; padding: 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.9rem; color: #e74c3c;">${error.message}</p>
                    <button onclick="location.reload()" style="background: #3498db; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                        Reload Application
                    </button>
                </div>
            </div>
        `;
    }

    // Public API
    getModule(name) {
        return this.modules.get(name);
    }

    isModuleLoaded(name) {
        return this.modules.has(name);
    }

    getCore() {
        return window.Core;
    }

    getVersion() {
        return this.version;
    }

    isReady() {
        return this.isInitialized;
    }

    // Health check
    healthCheck() {
        const health = {
            app: {
                version: this.version,
                initialized: this.isInitialized,
                loadedModules: this.modules.get('loaded') || [],
                failedModules: this.modules.get('failed') || []
            },
            core: window.Core ? window.Core.healthCheck() : null,
            ui: window.UI ? window.UI.healthCheck() : null,
            user: window.UserManager ? window.UserManager.healthCheck() : null,
            environment: window.EnvironmentManager ? window.EnvironmentManager.healthCheck() : null
        };

        console.log('💚 App Health Check:', health);
        return health;
    }

    // Debug methods
    showDebugInfo() {
        console.log('🐛 PostWoman Debug Information:');
        console.log('App Instance:', this);
        console.log('Modules:', Array.from(this.modules.keys()));
        console.log('Health Check:', this.healthCheck());
        
        if (window.Core) {
            console.log('Core Events:', Array.from(window.Core.events.keys()));
        }
    }

    // Restart application
    restart() {
        if (confirm('Are you sure you want to restart the application? Unsaved changes will be lost.')) {
            location.reload();
        }
    }
}

// Initialize the application
let app;

// Function to start the application
function initializeApplication() {
    try {
        app = new PostWomanApp();
        
        // Make app globally available
        if (typeof window !== 'undefined') {
            window.PostWomanApp = app;
            window.app = app;
        }
        
        return app;
    } catch (error) {
        console.error('Failed to create PostWoman application:', error);
        throw error;
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    // Initialize immediately if DOM is ready, otherwise wait for it
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeApplication, 200); // Delay to ensure all scripts are loaded
        });
    } else {
        setTimeout(initializeApplication, 200);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PostWomanApp, initializeApplication };
}

if (typeof exports !== 'undefined') {
    exports.PostWomanApp = PostWomanApp;
    exports.initializeApplication = initializeApplication;
}

// Global debug helpers
if (typeof window !== 'undefined') {
    window.debugPostWoman = () => {
        if (window.app) {
            window.app.showDebugInfo();
        } else {
            console.log('App not initialized yet');
        }
    };
    
    window.restartPostWoman = () => {
        if (window.app) {
            window.app.restart();
        } else {
            location.reload();
        }
    };
}