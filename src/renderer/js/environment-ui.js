// environment-ui.js - Clean implementation without overlays

class EnvironmentVariableUI {
    constructor() {
        this.tooltipElement = null;
        this.addVariableModal = null;
        this.initializeTooltip();
        this.initializeAddVariableModal();
        this.setupInputHandlers();
    }

    initializeTooltip() {
        // Create tooltip element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'env-var-tooltip';
        this.tooltipElement.style.display = 'none';
        document.body.appendChild(this.tooltipElement);
    }

    initializeAddVariableModal() {
        // Create modal for adding new environment variables
        this.addVariableModal = document.createElement('div');
        this.addVariableModal.className = 'modal';
        this.addVariableModal.id = 'addEnvVarModal';
        this.addVariableModal.style.display = 'none';
        
        this.addVariableModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌍 Add Environment Variable</h3>
                    <button class="close" onclick="this.closest('.modal').style.display='none'">&times;</button>
                </div>
                <form onsubmit="window.EnvironmentVariableUI.handleAddVariable(event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="newEnvVarName">Variable Name *</label>
                            <input type="text" id="newEnvVarName" required readonly>
                        </div>
                        <div class="form-group">
                            <label for="newEnvVarValue">Variable Value *</label>
                            <input type="text" id="newEnvVarValue" required placeholder="Enter variable value">
                        </div>
                        <div class="form-group">
                            <label for="targetEnvironment">Add to Environment *</label>
                            <select id="targetEnvironment" required>
                                <option value="">Select Environment</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Add Variable</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(this.addVariableModal);
    }

