// User Manager - Handles user profile, settings, and preferences

class UserManager {
    constructor() {
        this.user = this.loadUserProfile();
        this.settings = this.loadSettings();
        this.preferences = this.loadPreferences();
        this.initialize();
    }

    initialize() {
        this.applyTheme();
        this.applySettings();
        this.setupAutoSave();
    }

    loadUserProfile() {
        try {
            const stored = localStorage.getItem('postwoman_user');
            return stored ? JSON.parse(stored) : this.getDefaultUser();
        } catch (error) {
            console.error('Error loading user profile:', error);
            return this.getDefaultUser();
        }
    }

    getDefaultUser() {
        return {
            id: Core.generateId('user'),
            name: 'PostWoman User',
            email: 'user@example.com',
            avatar: '👤',
            role: 'user',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            stats: {
                requestsSent: 0,
                collectionsCreated: 0,
                environmentsCreated: 0,
                teamsJoined: 0
            }
        };
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('postwoman_settings');
            return stored ? JSON.parse(stored) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            theme: 'light', // light, dark, auto
            fontSize: 'medium', // small, medium, large
            autoSave: true,
            notifications: true,
            soundEffects: false,
            requestTimeout: 30000, // 30 seconds
            maxHistoryItems: 100,
            autoComplete: true,
            validateSSL: true,
            followRedirects: true,
            showLineNumbers: true,
            wordWrap: true,
            language: 'en',
            dateFormat: 'relative', // relative, absolute
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    loadPreferences() {
        try {
            const stored = localStorage.getItem('postwoman_preferences');
            return stored ? JSON.parse(stored) : this.getDefaultPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    getDefaultPreferences() {
        return {
            defaultMethod: 'GET',
            defaultContentType: 'application/json',
            showWelcome: true,
            compactMode: false,
            sidebarCollapsed: false,
            shortcuts: {
                newRequest: 'Ctrl+N',
                sendRequest: 'Ctrl+Enter',
                saveRequest: 'Ctrl+S',
                clearForm: 'Ctrl+K',
                focusUrl: 'Ctrl+L'
            },
            recentEnvironments: [],
            favoriteCollections: [],
            pinnedRequests: []
        };
    }

    saveUserProfile() {
        try {
            this.user.lastActiveAt = new Date().toISOString();
            localStorage.setItem('postwoman_user', JSON.stringify(this.user));
            Core.emit('userProfileUpdated', this.user);
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('postwoman_settings', JSON.stringify(this.settings));
            Core.emit('settingsUpdated', this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('postwoman_preferences', JSON.stringify(this.preferences));
            Core.emit('preferencesUpdated', this.preferences);
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    setupAutoSave() {
        // Save user activity every 5 minutes
        setInterval(() => {
            this.saveUserProfile();
        }, 5 * 60 * 1000);

        // Update stats when events happen
        Core.on('requestSent', () => {
            this.user.stats.requestsSent++;
            this.saveUserProfile();
        });

        Core.on('collectionCreated', () => {
            this.user.stats.collectionsCreated++;
            this.saveUserProfile();
        });

        Core.on('environmentCreated', () => {
            this.user.stats.environmentsCreated++;
            this.saveUserProfile();
        });

        Core.on('teamJoined', () => {
            this.user.stats.teamsJoined++;
            this.saveUserProfile();
        });
    }

    showProfile() {
        const modal = this.createProfileModal();
        document.body.appendChild(modal);
    }

    createProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>👤 User Profile</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <div class="profile-content">
                    ${this.renderProfileTabs()}
                </div>
            </div>
        `;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }

    renderProfileTabs() {
        return `
            <div class="profile-tabs">
                <div class="tab-buttons">
                    <button class="tab-button active" onclick="UserManager.switchProfileTab('profile')">
                        Profile
                    </button>
                    <button class="tab-button" onclick="UserManager.switchProfileTab('settings')">
                        Settings
                    </button>
                    <button class="tab-button" onclick="UserManager.switchProfileTab('preferences')">
                        Preferences
                    </button>
                    <button class="tab-button" onclick="UserManager.switchProfileTab('stats')">
                        Statistics
                    </button>
                    <button class="tab-button" onclick="UserManager.switchProfileTab('about')">
                        About
                    </button>
                </div>
                
                <div class="tab-contents">
                    <div id="profileTab" class="tab-content active">
                        ${this.renderProfileTab()}
                    </div>
                    <div id="settingsTab" class="tab-content">
                        ${this.renderSettingsTab()}
                    </div>
                    <div id="preferencesTab" class="tab-content">
                        ${this.renderPreferencesTab()}
                    </div>
                    <div id="statsTab" class="tab-content">
                        ${this.renderStatsTab()}
                    </div>
                    <div id="aboutTab" class="tab-content">
                        ${this.renderAboutTab()}
                    </div>
                </div>
            </div>
        `;
    }

    renderProfileTab() {
        return `
            <div class="profile-section">
                <div class="profile-header">
                    <div class="profile-avatar-section">
                        <div class="profile-avatar-large">${this.user.avatar}</div>
                        <button class="btn-sm btn-edit" onclick="UserManager.changeAvatar()">
                            Change Avatar
                        </button>
                    </div>
                    
                    <div class="profile-info">
                        <form onsubmit="UserManager.updateProfile(event)">
                            <div class="form-group">
                                <label for="userName">Name</label>
                                <input type="text" id="userName" value="${Core.escapeHtml(this.user.name)}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="userEmail">Email</label>
                                <input type="email" id="userEmail" value="${Core.escapeHtml(this.user.email)}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="userRole">Role</label>
                                <input type="text" id="userRole" value="${Core.escapeHtml(this.user.role)}" readonly>
                            </div>
                            
                            <button type="submit" class="action-btn">Update Profile</button>
                        </form>
                    </div>
                </div>
                
                <div class="profile-meta">
                    <div class="meta-item">
                        <strong>User ID:</strong> ${this.user.id}
                    </div>
                    <div class="meta-item">
                        <strong>Member Since:</strong> ${Core.formatDate(this.user.createdAt)}
                    </div>
                    <div class="meta-item">
                        <strong>Last Active:</strong> ${Core.formatDate(this.user.lastActiveAt)}
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="action-btn" onclick="UserManager.exportUserData()">
                        📤 Export Data
                    </button>
                    <button class="action-btn" onclick="UserManager.importUserData()">
                        📥 Import Data
                    </button>
                    <button class="btn-delete" onclick="UserManager.resetUserData()">
                        🔄 Reset All Data
                    </button>
                </div>
            </div>
        `;
    }

    renderSettingsTab() {
        return `
            <div class="settings-section">
                <form onsubmit="UserManager.updateSettings(event)">
                    <div class="settings-group">
                        <h4>Appearance</h4>
                        
                        <div class="form-group">
                            <label for="theme">Theme</label>
                            <select id="theme">
                                <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                <option value="auto" ${this.settings.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="fontSize">Font Size</label>
                            <select id="fontSize">
                                <option value="small" ${this.settings.fontSize === 'small' ? 'selected' : ''}>Small</option>
                                <option value="medium" ${this.settings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="large" ${this.settings.fontSize === 'large' ? 'selected' : ''}>Large</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Behavior</h4>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="autoSave" ${this.settings.autoSave ? 'checked' : ''}>
                                Auto-save requests
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="notifications" ${this.settings.notifications ? 'checked' : ''}>
                                Show notifications
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="soundEffects" ${this.settings.soundEffects ? 'checked' : ''}>
                                Sound effects
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="validateSSL" ${this.settings.validateSSL ? 'checked' : ''}>
                                Validate SSL certificates
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="followRedirects" ${this.settings.followRedirects ? 'checked' : ''}>
                                Follow redirects
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Request Defaults</h4>
                        
                        <div class="form-group">
                            <label for="requestTimeout">Request Timeout (ms)</label>
                            <input type="number" id="requestTimeout" value="${this.settings.requestTimeout}" min="1000" max="300000" step="1000">
                        </div>
                        
                        <div class="form-group">
                            <label for="maxHistoryItems">Max History Items</label>
                            <input type="number" id="maxHistoryItems" value="${this.settings.maxHistoryItems}" min="10" max="1000" step="10">
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Editor</h4>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="showLineNumbers" ${this.settings.showLineNumbers ? 'checked' : ''}>
                                Show line numbers
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="wordWrap" ${this.settings.wordWrap ? 'checked' : ''}>
                                Word wrap
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="autoComplete" ${this.settings.autoComplete ? 'checked' : ''}>
                                Auto-completion
                            </label>
                        </div>
                    </div>
                    
                    <button type="submit" class="send-button">Save Settings</button>
                </form>
            </div>
        `;
    }

    renderPreferencesTab() {
        return `
            <div class="preferences-section">
                <form onsubmit="UserManager.updatePreferences(event)">
                    <div class="settings-group">
                        <h4>Default Values</h4>
                        
                        <div class="form-group">
                            <label for="defaultMethod">Default HTTP Method</label>
                            <select id="defaultMethod">
                                <option value="GET" ${this.preferences.defaultMethod === 'GET' ? 'selected' : ''}>GET</option>
                                <option value="POST" ${this.preferences.defaultMethod === 'POST' ? 'selected' : ''}>POST</option>
                                <option value="PUT" ${this.preferences.defaultMethod === 'PUT' ? 'selected' : ''}>PUT</option>
                                <option value="DELETE" ${this.preferences.defaultMethod === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="defaultContentType">Default Content Type</label>
                            <select id="defaultContentType">
                                <option value="application/json" ${this.preferences.defaultContentType === 'application/json' ? 'selected' : ''}>application/json</option>
                                <option value="application/xml" ${this.preferences.defaultContentType === 'application/xml' ? 'selected' : ''}>application/xml</option>
                                <option value="text/plain" ${this.preferences.defaultContentType === 'text/plain' ? 'selected' : ''}>text/plain</option>
                                <option value="application/x-www-form-urlencoded" ${this.preferences.defaultContentType === 'application/x-www-form-urlencoded' ? 'selected' : ''}>application/x-www-form-urlencoded</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Interface</h4>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="showWelcome" ${this.preferences.showWelcome ? 'checked' : ''}>
                                Show welcome message
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="compactMode" ${this.preferences.compactMode ? 'checked' : ''}>
                                Compact mode
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="sidebarCollapsed" ${this.preferences.sidebarCollapsed ? 'checked' : ''}>
                                Collapse sidebar by default
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Keyboard Shortcuts</h4>
                        <div class="shortcuts-list">
                            ${Object.entries(this.preferences.shortcuts).map(([action, shortcut]) => `
                                <div class="shortcut-item">
                                    <span class="shortcut-action">${this.formatActionName(action)}</span>
                                    <span class="shortcut-key">${shortcut}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button type="submit" class="send-button">Save Preferences</button>
                </form>
            </div>
        `;
    }

    renderStatsTab() {
        const stats = this.user.stats;
        const totalActions = stats.requestsSent + stats.collectionsCreated + stats.environmentsCreated;
        
        return `
            <div class="stats-section">
                <div class="stats-overview">
                    <h4>Usage Statistics</h4>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">🚀</div>
                            <div class="stat-number">${stats.requestsSent.toLocaleString()}</div>
                            <div class="stat-label">Requests Sent</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📁</div>
                            <div class="stat-number">${stats.collectionsCreated.toLocaleString()}</div>
                            <div class="stat-label">Collections Created</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">🌍</div>
                            <div class="stat-number">${stats.environmentsCreated.toLocaleString()}</div>
                            <div class="stat-label">Environments Created</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-number">${stats.teamsJoined.toLocaleString()}</div>
                            <div class="stat-label">Teams Joined</div>
                        </div>
                    </div>
                </div>
                
                <div class="activity-summary">
                    <h4>Activity Summary</h4>
                    <div class="summary-item">
                        <strong>Total Actions:</strong> ${totalActions.toLocaleString()}
                    </div>
                    <div class="summary-item">
                        <strong>Average Daily Requests:</strong> ${this.calculateDailyAverage().toFixed(1)}
                    </div>
                    <div class="summary-item">
                        <strong>Most Active Day:</strong> Coming Soon
                    </div>
                </div>
                
                <div class="achievements">
                    <h4>Achievements</h4>
                    <div class="achievements-grid">
                        ${this.renderAchievements()}
                    </div>
                </div>
            </div>
        `;
    }

    renderAboutTab() {
        return `
            <div class="about-section">
                <div class="app-info">
                    <div class="app-logo">🌊</div>
                    <h3>PostWoman</h3>
                    <p class="app-version">Version 1.0.0</p>
                    <p class="app-description">
                        A powerful API testing tool built for developers. 
                        Send HTTP requests, manage collections, and collaborate with your team.
                    </p>
                </div>
                
                <div class="about-links">
                    <h4>Links</h4>
                    <div class="links-grid">
                        <a href="#" class="about-link">
                            🌐 Website
                        </a>
                        <a href="#" class="about-link">
                            📚 Documentation
                        </a>
                        <a href="#" class="about-link">
                            🐛 Report Issues
                        </a>
                        <a href="#" class="about-link">
                            💡 Feature Requests
                        </a>
                    </div>
                </div>
                
                <div class="system-info">
                    <h4>System Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Browser:</strong> ${this.getBrowserInfo()}
                        </div>
                        <div class="info-item">
                            <strong>Platform:</strong> ${navigator.platform}
                        </div>
                        <div class="info-item">
                            <strong>Language:</strong> ${navigator.language}
                        </div>
                        <div class="info-item">
                            <strong>Screen:</strong> ${screen.width}x${screen.height}
                        </div>
                        <div class="info-item">
                            <strong>Local Storage:</strong> ${this.getStorageInfo()}
                        </div>
                    </div>
                </div>
                
                <div class="credits">
                    <h4>Credits</h4>
                    <p>Built with ❤️ by the PostWoman team</p>
                    <p>Icons from various emoji sets</p>
                </div>
            </div>
        `;
    }

    switchProfileTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab
        event.target.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    updateProfile(event) {
        event.preventDefault();
        
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        
        if (!name || !email) {
            alert('Please fill in all required fields');
            return;
        }
        
        this.user.name = name;
        this.user.email = email;
        this.saveUserProfile();
        
        Core.showNotification('Profile Updated', 'Your profile has been updated successfully');
    }

    updateSettings(event) {
        event.preventDefault();
        
        this.settings.theme = document.getElementById('theme').value;
        this.settings.fontSize = document.getElementById('fontSize').value;
        this.settings.autoSave = document.getElementById('autoSave').checked;
        this.settings.notifications = document.getElementById('notifications').checked;
        this.settings.soundEffects = document.getElementById('soundEffects').checked;
        this.settings.validateSSL = document.getElementById('validateSSL').checked;
        this.settings.followRedirects = document.getElementById('followRedirects').checked;
        this.settings.requestTimeout = parseInt(document.getElementById('requestTimeout').value);
        this.settings.maxHistoryItems = parseInt(document.getElementById('maxHistoryItems').value);
        this.settings.showLineNumbers = document.getElementById('showLineNumbers').checked;
        this.settings.wordWrap = document.getElementById('wordWrap').checked;
        this.settings.autoComplete = document.getElementById('autoComplete').checked;
        
        this.saveSettings();
        this.applySettings();
        
        Core.showNotification('Settings Saved', 'Your settings have been applied');
    }

    updatePreferences(event) {
        event.preventDefault();
        
        this.preferences.defaultMethod = document.getElementById('defaultMethod').value;
        this.preferences.defaultContentType = document.getElementById('defaultContentType').value;
        this.preferences.showWelcome = document.getElementById('showWelcome').checked;
        this.preferences.compactMode = document.getElementById('compactMode').checked;
        this.preferences.sidebarCollapsed = document.getElementById('sidebarCollapsed').checked;
        
        this.savePreferences();
        this.applyPreferences();
        
        Core.showNotification('Preferences Saved', 'Your preferences have been updated');
    }

    applyTheme() {
        const theme = this.settings.theme;
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    applySettings() {
        this.applyTheme();
        
        // Apply font size
        document.documentElement.style.fontSize = {
            'small': '14px',
            'medium': '16px',
            'large': '18px'
        }[this.settings.fontSize] || '16px';
        
        // Apply other settings as needed
        document.body.classList.toggle('compact-mode', this.preferences.compactMode);
    }

    applyPreferences() {
        // Apply preferences to the UI
        if (this.preferences.sidebarCollapsed) {
            document.querySelector('.sidebar-nav')?.classList.add('collapsed');
        }
    }

    changeAvatar() {
        const newAvatar = prompt('Enter a new avatar (emoji):', this.user.avatar);
        if (newAvatar && newAvatar.trim()) {
            this.user.avatar = newAvatar.trim();
            this.saveUserProfile();
            
            // Update the avatar in the modal
            const avatarElement = document.querySelector('.profile-avatar-large');
            if (avatarElement) {
                avatarElement.textContent = newAvatar;
            }
            
            Core.showNotification('Avatar Updated', 'Your avatar has been changed');
        }
    }

    exportUserData() {
        const exportData = {
            postwoman_user_export: true,
            version: '1.0.0',
            user: this.user,
            settings: this.settings,
            preferences: this.preferences,
            collections: CollectionManager.collections,
            environments: EnvironmentManager.environments,
            history: HistoryManager.history.slice(0, 50), // Last 50 items
            exported_at: new Date().toISOString()
        };
        
        Core.downloadFile(exportData, `postwoman_user_data_${new Date().toISOString().split('T')[0]}.json`);
        Core.showNotification('Data Exported', 'Your user data has been exported');
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
            const text = await Core.readFile(file);
            const importData = JSON.parse(text);
            
            if (!importData.postwoman_user_export) {
                alert('Invalid user data file');
                return;
            }
            
            if (!confirm('This will replace your current user data. Are you sure?')) {
                return;
            }
            
            // Import user data
            if (importData.user) {
                this.user = { ...this.user, ...importData.user };
                this.saveUserProfile();
            }
            
            if (importData.settings) {
                this.settings = { ...this.settings, ...importData.settings };
                this.saveSettings();
                this.applySettings();
            }
            
            if (importData.preferences) {
                this.preferences = { ...this.preferences, ...importData.preferences };
                this.savePreferences();
                this.applyPreferences();
            }
            
            Core.showNotification('Data Imported', 'Your user data has been imported successfully');
            
            // Refresh the modal
            document.querySelector('.modal').remove();
            this.showProfile();
            
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing user data: ' + error.message);
        }
    }

    resetUserData() {
        if (!confirm('This will delete ALL your data including collections, environments, and history. Are you sure?')) {
            return;
        }
        
        if (!confirm('This action cannot be undone. Please confirm again.')) {
            return;
        }
        
        // Reset all data
        localStorage.clear();
        
        // Reinitialize with defaults
        this.user = this.getDefaultUser();
        this.settings = this.getDefaultSettings();
        this.preferences = this.getDefaultPreferences();
        
        this.saveUserProfile();
        this.saveSettings();
        this.savePreferences();
        
        // Reload the page
        window.location.reload();
    }

    closeProfile() {
        const modal = document.querySelector('#userModal, .modal:has(.profile-content)');
        if (modal) {
            modal.remove();
        }
    }

    formatActionName(action) {
        return action.replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();
    }

    calculateDailyAverage() {
        const daysSinceCreation = Math.max(1, Math.floor((Date.now() - new Date(this.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
        return this.user.stats.requestsSent / daysSinceCreation;
    }

    renderAchievements() {
        const achievements = [
            {
                icon: '🚀',
                name: 'First Request',
                description: 'Send your first API request',
                achieved: this.user.stats.requestsSent > 0
            },
            {
                icon: '📁',
                name: 'Organized',
                description: 'Create your first collection',
                achieved: this.user.stats.collectionsCreated > 0
            },
            {
                icon: '🔥',
                name: 'Power User',
                description: 'Send 100 requests',
                achieved: this.user.stats.requestsSent >= 100
            },
            {
                icon: '🌟',
                name: 'API Master',
                description: 'Send 1000 requests',
                achieved: this.user.stats.requestsSent >= 1000
            },
            {
                icon: '🏆',
                name: 'Collection Master',
                description: 'Create 10 collections',
                achieved: this.user.stats.collectionsCreated >= 10
            },
            {
                icon: '🤝',
                name: 'Team Player',
                description: 'Join your first team',
                achieved: this.user.stats.teamsJoined > 0
            }
        ];
        
        return achievements.map(achievement => `
            <div class="achievement-card ${achievement.achieved ? 'achieved' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                ${achievement.achieved ? '<div class="achievement-status">✓ Unlocked</div>' : '<div class="achievement-status">🔒 Locked</div>'}
            </div>
        `).join('');
    }

    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    getStorageInfo() {
        try {
            const used = JSON.stringify(localStorage).length;
            const quota = 5 * 1024 * 1024; // Approximate 5MB limit
            return `${Core.formatFileSize(used)} / ${Core.formatFileSize(quota)}`;
        } catch (error) {
            return 'Unknown';
        }
    }
}

// Global instance
window.UserManager = new UserManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}