// User Manager - Handles user authentication, profiles, and preferences

class UserManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.preferences = this.loadPreferences();
        this.initialized = false;
        
        console.log('👤 UserManager initializing...');
        this.initialize();
    }

initialize() {
    try {
        this.loadUserData();
        this.ensureUserExists(); // Add this line
        this.setupEventListeners();
        this.updateDisplay();
        
        this.initialized = true;
        console.log('✅ UserManager initialized successfully');
        
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('user-manager-initialized');
        }
    } catch (error) {
        console.error('❌ UserManager initialization failed:', error);
        // Create fallback user
        this.ensureUserExists();
        this.initialized = true;
    }
}



setupEventListeners() {
    console.log('👤 Setting up UserManager event listeners...');
    
    // Listen for auth state changes from AuthService
    if (window.Core) {
        window.Core.on('auth:stateChanged', (user) => {
            this.handleAuthStateChange(user);
        });
        
        window.Core.on('user:updated', () => {
            this.loadUserData();
            this.updateDisplay();
        });
        
        window.Core.on('auth:signedIn', (user) => {
            console.log('✅ User signed in event received');
            this.handleAuthStateChange(user);
        });
        
        window.Core.on('auth:signedOut', () => {
            console.log('👋 User signed out event received');
            this.handleAuthStateChange(null);
        });
    }

    // Profile update button
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', () => {
            this.updateProfile();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            this.logout();
        });
    }

    // Settings save button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    console.log('✅ UserManager event listeners setup complete');
}



async handleAuthStateChange(user) {
    console.log('🔐 Auth state changed in UserManager:', user ? user.email : 'logged out');
    
    if (user) {
        // User logged in
        this.currentUser = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
            avatar: user.user_metadata?.avatar_url || null,
            preferences: this.currentUser?.preferences || {
                theme: 'light',
                autoSave: true,
                notifications: true,
                requestTimeout: 30000,
                maxRedirects: 5
            },
            settings: this.currentUser?.settings || {
                defaultMethod: 'GET',
                validateSSL: true,
                followRedirects: true
            },
            createdAt: user.created_at,
            lastSignInAt: user.last_sign_in_at,
            isGuest: false
        };
        
        await this.saveUserData();
        console.log('✅ User logged in:', this.currentUser.email);
        
        // Emit login event
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('user:loggedIn', this.currentUser);
        }
    } else {
        // User logged out
        this.currentUser = this.createDefaultUser();
        await this.saveUserData();
        console.log('👋 User logged out, switched to guest');
        
        // Emit logout event
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('user:loggedOut');
        }
    }
    
    this.updateDisplay();
}


// 3. ADD: saveSettings method
// ADD this method if missing:

async saveSettings() {
    if (!this.currentUser) {
        console.error('❌ No user to save settings for');
        return false;
    }
    
    const preferences = {};
    const settings = {};
    
    // Get values from form elements if they exist
    const themeSelect = document.getElementById('themeSelect');
    const autoSaveCheckbox = document.getElementById('autoSaveCheckbox');
    const notificationsCheckbox = document.getElementById('notificationsCheckbox');
    const timeoutInput = document.getElementById('requestTimeoutInput');
    const maxRedirectsInput = document.getElementById('maxRedirectsInput');
    const validateSSLCheckbox = document.getElementById('validateSSLCheckbox');
    const followRedirectsCheckbox = document.getElementById('followRedirectsCheckbox');

    if (themeSelect) preferences.theme = themeSelect.value;
    if (autoSaveCheckbox) preferences.autoSave = autoSaveCheckbox.checked;
    if (notificationsCheckbox) preferences.notifications = notificationsCheckbox.checked;
    if (timeoutInput) preferences.requestTimeout = parseInt(timeoutInput.value) || 30000;
    if (maxRedirectsInput) preferences.maxRedirects = parseInt(maxRedirectsInput.value) || 5;
    if (validateSSLCheckbox) settings.validateSSL = validateSSLCheckbox.checked;
    if (followRedirectsCheckbox) settings.followRedirects = followRedirectsCheckbox.checked;

    // Update user data
    this.currentUser.preferences = {
        ...this.currentUser.preferences,
        ...preferences
    };
    
    this.currentUser.settings = {
        ...this.currentUser.settings,
        ...settings
    };
    
    await this.saveUserData();
    
    // Apply preferences
    this.applyPreferences();
    
    console.log('✅ Settings saved successfully');
    
    // Show notification
    if (window.Core && typeof window.Core.showNotification === 'function') {
        window.Core.showNotification('Settings Saved', 'Your settings have been saved successfully', { type: 'success' });
    }
    
    return true;
}


