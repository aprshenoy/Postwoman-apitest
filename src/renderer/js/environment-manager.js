// Environment Manager - Handles environment variables and switching (Fixed Version)

class EnvironmentManager {
    constructor() {
        this.environments = this.loadEnvironments();
        this.currentEnvironment = 'development';
        this.initialized = false;
        
        console.log('🌍 EnvironmentManager initializing...');
        
        // Wait for DOM and Core to be ready
        this.waitForDOMAndInitialize();
    }

    async waitForDOMAndInitialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Wait a bit for other modules to load
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.initializeEnvironments();
    }

    initializeEnvironments() {
        try {
            // Set up default environments if none exist
            if (Object.keys(this.environments).length === 0) {
                this.environments = {
                    development: {
                        baseUrl: 'http://localhost:3000',
                        apiToken: 'dev_token_123',
                        userId: 'dev_user_001',
                        timeout: '5000'
                    },
                    staging: {
                        baseUrl: 'https://staging-api.example.com',
                        apiToken: 'staging_token_456',
                        userId: 'staging_user_002',
                        timeout: '10000'
                    },
                    production: {
                        baseUrl: 'https://api.example.com',
                        apiToken: 'prod_token_789',
                        userId: 'prod_user_003',
                        timeout: '15000'
                    }
                };
                this.saveEnvironments();
            }

            this.updateEnvironmentSelect();
            this.updateDisplay();
            
            this.initialized = true;
            console.log('✅ EnvironmentManager initialized successfully');
            
            // Emit initialization event
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('environment-manager-initialized');
            }
        } catch (error) {
            console.error('❌ EnvironmentManager initialization failed:', error);
        }
    }

    loadEnvironments() {
        try {
            const stored = localStorage.getItem('posterboy_environments');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading environments:', error);
            return {};
        }
    }

    saveEnvironments() {
        try {
            localStorage.setItem('posterboy_environments', JSON.stringify(this.environments));
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('environmentsUpdated', this.environments);
            }
        } catch (error) {
            console.error('Error saving environments:', error);
        }
    }

    getCurrentEnvironment() {
        const envSelect = document.getElementById('currentEnvironment');
        return envSelect ? envSelect.value : this.currentEnvironment;
    }

    setCurrentEnvironment(envName) {
        this.currentEnvironment = envName;
        const envSelect = document.getElementById('currentEnvironment');
        if (envSelect) {
            envSelect.value = envName;
        }
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('environmentChanged', envName);
        }
    }

    getEnvironmentVariables(envName = null) {
        const env = envName || this.getCurrentEnvironment();
        return this.environments[env] || {};
    }

