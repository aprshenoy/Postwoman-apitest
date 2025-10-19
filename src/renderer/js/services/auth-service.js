/**
 * Authentication Service
 * Handles all authentication operations with Supabase
 */

class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.currentSession = null;
        this.initialized = false;
        
        console.log('🔐 AuthService initializing...');
        this.initialize();
    }

    /**
     * Initialize authentication service
     */
async initialize() {
    try {
        console.log('🔐 AuthService: Starting initialization...');
        
        // Try to wait for Supabase client
        try {
            await this.waitForSupabase();
        } catch (error) {
            console.warn('⚠️ Supabase not available:', error.message);
            console.log('ℹ️ AuthService will work in offline mode (guest only)');
            this.isInitialized = true;
            
            // Emit initialization event even if Supabase not available
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('authService:initialized', this);
            }
            
            return false;
        }
        
        // Setup auth state listener
        this.setupAuthListener();
        
        // Get current session
        await this.getCurrentSession();
        
        this.isInitialized = true;
        console.log('✅ AuthService initialized successfully');
        
        // Emit initialized event
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('authService:initialized', this);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing AuthService:', error);
        this.isInitialized = true; // Mark as initialized anyway to prevent blocking
        
        // Emit initialization event even on error
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('authService:initialized', this);
        }
        
        return false;
    }
}

isAuthenticated() {
    return !!(this.currentUser && this.currentSession);
}



getAccessToken() {
    return this.currentSession?.access_token || null;
}


    /**
     * Wait for Supabase client to be ready
     */
