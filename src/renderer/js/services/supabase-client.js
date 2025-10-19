/**
 * Supabase Client Initialization
 * Handles connection to Supabase backend
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.initializeClient();
    }

    /**
     * Initialize Supabase client
     */
    initializeClient() {
        try {
            // Check if configuration exists
            if (!window.CONFIG || !window.CONFIG.supabase) {
                console.error('❌ Configuration not found. Please ensure config.js is loaded.');
                return;
            }

            const { url, anonKey } = window.CONFIG.supabase;

            // Validate credentials
            if (!url || !anonKey || url.includes('YOUR_SUPABASE') || anonKey.includes('YOUR_SUPABASE')) {
                console.error('❌ Invalid Supabase credentials. Please update config.js');
                return;
            }

            // Check if Supabase library is loaded
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase library not loaded. Please include the Supabase CDN script.');
                return;
            }

            // Create Supabase client
            this.client = supabase.createClient(url, anonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage,
                    storageKey: 'posterboy_auth_token',
                }
            });

            this.initialized = true;
            console.log('✅ Supabase client initialized successfully');

            // Set up auth state listener
            this.setupAuthListener();

        } catch (error) {
            console.error('❌ Error initializing Supabase client:', error);
            this.initialized = false;
        }
    }

    /**
     * Set up authentication state listener
     */
    setupAuthListener() {
        if (!this.client) return;

        this.client.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);

            // Dispatch custom event for auth state changes
            const authEvent = new CustomEvent('authStateChange', {
                detail: { event, session }
            });
            window.dispatchEvent(authEvent);

            // Handle different auth events
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ User signed in');
                    break;
                case 'SIGNED_OUT':
                    console.log('👋 User signed out');
                    this.clearLocalData();
                    break;
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;
                case 'USER_UPDATED':
                    console.log('👤 User updated');
                    break;
                case 'PASSWORD_RECOVERY':
                    console.log('🔑 Password recovery');
                    break;
            }
        });
    }

    /**
     * Clear local data on sign out
     */
    clearLocalData() {
        try {
            const keysToKeep = ['posterboy_settings', 'posterboy_theme'];
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
                if (key.startsWith('posterboy_') && !keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log('🗑️ Local data cleared');
        } catch (error) {
            console.error('Error clearing local data:', error);
        }
    }

    /**
     * Get Supabase client instance
     */
    getClient() {
        if (!this.initialized || !this.client) {
            console.warn('⚠️ Supabase client not initialized');
            return null;
        }
        return this.client;
    }

    /**
     * Check if client is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get current session
     */
    async getSession() {
        if (!this.client) return null;
        
        try {
            const { data, error } = await this.client.auth.getSession();
            if (error) throw error;
            return data.session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    /**
     * Get current user
     */
    async getUser() {
        if (!this.client) return null;
        
        try {
            const { data, error } = await this.client.auth.getUser();
            if (error) throw error;
            return data.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }
}

// Initialize Supabase client
const supabaseClient = new SupabaseClient();

// Export for global access
if (typeof window !== 'undefined') {
    window.SupabaseClient = supabaseClient;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = supabaseClient;
}