// 4. ADD: applyPreferences method
// ADD this method if missing:

applyPreferences() {
    if (!this.currentUser || !this.currentUser.preferences) {
        return;
    }

    const { theme } = this.currentUser.preferences;

    // Apply theme
    if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (document.body) {
            document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
        }
        console.log(`🎨 Applied theme: ${theme}`);
    }

    // Other preference applications can be added here
}


// 5. FIX: updateDisplay method
// REPLACE or enhance your updateDisplay method:

updateDisplay() {
    console.log('🔄 Updating UserManager display...');
    
    if (!this.currentUser) {
        console.warn('⚠️ No current user to display');
        return;
    }
    
    // Update user info in header
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');

    if (userNameElement) {
        userNameElement.textContent = this.currentUser.name || 'Guest';
    }

    if (userEmailElement) {
        userEmailElement.textContent = this.currentUser.email || '';
    }

    if (userAvatarElement) {
        if (this.currentUser.avatar) {
            userAvatarElement.src = this.currentUser.avatar;
            userAvatarElement.alt = this.currentUser.name;
        } else {
            // Generate default avatar with initial
            const initial = this.currentUser.name?.charAt(0).toUpperCase() || 'G';
            userAvatarElement.src = this.generateAvatarDataURL(initial);
            userAvatarElement.alt = this.currentUser.name || 'Guest';
        }
    }

    // Update profile form if exists
    const profileNameInput = document.getElementById('profileName');
    const profileEmailInput = document.getElementById('profileEmail');

    if (profileNameInput) {
        profileNameInput.value = this.currentUser.name || '';
    }

    if (profileEmailInput) {
        profileEmailInput.value = this.currentUser.email || '';
    }

    // Update settings form if exists
    if (this.currentUser.preferences) {
        const themeSelect = document.getElementById('themeSelect');
        const autoSaveCheckbox = document.getElementById('autoSaveCheckbox');
        const notificationsCheckbox = document.getElementById('notificationsCheckbox');
        const timeoutInput = document.getElementById('requestTimeoutInput');
        const maxRedirectsInput = document.getElementById('maxRedirectsInput');

        if (themeSelect) themeSelect.value = this.currentUser.preferences.theme || 'light';
        if (autoSaveCheckbox) autoSaveCheckbox.checked = this.currentUser.preferences.autoSave !== false;
        if (notificationsCheckbox) notificationsCheckbox.checked = this.currentUser.preferences.notifications !== false;
        if (timeoutInput) timeoutInput.value = this.currentUser.preferences.requestTimeout || 30000;
        if (maxRedirectsInput) maxRedirectsInput.value = this.currentUser.preferences.maxRedirects || 5;
    }

    if (this.currentUser.settings) {
        const validateSSLCheckbox = document.getElementById('validateSSLCheckbox');
        const followRedirectsCheckbox = document.getElementById('followRedirectsCheckbox');

        if (validateSSLCheckbox) validateSSLCheckbox.checked = this.currentUser.settings.validateSSL !== false;
        if (followRedirectsCheckbox) followRedirectsCheckbox.checked = this.currentUser.settings.followRedirects !== false;
    }

    // Show/hide guest vs authenticated UI elements
    const guestElements = document.querySelectorAll('.guest-only');
    const authElements = document.querySelectorAll('.auth-only');

    guestElements.forEach(el => {
        el.style.display = this.isLoggedIn() ? 'none' : 'block';
    });

    authElements.forEach(el => {
        el.style.display = this.isLoggedIn() ? 'block' : 'none';
    });

    // Update user badge/status
    const userBadge = document.getElementById('userBadge');
    if (userBadge) {
        if (this.isLoggedIn()) {
            userBadge.textContent = '🟢 Online';
            userBadge.className = 'user-badge online';
        } else {
            userBadge.textContent = '👤 Guest';
            userBadge.className = 'user-badge guest';
        }
    }

    // Apply current preferences
    this.applyPreferences();
    
    console.log('✅ UserManager display updated');
}


