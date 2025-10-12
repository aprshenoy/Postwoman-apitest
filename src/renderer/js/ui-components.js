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

    // Show/hide requests sidebar based on section
    this.toggleRequestsSidebar(sectionName);

    // Update sidebar content based on section
    if (sectionName === 'workspace' || sectionName === 'history') {
        this.updateSidebarForSection(sectionName);
    }

    // For history section, also show workspace for the main content
    if (sectionName === 'history') {
        const workspaceSection = document.getElementById('workspace');
        if (workspaceSection) {
            workspaceSection.classList.add('active');
        }
        
        // Clear the workspace content when switching to history
        this.clearWorkspaceForHistory();
    }

    // Trigger section-specific initialization
    this.onSectionChange(sectionName);

    console.log(`Switched to section: ${sectionName}`);
}

clearWorkspaceForHistory() {
    // Clear request form when switching to history mode
    const requestNameInput = document.getElementById('requestName');
    const urlInput = document.getElementById('url');
    const responseContainer = document.getElementById('responseContainer');
    
    if (requestNameInput) requestNameInput.value = '';
    if (urlInput) urlInput.value = '';
    
    if (responseContainer) {
        responseContainer.innerHTML = `
            <div class="response-placeholder">
                <p>Select a request from history to load it here</p>
            </div>
        `;
    }
    
    // Clear method
    const methodSelect = document.getElementById('method');
    if (methodSelect) methodSelect.value = 'GET';
}

// Toggle requests sidebar visibility based on section
toggleRequestsSidebar(sectionName) {
    const requestsSidebar = document.getElementById('requestsSidebar');
    if (!requestsSidebar) return;
    
    // Show sidebar only for workspace and history
    const showSidebar = sectionName === 'workspace' || sectionName === 'history';
    
    if (showSidebar) {
        requestsSidebar.style.display = 'flex';
        requestsSidebar.classList.remove('hidden');
        // Ensure main content adjusts for sidebar
        document.querySelector('.main-content')?.classList.remove('full-width');
    } else {
        requestsSidebar.style.display = 'none';
        requestsSidebar.classList.add('hidden');
        // Make main content full width when sidebar is hidden
        document.querySelector('.main-content')?.classList.add('full-width');
    }
    
    console.log(`📋 Requests sidebar ${showSidebar ? 'shown' : 'hidden'} for section: ${sectionName}`);
}

updateSidebarForSection(sectionName) {
    const sidebar = document.getElementById('requestsSidebar');
    if (!sidebar) return;

    const requestsHeader = sidebar.querySelector('.requests-header');
    const requestsList = sidebar.querySelector('.requests-list');
    
    if (!requestsHeader || !requestsList) return;

    if (sectionName === 'history') {
        requestsHeader.innerHTML = `
            <div class="requests-header-content">
                <h3>Request History</h3>
                <button class="header-btn collection-add-btn" onclick="clearHistory()" title="Clear History">
                    Clear All
                </button>
            </div>
        `;
        
        // Load history items into sidebar immediately
        this.loadHistoryToSidebar();
        
    } else if (sectionName === 'workspace') {
        requestsHeader.innerHTML = `
            <div class="requests-header-content">
                <h3>Requests</h3>
                <button class="header-btn collection-add-btn" onclick="createCollection()" title="New Collection">
                    +
                </button>
            </div>
            <div class="collection-selector">
                <select id="requestsCollectionSelect" class="collection-dropdown" onchange="loadCollectionRequests()">
                    <option value="">Loading...</option>
                </select>
            </div>
        `;
        
        if (window.CollectionManager && window.CollectionManager.ensureCollectionSelected) {
            setTimeout(() => {
                window.CollectionManager.ensureCollectionSelected();
            }, 100);
        }
        
        requestsList.innerHTML = `
            <div class="empty-requests">
                <h4>Loading Collections...</h4>
                <p>Please wait while collections load</p>
            </div>
        `;
    }
}