replaceVariables(text, envName = null) {
    // Handle non-string values
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    const envVars = this.getEnvironmentVariables(envName);
    let result = text;
    
    // Replace {{variableName}} with actual values
    Object.entries(envVars).forEach(([key, value]) => {
        // Ensure value is a string
        const stringValue = String(value || '');
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, stringValue);
    });
    
    return result;
}

    openModal() {
        const modal = document.getElementById('envModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadVariables();
            
            // Focus first input
            const firstInput = modal.querySelector('input, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('envModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadVariables() {
        const envSelect = document.getElementById('envSelect');
        const container = document.getElementById('envVariablesContainer');
        if (!envSelect || !container) return;
        
        const envName = envSelect.value;
        const envVars = this.environments[envName] || {};
        
        container.innerHTML = '';
        
        Object.entries(envVars).forEach(([key, value]) => {
            this.addVariableRow(key, value);
        });
        
        // Add empty row for new variables
        this.addVariableRow();
    }

    addVariableRow(key = '', value = '') {
        const container = document.getElementById('envVariablesContainer');
        if (!container) return;
        
        const varDiv = document.createElement('div');
        varDiv.className = 'env-variable';
        varDiv.innerHTML = `
            <input type="text" placeholder="Variable Name" class="env-key" value="${this.escapeHtml(key)}">
            <input type="text" placeholder="Variable Value" class="env-value" value="${this.escapeHtml(value)}">
            <button class="remove-btn" onclick="this.parentNode.remove()">×</button>
        `;
        container.appendChild(varDiv);
    }

    addVariable() {
        this.addVariableRow();
    }

    saveEnvironment() {
        const envSelect = document.getElementById('envSelect');
        const container = document.getElementById('envVariablesContainer');
        if (!envSelect || !container) return;
        
        const envName = envSelect.value;
        const envVars = {};
        
        container.querySelectorAll('.env-variable').forEach(pair => {
            const key = pair.querySelector('.env-key')?.value?.trim();
            const value = pair.querySelector('.env-value')?.value?.trim();
            if (key && value) {
                envVars[key] = value;
            }
        });
        
        this.environments[envName] = envVars;
        this.saveEnvironments();
        this.closeModal();
        this.updateDisplay();
        
        this.showNotification('Environment Saved', `${envName} environment saved successfully!`);
    }
duplicateEnvironment(envName) {
    const originalEnv = this.environments[envName];
    if (!originalEnv) return;
    
    // Create modal for naming the duplicate
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📄 Duplicate Environment</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.EnvironmentManager.handleDuplicateEnvironment(event, '${envName}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="newEnvName">New Environment Name *</label>
                        <input type="text" id="newEnvName" required value="${envName}_copy" maxlength="50">
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Duplicate Environment</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus and select the name input
    const nameInput = modal.querySelector('#newEnvName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
}

// Add this method to EnvironmentManager
handleDuplicateEnvironment(event, originalEnvName) {
    event.preventDefault();
    
    const nameInput = document.getElementById('newEnvName');
    const newName = nameInput ? nameInput.value.trim() : '';
    
    if (!newName) {
        alert('Please enter an environment name');
        return;
    }
    
    const newEnvName = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.environments[newEnvName]) {
        alert('Environment already exists');
        return;
    }
    
    const originalEnv = this.environments[originalEnvName];
    if (!originalEnv) return;
    
    this.environments[newEnvName] = { ...originalEnv };
    this.saveEnvironments();
    this.updateDisplay();
    this.updateEnvironmentSelect();
    
    // Close modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Environment Duplicated', `${newName} environment created`);
}

// Replace createEnvironment method in EnvironmentManager
createEnvironment() {
    // Create modal for environment creation
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🌍 Create New Environment</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.EnvironmentManager.handleCreateEnvironment(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="envName">Environment Name *</label>
                        <input type="text" id="envName" required placeholder="Enter environment name" maxlength="50">
                    </div>
                    
                    <div class="form-group">
                        <label for="baseUrl">Base URL</label>
                        <input type="url" id="baseUrl" placeholder="https://api.example.com" value="https://api.example.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="apiToken">API Token</label>
                        <input type="text" id="apiToken" placeholder="your_token_here" value="your_token_here">
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Create Environment</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the name input
    const nameInput = modal.querySelector('#envName');
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
}

// Add this method to EnvironmentManager
handleCreateEnvironment(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('envName');
    const baseUrlInput = document.getElementById('baseUrl');
    const apiTokenInput = document.getElementById('apiToken');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const baseUrl = baseUrlInput ? baseUrlInput.value.trim() : 'https://api.example.com';
    const apiToken = apiTokenInput ? apiTokenInput.value.trim() : 'your_token_here';
    
    if (!name) {
        alert('Please enter an environment name');
        return;
    }
    
    const envName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.environments[envName]) {
        alert('Environment already exists');
        return;
    }
    
    this.environments[envName] = {
        baseUrl: baseUrl,
        apiToken: apiToken
    };
    
    this.saveEnvironments();
    this.updateDisplay();
    this.updateEnvironmentSelect();
    
    // Close modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Environment Created', `${name} environment created`);
}

    deleteEnvironment(envName) {
        if (!confirm(`Are you sure you want to delete the "${envName}" environment?`)) {
            return;
        }
        
        if (Object.keys(this.environments).length <= 1) {
            alert('Cannot delete the last environment');
            return;
        }
        
        delete this.environments[envName];
        this.saveEnvironments();
        this.updateDisplay();
        this.updateEnvironmentSelect();
        
        // Switch to first available environment if current was deleted
        if (this.getCurrentEnvironment() === envName) {
            const firstEnv = Object.keys(this.environments)[0];
            this.setCurrentEnvironment(firstEnv);
        }
        
        this.showNotification('Environment Deleted', `${envName} environment deleted`);
    }


    updateEnvironmentSelect() {
        const selects = document.querySelectorAll('#currentEnvironment, #envSelect');
        
        selects.forEach(select => {
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '';
            
            Object.keys(this.environments).forEach(envName => {
                const option = document.createElement('option');
                option.value = envName;
                option.textContent = envName.charAt(0).toUpperCase() + envName.slice(1);
                select.appendChild(option);
            });
            
            // Restore previous selection if it still exists
            if (this.environments[currentValue]) {
                select.value = currentValue;
            } else if (Object.keys(this.environments).length > 0) {
                // Set to first environment if current doesn't exist
                select.value = Object.keys(this.environments)[0];
            }
        });
    }

 // Fix for EnvironmentManager updateDisplay method
// Replace the updateDisplay method in your environment-manager.js file

updateDisplay() {
    const container = document.getElementById('environmentsContainer');
    if (!container) return;
    
    const currentEnv = this.getCurrentEnvironment();
    
    if (Object.keys(this.environments).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #64748b;">
                <h3>No Environments Yet</h3>
                <p>Create your first environment to manage API variables</p>
                <button class="action-btn" onclick="createEnvironment()" style="margin-top: 1rem;">
                    ➕ Create Environment
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = Object.entries(this.environments).map(([envName, envVars]) => `
        <div class="environment-card ${envName === currentEnv ? 'active' : ''}">
            <div class="environment-header">
                <h3 class="environment-name">${envName.charAt(0).toUpperCase() + envName.slice(1)}</h3>
                <span class="environment-badge badge-${envName}">
                    ${envName === currentEnv ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="environment-variables">
                ${Object.keys(envVars).length} variables defined
            </div>
            <div class="environment-preview">
                ${Object.entries(envVars).slice(0, 3).map(([key, value]) => 
                    `<div class="env-preview-item">
                        <span class="env-preview-key">${key}:</span>
                        <span class="env-preview-value">${value.length > 20 ? value.substring(0, 20) + '...' : value}</span>
                    </div>`
                ).join('')}
                ${Object.keys(envVars).length > 3 ? `<div class="env-preview-more">+${Object.keys(envVars).length - 3} more</div>` : ''}
            </div>
            <div class="environment-actions">
                <button class="btn-sm btn-edit" onclick="editEnvironment('${envName}')">Edit</button>
                <button class="btn-sm btn-edit" onclick="setActiveEnvironment('${envName}')">
                    ${envName === currentEnv ? 'Active' : 'Activate'}
                </button>
                <button class="btn-sm btn-edit" onclick="duplicateEnvironment('${envName}')">Duplicate</button>
                <button class="btn-sm btn-delete" onclick="deleteEnvironment('${envName}')">Delete</button>
            </div>
        </div>
    `).join('');
}

    editEnvironment(envName) {
        const envSelect = document.getElementById('envSelect');
        if (envSelect) {
            envSelect.value = envName;
            this.openModal();
        }
    }

    setActiveEnvironment(envName) {
        this.setCurrentEnvironment(envName);
        this.updateDisplay();
        this.showNotification('Environment Changed', `Switched to ${envName} environment`);
    }

    importEnvironments() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => this.handleEnvironmentImport(event);
        input.click();
    }

    async handleEnvironmentImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await this.readFile(file);
            const importData = JSON.parse(text);
            
            // Handle different import formats
            if (importData.environments) {
                // PosterBoy format
                Object.assign(this.environments, importData.environments);
            } else if (importData.name && importData.values) {
                // Postman environment format
                const envName = importData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const variables = {};
                
                importData.values.forEach(variable => {
                    if (variable.key && variable.enabled !== false) {
                        variables[variable.key] = variable.value || '';
                    }
                });
                
                this.environments[envName] = variables;
            } else {
                // Direct environment object
                Object.assign(this.environments, importData);
            }
            
            this.saveEnvironments();
            this.updateDisplay();
            this.updateEnvironmentSelect();
            
            this.showNotification('Environments Imported', 'Environments imported successfully');
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing environments: ' + error.message);
        }
    }

    exportEnvironments() {
        const exportData = {
            posterboy_environments: true,
            version: '1.0.0',
            environments: this.environments,
            exported_at: new Date().toISOString()
        };
        
        this.downloadFile(exportData, `posterboy_environments_${new Date().toISOString().split('T')[0]}.json`);
        this.showNotification('Environments Exported', 'All environments exported successfully');
    }

    exportEnvironment(envName) {
        const environment = this.environments[envName];
        if (!environment) return;
        
        const exportData = {
            name: envName,
            values: Object.entries(environment).map(([key, value]) => ({
                key: key,
                value: value,
                enabled: true,
                type: 'text'
            }))
        };
        
        this.downloadFile(exportData, `${envName}_environment.json`);
        this.showNotification('Environment Exported', `${envName} environment exported`);
    }

    searchEnvironments(query) {
        const container = document.getElementById('environmentsContainer');
        if (!container) return;
        
        const cards = container.querySelectorAll('.environment-card');
        
        cards.forEach(card => {
            const name = card.querySelector('.environment-name').textContent.toLowerCase();
            const matches = name.includes(query.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
        });
    }

    validateEnvironment(envName) {
        const env = this.environments[envName];
        if (!env) return { valid: false, errors: ['Environment not found'] };
        
        const errors = [];
        const warnings = [];
        
        // Check for required variables
        const requiredVars = ['baseUrl'];
        requiredVars.forEach(varName => {
            if (!env[varName]) {
                errors.push(`Missing required variable: ${varName}`);
            }
        });
        
        // Validate URLs
        Object.entries(env).forEach(([key, value]) => {
            if (key.toLowerCase().includes('url') && value) {
                try {
                    new URL(value);
                } catch (e) {
                    warnings.push(`Invalid URL in ${key}: ${value}`);
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    getVariableUsage(varName) {
        // This would analyze all collections/requests to see where a variable is used
        // For now, return a placeholder
        return {
            collections: 0,
            requests: 0,
            total: 0
        };
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    downloadFile(data, filename) {
        try {
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
        } catch (error) {
            console.error('Error downloading file:', error);
        }
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

    // Health check
    healthCheck() {
        return {
            initialized: this.initialized,
            environmentCount: Object.keys(this.environments).length,
            currentEnvironment: this.getCurrentEnvironment(),
            variableCount: Object.values(this.environments).reduce((sum, env) => sum + Object.keys(env).length, 0)
        };
    }
}

// Global instance
window.EnvironmentManager = new EnvironmentManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentManager;
}