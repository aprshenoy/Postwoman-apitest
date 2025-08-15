// Environment Manager - Handles environment variables and switching

class EnvironmentManager {
    constructor() {
        this.environments = this.loadEnvironments();
        this.currentEnvironment = 'development';
        this.initializeEnvironments();
    }

    initializeEnvironments() {
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
    }

    loadEnvironments() {
        try {
            const stored = localStorage.getItem('postwoman_environments');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading environments:', error);
            return {};
        }
    }

    saveEnvironments() {
        try {
            localStorage.setItem('postwoman_environments', JSON.stringify(this.environments));
            Core.emit('environmentsUpdated', this.environments);
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
        Core.emit('environmentChanged', envName);
    }

    getEnvironmentVariables(envName = null) {
        const env = envName || this.getCurrentEnvironment();
        return this.environments[env] || {};
    }

    replaceVariables(text, envName = null) {
        if (!text) return text;
        
        const envVars = this.getEnvironmentVariables(envName);
        let result = text;
        
        // Replace {{variableName}} with actual values
        Object.entries(envVars).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value);
        });
        
        return result;
    }

    openModal() {
        const modal = document.getElementById('envModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadVariables();
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
            <input type="text" placeholder="Variable Name" class="env-key" value="${Core.escapeHtml(key)}">
            <input type="text" placeholder="Variable Value" class="env-value" value="${Core.escapeHtml(value)}">
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
        
        Core.showNotification('Environment Saved', `${envName} environment saved successfully!`);
    }

    createEnvironment() {
        const name = prompt('Enter environment name:');
        if (!name || name.trim() === '') return;
        
        const envName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (this.environments[envName]) {
            alert('Environment already exists');
            return;
        }
        
        this.environments[envName] = {
            baseUrl: 'https://api.example.com',
            apiToken: 'your_token_here'
        };
        
        this.saveEnvironments();
        this.updateDisplay();
        this.updateEnvironmentSelect();
        
        Core.showNotification('Environment Created', `${name} environment created`);
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
        
        Core.showNotification('Environment Deleted', `${envName} environment deleted`);
    }

    duplicateEnvironment(envName) {
        const originalEnv = this.environments[envName];
        if (!originalEnv) return;
        
        const newName = prompt('Enter name for duplicated environment:', `${envName}_copy`);
        if (!newName || newName.trim() === '') return;
        
        const newEnvName = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (this.environments[newEnvName]) {
            alert('Environment already exists');
            return;
        }
        
        this.environments[newEnvName] = { ...originalEnv };
        this.saveEnvironments();
        this.updateDisplay();
        this.updateEnvironmentSelect();
        
        Core.showNotification('Environment Duplicated', `${newName} environment created`);
    }

    updateEnvironmentSelect() {
        const selects = document.querySelectorAll('#currentEnvironment, #envSelect');
        
        selects.forEach(select => {
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
            }
        });
    }

    updateDisplay() {
        const container = document.getElementById('environmentsContainer');
        if (!container) return;
        
        const currentEnv = this.getCurrentEnvironment();
        
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
                    <button class="btn-sm btn-edit" onclick="EnvironmentManager.editEnvironment('${envName}')">Edit</button>
                    <button class="btn-sm btn-edit" onclick="EnvironmentManager.setActiveEnvironment('${envName}')">
                        ${envName === currentEnv ? 'Active' : 'Activate'}
                    </button>
                    <button class="btn-sm btn-edit" onclick="EnvironmentManager.duplicateEnvironment('${envName}')">Duplicate</button>
                    <button class="btn-sm btn-delete" onclick="EnvironmentManager.deleteEnvironment('${envName}')">Delete</button>
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
        Core.showNotification('Environment Changed', `Switched to ${envName} environment`);
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
            const text = await Core.readFile(file);
            const importData = JSON.parse(text);
            
            // Handle different import formats
            if (importData.environments) {
                // PostWoman format
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
            
            Core.showNotification('Environments Imported', 'Environments imported successfully');
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing environments: ' + error.message);
        }
    }

    exportEnvironments() {
        const exportData = {
            postwoman_environments: true,
            version: '1.0.0',
            environments: this.environments,
            exported_at: new Date().toISOString()
        };
        
        Core.downloadFile(exportData, `postwoman_environments_${new Date().toISOString().split('T')[0]}.json`);
        Core.showNotification('Environments Exported', 'All environments exported successfully');
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
        
        Core.downloadFile(exportData, `${envName}_environment.json`);
        Core.showNotification('Environment Exported', `${envName} environment exported`);
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
}

// Global instance
window.EnvironmentManager = new EnvironmentManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentManager;
}