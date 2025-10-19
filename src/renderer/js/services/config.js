/**
 * PosterBoy Configuration
 * Store all application configuration here
 */

const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'YOUR_SUPABASE_URL_HERE',  // Replace with your Supabase project URL
        anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE',  // Replace with your anon/public key
    },

    // Application Settings
    app: {
        name: 'PosterBoy',
        version: '1.0.0',
        environment: 'development', // 'development' or 'production'
    },

    // Storage Keys
    storage: {
        sessionKey: 'posterboy_session',
        collectionsKey: 'posterboy_collections',
        environmentsKey: 'posterboy_environments',
        settingsKey: 'posterboy_settings',
    },

    // API Settings
    api: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
    },

    // Authentication Settings
    auth: {
        tokenRefreshInterval: 3600000, // 1 hour in milliseconds
        sessionTimeout: 86400000, // 24 hours in milliseconds
    },

    // UI Settings
    ui: {
        notificationDuration: 3000, // 3 seconds
        autoSaveDelay: 2000, // 2 seconds
    },
};

// Validation: Check if Supabase credentials are set
if (CONFIG.supabase.url.includes('YOUR_SUPABASE') || CONFIG.supabase.anonKey.includes('YOUR_SUPABASE')) {
    console.warn('⚠️ WARNING: Supabase credentials not configured in config.js');
    console.warn('Please update src/renderer/js/config.js with your Supabase credentials');
}

// Export configuration
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}