// 6. ADD: generateAvatarDataURL helper
// ADD this helper method:

generateAvatarDataURL(initial) {
    // Create a simple SVG avatar with the user's initial
    const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#4B75FF"/>
            <text x="50" y="50" font-family="Arial" font-size="48" 
                  fill="white" text-anchor="middle" dy=".3em" font-weight="bold">
                ${initial}
            </text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

async logout() {
    console.log('👋 Logging out user...');
    
    // Sign out from AuthService if available
    if (window.authService && typeof window.authService.signOut === 'function') {
        try {
            await window.authService.signOut();
            console.log('✅ Signed out from AuthService');
        } catch (error) {
            console.error('❌ Error signing out from AuthService:', error);
        }
    }

    // Reset to guest user
    this.currentUser = this.createDefaultUser();
    await this.saveUserData();
    
    console.log('👋 User logged out successfully');
    
    // Emit event
    if (window.Core && typeof window.Core.emit === 'function') {
        window.Core.emit('user:loggedOut');
    }

    this.updateDisplay();

    // Show notification
    if (window.Core && typeof window.Core.showNotification === 'function') {
        window.Core.showNotification('Logged Out', 'You have been logged out successfully', { type: 'info' });
    }
}




    loadUserData() {
        try {
            // Load user from localStorage
            const userData = localStorage.getItem('posterboy_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
            } else {
                // Create a default local user
                this.createDefaultUser();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.createDefaultUser();
        }
    }

    createDefaultUser() {
        this.currentUser = {
            id: this.generateUserId(),
            name: 'Local User',
            email: 'user@posterboy.local',
            avatar: '👤',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                theme: 'light',
                autoSave: true,
                notifications: true,
                defaultTimeout: 30000,
                maxHistoryItems: 100
            },
            usage: {
                requestsSent: 0,
                collectionsCreated: 0,
                environmentsCreated: 0,
                lastActivity: new Date().toISOString()
            }
        };
        
        this.isAuthenticated = true;
        this.saveUserData();
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveUserData() {
        try {
            localStorage.setItem('posterboy_user', JSON.stringify(this.currentUser));
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    loadPreferences() {
        try {
            const stored = localStorage.getItem('posterboy_preferences');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {};
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('posterboy_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    applyPreferences() {
        if (!this.currentUser) return;

        const prefs = this.currentUser.preferences;
        
        // Apply theme
        if (prefs.theme) {
            this.setTheme(prefs.theme);
        }
        
        // Apply other preferences
        this.preferences = { ...this.preferences, ...prefs };
    }

    updateUserInterface() {
        // Update any user-related UI elements
        this.updateUserAvatar();
        this.updateUserMenu();
    }

    updateUserAvatar() {
        const userAvatars = document.querySelectorAll('.user-avatar');
        userAvatars.forEach(avatar => {
            if (this.currentUser) {
                avatar.textContent = this.currentUser.avatar || '👤';
                avatar.title = this.currentUser.name || 'User';
            }
        });
    }

    updateUserMenu() {
        // Update user menu if it exists
        const userMenu = document.getElementById('userMenu');
        if (userMenu && this.currentUser) {
            userMenu.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${this.currentUser.avatar}</div>
                    <div class="user-details">
                        <div class="user-name">${this.escapeHtml(this.currentUser.name)}</div>
                        <div class="user-email">${this.escapeHtml(this.currentUser.email)}</div>
                    </div>
                </div>
                <div class="user-actions">
                    <button onclick="UserManager.showProfile()">👤 Profile</button>
                    <button onclick="UserManager.showPreferences()">⚙️ Preferences</button>
                    <button onclick="UserManager.exportUserData()">📤 Export Data</button>
                    <button onclick="UserManager.importUserData()">📥 Import Data</button>
                    <button onclick="UserManager.resetUserData()">🔄 Reset</button>
                </div>
            `;
        }
    }

    // User Profile Management
    showProfile() {
        if (!this.currentUser) return;

        const modal = this.createProfileModal();
        document.body.appendChild(modal);
    }

    createProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>👤 User Profile</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <form onsubmit="UserManager.updateProfile(event)">
                    <div class="profile-section">
                        <div class="form-group">
                            <label for="userName">Name:</label>
                            <input type="text" id="userName" value="${this.escapeHtml(this.currentUser.name)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="userEmail">Email:</label>
                            <input type="email" id="userEmail" value="${this.escapeHtml(this.currentUser.email)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="userAvatar">Avatar (Emoji):</label>
                            <input type="text" id="userAvatar" value="${this.currentUser.avatar}" maxlength="2">
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <h4>Usage Statistics</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-value">${this.currentUser.usage.requestsSent}</span>
                                <span class="stat-label">Requests Sent</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.currentUser.usage.collectionsCreated}</span>
                                <span class="stat-label">Collections Created</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.currentUser.usage.environmentsCreated}</span>
                                <span class="stat-label">Environments Created</span>
                            </div>
                        </div>
                        <p class="last-activity">Last Activity: ${this.formatDate(this.currentUser.usage.lastActivity)}</p>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Update Profile</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        return modal;
    }

    updateProfile(event) {
        event.preventDefault();
        
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const avatar = document.getElementById('userAvatar').value.trim() || '👤';
        
        if (!name || !email) {
            this.showNotification('Error', 'Name and email are required', { type: 'error' });
            return;
        }
        
        // Update user data
        this.currentUser.name = name;
        this.currentUser.email = email;
        this.currentUser.avatar = avatar;
        
        this.saveUserData();
        this.updateUserInterface();
        
        // Close modal
        document.querySelector('.modal').remove();
        
        this.showNotification('Profile Updated', 'Your profile has been updated successfully', { type: 'success' });
    }

    // Preferences Management
    showPreferences() {
        const modal = this.createPreferencesModal();
        document.body.appendChild(modal);
    }

    createPreferencesModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const prefs = this.currentUser.preferences;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Preferences</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <form onsubmit="UserManager.updatePreferences(event)">
                    <div class="preferences-section">
                        <h4>Appearance</h4>
                        <div class="form-group">
                            <label for="prefTheme">Theme:</label>
                            <select id="prefTheme">
                                <option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                <option value="auto" ${prefs.theme === 'auto' ? 'selected' : ''}>Auto</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="preferences-section">
                        <h4>Behavior</h4>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="prefAutoSave" ${prefs.autoSave ? 'checked' : ''}>
                                Auto-save requests
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="prefNotifications" ${prefs.notifications ? 'checked' : ''}>
                                Show notifications
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="prefTimeout">Default request timeout (ms):</label>
                            <input type="number" id="prefTimeout" value="${prefs.defaultTimeout}" min="1000" max="300000" step="1000">
                        </div>
                        
                        <div class="form-group">
                            <label for="prefHistoryItems">Max history items:</label>
                            <input type="number" id="prefHistoryItems" value="${prefs.maxHistoryItems}" min="10" max="1000" step="10">
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Save Preferences</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="UserManager.resetPreferences()">Reset to Defaults</button>
                    </div>
                </form>
            </div>
        `;
        
        return modal;
    }

    updatePreferences(event) {
        event.preventDefault();
        
        const theme = document.getElementById('prefTheme').value;
        const autoSave = document.getElementById('prefAutoSave').checked;
        const notifications = document.getElementById('prefNotifications').checked;
        const defaultTimeout = parseInt(document.getElementById('prefTimeout').value);
        const maxHistoryItems = parseInt(document.getElementById('prefHistoryItems').value);
        
        // Update preferences
        this.currentUser.preferences = {
            theme,
            autoSave,
            notifications,
            defaultTimeout,
            maxHistoryItems
        };
        
        this.saveUserData();
        this.applyPreferences();
        
        // Close modal
        document.querySelector('.modal').remove();
        
        this.showNotification('Preferences Saved', 'Your preferences have been saved successfully', { type: 'success' });
    }

    resetPreferences() {
        if (!confirm('Are you sure you want to reset all preferences to default values?')) {
            return;
        }
        
        this.currentUser.preferences = {
            theme: 'light',
            autoSave: true,
            notifications: true,
            defaultTimeout: 30000,
            maxHistoryItems: 100
        };
        
        this.saveUserData();
        this.applyPreferences();
        
        // Refresh preferences modal if open
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
            this.showPreferences();
        }
        
        this.showNotification('Preferences Reset', 'Preferences have been reset to default values', { type: 'info' });
    }

    // Theme Management
    setTheme(theme) {
        if (theme === 'auto') {
            // Detect system preference
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update user preference if current user exists
        if (this.currentUser) {
            this.currentUser.preferences.theme = theme;
            this.saveUserData();
        }
    }

    getTheme() {
        return this.currentUser?.preferences?.theme || 'light';
    }

    // Usage Tracking
trackActivity(activityType = 'general') {
    try {
        // Ensure user object exists
        if (!this.currentUser) {
            this.currentUser = {
                id: this.generateId('user'),
                name: 'Anonymous User',
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                activityCount: 0,
                preferences: {}
            };
        }
        
        // Ensure user object has required properties
        if (!this.currentUser.hasOwnProperty('lastActivity')) {
            this.currentUser.lastActivity = new Date().toISOString();
        }
        
        if (!this.currentUser.hasOwnProperty('activityCount')) {
            this.currentUser.activityCount = 0;
        }
        
        // Update activity
        this.currentUser.lastActivity = new Date().toISOString();
        this.currentUser.activityCount = (this.currentUser.activityCount || 0) + 1;
        
        // Save user data
        this.saveUserData();
        
        console.log(`📊 Activity tracked: ${activityType}`);
        
    } catch (error) {
        console.warn('Error tracking activity:', error);
        // Don't let activity tracking break the app
    }
}

ensureUserExists() {
    if (!this.currentUser) {
        this.currentUser = {
            id: this.generateId('user'),
            name: 'Anonymous User',
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            activityCount: 0,
            preferences: {
                theme: 'light',
                autoSave: true,
                notifications: true
            },
            stats: {
                requestsSent: 0,
                collectionsCreated: 0,
                environmentsCreated: 0
            }
        };
        this.saveUserData();
    }
    return this.currentUser;
}
    // Data Export/Import
    exportUserData() {
        if (!this.currentUser) return;
        
        const exportData = {
            PosterBoy_user_export: true,
            version: '1.0.0',
            user: this.currentUser,
            exported_at: new Date().toISOString()
        };
        
        this.downloadFile(exportData, `posterboy_user_${this.currentUser.name.replace(/[^a-z0-9]/gi, '_')}.json`);
        this.showNotification('User Data Exported', 'User data exported successfully', { type: 'success' });
    }

    importUserData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => this.handleUserDataImport(event);
        input.click();
    }

    async handleUserDataImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await this.readFile(file);
            const importData = JSON.parse(text);
            
            if (!importData.PosterBoy_user_export || !importData.user) {
                throw new Error('Invalid user data file format');
            }
            
            if (!confirm('Are you sure you want to import user data? This will overwrite your current profile.')) {
                return;
            }
            
            this.currentUser = importData.user;
            this.saveUserData();
            this.applyPreferences();
            this.updateUserInterface();
            
            this.showNotification('User Data Imported', 'User data imported successfully', { type: 'success' });
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import Failed', 'Error importing user data: ' + error.message, { type: 'error' });
        }
    }

    resetUserData() {
        if (!confirm('Are you sure you want to reset all user data? This will create a new local user and cannot be undone.')) {
            return;
        }
        
        // Clear user data from storage
        localStorage.removeItem('posterboy_user');
        localStorage.removeItem('posterboy_preferences');
        
        // Create new default user
        this.createDefaultUser();
        this.applyPreferences();
        this.updateUserInterface();
        
        this.showNotification('User Data Reset', 'User data has been reset successfully', { type: 'info' });
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    downloadFile(data, filename) {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    showNotification(title, message, options = {}) {
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification(title, message, options);
        } else if (window.Core && window.Core.showNotification) {
            window.Core.showNotification(title, message, options);
        } else {
            console.log(`${title}: ${message}`);
        }
    }

    // API for other modules
    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getUserPreference(key, defaultValue = null) {
        return this.currentUser?.preferences?.[key] ?? defaultValue;
    }

    setUserPreference(key, value) {
        if (!this.currentUser) return;
        
        this.currentUser.preferences[key] = value;
        this.saveUserData();
    }

    // Health check
    healthCheck() {
        return {
            initialized: this.initialized,
            authenticated: this.isAuthenticated,
            currentUser: this.currentUser ? {
                id: this.currentUser.id,
                name: this.currentUser.name,
                email: this.currentUser.email
            } : null,
            preferences: Object.keys(this.preferences).length,
            theme: this.getTheme()
        };
    }
}

// Create global instance
window.UserManager = new UserManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}