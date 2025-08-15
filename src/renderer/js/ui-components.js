// UI Components and Interactions
// Handles all UI-related functionality and environment variable highlighting

class UI {
    constructor() {
        this.tooltip = null;
        this.envVariableRegex = /\{\{([^}]+)\}\}/g;
        this.currentActiveSection = 'workspace';
        this.standardHeaders = [
            { key: 'Accept', value: 'application/json' },
            { key: 'Content-Type', value: 'application/json' },
            { key: 'User-Agent', value: 'PostWoman/1.0' },
            { key: 'Cache-Control', value: 'no-cache' }
        ];
        
        this.initializeUI();
    }

    initializeUI() {
        // Initialize standard headers
        this.initializeStandardHeaders();
        
        // Set up environment variable listeners
        this.setupEnvironmentVariableListeners();
        
        // Set up modal handlers
        this.setupModalHandlers();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Initialize tooltips
        this.createTooltip();
    }

    // Section Navigation
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Add active class to clicked nav item
        const navItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        this.currentActiveSection = sectionName;
        
        // Trigger section-specific updates
        Core.emit('sectionChanged', sectionName);
        
        // Update display based on section
        switch (sectionName) {
            case 'history':
                if (typeof HistoryManager !== 'undefined') {
                    HistoryManager.updateDisplay();
                }
                break;
            case 'collections':
                if (typeof CollectionManager !== 'undefined') {
                    CollectionManager.updateDisplay();
                }
                break;
            case 'environments':
                if (typeof EnvironmentManager !== 'undefined') {
                    EnvironmentManager.updateDisplay();
                }
                break;
            case 'teams':
                if (typeof TeamsManager !== 'undefined') {
                    TeamsManager.updateDisplay();
                }
                break;
        }
    }

    // Workspace tab switching
    switchWorkspaceTab(tabName) {
        // Hide all workspace content
        document.querySelectorAll('.workspace-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all workspace tabs
        document.querySelectorAll('.workspace-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected workspace content
        const targetContent = document.getElementById(tabName + 'Workspace');
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Add active class to clicked tab
        event.target.classList.add('active');
        
        Core.emit('workspaceTabChanged', tabName);
    }

    // Tab switching
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Add active class to clicked tab
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        this.setupEnvironmentVariableListeners();
        Core.emit('tabChanged', tabName);
    }

    // Initialize standard headers
    initializeStandardHeaders() {
        const container = document.getElementById('headersContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.standardHeaders.forEach(header => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'key-value-pair';
            headerDiv.innerHTML = `
                <input type="text" placeholder="Header Name" class="header-key" value="${header.key}">
                <input type="text" placeholder="Header Value (use {{variables}})" class="header-value" value="${header.value}">
                <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
            `;
            container.appendChild(headerDiv);
        });
        
        this.setupEnvironmentVariableListeners();
    }

    // Environment variable highlighting and tooltips
    setupEnvironmentVariableListeners() {
        // Get all input fields and textareas
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"], textarea');
        
        inputs.forEach(input => {
            // Remove existing listeners to prevent duplicates
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // Add input event listener for real-time highlighting
            newInput.addEventListener('input', (e) => {
                this.handleEnvironmentVariableInput(e.target);
            });
            
            // Add focus event for initial highlighting
            newInput.addEventListener('focus', (e) => {
                this.handleEnvironmentVariableInput(e.target);
            });
            
            // Add mouseover event for tooltips
            newInput.addEventListener('mouseover', (e) => {
                this.handleEnvironmentVariableHover(e);
            });
            
            // Add mouseout event to hide tooltips
            newInput.addEventListener('mouseout', (e) => {
                this.hideTooltip();
            });
            
            // Add mousemove event for tooltip positioning
            newInput.addEventListener('mousemove', (e) => {
                this.updateTooltipPosition(e);
            });
            
            // Initial highlighting
            this.handleEnvironmentVariableInput(newInput);
        });
    }

    handleEnvironmentVariableInput(input) {
        const value = input.value;
        const hasEnvVars = this.envVariableRegex.test(value);
        
        if (hasEnvVars) {
            input.classList.add('env-variable-input');
            input.style.backgroundImage = this.createEnvironmentVariableBackground(value);
        } else {
            input.classList.remove('env-variable-input');
            input.style.backgroundImage = '';
        }
        
        // Reset regex for next use
        this.envVariableRegex.lastIndex = 0;
    }

    createEnvironmentVariableBackground(text) {
        // Create a subtle gradient to indicate env variables are present
        const hasVars = /\{\{[^}]+\}\}/.test(text);
        if (hasVars) {
            return 'linear-gradient(90deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.1) 50%, rgba(14, 165, 233, 0.05) 100%)';
        }
        return '';
    }

    handleEnvironmentVariableHover(event) {
        const input = event.target;
        const value = input.value;
        const envVars = this.extractEnvironmentVariables(value);
        
        if (envVars.length > 0) {
            const tooltipContent = this.createTooltipContent(envVars);
            this.showTooltip(event, tooltipContent);
        }
    }

    extractEnvironmentVariables(text) {
        const matches = [];
        let match;
        
        // Reset regex
        this.envVariableRegex.lastIndex = 0;
        
        while ((match = this.envVariableRegex.exec(text)) !== null) {
            const varName = match[1].trim();
            const varValue = this.getEnvironmentVariableValue(varName);
            matches.push({
                name: varName,
                value: varValue,
                found: varValue !== null
            });
        }
        
        return matches;
    }

    getEnvironmentVariableValue(varName) {
        const currentEnv = document.getElementById('currentEnvironment')?.value || 'development';
        const environments = Core.getStorage('environments') || {};
        const envVars = environments[currentEnv] || {};
        
        return envVars[varName] || null;
    }

    createTooltipContent(envVars) {
        return envVars.map(envVar => {
            const statusIcon = envVar.found ? '✅' : '❌';
            const value = envVar.found ? envVar.value : 'Not defined';
            const valueClass = envVar.found ? 'tooltip-value' : 'tooltip-error';
            
            return `
                <div class="tooltip-variable-item">
                    ${statusIcon} <span class="tooltip-variable">{{${envVar.name}}}</span>
                    <div class="${valueClass}">${Core.escapeHtml(value)}</div>
                </div>
            `;
        }).join('');
    }

    createTooltip() {
        if (this.tooltip) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'envTooltip';
        this.tooltip.className = 'env-tooltip';
        this.tooltip.innerHTML = '<div class="tooltip-content"></div>';
        document.body.appendChild(this.tooltip);
        
        // Add enhanced tooltip styles
        const style = document.createElement('style');
        style.textContent = `
            .tooltip-variable-item {
                margin-bottom: 0.5rem;
                padding: 0.25rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .tooltip-variable-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .tooltip-variable {
                color: #fbbf24;
                font-weight: 600;
                font-family: 'Monaco', 'Consolas', monospace;
            }
            .tooltip-value {
                color: #34d399;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                word-break: break-all;
            }
            .tooltip-error {
                color: #f87171;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    showTooltip(event, content) {
        if (!this.tooltip) return;
        
        const tooltipContent = this.tooltip.querySelector('.tooltip-content');
        tooltipContent.innerHTML = content;
        
        this.tooltip.classList.add('visible');
        this.updateTooltipPosition(event);
    }

    updateTooltipPosition(event) {
        if (!this.tooltip || !this.tooltip.classList.contains('visible')) return;
        
        const rect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = event.clientX + 10;
        let y = event.clientY - rect.height - 10;
        
        // Adjust if tooltip goes off screen
        if (x + rect.width > viewportWidth) {
            x = event.clientX - rect.width - 10;
        }
        
        if (y < 0) {
            y = event.clientY + 10;
        }
        
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
        }
    }

    // Toggle authentication fields
    toggleAuthFields() {
        const authType = document.getElementById('authType');
        if (!authType) return;
        
        const authTypeValue = authType.value;
        
        // Hide all auth fields
        document.querySelectorAll('#authFields > div').forEach(field => {
            field.style.display = 'none';
        });
        
        // Show selected auth field
        if (authTypeValue !== 'none') {
            const authField = document.getElementById(authTypeValue + 'Auth');
            if (authField) {
                authField.style.display = 'block';
            }
        }
        
        this.setupEnvironmentVariableListeners();
        Core.emit('authFieldsChanged', authTypeValue);
    }

    // Toggle body fields
    toggleBodyFields() {
        const bodyType = document.getElementById('bodyType');
        if (!bodyType) return;
        
        const bodyTypeValue = bodyType.value;
        
        // Hide all body fields
        document.querySelectorAll('#bodyContent > div').forEach(field => {
            field.style.display = 'none';
        });
        
        // Show selected body field
        if (bodyTypeValue !== 'none') {
            const bodyField = document.getElementById(bodyTypeValue + 'Body');
            if (bodyField) {
                bodyField.style.display = 'block';
            }
        }
        
        this.setupEnvironmentVariableListeners();
        Core.emit('bodyFieldsChanged', bodyTypeValue);
    }

    // Add form elements
    addParam() {
        const container = document.getElementById('paramsContainer');
        if (!container) return;
        
        const paramDiv = document.createElement('div');
        paramDiv.className = 'key-value-pair';
        paramDiv.innerHTML = `
            <input type="text" placeholder="Key" class="param-key">
            <input type="text" placeholder="Value (use {{variables}})" class="param-value">
            <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
        `;
        container.appendChild(paramDiv);
        this.setupEnvironmentVariableListeners();
        Core.emit('paramAdded');
    }

    addHeader() {
        const container = document.getElementById('headersContainer');
        if (!container) return;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'key-value-pair';
        headerDiv.innerHTML = `
            <input type="text" placeholder="Header Name" class="header-key">
            <input type="text" placeholder="Header Value (use {{variables}})" class="header-value">
            <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
        `;
        container.appendChild(headerDiv);
        this.setupEnvironmentVariableListeners();
        Core.emit('headerAdded');
    }

    addCookie() {
        const container = document.getElementById('cookiesContainer');
        if (!container) return;
        
        const cookieDiv = document.createElement('div');
        cookieDiv.className = 'key-value-pair';
        cookieDiv.innerHTML = `
            <input type="text" placeholder="Cookie Name" class="cookie-key">
            <input type="text" placeholder="Cookie Value (use {{variables}})" class="cookie-value">
            <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
        `;
        container.appendChild(cookieDiv);
        this.setupEnvironmentVariableListeners();
        Core.emit('cookieAdded');
    }

    addFormData() {
        const container = document.getElementById('formDataContainer');
        if (!container) return;
        
        const formDiv = document.createElement('div');
        formDiv.className = 'key-value-pair';
        formDiv.innerHTML = `
            <input type="text" placeholder="Key" class="form-key">
            <input type="text" placeholder="Value (use {{variables}})" class="form-value">
            <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
        `;
        container.appendChild(formDiv);
        this.setupEnvironmentVariableListeners();
        Core.emit('formDataAdded');
    }

    // Clear form for new request
    clearForm() {
        const urlInput = document.getElementById('url');
        const methodSelect = document.getElementById('method');
        
        if (urlInput) urlInput.value = '';
        if (methodSelect) methodSelect.value = 'GET';
        
        // Clear auth fields
        const authType = document.getElementById('authType');
        if (authType) {
            authType.value = 'none';
            this.toggleAuthFields();
        }
        
        // Clear body
        const bodyType = document.getElementById('bodyType');
        if (bodyType) {
            bodyType.value = 'none';
            this.toggleBodyFields();
        }
        
        // Reset to standard headers
        this.initializeStandardHeaders();
        
        Core.emit('formCleared');
        Core.showNotification('New Request', 'Form cleared for new request');
    }

    // Modal handling
    setupModalHandlers() {
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Handle escape key for modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const visibleModal = document.querySelector('.modal[style*="block"]');
                if (visibleModal) {
                    visibleModal.style.display = 'none';
                }
            }
        });
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        Core.on('shortcut:newRequest', () => {
            this.clearForm();
        });
        
        Core.on('shortcut:save', () => {
            if (typeof CollectionManager !== 'undefined') {
                CollectionManager.saveCurrentRequest();
            }
        });
        
        Core.on('shortcut:environment', () => {
            if (typeof EnvironmentManager !== 'undefined') {
                EnvironmentManager.openModal();
            }
        });
        
        Core.on('shortcut:escape', () => {
            this.hideTooltip();
            // Close any open modals
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        });
    }

    // Loading states
    showLoading(element, text = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.classList.add('loading');
        const originalContent = element.innerHTML;
        element.dataset.originalContent = originalContent;
        
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 2rem; color: #64748b;">
                <div style="margin-right: 0.5rem;">⏳</div>
                <div>${text}</div>
            </div>
        `;
    }

    hideLoading(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.classList.remove('loading');
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    }

    // Animation helpers
    slideDown(element, duration = 300) {
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight + 'px';
        
        element.animate([
            { height: '0px' },
            { height: targetHeight }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => {
            element.style.height = 'auto';
            element.style.overflow = '';
        };
    }

    slideUp(element, duration = 300) {
        const currentHeight = element.offsetHeight + 'px';
        element.style.height = currentHeight;
        element.style.overflow = 'hidden';
        
        element.animate([
            { height: currentHeight },
            { height: '0px' }
        ], {
            duration: duration,
            easing: 'ease-in'
        }).onfinish = () => {
            element.style.display = 'none';
            element.style.height = '';
            element.style.overflow = '';
        };
    }

    // Context menu
    showContextMenu(event, items) {
        event.preventDefault();
        
        // Remove existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        menu.innerHTML = items.map(item => {
            if (item.separator) {
                return '<div class="menu-separator"></div>';
            }
            
            const className = item.danger ? 'menu-item danger' : 'menu-item';
            return `
                <div class="${className}" onclick="${item.action}">
                    ${item.icon ? `<span class="menu-icon">${item.icon}</span>` : ''}
                    ${item.label}
                </div>
            `;
        }).join('');
        
        document.body.appendChild(menu);
        
        // Position menu
        const rect = menu.getBoundingClientRect();
        const x = Math.min(event.clientX, window.innerWidth - rect.width);
        const y = Math.min(event.clientY, window.innerHeight - rect.height);
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Close menu on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // Theme utilities
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Core.setStorage('theme', theme);
        Core.emit('themeChanged', theme);
    }

    getTheme() {
        return Core.getStorage('theme') || 'light';
    }

    // Responsive utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Focus management
    focusFirstInput(container) {
        const input = container.querySelector('input:not([disabled]), textarea:not([disabled])');
        if (input) {
            input.focus();
        }
    }

    // Form validation helpers
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        return isValid;
    }

    // Auto-resize textareas
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    setupAutoResizeTextareas() {
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.autoResizeTextarea(textarea);
            });
            
            // Initial resize
            this.autoResizeTextarea(textarea);
        });
    }
}

// Global UI instance
window.UI = new UI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}