async waitForSupabase() {
    this.initializationAttempts++;
    
    console.log(`🔐 Waiting for Supabase... (attempt ${this.initializationAttempts}/${this.maxInitializationAttempts})`);
    
    if (this.initializationAttempts > this.maxInitializationAttempts) {
        console.warn('⚠️ Supabase client not initialized after max attempts');
        throw new Error('Supabase client not initialized');
    }
    
    // Check if Supabase client is available
    if (window.supabaseClient && window.supabaseClient.supabase) {
        this.supabase = window.supabaseClient.supabase;
        console.log('✅ Supabase client connected');
        return true;
    }
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.waitForSupabase();
}

    /**
     * Load existing session
     */
    async loadSession() {
        try {
            const session = await window.SupabaseClient.getSession();
            
            if (session) {
                this.currentSession = session;
                this.currentUser = session.user;
                console.log('✅ Session loaded:', this.currentUser.email);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error loading session:', error);
            return false;
        }
    }

    /**
     * Sign up with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} username - Username
     * @param {string} fullName - Full name (optional)
     */
    async signUp(email, password, username, fullName = '') {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            // Validate inputs
            if (!email || !password || !username) {
                throw new Error('Email, password, and username are required');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            console.log('📝 Signing up user:', email);

            // Sign up with Supabase
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username,
                        full_name: fullName,
                        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || username)}&background=random`,
                    }
                }
            });

            if (error) throw error;

            // Check if email confirmation is required
            if (data.user && !data.session) {
                return {
                    success: true,
                    user: data.user,
                    requiresEmailConfirmation: true,
                    message: 'Please check your email to confirm your account'
                };
            }

            // Auto sign-in successful
            this.currentUser = data.user;
            this.currentSession = data.session;

            console.log('✅ User signed up successfully:', data.user.email);

            return {
                success: true,
                user: data.user,
                session: data.session,
                requiresEmailConfirmation: false,
                message: 'Account created successfully!'
            };

        } catch (error) {
            console.error('❌ Sign up error:', error);
            return {
                success: false,
                error: error.message || 'Sign up failed'
            };
        }
    }

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async signIn(email, password) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('🔑 Signing in user:', email);

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            this.currentUser = data.user;
            this.currentSession = data.session;

            console.log('✅ User signed in successfully:', data.user.email);

            return {
                success: true,
                user: data.user,
                session: data.session,
                message: 'Signed in successfully!'
            };

        } catch (error) {
            console.error('❌ Sign in error:', error);
            return {
                success: false,
                error: error.message || 'Sign in failed'
            };
        }
    }

    /**
     * Sign in with Google OAuth
     */
async signInWithGoogle() {
    if (!this.supabase) {
        const error = new Error('Supabase client not available');
        console.error('❌', error.message);
        throw error;
    }

    try {
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            console.error('❌ Google sign in error:', error);
            throw error;
        }

        console.log('✅ Google sign in initiated');
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Google sign in failed:', error);
        return { success: false, error: error.message };
    }
}

async signOut() {
    if (!this.supabase) {
        console.warn('⚠️ Supabase not available for sign out');
        
        // Still clear local state
        this.currentSession = null;
        this.currentUser = null;
        
        // Emit sign out event
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('auth:signedOut');
        }
        
        return { success: true };
    }

    try {
        const { error } = await this.supabase.auth.signOut();

        if (error) {
            console.error('❌ Sign out error:', error);
            throw error;
        }

        console.log('✅ Signed out successfully');
        
        this.currentSession = null;
        this.currentUser = null;
        
        // Update UI
        this.updateAuthUI();
        
        return { success: true };
    } catch (error) {
        console.error('❌ Sign out failed:', error);
        
        // Still clear local state even if server sign out fails
        this.currentSession = null;
        this.currentUser = null;
        
        return { success: false, error: error.message };
    }
}

healthCheck() {
    return {
        initialized: this.isInitialized,
        hasSupabase: !!this.supabase,
        isAuthenticated: this.isAuthenticated(),
        hasSession: !!this.currentSession,
        userEmail: this.currentUser?.email || 'none',
        attempts: this.initializationAttempts
    };
}

    setupAuthListener() {
    if (!this.supabase) {
        console.warn('⚠️ Cannot setup auth listener: Supabase not available');
        return;
    }

    try {
        const { data: authListener } = this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);
            
            this.currentSession = session;
            this.currentUser = session?.user || null;
            
            // Emit events through Core
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('auth:stateChanged', this.currentUser);
                
                if (event === 'SIGNED_IN') {
                    window.Core.emit('auth:signedIn', this.currentUser);
                    console.log('✅ User signed in:', this.currentUser.email);
                } else if (event === 'SIGNED_OUT') {
                    window.Core.emit('auth:signedOut');
                    console.log('👋 User signed out');
                } else if (event === 'TOKEN_REFRESHED') {
                    window.Core.emit('auth:tokenRefreshed', session);
                    console.log('🔄 Token refreshed');
                } else if (event === 'USER_UPDATED') {
                    window.Core.emit('auth:userUpdated', this.currentUser);
                    console.log('📝 User updated');
                }
            }
            
            // Update auth UI
            this.updateAuthUI();
        });
        
        // Store listener reference for cleanup
        this.authListener = authListener;
        
        console.log('✅ Auth state listener setup complete');
    } catch (error) {
        console.error('❌ Error setting up auth listener:', error);
    }
}

updateAuthUI() {
    const isAuthenticated = this.isAuthenticated();
    
    console.log('🔄 Updating auth UI, authenticated:', isAuthenticated);

    // Update auth buttons
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const githubSignInBtn = document.getElementById('githubSignInBtn');

    if (signInBtn) {
        signInBtn.style.display = isAuthenticated ? 'none' : 'block';
    }

    if (signOutBtn) {
        signOutBtn.style.display = isAuthenticated ? 'block' : 'none';
    }

    if (userProfileBtn) {
        userProfileBtn.style.display = isAuthenticated ? 'block' : 'none';
    }

    if (googleSignInBtn) {
        googleSignInBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    }

    if (githubSignInBtn) {
        githubSignInBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    }

    // Update user display elements
    const authUserName = document.getElementById('authUserName');
    const authUserEmail = document.getElementById('authUserEmail');

    if (authUserName) {
        authUserName.textContent = this.currentUser?.user_metadata?.name || 
                                  this.currentUser?.user_metadata?.full_name || 
                                  this.currentUser?.email || 
                                  'Guest';
    }

    if (authUserEmail) {
        authUserEmail.textContent = this.currentUser?.email || '';
    }

    // Show/hide authenticated sections
    const authSections = document.querySelectorAll('.auth-required');
    authSections.forEach(section => {
        section.style.display = isAuthenticated ? 'block' : 'none';
    });

    const guestSections = document.querySelectorAll('.guest-only');
    guestSections.forEach(section => {
        section.style.display = isAuthenticated ? 'none' : 'block';
    });
    
    console.log('✅ Auth UI updated');
}


async getCurrentSession() {
    if (!this.supabase) {
        console.warn('⚠️ Supabase not available for getCurrentSession');
        return null;
    }

    try {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error getting session:', error);
            return null;
        }
        
        this.currentSession = session;
        this.currentUser = session?.user || null;
        
        if (this.currentUser) {
            console.log('✅ Current user session found:', this.currentUser.email);
        } else {
            console.log('ℹ️ No active session');
        }
        
        return session;
    } catch (error) {
        console.error('❌ Error getting current session:', error);
        return null;
    }
}



    /**
     * Reset password
     * @param {string} email - User email
     */
    async resetPassword(email) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('🔑 Requesting password reset for:', email);

            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });

            if (error) throw error;

            console.log('✅ Password reset email sent');

            return {
                success: true,
                message: 'Password reset email sent! Check your inbox.'
            };

        } catch (error) {
            console.error('❌ Password reset error:', error);
            return {
                success: false,
                error: error.message || 'Password reset failed'
            };
        }
    }

    /**
     * Update password
     * @param {string} newPassword - New password
     */
    async updatePassword(newPassword) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            console.log('🔑 Updating password...');

            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            console.log('✅ Password updated successfully');

            return {
                success: true,
                message: 'Password updated successfully!'
            };

        } catch (error) {
            console.error('❌ Password update error:', error);
            return {
                success: false,
                error: error.message || 'Password update failed'
            };
        }
    }

    /**
     * Get user profile from database
     */
    async getUserProfile() {
        try {
            if (!this.supabase || !this.currentUser) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;

            console.log('✅ User profile loaded');

            return {
                success: true,
                profile: data
            };

        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            return {
                success: false,
                error: error.message || 'Failed to load user profile'
            };
        }
    }

    /**
     * Update user profile
     * @param {Object} updates - Profile updates
     */
    async updateUserProfile(updates) {
        try {
            if (!this.supabase || !this.currentUser) {
                throw new Error('User not authenticated');
            }

            console.log('📝 Updating user profile...');

            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ User profile updated');

            return {
                success: true,
                profile: data,
                message: 'Profile updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            return {
                success: false,
                error: error.message || 'Failed to update profile'
            };
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null && this.currentSession !== null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current session
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Refresh session
     */
    async refreshSession() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase.auth.refreshSession();

            if (error) throw error;

            this.currentSession = data.session;
            this.currentUser = data.user;

            console.log('✅ Session refreshed');

            return {
                success: true,
                session: data.session
            };

        } catch (error) {
            console.error('❌ Error refreshing session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize authentication service
const authService = new AuthService();

// Export for global access
if (typeof window !== 'undefined') {
    window.AuthService = authService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
}