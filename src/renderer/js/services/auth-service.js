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
            // Wait for Supabase client to be ready
            await this.waitForSupabase();
            
            this.supabase = window.SupabaseClient.getClient();
            
            if (!this.supabase) {
                console.error('❌ Supabase client not available');
                return;
            }

            // Load existing session
            await this.loadSession();
            
            this.initialized = true;
            console.log('✅ AuthService initialized');

        } catch (error) {
            console.error('❌ Error initializing AuthService:', error);
        }
    }

    /**
     * Wait for Supabase client to be ready
     */
    async waitForSupabase(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.SupabaseClient && window.SupabaseClient.isInitialized()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Supabase client not initialized');
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
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('🔑 Signing in with Google...');

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) throw error;

            console.log('✅ Google sign in initiated');

            return {
                success: true,
                message: 'Redirecting to Google...'
            };

        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return {
                success: false,
                error: error.message || 'Google sign in failed'
            };
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👋 Signing out user...');

            const { error } = await this.supabase.auth.signOut();

            if (error) throw error;

            this.currentUser = null;
            this.currentSession = null;

            console.log('✅ User signed out successfully');

            return {
                success: true,
                message: 'Signed out successfully!'
            };

        } catch (error) {
            console.error('❌ Sign out error:', error);
            return {
                success: false,
                error: error.message || 'Sign out failed'
            };
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