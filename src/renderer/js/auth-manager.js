// Authentication & Authorization Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initialized = false;
        console.log('🔐 AuthManager initializing...');
        this.initialize();
    }

    initialize() {
        this.loadUserSession();
        this.createUserProfileUI();
        this.initialized = true;
        console.log('✅ AuthManager initialized');
    }

    loadUserSession() {
        const session = localStorage.getItem('posterboy_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.isAuthenticated = true;
        } else {
            this.createDemoUser();
        }
    }

    createDemoUser() {
        this.currentUser = {
            id: 'demo_' + Date.now(),
            name: 'Demo User',
            email: 'demo@PosterBoy.com',
            avatar: '👤',
            plan: 'Free',
            isDemo: true
        };
        this.isAuthenticated = true;
        this.saveSession();
    }

    saveSession() {
        localStorage.setItem('posterboy_session', JSON.stringify(this.currentUser));
    }

createUserProfileUI() {
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
        // Remove existing profile element
        const existing = headerControls.querySelector('.user-profile');
        if (existing) existing.remove();
        
        const profileElement = document.createElement('div');
        profileElement.className = 'user-profile';
        
        if (this.isAuthenticated) {
            profileElement.innerHTML = `
                <button class="user-profile-btn" onclick="window.AuthManager.showProfileMenu(event)">
                    <span class="user-avatar">${this.currentUser.avatar}</span>
                    <span class="user-name">${this.currentUser.name}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
            `;
        } else {
            profileElement.innerHTML = `
                <button class="user-profile-btn" onclick="window.AuthManager.showLogin()">
                    <span class="user-avatar">👤</span>
                    <span class="user-name">Login</span>
                </button>
            `;
        }
        
        headerControls.appendChild(profileElement);
    }
}

showLogin() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔐 Login</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.AuthManager.handleLogin(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="loginEmail">Email:</label>
                        <input type="email" id="loginEmail" required placeholder="Enter your email">
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Password:</label>
                        <input type="password" id="loginPassword" required placeholder="Enter your password">
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Login</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Demo login - replace with actual authentication
    this.currentUser = {
        id: 'user_' + Date.now(),
        name: email.split('@')[0],
        email: email,
        avatar: '👤',
        plan: 'Free'
    };
    
    this.isAuthenticated = true;
    this.saveSession();
    this.createUserProfileUI();
    
    document.querySelector('.modal').remove();
    
    if (window.UI) {
        window.UI.showNotification('Login Successful', 'Welcome back!', { type: 'success' });
    }
}

logout() {
    if (confirm('Are you sure you want to logout?')) {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('posterboy_session');
        this.createUserProfileUI();
        
        if (window.UI) {
            window.UI.showNotification('Logged Out', 'You have been logged out', { type: 'info' });
        }
    }
}

    showProfileMenu(event) {
    const menuItems = [
        { icon: '👤', label: 'Profile Settings', action: 'window.AuthManager.showProfile()' },
        { icon: '⚙️', label: 'Preferences', action: 'window.AuthManager.showPreferences()' },
        { separator: true },
        { icon: '🚪', label: 'Logout', action: 'window.AuthManager.logout()', danger: true }
    ];

    if (window.UI && window.UI.showContextMenu) {
        window.UI.showContextMenu(event, menuItems);
    }
}

showProfile() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>👤 User Profile</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="profile-section">
                    <div class="form-group">
                        <label for="profileName">Name:</label>
                        <input type="text" id="profileName" value="${this.currentUser.name}">
                    </div>
                    <div class="form-group">
                        <label for="profileEmail">Email:</label>
                        <input type="email" id="profileEmail" value="${this.currentUser.email}">
                    </div>
                    <div class="form-group">
                        <label for="profileAvatar">Avatar:</label>
                        <input type="text" id="profileAvatar" value="${this.currentUser.avatar}" maxlength="2">
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="window.AuthManager.saveProfile()">Save Changes</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

saveProfile() {
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const avatar = document.getElementById('profileAvatar').value;
    
    this.currentUser.name = name;
    this.currentUser.email = email;
    this.currentUser.avatar = avatar;
    
    this.saveSession();
    this.createUserProfileUI();
    
    document.querySelector('.modal').remove();
    
    if (window.UI) {
        window.UI.showNotification('Profile Updated', 'Your profile has been saved', { type: 'success' });
    }
}



showPreferences() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>⚙️ Preferences</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="preferences-section">
                    <h4>Appearance</h4>
                    <div class="form-group">
                        <label for="prefTheme">Theme:</label>
                        <select id="prefTheme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto</option>
                        </select>
                    </div>
                </div>
                
                <div class="preferences-section">
                    <h4>Behavior</h4>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="prefAutoSave" checked>
                            Auto-save requests
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="prefNotifications" checked>
                            Show notifications
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="prefTimeout">Request timeout (seconds):</label>
                        <input type="number" id="prefTimeout" value="30" min="5" max="300">
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="window.AuthManager.savePreferences()">Save Preferences</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

savePreferences() {
    const theme = document.getElementById('prefTheme').value;
    const autoSave = document.getElementById('prefAutoSave').checked;
    const notifications = document.getElementById('prefNotifications').checked;
    const timeout = document.getElementById('prefTimeout').value;
    
    // Save preferences to localStorage
    const preferences = { theme, autoSave, notifications, timeout };
    localStorage.setItem('posterboy_preferences', JSON.stringify(preferences));
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    
    document.querySelector('.modal').remove();
    
    if (window.UI) {
        window.UI.showNotification('Preferences Saved', 'Your preferences have been updated', { type: 'success' });
    }
}

    showUpgrade() {
        // Implementation for upgrade modal
        console.log('Show upgrade modal');
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('posterboy_session');
            location.reload();
        }
    }
}

window.AuthManager = new AuthManager();