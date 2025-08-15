// History Manager - Handles request history tracking and management

class HistoryManager {
    constructor() {
        this.history = this.loadHistory();
        this.maxHistorySize = 100; // Maximum number of history items to keep
        this.initialize();
    }

    initialize() {
        // Clean up old history items if too many
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
            this.saveHistory();
        }
        
        this.updateDisplay();
    }

    loadHistory() {
        try {
            const stored = localStorage.getItem('postwoman_history');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('postwoman_history', JSON.stringify(this.history));
            Core.emit('historyUpdated', this.history);
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    addToHistory(requestData, responseData) {
        const historyItem = {
            id: Core.generateId('hist'),
            timestamp: new Date().toISOString(),
            request: {
                method: requestData.method,
                url: requestData.url,
                headers: requestData.headers,
                params: requestData.params,
                body: requestData.body,
                auth: requestData.auth
            },
            response: {
                status: responseData.status,
                statusText: responseData.statusText,
                headers: responseData.headers,
                body: responseData.body,
                size: responseData.size,
                duration: responseData.duration
            }
        };
        
        // Add to beginning of array (most recent first)
        this.history.unshift(historyItem);
        
        // Trim history if it's too long
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
        
        this.saveHistory();
        
        // Update display if we're on the history section
        if (UI.currentActiveSection === 'history') {
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        if (this.history.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <h3>No Request History</h3>
                    <p>Your API request history will appear here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.renderHistoryList();
    }

    renderHistoryList() {
        return this.history.map((item, index) => `
            <div class="history-item" onclick="HistoryManager.loadFromHistory(${index})">
                <div class="history-header">
                    <div class="history-request-info">
                        <span class="history-method method-${item.request.method.toLowerCase()}">
                            ${item.request.method}
                        </span>
                        <span class="history-status status-${this.getStatusClass(item.response.status)}">
                            ${item.response.status} ${item.response.statusText}
                        </span>
                        <span class="history-duration">
                            ${item.response.duration}ms
                        </span>
                    </div>
                    <div class="history-meta">
                        <span class="history-time">${this.formatRelativeTime(item.timestamp)}</span>
                        <div class="history-actions" onclick="event.stopPropagation()">
                            <button class="btn-sm btn-edit" onclick="HistoryManager.showDetails(${index})" title="View Details">
                                👁️
                            </button>
                            <button class="btn-sm btn-edit" onclick="HistoryManager.saveToCollection(${index})" title="Save to Collection">
                                💾
                            </button>
                            <button class="btn-sm btn-delete" onclick="HistoryManager.removeFromHistory(${index})" title="Remove">
                                ×
                            </button>
                        </div>
                    </div>
                </div>
                <div class="history-url" title="${Core.escapeHtml(item.request.url)}">
                    ${this.truncateUrl(item.request.url)}
                </div>
                <div class="history-details">
                    <span class="history-size">${Core.formatFileSize(item.response.size || 0)}</span>
                    ${item.request.headers.length > 0 ? `<span class="history-headers">${item.request.headers.length} headers</span>` : ''}
                    ${item.request.body && item.request.body.type !== 'none' ? '<span class="history-body">Has body</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    getStatusClass(status) {
        if (status >= 200 && status < 300) return '200';
        if (status >= 300 && status < 400) return '300';
        if (status >= 400 && status < 500) return '400';
        if (status >= 500) return '500';
        return 'unknown';
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return Core.formatDate(timestamp, { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateUrl(url, maxLength = 60) {
        if (url.length <= maxLength) return url;
        
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const path = urlObj.pathname;
            
            if (domain.length + path.length <= maxLength) {
                return `${domain}${path}`;
            }
            
            const availableLength = maxLength - domain.length - 3; // 3 for "..."
            if (availableLength > 0) {
                return `${domain}...${path.slice(-availableLength)}`;
            }
        } catch (e) {
            // Fallback for invalid URLs
        }
        
        return url.slice(0, maxLength - 3) + '...';
    }

    loadFromHistory(index) {
        const item = this.history[index];
        if (!item) return;
        
        RequestManager.loadRequest(item.request);
        
        // Switch to workspace
        UI.showSection('workspace');
        Core.showNotification('History Loaded', `Loaded ${item.request.method} request from history`);
    }

    showDetails(index) {
        const item = this.history[index];
        if (!item) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Request Details</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="history-detail-content">
                    ${this.renderRequestDetails(item)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    renderRequestDetails(item) {
        return `
            <div class="request-response-details">
                <div class="detail-section">
                    <h4>Request Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Method:</strong> 
                            <span class="method-badge method-${item.request.method.toLowerCase()}">
                                ${item.request.method}
                            </span>
                        </div>
                        <div class="detail-item">
                            <strong>URL:</strong> 
                            <span class="url-text">${Core.escapeHtml(item.request.url)}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Timestamp:</strong> 
                            ${Core.formatDate(item.timestamp)}
                        </div>
                    </div>
                    
                    ${item.request.headers.length > 0 ? `
                        <h5>Headers (${item.request.headers.length})</h5>
                        <div class="headers-list">
                            ${item.request.headers.map(header => 
                                `<div class="header-item">
                                    <span class="header-key">${Core.escapeHtml(header.key)}:</span>
                                    <span class="header-value">${Core.escapeHtml(header.value)}</span>
                                </div>`
                            ).join('')}
                        </div>
                    ` : ''}
                    
                    ${item.request.params.length > 0 ? `
                        <h5>Parameters (${item.request.params.length})</h5>
                        <div class="params-list">
                            ${item.request.params.map(param => 
                                `<div class="param-item">
                                    <span class="param-key">${Core.escapeHtml(param.key)}:</span>
                                    <span class="param-value">${Core.escapeHtml(param.value)}</span>
                                </div>`
                            ).join('')}
                        </div>
                    ` : ''}
                    
                    ${item.request.body && item.request.body.type !== 'none' ? `
                        <h5>Request Body (${item.request.body.type})</h5>
                        <pre class="body-content">${Core.escapeHtml(
                            typeof item.request.body.data === 'object' 
                                ? JSON.stringify(item.request.body.data, null, 2)
                                : item.request.body.data
                        )}</pre>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <h4>Response Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Status:</strong> 
                            <span class="status-badge status-${this.getStatusClass(item.response.status)}">
                                ${item.response.status} ${item.response.statusText}
                            </span>
                        </div>
                        <div class="detail-item">
                            <strong>Duration:</strong> 
                            ${item.response.duration}ms
                        </div>
                        <div class="detail-item">
                            <strong>Size:</strong> 
                            ${Core.formatFileSize(item.response.size || 0)}
                        </div>
                    </div>
                    
                    ${item.response.headers && Object.keys(item.response.headers).length > 0 ? `
                        <h5>Response Headers</h5>
                        <div class="headers-list">
                            ${Object.entries(item.response.headers).map(([key, value]) => 
                                `<div class="header-item">
                                    <span class="header-key">${Core.escapeHtml(key)}:</span>
                                    <span class="header-value">${Core.escapeHtml(value)}</span>
                                </div>`
                            ).join('')}
                        </div>
                    ` : ''}
                    
                    ${item.response.body ? `
                        <h5>Response Body</h5>
                        <pre class="response-body">${Core.escapeHtml(
                            typeof item.response.body === 'object' 
                                ? JSON.stringify(item.response.body, null, 2)
                                : item.response.body
                        )}</pre>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-actions" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                <button class="action-btn" onclick="HistoryManager.loadFromHistory(${this.history.indexOf(item)}); this.closest('.modal').remove();">
                    Load Request
                </button>
                <button class="action-btn" onclick="HistoryManager.saveToCollection(${this.history.indexOf(item)}); this.closest('.modal').remove();">
                    Save to Collection
                </button>
                <button class="action-btn" onclick="HistoryManager.exportHistoryItem(${this.history.indexOf(item)})">
                    Export
                </button>
            </div>
        `;
    }

    saveToCollection(index) {
        const item = this.history[index];
        if (!item) return;
        
        // Open save modal with pre-filled data
        const requestName = `${item.request.method} ${this.getUrlPath(item.request.url)}`;
        document.getElementById('requestName').value = requestName;
        document.getElementById('requestDescription').value = `Saved from history - ${Core.formatDate(item.timestamp)}`;
        
        CollectionManager.updateTargetCollectionSelect();
        
        // Store the request data temporarily
        window._tempRequestData = item.request;
        
        Core.showModal('saveRequestModal');
    }

    getUrlPath(url) {
        try {
            return new URL(url).pathname;
        } catch (e) {
            return url;
        }
    }

    removeFromHistory(index) {
        if (!confirm('Are you sure you want to remove this item from history?')) {
            return;
        }
        
        this.history.splice(index, 1);
        this.saveHistory();
        this.updateDisplay();
        
        Core.showNotification('History Item Removed', 'Item removed from history');
    }

    clearHistory() {
        if (!confirm('Are you sure you want to clear all request history?')) {
            return;
        }
        
        this.history = [];
        this.saveHistory();
        this.updateDisplay();
        
        Core.showNotification('History Cleared', 'All request history has been cleared');
    }

    exportHistory() {
        if (this.history.length === 0) {
            alert('No history to export');
            return;
        }
        
        const exportData = {
            postwoman_history: true,
            version: '1.0.0',
            history: this.history,
            exported_at: new Date().toISOString()
        };
        
        Core.downloadFile(exportData, `postwoman_history_${new Date().toISOString().split('T')[0]}.json`);
        Core.showNotification('History Exported', 'Request history exported successfully');
    }

    exportHistoryItem(index) {
        const item = this.history[index];
        if (!item) return;
        
        const exportData = {
            postwoman_history_item: true,
            version: '1.0.0',
            item: item,
            exported_at: new Date().toISOString()
        };
        
        const filename = `request_${item.request.method}_${new Date(item.timestamp).getTime()}.json`;
        Core.downloadFile(exportData, filename);
        Core.showNotification('History Item Exported', 'Request exported successfully');
    }

    importHistory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => this.handleHistoryImport(event);
        input.click();
    }

    async handleHistoryImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await Core.readFile(file);
            const importData = JSON.parse(text);
            
            let imported = 0;
            
            if (importData.postwoman_history && importData.history) {
                // Full history export
                importData.history.forEach(item => {
                    if (this.isValidHistoryItem(item)) {
                        this.history.unshift(item);
                        imported++;
                    }
                });
            } else if (importData.postwoman_history_item && importData.item) {
                // Single history item
                if (this.isValidHistoryItem(importData.item)) {
                    this.history.unshift(importData.item);
                    imported = 1;
                }
            }
            
            if (imported > 0) {
                // Trim history if it's too long
                if (this.history.length > this.maxHistorySize) {
                    this.history = this.history.slice(0, this.maxHistorySize);
                }
                
                this.saveHistory();
                this.updateDisplay();
                Core.showNotification('History Imported', `${imported} history items imported successfully`);
            } else {
                alert('No valid history items found in the file');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing history: ' + error.message);
        }
    }

    isValidHistoryItem(item) {
        return item && 
               item.timestamp && 
               item.request && 
               item.request.method && 
               item.request.url &&
               item.response;
    }

    searchHistory(query) {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.history-item');
        
        items.forEach(item => {
            const url = item.querySelector('.history-url').textContent.toLowerCase();
            const method = item.querySelector('.history-method').textContent.toLowerCase();
            const matches = url.includes(query.toLowerCase()) || method.includes(query.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    filterByMethod(method) {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.history-item');
        
        items.forEach(item => {
            const itemMethod = item.querySelector('.history-method').textContent.trim();
            const matches = method === 'all' || itemMethod === method;
            item.style.display = matches ? 'block' : 'none';
        });
    }

    filterByStatus(statusRange) {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.history-item');
        
        items.forEach(item => {
            const statusElement = item.querySelector('[class*="status-"]');
            if (!statusElement) return;
            
            const statusClass = Array.from(statusElement.classList).find(cls => cls.startsWith('status-'));
            const matches = statusRange === 'all' || statusElement.classList.contains(`status-${statusRange}`);
            item.style.display = matches ? 'block' : 'none';
        });
    }

    getHistoryStats() {
        const stats = {
            total: this.history.length,
            methods: {},
            statuses: {},
            avgDuration: 0,
            totalSize: 0
        };
        
        let totalDuration = 0;
        
        this.history.forEach(item => {
            // Count methods
            const method = item.request.method;
            stats.methods[method] = (stats.methods[method] || 0) + 1;
            
            // Count status codes
            const status = Math.floor(item.response.status / 100) * 100;
            stats.statuses[status] = (stats.statuses[status] || 0) + 1;
            
            // Sum duration and size
            totalDuration += item.response.duration || 0;
            stats.totalSize += item.response.size || 0;
        });
        
        stats.avgDuration = this.history.length > 0 ? Math.round(totalDuration / this.history.length) : 0;
        
        return stats;
    }
}

// Global instance
window.HistoryManager = new HistoryManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}