loadHistoryToSidebar() {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList || !window.HistoryManager) return;
    
    const history = window.HistoryManager.history || [];
    
    if (history.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-requests">
                <h4>No History</h4>
                <p>Your request history will appear here</p>
            </div>
        `;
        return;
    }
    
    requestsList.innerHTML = history.slice(0, 50).map((item, index) => {
        const statusClass = this.getStatusClass(item.response.status);
        
        // Generate URL display without method prefix
        let urlDisplay = 'No URL';
        if (item.request.url) {
            try {
                const url = new URL(item.request.url);
                urlDisplay = url.hostname + url.pathname;
                if (urlDisplay.length > 35) {
                    urlDisplay = urlDisplay.substring(0, 32) + '...';
                }
            } catch (e) {
                urlDisplay = item.request.url.length > 35 
                    ? item.request.url.substring(0, 32) + '...'
                    : item.request.url;
            }
        }
        
        return `
            <div class="request-item history-item" onclick="loadHistoryToWorkspace(${index})">
                <div class="request-method method-${item.request.method.toLowerCase()}">${item.request.method}</div>
                <div class="request-details">
                    <div class="request-header">
                        <div class="request-name" title="${this.escapeHtml(item.request.url)}">${this.escapeHtml(urlDisplay)}</div>
                        <div class="request-time">${this.formatRelativeTime(item.timestamp)}</div>
                    </div>
                    <div class="request-status">
                        <span class="status-badge status-${statusClass}">${item.response.status}</span>
                        <span class="duration">${item.response.duration}ms</span>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="request-delete-btn" onclick="event.stopPropagation(); window.HistoryManager.removeFromHistory(${index})" title="Remove from History">
                        ×
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

loadHistoryToWorkspace(index) {
    if (!window.HistoryManager || !window.HistoryManager.history) return;
    
    const item = window.HistoryManager.history[index];
    if (!item) return;
    
    // Load the request data without changing sections
    if (window.RequestManager && window.RequestManager.loadRequest) {
        window.RequestManager.loadRequest(item.request);
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.request-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const clickedItem = document.querySelector(`[onclick="loadHistoryToWorkspace(${index})"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // Show notification without changing sections
    if (window.UI && window.UI.showNotification) {
        window.UI.showNotification('History Loaded', `Loaded ${item.request.method} request from history`);
    }
}

// Helper method to format URLs for history display
formatUrlForHistory(request) {
    if (!request.url) {
        return 'No URL';
    }
    
    try {
        // Try to parse as complete URL
        if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
            const urlObj = new URL(request.url);
            const path = urlObj.pathname;
            
            if (path && path !== '/') {
                // Show method + path
                return `${request.method} ${path}`;
            } else {
                // Show method + hostname
                return `${request.method} ${urlObj.hostname}`;
            }
        } else {
            // Relative URL or path
            const displayUrl = request.url.length > 25 
                ? request.url.substring(0, 22) + '...'
                : request.url;
            return `${request.method} ${displayUrl}`;
        }
    } catch (e) {
        // Fallback for invalid URLs
        const displayUrl = request.url.length > 25 
            ? request.url.substring(0, 22) + '...'
            : request.url;
        return `${request.method} ${displayUrl}`;
    }
}

    // Add these helper methods to the UI class
// Enhanced formatRelativeTime method
formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 30) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return this.formatDate(timestamp);
}

    getStatusClass(status) {
        if (status >= 200 && status < 300) return '200';
        if (status >= 300 && status < 400) return '300';
        if (status >= 400 && status < 500) return '400';
        if (status >= 500) return '500';
        return 'unknown';
    }

    getUrlPath(url) {
        try {
            return new URL(url).pathname;
        } catch (e) {
            return url;
        }
    }

onSectionChange(sectionName) {
    switch (sectionName) {
        case 'collections':
            if (window.CollectionManager && window.CollectionManager.updateDisplay) {
                window.CollectionManager.updateDisplay();
            }
            break;
        case 'history':
            // Don't load history in main content - it's now in sidebar
            // The main workspace area stays ready for loading history items
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

    createNewRequest() {
    // Clear the workspace
    if (window.UI && window.UI.clearForm) {
        window.UI.clearForm();
    }
    
    // Set focus to request name input and ensure cursor is visible
    const nameInput = document.getElementById('requestName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.style.caretColor = 'var(--text-primary)';
            nameInput.style.cursor = 'text';
        }, 100);
    }
    
    // Switch to workspace if not already there
    if (window.UI && window.UI.showSection) {
        window.UI.showSection('workspace');
    }
    
    this.showNotification('New Request', 'Started creating a new request');
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

// Enhanced clearForm with unsaved changes check
async clearForm() {
    // Check for unsaved changes before clearing
    if (window.RequestManager && window.RequestManager.hasUnsavedChanges && window.RequestManager.hasUnsavedChanges()) {
        const shouldSave = confirm('You have unsaved changes. Do you want to save the current request before clearing?');
        if (shouldSave && window.CollectionManager) {
            await window.CollectionManager.autoSaveCurrentRequest();
        }
    }
    
    // Clear all form fields
    const urlInput = document.getElementById('requestName');
    const urlField = document.getElementById('url');
    const methodSelect = document.getElementById('method');
    
    if (urlInput) urlInput.value = '';
    if (urlField) urlField.value = '';
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

    // Clear saved state in request manager
    if (window.RequestManager && window.RequestManager.clearSavedState) {
        window.RequestManager.clearSavedState();
    }

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

// Enhanced showContextMenu with better positioning and styling
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
            <div class="${className}" onclick="${item.action}; window.UI.hideContextMenu();">
                <span class="menu-icon">${item.icon || ''}</span>
                <span class="menu-label">${item.label}</span>
            </div>
        `;
    }).join('');

    contextMenu.innerHTML = menuHTML;
    contextMenu.style.display = 'block';
    
    // Calculate position
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

    // Hide menu when clicking elsewhere
    const hideMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            this.hideContextMenu();
            document.removeEventListener('click', hideMenu);
        }
    };
    
    // Delay to prevent immediate hiding
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
        localStorage.setItem('posterboy_theme', theme);
    }

    getTheme() {
        return localStorage.getItem('posterboy_theme') || 'light';
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