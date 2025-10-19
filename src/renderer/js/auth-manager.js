/**
 * Authentication Manager
 * Handles authentication UI and user session management
 * Integrates with AuthService for backend operations
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initialized = false;
        this.authService = null;
        
        console.log('🔐 AuthManager initializing...');
    }

    /**
     * Initialize authentication manager
     */
    async initialize() {
        try {
            // Wait for AuthService to be available
            await this.waitForAuthService();
            
            this.authService = window.AuthService;

            // Check if user is already authenticated
            await this.checkAuthStatus();

            // Create user profile UI
            this.createUserProfileUI();

            // Set up event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('✅ AuthManager initialized');

        } catch (error) {
            console.error('❌ Error initializing AuthManager:', error);
            // Fallback to guest mode
            this.createGuestUI();
        }
    }

    /**
     * Wait for AuthService to be available
     */
    async waitForAuthService(maxAttempts = 20) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.AuthService && window.AuthService.initialized) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('AuthService not available');
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            if (this.authService && this.authService.isAuthenticated()) {
                this.currentUser = this.authService.getCurrentUser();
                this.isAuthenticated = true;
                
                // Load user profile from database
                const profileResult = await this.authService.getUserProfile();
                if (profileResult.success) {
                    this.currentUser.profile = profileResult.profile;
                }

                console.log('✅ User authenticated:', this.currentUser.email);
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
                console.log('ℹ️ No active session');
            }
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for auth state changes from Supabase
        window.addEventListener('authStateChange', async (event) => {
            const { event: authEvent, session } = event.detail;
            
            console.log('🔐 Auth state changed:', authEvent);

            switch (authEvent) {
                case 'SIGNED_IN':
                    await this.handleSignIn(session);
                    break;

                case 'SIGNED_OUT':
                    this.handleSignOut();
                    break;

                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;

                case 'USER_UPDATED':
                    await this.handleUserUpdate();
                    break;
            }
        });

        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
        });
    }

    /**
     * Handle sign in event
     */
    async handleSignIn(session) {
        this.currentUser = session.user;
        this.isAuthenticated = true;

        // Load user profile
        const profileResult = await this.authService.getUserProfile();
        if (profileResult.success) {
            this.currentUser.profile = profileResult.profile;
        }

        // Update UI
        this.createUserProfileUI();

        // Show welcome notification
        if (window.UI) {
            window.UI.showNotification(
                'Welcome back!',
                `Signed in as ${this.currentUser.email}`,
                { type: 'success', duration: 3000 }
            );
        }

        // Trigger data sync
        if (window.SyncService) {
            window.SyncService.enableSync();
        }

        // Reload collections
        if (window.CollectionManager) {
            window.CollectionManager.loadCollections();
        }
    }

    /**
     * Handle sign out event
     */
    handleSignOut() {
        this.currentUser = null;
        this.isAuthenticated = false;

        // Update UI
        this.createUserProfileUI();

        // Show notification
        if (window.UI) {
            window.UI.showNotification(
                'Signed out',
                'You have been signed out successfully',
                { type: 'info', duration: 3000 }
            );
        }

        // Disable sync
        if (window.SyncService) {
            window.SyncService.disableSync();
        }

        // Clear collections
        if (window.CollectionManager) {
            window.CollectionManager.clearCollections();
        }
    }

    /**
     * Handle user update event
     */
    async handleUserUpdate() {
        if (this.authService && this.authService.isAuthenticated()) {
            const profileResult = await this.authService.getUserProfile();
            if (profileResult.success) {
                this.currentUser.profile = profileResult.profile;
                this.createUserProfileUI();
            }
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(isOnline) {
        const statusIndicator = document.querySelector('.connection-status');
        if (statusIndicator) {
            statusIndicator.className = 'connection-status ' + (isOnline ? 'online' : 'offline');
            statusIndicator.title = isOnline ? 'Connected' : 'Offline';
        }
    }

    // ============================================
    // UI COMPONENTS
    // ============================================

    /**
     * Create user profile UI in header
     */
    createUserProfileUI() {
        const headerControls = document.querySelector('.header-controls');
        if (!headerControls) return;

        // Remove existing profile element
        const existing = headerControls.querySelector('.user-profile');
        if (existing) existing.remove();

        const profileElement = document.createElement('div');
        profileElement.className = 'user-profile';

        if (this.isAuthenticated && this.currentUser) {
            const profile = this.currentUser.profile || {};
            const displayName = profile.full_name || profile.username || this.currentUser.email?.split('@')[0] || 'User';
            const avatarUrl = profile.avatar_url || this.generateAvatarUrl(displayName);

            profileElement.innerHTML = `
                <button class="user-profile-btn" onclick="window.AuthManager.showProfileMenu(event)" title="${this.currentUser.email}">
                    <img src="${avatarUrl}" alt="${displayName}" class="user-avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👤</text></svg>'">
                    <span class="user-name">${displayName}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
                <div class="connection-status ${navigator.onLine ? 'online' : 'offline'}" title="${navigator.onLine ? 'Connected' : 'Offline'}"></div>
            `;
        } else {
            profileElement.innerHTML = `
                <button class="user-profile-btn login-btn" onclick="window.AuthManager.showLoginModal()">
                    <span class="user-avatar">👤</span>
                    <span class="user-name">Sign In</span>
                </button>
            `;
        }

        headerControls.appendChild(profileElement);
    }

    /**
     * Generate avatar URL from name
     */
    generateAvatarUrl(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
    }

    /**
     * Create guest UI (fallback)
     */
    createGuestUI() {
        const headerControls = document.querySelector('.header-controls');
        if (!headerControls) return;

        const existing = headerControls.querySelector('.user-profile');
        if (existing) existing.remove();

        const profileElement = document.createElement('div');
        profileElement.className = 'user-profile';
        profileElement.innerHTML = `
            <button class="user-profile-btn guest-btn" onclick="window.AuthManager.showLoginModal()">
                <span class="user-avatar">👤</span>
                <span class="user-name">Guest Mode</span>
            </button>
        `;

        headerControls.appendChild(profileElement);
    }

    /**
     * Show profile menu dropdown
     */
    showProfileMenu(event) {
        event.stopPropagation();

        // Remove existing menu
        const existingMenu = document.querySelector('.profile-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const profile = this.currentUser?.profile || {};
        const displayName = profile.full_name || profile.username || this.currentUser?.email?.split('@')[0] || 'User';
        const email = this.currentUser?.email || '';

        const menu = document.createElement('div');
        menu.className = 'profile-menu';
        menu.innerHTML = `
            <div class="profile-menu-header">
                <div class="profile-menu-avatar">
                    <img src="${profile.avatar_url || this.generateAvatarUrl(displayName)}" alt="${displayName}">
                </div>
                <div class="profile-menu-info">
                    <div class="profile-menu-name">${displayName}</div>
                    <div class="profile-menu-email">${email}</div>
                </div>
            </div>
            <div class="profile-menu-divider"></div>
            <div class="profile-menu-items">
                <button class="profile-menu-item" onclick="window.AuthManager.showProfileSettings()">
                    <span class="menu-icon">⚙️</span>
                    <span>Account Settings</span>
                </button>
                <button class="profile-menu-item" onclick="window.AuthManager.showTeamsModal()">
                    <span class="menu-icon">👥</span>
                    <span>My Teams</span>
                </button>
                <button class="profile-menu-item" onclick="window.AuthManager.showSyncStatus()">
                    <span class="menu-icon">🔄</span>
                    <span>Sync Status</span>
                </button>
                <div class="profile-menu-divider"></div>
                <button class="profile-menu-item danger" onclick="window.AuthManager.logout()">
                    <span class="menu-icon">🚪</span>
                    <span>Sign Out</span>
                </button>
            </div>
        `;

        // Position menu below button
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = '10px';

        document.body.appendChild(menu);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 0);
    }

    // ============================================
    // LOGIN / SIGNUP MODALS
    // ============================================

    /**
     * Show login modal
     */
    showLoginModal() {
        // Remove existing modal
        const existingModal = document.querySelector('.auth-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal auth-modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content auth-modal-content">
                <div class="modal-header">
                    <h3>🔐 Sign In to PosterBoy</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>

                <form id="loginForm" onsubmit="window.AuthManager.handleLogin(event)">
                    <div class="modal-body">
                        <!-- Google Sign In Button -->
                        <button type="button" class="btn btn-google" onclick="window.AuthManager.signInWithGoogle()">
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <div class="divider">
                            <span>OR</span>
                        </div>

                        <!-- Email Login -->
                        <div class="form-group">
                            <label for="loginEmail">Email</label>
                            <input type="email" id="loginEmail" class="form-control" required placeholder="your@email.com" autocomplete="email">
                        </div>

                        <div class="form-group">
                            <label for="loginPassword">Password</label>
                            <input type="password" id="loginPassword" class="form-control" required placeholder="Enter your password" autocomplete="current-password">
                        </div>

                        <div class="form-group form-check">
                            <input type="checkbox" id="rememberMe" checked>
                            <label for="rememberMe">Remember me</label>
                        </div>

                        <div class="form-links">
                            <a href="#" onclick="window.AuthManager.showForgotPassword(); return false;">Forgot password?</a>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary btn-block" id="loginBtn">
                            <span>Sign In</span>
                            <span class="spinner" style="display: none;">⏳</span>
                        </button>
                        <div class="signup-link">
                            Don't have an account? 
                            <a href="#" onclick="window.AuthManager.showSignupModal(); return false;">Sign Up</a>
                        </div>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus on email input
        setTimeout(() => {
            document.getElementById('loginEmail')?.focus();
        }, 100);
    }

    /**
     * Show signup modal
     */
    showSignupModal() {
        // Remove existing modal
        const existingModal = document.querySelector('.auth-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal auth-modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content auth-modal-content">
                <div class="modal-header">
                    <h3>📝 Create Account</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>

                <form id="signupForm" onsubmit="window.AuthManager.handleSignup(event)">
                    <div class="modal-body">
                        <!-- Google Sign In Button -->
                        <button type="button" class="btn btn-google" onclick="window.AuthManager.signInWithGoogle()">
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <div class="divider">
                            <span>OR</span>
                        </div>

                        <!-- Signup Form -->
                        <div class="form-group">
                            <label for="signupUsername">Username</label>
                            <input type="text" id="signupUsername" class="form-control" required placeholder="Choose a username" autocomplete="username">
                        </div>

                        <div class="form-group">
                            <label for="signupEmail">Email</label>
                            <input type="email" id="signupEmail" class="form-control" required placeholder="your@email.com" autocomplete="email">
                        </div>

                        <div class="form-group">
                            <label for="signupPassword">Password</label>
                            <input type="password" id="signupPassword" class="form-control" required placeholder="At least 6 characters" autocomplete="new-password" minlength="6">
                            <small class="form-text">Minimum 6 characters</small>
                        </div>

                        <div class="form-group">
                            <label for="signupFullName">Full Name (Optional)</label>
                            <input type="text" id="signupFullName" class="form-control" placeholder="Your full name" autocomplete="name">
                        </div>

                        <div class="form-group form-check">
                            <input type="checkbox" id="agreeTerms" required>
                            <label for="agreeTerms">
                                I agree to the <a href="#" onclick="return false;">Terms of Service</a> and 
                                <a href="#" onclick="return false;">Privacy Policy</a>
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary btn-block" id="signupBtn">
                            <span>Create Account</span>
                            <span class="spinner" style="display: none;">⏳</span>
                        </button>
                        <div class="signup-link">
                            Already have an account? 
                            <a href="#" onclick="window.AuthManager.showLoginModal(); return false;">Sign In</a>
                        </div>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus on username input
        setTimeout(() => {
            document.getElementById('signupUsername')?.focus();
        }, 100);
    }

    /**
     * Show forgot password modal
     */
    showForgotPassword() {
        const existingModal = document.querySelector('.auth-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal auth-modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content auth-modal-content">
                <div class="modal-header">
                    <h3>🔑 Reset Password</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>

                <form id="forgotPasswordForm" onsubmit="window.AuthManager.handleForgotPassword(event)">
                    <div class="modal-body">
                        <p>Enter your email address and we'll send you a link to reset your password.</p>

                        <div class="form-group">
                            <label for="resetEmail">Email</label>
                            <input type="email" id="resetEmail" class="form-control" required placeholder="your@email.com">
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary btn-block" id="resetBtn">
                            <span>Send Reset Link</span>
                            <span class="spinner" style="display: none;">⏳</span>
                        </button>
                        <div class="signup-link">
                            Remember your password? 
                            <a href="#" onclick="window.AuthManager.showLoginModal(); return false;">Sign In</a>
                        </div>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            document.getElementById('resetEmail')?.focus();
        }, 100);
    }

    // ============================================
    // AUTHENTICATION HANDLERS
    // ============================================

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const button = document.getElementById('loginBtn');
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('span:first-child');

        // Show loading state
        button.disabled = true;
        spinner.style.display = 'inline-block';
        text.textContent = 'Signing in...';

        try {
            const result = await this.authService.signIn(email, password);

            if (result.success) {
                // Success notification
                if (window.UI) {
                    window.UI.showNotification(
                        'Welcome back!',
                        result.message,
                        { type: 'success' }
                    );
                }

                // Close modal
                document.querySelector('.auth-modal')?.remove();

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Login error:', error);

            // Show error notification
            if (window.UI) {
                window.UI.showNotification(
                    'Login Failed',
                    error.message || 'Invalid email or password',
                    { type: 'error' }
                );
            }

            // Reset button state
            button.disabled = false;
            spinner.style.display = 'none';
            text.textContent = 'Sign In';
        }
    }

    /**
     * Handle signup form submission
     */
    async handleSignup(event) {
        event.preventDefault();

        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const fullName = document.getElementById('signupFullName').value.trim();
        const button = document.getElementById('signupBtn');
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('span:first-child');

        // Validate username
        if (username.length < 3) {
            if (window.UI) {
                window.UI.showNotification(
                    'Invalid Username',
                    'Username must be at least 3 characters',
                    { type: 'error' }
                );
            }
            return;
        }

        // Show loading state
        button.disabled = true;
        spinner.style.display = 'inline-block';
        text.textContent = 'Creating account...';

        try {
            const result = await this.authService.signUp(email, password, username, fullName);

            if (result.success) {
                // Success notification
                if (window.UI) {
                    window.UI.showNotification(
                        'Account Created!',
                        result.requiresEmailConfirmation 
                            ? 'Please check your email to confirm your account'
                            : 'Welcome to PosterBoy!',
                        { type: 'success', duration: 5000 }
                    );
                }

                // Close modal if auto sign-in successful
                if (!result.requiresEmailConfirmation) {
                    document.querySelector('.auth-modal')?.remove();
                } else {
                    // Show message to check email
                    const modalBody = document.querySelector('.modal-body');
                    if (modalBody) {
                        modalBody.innerHTML = `
                            <div class="alert alert-info">
                                <h4>📧 Check Your Email</h4>
                                <p>We've sent a confirmation link to <strong>${email}</strong></p>
                                <p>Please click the link in the email to activate your account.</p>
                            </div>
                            <button class="btn btn-secondary btn-block" onclick="this.closest('.modal').remove()">
                                Close
                            </button>
                        `;
                    }
                }

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Signup error:', error);

            // Show error notification
            if (window.UI) {
                window.UI.showNotification(
                    'Signup Failed',
                    error.message || 'Could not create account',
                    { type: 'error' }
                );
            }

            // Reset button state
            button.disabled = false;
            spinner.style.display = 'none';
            text.textContent = 'Create Account';
        }
    }

    /**
     * Handle forgot password form submission
     */
    async handleForgotPassword(event) {
        event.preventDefault();

        const email = document.getElementById('resetEmail').value.trim();
        const button = document.getElementById('resetBtn');
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('span:first-child');

        // Show loading state
        button.disabled = true;
        spinner.style.display = 'inline-block';
        text.textContent = 'Sending...';

        try {
            const result = await this.authService.resetPassword(email);

            if (result.success) {
                // Show success message
                const modalBody = document.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div class="alert alert-success">
                            <h4>✅ Email Sent!</h4>
                            <p>We've sent a password reset link to <strong>${email}</strong></p>
                            <p>Please check your email and follow the instructions to reset your password.</p>
                        </div>
                        <button class="btn btn-primary btn-block" onclick="window.AuthManager.showLoginModal()">
                            Back to Sign In
                        </button>
                    `;
                }

                // Show notification
                if (window.UI) {
                    window.UI.showNotification(
                        'Reset Email Sent',
                        result.message,
                        { type: 'success' }
                    );
                }

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Password reset error:', error);

            // Show error notification
            if (window.UI) {
                window.UI.showNotification(
                    'Reset Failed',
                    error.message || 'Could not send reset email',
                    { type: 'error' }
                );
            }

            // Reset button state
            button.disabled = false;
            spinner.style.display = 'none';
            text.textContent = 'Send Reset Link';
        }
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        try {
            // Show loading notification
            if (window.UI) {
                window.UI.showNotification(
                    'Redirecting...',
                    'Opening Google sign-in',
                    { type: 'info', duration: 2000 }
                );
            }

            const result = await this.authService.signInWithGoogle();

            if (!result.success) {
                throw new Error(result.error);
            }

            // The page will redirect to Google, so no need to handle success here

        } catch (error) {
            console.error('❌ Google sign-in error:', error);

            if (window.UI) {
                window.UI.showNotification(
                    'Google Sign-In Failed',
                    error.message || 'Could not sign in with Google',
                    { type: 'error' }
                );
            }
        }
    }

    /**
     * Logout user
     */
    async logout() {
        if (!confirm('Are you sure you want to sign out?')) {
            return;
        }

        try {
            const result = await this.authService.signOut();

            if (result.success) {
                console.log('✅ Signed out successfully');
            }

        } catch (error) {
            console.error('❌ Logout error:', error);

            if (window.UI) {
                window.UI.showNotification(
                    'Logout Failed',
                    error.message || 'Could not sign out',
                    { type: 'error' }
                );
            }
        }
    }

    // ============================================
    // PROFILE MANAGEMENT
    // ============================================

    /**
     * Show profile settings modal
     */
    async showProfileSettings() {
        const profile = this.currentUser?.profile || {};

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Account Settings</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">×</button>
</div>
<form id="profileSettingsForm" onsubmit="window.AuthManager.handleProfileUpdate(event)">
                <div class="modal-body">
                    <div class="profile-settings-section">
                        <h4>Profile Information</h4>

                        <div class="form-group">
                            <label for="profileUsername">Username</label>
                            <input type="text" id="profileUsername" class="form-control" value="${profile.username || ''}" required>
                        </div>

                        <div class="form-group">
                            <label for="profileFullName">Full Name</label>
                            <input type="text" id="profileFullName" class="form-control" value="${profile.full_name || ''}" placeholder="Your full name">
                        </div>

                        <div class="form-group">
                            <label for="profileBio">Bio</label>
                            <textarea id="profileBio" class="form-control" rows="3" placeholder="Tell us about yourself">${profile.bio || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="profileAvatarUrl">Avatar URL</label>
                            <input type="url" id="profileAvatarUrl" class="form-control" value="${profile.avatar_url || ''}" placeholder="https://example.com/avatar.jpg">
                            <small class="form-text">Or leave empty to use generated avatar</small>
                        </div>

                        <div class="profile-avatar-preview">
                            <img src="${profile.avatar_url || this.generateAvatarUrl(profile.full_name || profile.username || 'User')}" alt="Avatar Preview" id="avatarPreview">
                        </div>
                    </div>

                    <div class="profile-settings-section">
                        <h4>Account Details</h4>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${this.currentUser?.email || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">User ID:</span>
                            <span class="info-value">${this.currentUser?.id || ''}</span>
                        </div>
                    </div>

                    <div class="profile-settings-section">
                        <h4>Security</h4>
                        <button type="button" class="btn btn-secondary" onclick="window.AuthManager.showChangePassword()">
                            🔒 Change Password
                        </button>
                    </div>

                    <div class="profile-settings-section danger-zone">
                        <h4>Danger Zone</h4>
                        <button type="button" class="btn btn-danger" onclick="window.AuthManager.confirmDeleteAccount()">
                            🗑️ Delete Account
                        </button>
                        <small class="form-text">This action cannot be undone</small>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="saveProfileBtn">
                        <span>Save Changes</span>
                        <span class="spinner" style="display: none;">⏳</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Avatar preview update
    const avatarInput = document.getElementById('profileAvatarUrl');
    const avatarPreview = document.getElementById('avatarPreview');
    avatarInput?.addEventListener('input', (e) => {
        if (e.target.value) {
            avatarPreview.src = e.target.value;
        }
    });
}

/**
 * Handle profile update
 */
async handleProfileUpdate(event) {
    event.preventDefault();

    const username = document.getElementById('profileUsername').value.trim();
    const fullName = document.getElementById('profileFullName').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    const avatarUrl = document.getElementById('profileAvatarUrl').value.trim();

    const button = document.getElementById('saveProfileBtn');
    const spinner = button.querySelector('.spinner');
    const text = button.querySelector('span:first-child');

    // Show loading state
    button.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Saving...';

    try {
        const updates = {
            username: username,
            full_name: fullName,
            bio: bio,
            avatar_url: avatarUrl || this.generateAvatarUrl(fullName || username)
        };

        const result = await this.authService.updateUserProfile(updates);

        if (result.success) {
            // Update local user data
            this.currentUser.profile = result.profile;

            // Update UI
            this.createUserProfileUI();

            // Show success notification
            if (window.UI) {
                window.UI.showNotification(
                    'Profile Updated',
                    result.message,
                    { type: 'success' }
                );
            }

            // Close modal
            document.querySelector('.modal')?.remove();

        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Profile update error:', error);

        if (window.UI) {
            window.UI.showNotification(
                'Update Failed',
                error.message || 'Could not update profile',
                { type: 'error' }
            );
        }

        // Reset button state
        button.disabled = false;
        spinner.style.display = 'none';
        text.textContent = 'Save Changes';
    }
}

/**
 * Show change password modal
 */
showChangePassword() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔒 Change Password</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>

            <form id="changePasswordForm" onsubmit="window.AuthManager.handleChangePassword(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" class="form-control" required minlength="6" placeholder="At least 6 characters">
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-control" required minlength="6" placeholder="Re-enter password">
                    </div>

                    <small class="form-text">Password must be at least 6 characters long</small>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="changePasswordBtn">
                        <span>Change Password</span>
                        <span class="spinner" style="display: none;">⏳</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Handle password change
 */
async handleChangePassword(event) {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        if (window.UI) {
            window.UI.showNotification(
                'Passwords Don\'t Match',
                'Please make sure both passwords are the same',
                { type: 'error' }
            );
        }
        return;
    }

    const button = document.getElementById('changePasswordBtn');
    const spinner = button.querySelector('.spinner');
    const text = button.querySelector('span:first-child');

    // Show loading state
    button.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Changing...';

    try {
        const result = await this.authService.updatePassword(newPassword);

        if (result.success) {
            // Show success notification
            if (window.UI) {
                window.UI.showNotification(
                    'Password Changed',
                    result.message,
                    { type: 'success' }
                );
            }

            // Close modal
            document.querySelector('.modal')?.remove();

        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Password change error:', error);

        if (window.UI) {
            window.UI.showNotification(
                'Change Failed',
                error.message || 'Could not change password',
                { type: 'error' }
            );
        }

        // Reset button state
        button.disabled = false;
        spinner.style.display = 'none';
        text.textContent = 'Change Password';
    }
}

/**
 * Confirm account deletion
 */
confirmDeleteAccount() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete your account and all your data.\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you absolutely sure you want to delete your account?'
    );

    if (confirmed) {
        const doubleConfirm = prompt(
            'To confirm deletion, please type "DELETE MY ACCOUNT" (all caps):'
        );

        if (doubleConfirm === 'DELETE MY ACCOUNT') {
            this.deleteAccount();
        } else {
            if (window.UI) {
                window.UI.showNotification(
                    'Deletion Cancelled',
                    'Account deletion cancelled',
                    { type: 'info' }
                );
            }
        }
    }
}

/**
 * Delete account (placeholder - implement with backend)
 */
async deleteAccount() {
    // TODO: Implement account deletion
    // This would require a backend endpoint to delete user data

    if (window.UI) {
        window.UI.showNotification(
            'Not Implemented',
            'Account deletion is not yet implemented. Please contact support.',
            { type: 'warning' }
        );
    }

    console.warn('⚠️ Account deletion not implemented');
}

// ============================================
// TEAMS MODAL
// ============================================

/**
 * Show teams modal
 */
async showTeamsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>👥 My Teams</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>

            <div class="modal-body">
                <div class="teams-header">
                    <button class="btn btn-primary" onclick="window.AuthManager.showCreateTeamModal()">
                        ➕ Create Team
                    </button>
                </div>

                <div id="teamsContainer" class="teams-container">
                    <div class="loading">Loading teams...</div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load teams
    await this.loadTeamsInModal();
}

/**
 * Load teams in modal
 */
async loadTeamsInModal() {
    const container = document.getElementById('teamsContainer');
    if (!container) return;

    try {
        if (!window.TeamService) {
            throw new Error('TeamService not available');
        }

        const result = await window.TeamService.getMyTeams();

        if (result.success && result.teams.length > 0) {
            container.innerHTML = result.teams.map(team => `
                <div class="team-card">
                    <div class="team-card-header">
                        <h4>${team.name}</h4>
                        <span class="team-role ${team.role}">${team.role}</span>
                    </div>
                    <p class="team-description">${team.description || 'No description'}</p>
                    <div class="team-card-footer">
                        <button class="btn btn-sm btn-secondary" onclick="window.AuthManager.viewTeamDetails('${team.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h4>No Teams Yet</h4>
                    <p>Create a team to collaborate with others</p>
                    <button class="btn btn-primary" onclick="window.AuthManager.showCreateTeamModal()">
                        Create Your First Team
                    </button>
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Error loading teams:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Failed to load teams</p>
                <button class="btn btn-secondary" onclick="window.AuthManager.loadTeamsInModal()">
                    Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Show create team modal
 */
showCreateTeamModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>➕ Create Team</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>

            <form id="createTeamForm" onsubmit="window.AuthManager.handleCreateTeam(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="teamName">Team Name</label>
                        <input type="text" id="teamName" class="form-control" required placeholder="Enter team name">
                    </div>

                    <div class="form-group">
                        <label for="teamDescription">Description (Optional)</label>
                        <textarea id="teamDescription" class="form-control" rows="3" placeholder="What is this team for?"></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="createTeamBtn">
                        <span>Create Team</span>
                        <span class="spinner" style="display: none;">⏳</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Handle create team
 */
async handleCreateTeam(event) {
    event.preventDefault();

    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDescription').value.trim();

    const button = document.getElementById('createTeamBtn');
    const spinner = button.querySelector('.spinner');
    const text = button.querySelector('span:first-child');

    // Show loading state
    button.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Creating...';

    try {
        if (!window.TeamService) {
            throw new Error('TeamService not available');
        }

        const result = await window.TeamService.createTeam(name, description);

        if (result.success) {
            // Show success notification
            if (window.UI) {
                window.UI.showNotification(
                    'Team Created',
                    result.message,
                    { type: 'success' }
                );
            }

            // Close modal
            document.querySelector('.modal')?.remove();

            // Refresh teams list if modal is open
            if (document.getElementById('teamsContainer')) {
                await this.loadTeamsInModal();
            }

        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Create team error:', error);

        if (window.UI) {
            window.UI.showNotification(
                'Creation Failed',
                error.message || 'Could not create team',
                { type: 'error' }
            );
        }

        // Reset button state
        button.disabled = false;
        spinner.style.display = 'none';
        text.textContent = 'Create Team';
    }
}

/**
 * View team details (placeholder)
 */
viewTeamDetails(teamId) {
    console.log('View team details:', teamId);
    
    if (window.UI) {
        window.UI.showNotification(
            'Coming Soon',
            'Team details view is coming soon!',
            { type: 'info' }
        );
    }

    // TODO: Implement team details view
}

// ============================================
// SYNC STATUS
// ============================================

/**
 * Show sync status modal
 */
showSyncStatus() {
    const syncService = window.SyncService;
    const status = syncService ? syncService.getSyncStatus() : null;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔄 Sync Status</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>

            <div class="modal-body">
                ${status ? `
                    <div class="sync-status-info">
                        <div class="status-row">
                            <span class="status-label">Status:</span>
                            <span class="status-value ${status.enabled ? 'status-active' : 'status-inactive'}">
                                ${status.enabled ? '✅ Active' : '❌ Inactive'}
                            </span>
                        </div>

                        <div class="status-row">
                            <span class="status-label">Connection:</span>
                            <span class="status-value ${status.online ? 'status-online' : 'status-offline'}">
                                ${status.online ? '🌐 Online' : '📴 Offline'}
                            </span>
                        </div>

                        <div class="status-row">
                            <span class="status-label">Currently Syncing:</span>
                            <span class="status-value">
                                ${status.syncing ? '⏳ Yes' : '✅ No'}
                            </span>
                        </div>

                        <div class="status-row">
                            <span class="status-label">Last Sync:</span>
                            <span class="status-value">
                                ${status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
                            </span>
                        </div>

                        <div class="status-row">
                            <span class="status-label">Pending Changes:</span>
                            <span class="status-value">
                                ${status.queueLength} item${status.queueLength !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div class="status-row">
                            <span class="status-label">Active Subscriptions:</span>
                            <span class="status-value">
                                ${status.subscriptions}
                            </span>
                        </div>
                    </div>

                    <div class="sync-actions">
                        <button class="btn btn-primary btn-block" onclick="window.AuthManager.forceSyncNow()" ${status.syncing ? 'disabled' : ''}>
                            🔄 Sync Now
                        </button>
                    </div>
                ` : `
                    <div class="alert alert-warning">
                        Sync service not available
                    </div>
                `}
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Force sync now
 */
async forceSyncNow() {
    if (!window.SyncService) {
        if (window.UI) {
            window.UI.showNotification(
                'Sync Unavailable',
                'Sync service is not available',
                { type: 'error' }
            );
        }
        return;
    }

    if (window.UI) {
        window.UI.showNotification(
            'Syncing...',
            'Starting sync process',
            { type: 'info', duration: 2000 }
        );
    }

    const result = await window.SyncService.forceSyncNow();

    if (result.success) {
        if (window.UI) {
            window.UI.showNotification(
                'Sync Complete',
                'All data synced successfully',
                { type: 'success' }
            );
        }

        // Refresh sync status modal if open
        const syncStatusModal = document.querySelector('.modal');
        if (syncStatusModal) {
            syncStatusModal.remove();
            this.showSyncStatus();
        }
    } else {
        if (window.UI) {
            window.UI.showNotification(
                'Sync Failed',
                result.error || 'Could not sync data',
                { type: 'error' }
            );
        }
    }
}

// ============================================
// UTILITY METHODS
// ============================================

/**
 * Get current user
 */
getCurrentUser() {
    return this.currentUser;
}

/**
 * Check if authenticated
 */
isUserAuthenticated() {
    return this.isAuthenticated;
}

/**
 * Get user display name
 */
getUserDisplayName() {
    if (!this.currentUser) return 'Guest';
    
    const profile = this.currentUser.profile || {};
    return profile.full_name || profile.username || this.currentUser.email?.split('@')[0] || 'User';
}

/**
 * Get user avatar URL
 */
getUserAvatarUrl() {
    if (!this.currentUser) return null;
    
    const profile = this.currentUser.profile || {};
    return profile.avatar_url || this.generateAvatarUrl(this.getUserDisplayName());
}
}
// Initialize auth manager
const authManager = new AuthManager();
// Initialize when DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
authManager.initialize();
});
} else {
authManager.initialize();
}
// Export for global access
if (typeof window !== 'undefined') {
window.AuthManager = authManager;
}
// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
module.exports = authManager;
}
