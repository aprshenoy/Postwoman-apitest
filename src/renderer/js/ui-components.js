// UI Components - Handles all user interface interactions and utilities

class UI {
    constructor() {
        this.currentActiveSection = 'workspace';
        this.currentActiveTab = 'params';
        this.notifications = [];
        this.contextMenu = null;
        this.initialized = false;
        
        console.log('🎨 UI module initializing...');
        
        // Wait for DOM to be ready
        this.waitForDOMAndInitialize();
    }

    async waitForDOMAndInitialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Small delay to ensure all elements are rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.initialize();
    }

    initialize() {
        try {
            this.setupEventListeners();
            this.initializeFirstRows();
            this.setupKeyboardShortcuts();
            this.setupContextMenuHandlers();
            this.setupNotificationSystem();
            
            // Initialize default tab and section
            this.showSection('workspace');
            this.showTab('params');
            
            this.initialized = true;
            console.log('✅ UI module initialized successfully');
            
            // Emit initialization event
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('ui-initialized');
            }
        } catch (error) {
            console.error('❌ UI initialization failed:', error);
        }
    }

    setupEventListeners() {
        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.hideContextMenu();
            }
        });

        // Input validation and auto-update handlers
        this.setupInputValidation();
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.hideContextMenu();
        });

        console.log('🔗 Event listeners setup complete');
    }

    setupInputValidation() {
        // URL validation
        const urlInput = document.getElementById('url');
        if (urlInput) {
            urlInput.addEventListener('input', (e) => {
                this.validateURL(e.target);
            });
        }

        // JSON validation
        const jsonInput = document.getElementById('jsonInput');
        if (jsonInput) {
            jsonInput.addEventListener('input', (e) => {
                this.validateJSON(e.target);
            });
        }
    }

    validateURL(input) {
        const value = input.value.trim();
        if (!value) {
            input.classList.remove('valid', 'invalid');
            return;
        }

        try {
            // Allow variables in URL
            const testUrl = value.replace(/\{\{[^}]+\}\}/g, 'placeholder');
            new URL(testUrl);
            input.classList.remove('invalid');
            input.classList.add('valid');
        } catch (e) {
            input.classList.remove('valid');
            input.classList.add('invalid');
        }
    }

    validateJSON(input) {
        const value = input.value.trim();
        if (!value) {
            input.classList.remove('valid', 'invalid');
            return;
        }

        try {
            JSON.parse(value);
            input.classList.remove('invalid');
            input.classList.add('valid');
        } catch (e) {
            input.classList.remove('valid');
            input.classList.add('invalid');
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for modifier key (Cmd on Mac, Ctrl on others)
            const modifier = e.metaKey || e.ctrlKey;
            
            if (modifier) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        if (window.RequestManager) {
                            window.RequestManager.sendRequest();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        if (window.CollectionManager) {
                            window.CollectionManager.saveCurrentRequest();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        this.clearForm();
                        break;
                    case 'l':
                        e.preventDefault();
                        document.getElementById('url')?.focus();
                        break;
                    case '1':
                        e.preventDefault();
                        this.showSection('workspace');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showSection('collections');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showSection('history');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showSection('environments');
                        break;
                    case '5':
                        e.preventDefault();
                        this.showSection('teams');
                        break;
                }
            }
        });
    }

    setupContextMenuHandlers() {
        // Prevent default context menu in specific areas
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.context-menu-zone')) {
                e.preventDefault();
            }
        });
    }

    setupNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Listen for Core notification events
        if (window.Core && typeof window.Core.on === 'function') {
            window.Core.on('notification', (data) => {
                this.showNotification(data.title, data.message, data);
            });
        }
    }

    initializeFirstRows() {
        try {
            // Add initial empty rows for key-value pairs
            if (window.RequestManager) {
                window.RequestManager.addParamRow();
                window.RequestManager.addHeaderRow();
                window.RequestManager.addCookieRow();
                window.RequestManager.addFormDataRow();
            }
        } catch (error) {
            console.warn('Could not initialize first rows:', error);
        }
    }

    // Section Management
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Activate corresponding nav item
        const navItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.currentActiveSection = sectionName;

        // Trigger section-specific initialization
        this.onSectionChange(sectionName);

        console.log(`📄 Switched to section: ${sectionName}`);
    }

    onSectionChange(sectionName) {
        switch (sectionName) {
            case 'collections':
                if (window.CollectionManager && window.CollectionManager.updateDisplay) {
                    window.CollectionManager.updateDisplay();
                }
                break;
            case 'history':
                if (window.HistoryManager && window.HistoryManager.updateDisplay) {
                    window.HistoryManager.updateDisplay();
                }
                break;
            case 'environments':
                if (window.EnvironmentManager && window.EnvironmentManager.updateDisplay) {
                    window.EnvironmentManager.updateDisplay();
                }
                break;
            case 'teams':
                if (window.TeamsManager && window.TeamsManager.updateDisplay) {
                    window.TeamsManager.updateDisplay();
                }
                break;
        }
    }

    // Tab Management
    showTab(tabName) {
        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show target tab pane
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        // Activate corresponding tab button
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }

        this.currentActiveTab = tabName;
        console.log(`📑 Switched to tab: ${tabName}`);
    }

    // Auth Fields Management
    toggleAuthFields() {
        const authType = document.getElementById('authType')?.value;
        
        // Hide all auth fields
        document.querySelectorAll('.auth-fields').forEach(field => {
            field.style.display = 'none';
        });

        // Show relevant auth fields
        switch (authType) {
            case 'bearer':
                const bearerAuth = document.getElementById('bearerAuth');
                if (bearerAuth) bearerAuth.style.display = 'block';
                break;
            case 'basic':
                const basicAuth = document.getElementById('basicAuth');
                if (basicAuth) basicAuth.style.display = 'block';
                break;
            case 'apikey':
                const apikeyAuth = document.getElementById('apikeyAuth');
                if (apikeyAuth) apikeyAuth.style.display = 'block';
                break;
        }

        // Update cURL command
        if (window.RequestManager && window.RequestManager.updateCurlCommand) {
            window.RequestManager.updateCurlCommand();
        }
    }

    // Body Fields Management
    toggleBodyFields() {
        const bodyType = document.getElementById('bodyType')?.value;
        
        // Hide all body fields
        document.querySelectorAll('.body-fields').forEach(field => {
            field.style.display = 'none';
        });

        // Show relevant body fields
        switch (bodyType) {
            case 'json':
                const jsonBody = document.getElementById('jsonBody');
                if (jsonBody) jsonBody.style.display = 'block';
                break;
            case 'form':
                const formBody = document.getElementById('formBody');
                if (formBody) formBody.style.display = 'block';
                break;
            case 'raw':
                const rawBody = document.getElementById('rawBody');
                if (rawBody) rawBody.style.display = 'block';
                break;
        }

        // Update cURL command
        if (window.RequestManager && window.RequestManager.updateCurlCommand) {
            window.RequestManager.updateCurlCommand();
        }
    }

    // JSON Formatting
    formatJSON() {
        const jsonInput = document.getElementById('jsonInput');
        if (!jsonInput) return;

        try {
            const parsed = JSON.parse(jsonInput.value);
            jsonInput.value = JSON.stringify(parsed, null, 2);
            jsonInput.classList.remove('invalid');
            jsonInput.classList.add('valid');
            this.showNotification('Success', 'JSON formatted successfully', { type: 'success' });
        } catch (error) {
            this.showNotification('Error', 'Invalid JSON format', { type: 'error' });
        }
    }

    // Form Management
    clearForm() {
        // Clear URL and method
        const urlInput = document.getElementById('url');
        const methodSelect = document.getElementById('method');
        
        if (urlInput) urlInput.value = '';
        if (methodSelect) methodSelect.value = 'GET';

        // Clear all containers
        const containers = [
            'paramsContainer',
            'headersContainer', 
            'cookiesContainer',
            'formDataContainer'
        ];

        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Reset auth
        const authType = document.getElementById('authType');
        if (authType) {
            authType.value = 'none';
            this.toggleAuthFields();
        }

        // Clear auth fields
        const authInputs = document.querySelectorAll('.auth-fields input');
        authInputs.forEach(input => input.value = '');

        // Reset body
        const bodyType = document.getElementById('bodyType');
        if (bodyType) {
            bodyType.value = 'none';
            this.toggleBodyFields();
        }

        // Clear body fields
        const jsonInput = document.getElementById('jsonInput');
        const rawInput = document.getElementById('rawInput');
        if (jsonInput) jsonInput.value = '';
        if (rawInput) rawInput.value = '';

        // Clear response
        const responseContainer = document.getElementById('responseContainer');
        if (responseContainer) {
            responseContainer.innerHTML = `
                <div class="response-placeholder">
                    <p>Send a request to see the response here</p>
                </div>
            `;
        }

        // Re-initialize first rows
        this.initializeFirstRows();

        // Update cURL
        if (window.RequestManager && window.RequestManager.updateCurlCommand) {
            window.RequestManager.updateCurlCommand();
        }

        this.showNotification('Form Cleared', 'Request form has been reset', { type: 'info' });
    }

    // Loading States
    showLoading(container, message = 'Loading...') {
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p>${message}</p>
            </div>
        `;
    }

    hideLoading(container) {
        if (!container) return;
        
        const loadingState = container.querySelector('.loading-state');
        if (loadingState) {
            loadingState.remove();
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Focus first input in modal
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
    }

    // Context Menu
    showContextMenu(event, menuItems) {
        event.preventDefault();
        event.stopPropagation();

        let contextMenu = document.getElementById('contextMenu');
        
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'contextMenu';
            contextMenu.className = 'context-menu';
            document.body.appendChild(contextMenu);
        }

        // Build menu HTML
        const menuHTML = menuItems.map(item => {
            if (item.separator) {
                return '<div class="context-menu-separator"></div>';
            }
            
            const className = `context-menu-item ${item.danger ? 'danger' : ''}`;
            return `
                <div class="${className}" onclick="${item.action}; UI.hideContextMenu();">
                    <span class="menu-icon">${item.icon || ''}</span>
                    <span class="menu-label">${item.label}</span>
                </div>
            `;
        }).join('');

        contextMenu.innerHTML = menuHTML;
        
        // Position menu
        const rect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = event.pageX;
        let y = event.pageY;
        
        // Adjust position if menu would go off-screen
        if (x + rect.width > viewportWidth) {
            x = viewportWidth - rect.width - 10;
        }
        
        if (y + rect.height > viewportHeight) {
            y = viewportHeight - rect.height - 10;
        }
        
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';

        // Hide menu when clicking elsewhere
        const hideMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 0);
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    // Notifications
    showNotification(title, message, options = {}) {
        const { type = 'info', duration = 5000 } = options;
        
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }

        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }

    // Theme Management
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('postwoman_theme', theme);
    }

    getTheme() {
        return localStorage.getItem('postwoman_theme') || 'light';
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }

    // Animation helpers
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    fadeOut(element, duration = 300) {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = 1 - Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Health check
    healthCheck() {
        return {
            initialized: this.initialized,
            currentSection: this.currentActiveSection,
            currentTab: this.currentActiveTab,
            notifications: this.notifications.length,
            theme: this.getTheme()
        };
    }
}

// Create global instance
window.UI = new UI();

// Utility functions for backward compatibility
function showNotifications() {
    window.UI.showNotification('Notifications', 'Notification center coming soon!', { type: 'info' });
}

function showSettings() {
    window.UI.showNotification('Settings', 'Settings panel coming soon!', { type: 'info' });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}