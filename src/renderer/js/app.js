// PostWoman Application Main Entry Point
class PostWomanApp {
    constructor() {
        this.version = '1.0.0';
        this.modules = new Map();
        this.initializationPromise = null;
        this.isInitialized = false;
        
        console.log('🌊 Initializing PostWoman v' + this.version);
        
        // Ensure Core is available
        this.ensureCore();
    }

    ensureCore() {
        // Wait for Core to be available
        if (typeof window !== 'undefined' && window.Core) {
            this.core = window.Core;
            this.setupGlobalErrorHandling();
            this.initialize();
        } else {
            // Retry after a short delay
            setTimeout(() => this.ensureCore(), 10);
        }
    }

    setupGlobalErrorHandling() {
        if (!this.core) {
            console.error('Core module not available for error handling setup');
            return;
        }

        // Set up global error handling
        this.core.on('error', (error) => {
            console.error('Application error:', error);
            this.handleApplicationError(error);
        });

        this.core.on('unhandledRejection', (reason) => {
            console.error('Unhandled promise rejection:', reason);
            this.handleApplicationError(reason);
        });

        console.log('✅ Global error handling configured');
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
            console.log('🔧 Core systems initialized');
            
            // Wait a bit for DOM to be ready
            await this.waitForDOM();
            
            console.log('⚙️ Initializing modules...');
            
            // Initialize modules in the correct order
            await this.initializeModules();
            
            // Initialize UI after all modules are ready
            this.initializeUI();
            
            // Setup Electron specific events if available
            this.setupElectronEvents();
            
            this.isInitialized = true;
            console.log('✅ PostWoman initialized successfully');
            
            // Emit initialization complete event
            if (this.core) {
                this.core.emit('app-initialized', this);
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

    async initializeModules() {
        const moduleConfigs = [
            { name: 'ui', className: 'UI', required: true },
            { name: 'environmentManager', className: 'EnvironmentManager', required: true },
            { name: 'collectionManager', className: 'CollectionManager', required: true },
            { name: 'historyManager', className: 'HistoryManager', required: true },
            { name: 'requestManager', className: 'RequestManager', required: true },
            { name: 'userManager', className: 'UserManager', required: false },
            { name: 'teamsManager', className: 'TeamsManager', required: false },
            { name: 'importManager', className: 'ImportManager', required: false }
        ];

        const loadedModules = [];
        const failedModules = [];

        for (const config of moduleConfigs) {
            try {
                await this.initializeModule(config);
                loadedModules.push(config.name);
            } catch (error) {
                console.warn(`Failed to initialize ${config.name}:`, error);
                failedModules.push(config.name);
                
                if (config.required) {
                    throw new Error(`Required module ${config.name} failed to initialize: ${error.message}`);
                }
            }
        }

        console.log('✅ Available modules loaded successfully');
        
        if (failedModules.length > 0) {
            console.warn('Some modules not ready:', failedModules.join(', '));
        }

        // Store module status
        this.modules.set('loaded', loadedModules);
        this.modules.set('failed', failedModules);
    }

    async initializeModule(config) {
        const { name, className } = config;
        
        // Check if the module class exists globally
        if (typeof window !== 'undefined' && typeof window[className] !== 'undefined') {
            const ModuleClass = window[className];
            
            // Initialize the module
            let moduleInstance;
            if (typeof ModuleClass === 'function') {
                // It's a constructor function/class
                moduleInstance = new ModuleClass();
            } else if (typeof ModuleClass === 'object') {
                // It's already an instance
                moduleInstance = ModuleClass;
                
                // Call init if it exists
                if (typeof moduleInstance.init === 'function') {
                    await moduleInstance.init();
                }
            }
            
            // Store the module instance
            if (moduleInstance) {
                this.modules.set(name, moduleInstance);
                
                // Make it globally available
                window[name] = moduleInstance;
                
                // Register with Core if available
                if (this.core && typeof this.core.registerModule === 'function') {
                    this.core.registerModule(name, moduleInstance);
                }
                
                console.log(`📦 ${name} module initialized`);
            }
        } else {
            throw new Error(`Module class ${className} not found`);
        }
    }

    initializeUI() {
        console.log('⚡ Setting up UI');
        
        // Check if UI module is available
        const uiModule = this.modules.get('ui') || window.UI;
        
        if (uiModule) {
            console.log('✅ UI module ready');
            
            // Ensure UI is properly initialized
            if (typeof uiModule.initialize === 'function') {
                uiModule.initialize();
            }
        } else {
            console.warn('UI module not available');
        }
    }

    setupElectronEvents() {
        // Check if we're running in Electron
        if (typeof window !== 'undefined' && window.electronAPI) {
            console.log('⚡ Setting up Electron events');
            
            // Handle menu actions
            window.electronAPI.onMenuAction((action) => {
                this.handleMenuAction(action);
            });
            
            // Handle file imports
            window.electronAPI.onImportFile((data) => {
                this.handleFileImport(data);
            });
            
            // Handle app updates
            window.electronAPI.onUpdateAvailable((info) => {
                this.handleUpdateAvailable(info);
            });
        }
    }

    handleMenuAction(action) {
        console.log('Menu action received:', action.type);
        
        // Emit event through Core
        if (this.core) {
            this.core.emit('menu-action', action);
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
        const importManager = this.modules.get('importManager') || window.ImportManager;
        if (importManager && typeof importManager.handleFileImport === 'function') {
            importManager.handleFileImport(data);
        }
    }

    handleUpdateAvailable(info) {
        if (this.core) {
            this.core.showNotification('Update Available', 'A new version is ready to install.', {
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
        const collectionManager = this.modules.get('collectionManager') || window.CollectionManager;
        if (collectionManager && typeof collectionManager.saveCurrentRequest === 'function') {
            collectionManager.saveCurrentRequest();
        }
    }

    sendRequest() {
        const requestManager = this.modules.get('requestManager') || window.RequestManager;
        if (requestManager && typeof requestManager.sendRequest === 'function') {
            requestManager.sendRequest();
        }
    }

    showSection(sectionName) {
        const ui = this.modules.get('ui') || window.UI;
        if (ui && typeof ui.showSection === 'function') {
            ui.showSection(sectionName);
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
        const ui = this.modules.get('ui') || window.UI;
        if (ui && typeof ui.clearForm === 'function') {
            ui.clearForm();
        }
    }

    // Error handling
    handleApplicationError(error) {
        console.error('Application error handled:', error);
        
        // Show user-friendly error notification
        if (this.core) {
            this.core.showNotification('Application Error', 'An error occurred. Please check the console for details.', {
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
        return this.core;
    }

    getVersion() {
        return this.version;
    }

    isInitialized() {
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
            core: this.core ? this.core.healthCheck() : null
        };

        console.log('💚 App Health Check:', health);
        return health;
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
            setTimeout(initializeApplication, 100); // Small delay to ensure all scripts are loaded
        });
    } else {
        setTimeout(initializeApplication, 100);
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