    setupInputHandlers() {
        // Add event listeners to all relevant input fields
        document.addEventListener('input', (e) => {
            if (this.isRelevantInput(e.target)) {
                this.processEnvironmentVariables(e.target);
            }
        });

        // Handle focus events to ensure smooth cursor behavior
        document.addEventListener('focus', (e) => {
            if (this.isRelevantInput(e.target) && e.target.classList.contains('has-env-vars')) {
                // Ensure cursor is visible and input is functional
                e.target.style.cursor = 'text';
            }
        }, true);

        document.addEventListener('mouseover', (e) => {
            if (this.isRelevantInput(e.target) && e.target.classList.contains('has-env-vars')) {
                this.handleMouseOver(e);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (this.isRelevantInput(e.target)) {
                this.hideTooltip();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.tooltipElement.style.display === 'block') {
                this.handleMouseMove(e);
            }
        });

        // Right-click context menu for undefined variables
        document.addEventListener('contextmenu', (e) => {
            if (this.isRelevantInput(e.target) && e.target.classList.contains('has-env-vars')) {
                this.handleRightClick(e);
            }
        });

        // Handle dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const inputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
                        inputs.forEach(input => {
                            if (this.isRelevantInput(input)) {
                                this.processEnvironmentVariables(input);
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    isRelevantInput(element) {
        return element && 
               element.matches && 
               element.matches('input[type="text"], input[type="url"], input[type="password"], textarea') &&
               !element.classList.contains('env-var-excluded');
    }

    processEnvironmentVariables(input) {
        const value = input.value;
        const variables = this.extractVariables(value);
        
        if (variables.length > 0) {
            input.classList.add('has-env-vars');
            // Store variables data for context menu and tooltips
            input._envVariables = variables;
        } else {
            input.classList.remove('has-env-vars');
            delete input._envVariables;
        }
    }

    extractVariables(text) {
        const regex = /\{\{([^}]+)\}\}/g;
        const variables = [];
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const varName = match[1].trim();
            const varValue = this.getVariableValue(varName);
            const isDefined = this.isVariableDefined(varName);
            
            variables.push({
                full: match[0],
                name: varName,
                value: varValue,
                isDefined: isDefined,
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        return variables;
    }

    getVariableValue(varName) {
        if (window.EnvironmentManager) {
            const envVars = window.EnvironmentManager.getEnvironmentVariables();
            return envVars[varName] || '(undefined)';
        }
        return '(undefined)';
    }

    isVariableDefined(varName) {
        if (window.EnvironmentManager) {
            const envVars = window.EnvironmentManager.getEnvironmentVariables();
            return envVars.hasOwnProperty(varName) && envVars[varName] !== undefined && envVars[varName] !== '';
        }
        return false;
    }

    handleMouseOver(e) {
        const target = e.target;
        const variables = target._envVariables || [];
        
        if (variables.length > 0) {
            this.showVariablesTooltip(e, variables);
        }
    }

    handleMouseMove(e) {
        this.positionTooltip(e);
    }

    handleRightClick(e) {
        const target = e.target;
        const variables = target._envVariables || [];
        const undefinedVars = variables.filter(v => !v.isDefined);
        
        if (undefinedVars.length > 0) {
            e.preventDefault();
            this.hideTooltip(); // Hide tooltip when showing modal
            this.showAddVariableModal(undefinedVars[0]); // Show modal for first undefined variable
        }
    }

    showVariablesTooltip(e, variables) {
        const tooltipContent = variables.map(variable => {
            const statusClass = variable.isDefined ? 'defined' : 'undefined';
            const statusIcon = variable.isDefined ? '✅' : '❌';
            
            return `<div class="env-var-tooltip-item ${statusClass}">
                <span class="var-status">${statusIcon}</span>
                <span class="var-name">${this.escapeHtml(variable.name)}</span>
                <span class="var-arrow">→</span>
                <span class="var-value">${this.escapeHtml(variable.value)}</span>
            </div>`;
        }).join('');

        const undefinedCount = variables.filter(v => !v.isDefined).length;
        const footerText = undefinedCount > 0 
            ? `Right-click to add ${undefinedCount} undefined variable${undefinedCount > 1 ? 's' : ''}`
            : 'All variables are defined';

        this.tooltipElement.innerHTML = `
            <div class="env-var-tooltip-header">Environment Variables</div>
            ${tooltipContent}
            <div class="env-var-tooltip-footer">${footerText}</div>
        `;
        
        this.tooltipElement.style.display = 'block';
        this.positionTooltip(e);
    }

    positionTooltip(e) {
        const tooltip = this.tooltipElement;
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = e.clientX + 10;
        let y = e.clientY - rect.height - 10;
        
        // Adjust if tooltip goes off screen
        if (x + rect.width > viewportWidth) {
            x = e.clientX - rect.width - 10;
        }
        
        if (y < 0) {
            y = e.clientY + 10;
        }
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    hideTooltip() {
        this.tooltipElement.style.display = 'none';
    }

    showAddVariableModal(variable) {
        // Populate environments dropdown
        this.populateEnvironmentsDropdown();
        
        // Set variable name
        document.getElementById('newEnvVarName').value = variable.name;
        document.getElementById('newEnvVarValue').value = '';
        
        // Show modal
        this.addVariableModal.style.display = 'block';
        
        // Focus on value input
        setTimeout(() => {
            const valueInput = document.getElementById('newEnvVarValue');
            if (valueInput) {
                valueInput.focus();
            }
        }, 100);
    }

    populateEnvironmentsDropdown() {
        const select = document.getElementById('targetEnvironment');
        if (!select || !window.EnvironmentManager) return;
        
        const environments = window.EnvironmentManager.environments || {};
        
        select.innerHTML = '<option value="">Select Environment</option>';
        
        Object.keys(environments).forEach(envName => {
            const option = document.createElement('option');
            option.value = envName;
            option.textContent = envName.charAt(0).toUpperCase() + envName.slice(1);
            select.appendChild(option);
        });

        // Select current environment if available
        if (window.EnvironmentManager.getCurrentEnvironment) {
            const currentEnv = window.EnvironmentManager.getCurrentEnvironment();
            if (currentEnv && environments[currentEnv]) {
                select.value = currentEnv;
            }
        }
    }

    handleAddVariable(event) {
        event.preventDefault();
        
        const varName = document.getElementById('newEnvVarName').value.trim();
        const varValue = document.getElementById('newEnvVarValue').value.trim();
        const envName = document.getElementById('targetEnvironment').value;
        
        if (!varName || !varValue || !envName) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!window.EnvironmentManager) {
            alert('Environment Manager not available');
            return;
        }
        
        // Add variable to environment
        if (!window.EnvironmentManager.environments[envName]) {
            window.EnvironmentManager.environments[envName] = {};
        }
        
        window.EnvironmentManager.environments[envName][varName] = varValue;
        window.EnvironmentManager.saveEnvironments();
        
        // Close modal
        this.addVariableModal.style.display = 'none';
        
        // Show success notification
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification(
                'Variable Added',
                `Added "${varName}" to ${envName} environment`,
                { type: 'success' }
            );
        }
        
        // Refresh all environment variable displays
        this.refreshAllVariableDisplays();
        
        // Update environment dropdown if the new variable's environment is selected
        if (window.EnvironmentManager.getCurrentEnvironment() === envName) {
            if (window.EnvironmentManager.updateEnvironmentSelect) {
                window.EnvironmentManager.updateEnvironmentSelect();
            }
        }
    }

    refreshAllVariableDisplays() {
        // Refresh all inputs with environment variables
        document.querySelectorAll('input, textarea').forEach(input => {
            if (this.isRelevantInput(input)) {
                this.processEnvironmentVariables(input);
            }
        });
        
        // Update environment dropdown if visible
        if (window.EnvironmentManager && window.EnvironmentManager.updateEnvironmentSelect) {
            window.EnvironmentManager.updateEnvironmentSelect();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.EnvironmentVariableUI = new EnvironmentVariableUI();
});

// Refresh highlights when environment changes
if (window.Core && typeof window.Core.on === 'function') {
    window.Core.on('environmentChanged', () => {
        if (window.EnvironmentVariableUI) {
            window.EnvironmentVariableUI.refreshAllVariableDisplays();
        }
    });
}

// Also listen for environment manager events
setTimeout(() => {
    if (window.EnvironmentManager && window.Core) {
        window.Core.on('environmentsUpdated', () => {
            if (window.EnvironmentVariableUI) {
                window.EnvironmentVariableUI.refreshAllVariableDisplays();
            }
        });
    }
}, 1000);