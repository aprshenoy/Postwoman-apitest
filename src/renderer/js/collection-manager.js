// Collection Manager - Handles collection management and request organization

class CollectionManager {
    constructor() {
        this.collections = this.loadCollections();
        this.currentCollection = null;
        this.initialize();
    }

    initialize() {
        // Create default collection if none exist
        if (this.collections.length === 0) {
            const defaultCollection = {
                id: Core.generateId('col'),
                name: 'My First Collection',
                description: 'Default collection for your API requests',
                requests: [],
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.collections.push(defaultCollection);
            this.saveCollections();
        }
        
        this.updateDisplay();
        this.updateTargetCollectionSelect();
    }

    loadCollections() {
        try {
            const stored = localStorage.getItem('postwoman_collections');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading collections:', error);
            return [];
        }
    }

    saveCollections() {
        try {
            localStorage.setItem('postwoman_collections', JSON.stringify(this.collections));
            Core.emit('collectionsUpdated', this.collections);
        } catch (error) {
            console.error('Error saving collections:', error);
        }
    }

    createCollection() {
        const name = prompt('Enter collection name:');
        if (!name || name.trim() === '') return;
        
        const description = prompt('Enter collection description (optional):') || '';
        
        const newCollection = {
            id: Core.generateId('col'),
            name: name.trim(),
            description: description.trim(),
            requests: [],
            variables: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.collections.push(newCollection);
        this.saveCollections();
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        Core.showNotification('Collection Created', `"${name}" collection created successfully!`);
        return newCollection;
    }

    deleteCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        if (!confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
            return;
        }
        
        this.collections = this.collections.filter(col => col.id !== collectionId);
        this.saveCollections();
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        Core.showNotification('Collection Deleted', 'Collection deleted successfully');
    }

    duplicateCollection(collectionId) {
        const originalCollection = this.getCollection(collectionId);
        if (!originalCollection) return;
        
        const duplicatedCollection = {
            ...Core.deepClone(originalCollection),
            id: Core.generateId('col'),
            name: `${originalCollection.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.collections.push(duplicatedCollection);
        this.saveCollections();
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        Core.showNotification('Collection Duplicated', `"${duplicatedCollection.name}" created successfully!`);
    }

    renameCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        const newName = prompt('Enter new collection name:', collection.name);
        if (!newName || newName.trim() === '' || newName === collection.name) return;
        
        collection.name = newName.trim();
        collection.updatedAt = new Date().toISOString();
        
        this.saveCollections();
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        Core.showNotification('Collection Renamed', `Collection renamed to "${newName}"`);
    }

    getCollection(collectionId) {
        return this.collections.find(col => col.id === collectionId);
    }

    updateDisplay() {
        const container = document.getElementById('collectionsContainer');
        if (!container) return;
        
        if (this.collections.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <h3>No Collections Yet</h3>
                    <p>Create your first collection to organize your API requests</p>
                    <button class="action-btn" onclick="CollectionManager.createCollection()" style="margin-top: 1rem;">
                        ➕ Create Collection
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.collections.map(collection => `
            <div class="collection-card" onclick="CollectionManager.openCollection('${collection.id}')">
                <div class="collection-header">
                    <h3 class="collection-title">${Core.escapeHtml(collection.name)}</h3>
                    <div class="collection-menu">
                        <button class="collection-menu-btn" onclick="event.stopPropagation(); CollectionManager.showCollectionMenu('${collection.id}', event)">
                            ⋮
                        </button>
                    </div>
                </div>
                <div class="collection-info">
                    ${collection.description ? Core.escapeHtml(collection.description) : 'No description'}
                </div>
                <div class="collection-stats">
                    <span>📄 ${collection.requests.length} requests</span>
                    <span>📅 ${Core.formatDate(collection.updatedAt)}</span>
                </div>
                <div class="collection-methods">
                    ${this.getMethodCounts(collection.requests)}
                </div>
            </div>
        `).join('');
    }

    getMethodCounts(requests) {
        const methods = requests.reduce((acc, req) => {
            acc[req.method] = (acc[req.method] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(methods).map(([method, count]) => 
            `<span class="method-count method-${method.toLowerCase()}">${method} (${count})</span>`
        ).join('');
    }

    showCollectionMenu(collectionId, event) {
        event.stopPropagation();
        
        const collection = this.getCollection(collectionId);
        if (!collection) return;

        const menuItems = [
            {
                icon: '👁️',
                label: 'View Collection',
                action: `CollectionManager.openCollection('${collectionId}')`
            },
            {
                icon: '✏️',
                label: 'Rename',
                action: `CollectionManager.renameCollection('${collectionId}')`
            },
            {
                icon: '📄',
                label: 'Duplicate',
                action: `CollectionManager.duplicateCollection('${collectionId}')`
            },
            { separator: true },
            {
                icon: '📤',
                label: 'Export',
                action: `CollectionManager.exportCollection('${collectionId}')`
            },
            {
                icon: '📥',
                label: 'Import Requests',
                action: `CollectionManager.importToCollection('${collectionId}')`
            },
            { separator: true },
            {
                icon: '🗑️',
                label: 'Delete',
                action: `CollectionManager.deleteCollection('${collectionId}')`,
                danger: true
            }
        ];

        UI.showContextMenu(event, menuItems);
    }

    openCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        this.currentCollection = collection;
        
        const modalBody = document.getElementById('collectionModalBody');
        const modalTitle = document.getElementById('collectionModalTitle');
        
        modalTitle.textContent = collection.name;
        
        modalBody.innerHTML = `
            <div class="collection-details">
                <div class="collection-meta">
                    <p><strong>Description:</strong> ${collection.description || 'No description'}</p>
                    <p><strong>Created:</strong> ${Core.formatDate(collection.createdAt)}</p>
                    <p><strong>Last Updated:</strong> ${Core.formatDate(collection.updatedAt)}</p>
                    <p><strong>Requests:</strong> ${collection.requests.length}</p>
                </div>
                
                <div class="collection-actions" style="margin: 1rem 0; padding: 1rem 0; border-top: 1px solid #e2e8f0;">
                    <button class="action-btn" onclick="CollectionManager.addCurrentRequestToCollection('${collection.id}')">
                        ➕ Add Current Request
                    </button>
                    <button class="action-btn" onclick="CollectionManager.exportCollection('${collection.id}')">
                        📤 Export Collection
                    </button>
                    <button class="action-btn" onclick="CollectionManager.runCollection('${collection.id}')">
                        ▶️ Run Collection
                    </button>
                </div>
                
                <div class="requests-list">
                    <h4 style="margin-bottom: 1rem; color: #0ea5e9;">Requests in Collection</h4>
                    ${this.renderRequestsList(collection.requests, collection.id)}
                </div>
            </div>
        `;
        
        Core.showModal('collectionModal');
    }

    renderRequestsList(requests, collectionId) {
        if (requests.length === 0) {
            return '<p style="color: #64748b; text-align: center; padding: 2rem;">No requests in this collection yet</p>';
        }

        return requests.map((request, index) => `
            <div class="request-item" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <span class="method-badge method-${request.method.toLowerCase()}" style="margin-right: 0.75rem;">
                                ${request.method}
                            </span>
                            <strong>${Core.escapeHtml(request.name || 'Untitled Request')}</strong>
                        </div>
                        <div style="color: #64748b; font-size: 0.9rem; word-break: break-all;">
                            ${Core.escapeHtml(request.url)}
                        </div>
                        ${request.description ? `<div style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">${Core.escapeHtml(request.description)}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-sm btn-edit" onclick="CollectionManager.loadRequestFromCollection('${collectionId}', ${index})">
                            Load
                        </button>
                        <button class="btn-sm btn-edit" onclick="CollectionManager.editRequest('${collectionId}', ${index})">
                            Edit
                        </button>
                        <button class="btn-sm btn-delete" onclick="CollectionManager.removeRequestFromCollection('${collectionId}', ${index})">
                            ×
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    closeModal() {
        Core.hideModal('collectionModal');
        this.currentCollection = null;
    }

    addCurrentRequestToCollection(collectionId) {
        const requestData = RequestManager.getCurrentRequestData();
        if (!requestData.url) {
            alert('Please enter a URL for the request');
            return;
        }
        
        const name = prompt('Enter request name:', `${requestData.method} ${this.getUrlPath(requestData.url)}`);
        if (!name) return;
        
        const description = prompt('Enter request description (optional):') || '';
        
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        const request = {
            id: Core.generateId('req'),
            name: name.trim(),
            description: description.trim(),
            method: requestData.method,
            url: requestData.url,
            headers: requestData.headers,
            params: requestData.params,
            cookies: requestData.cookies,
            auth: requestData.auth,
            body: requestData.body,
            createdAt: new Date().toISOString()
        };
        
        collection.requests.push(request);
        collection.updatedAt = new Date().toISOString();
        
        this.saveCollections();
        this.openCollection(collectionId); // Refresh the modal
        this.updateDisplay();
        
        Core.showNotification('Request Saved', `Request "${name}" added to collection`);
    }

    getUrlPath(url) {
        try {
            return new URL(url).pathname;
        } catch (e) {
            return url;
        }
    }

    removeRequestFromCollection(collectionId, requestIndex) {
        if (!confirm('Are you sure you want to remove this request from the collection?')) {
            return;
        }
        
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        collection.requests.splice(requestIndex, 1);
        collection.updatedAt = new Date().toISOString();
        
        this.saveCollections();
        this.openCollection(collectionId); // Refresh the modal
        this.updateDisplay();
        
        Core.showNotification('Request Removed', 'Request removed from collection');
    }

    loadRequestFromCollection(collectionId, requestIndex) {
        const collection = this.getCollection(collectionId);
        if (!collection || !collection.requests[requestIndex]) return;
        
        const request = collection.requests[requestIndex];
        RequestManager.loadRequest(request);
        
        // Switch to workspace and close modal
        UI.showSection('workspace');
        this.closeModal();
        
        Core.showNotification('Request Loaded', `"${request.name}" loaded into workspace`);
    }

    editRequest(collectionId, requestIndex) {
        const collection = this.getCollection(collectionId);
        if (!collection || !collection.requests[requestIndex]) return;
        
        const request = collection.requests[requestIndex];
        
        const newName = prompt('Request name:', request.name);
        if (newName === null) return; // User cancelled
        
        const newDescription = prompt('Request description:', request.description || '');
        if (newDescription === null) return; // User cancelled
        
        request.name = newName.trim() || request.name;
        request.description = newDescription.trim();
        
        collection.updatedAt = new Date().toISOString();
        this.saveCollections();
        this.openCollection(collectionId); // Refresh the modal
        
        Core.showNotification('Request Updated', 'Request details updated');
    }

    saveCurrentRequest() {
        const requestData = RequestManager.getCurrentRequestData();
        if (!requestData.url) {
            alert('Please enter a URL for the request');
            return;
        }
        
        // Pre-fill request name
        try {
            const urlObj = new URL(requestData.url);
            document.getElementById('requestName').value = `${requestData.method} ${urlObj.pathname}`;
        } catch (e) {
            document.getElementById('requestName').value = `${requestData.method} Request`;
        }
        
        this.updateTargetCollectionSelect();
        Core.showModal('saveRequestModal');
    }

    closeSaveModal() {
        Core.hideModal('saveRequestModal');
        document.getElementById('requestName').value = '';
        document.getElementById('requestDescription').value = '';
        document.getElementById('targetCollection').value = '';
    }

    saveToCollection() {
        const name = document.getElementById('requestName').value.trim();
        const description = document.getElementById('requestDescription').value.trim();
        const collectionId = document.getElementById('targetCollection').value;
        
        if (!name) {
            alert('Please enter a request name');
            return;
        }
        
        if (!collectionId) {
            alert('Please select a collection');
            return;
        }
        
        this.addCurrentRequestToCollection(collectionId);
        this.closeSaveModal();
    }

    updateTargetCollectionSelect() {
        const select = document.getElementById('targetCollection');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Collection</option>' +
            this.collections.map(col => 
                `<option value="${col.id}">${Core.escapeHtml(col.name)}</option>`
            ).join('');
    }

    exportCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        const exportData = {
            info: {
                name: collection.name,
                description: collection.description,
                version: '1.0.0',
                schema: 'postwoman-collection-v1.0.0'
            },
            item: collection.requests.map(request => ({
                name: request.name,
                request: {
                    method: request.method,
                    header: request.headers,
                    url: {
                        raw: request.url,
                        query: request.params
                    },
                    body: request.body.type !== 'none' ? {
                        mode: request.body.type,
                        [request.body.type]: request.body.data
                    } : undefined,
                    auth: request.auth
                },
                response: []
            })),
            variable: Object.entries(collection.variables).map(([key, value]) => ({
                key: key,
                value: value,
                type: 'string'
            }))
        };
        
        Core.downloadFile(exportData, `${collection.name.replace(/[^a-z0-9]/gi, '_')}_collection.json`);
        Core.showNotification('Collection Exported', `"${collection.name}" exported successfully`);
    }

    exportAllCollections() {
        if (this.collections.length === 0) {
            alert('No collections to export');
            return;
        }
        
        const exportData = {
            postwoman_export: true,
            version: '1.0.0',
            collections: this.collections,
            exported_at: new Date().toISOString()
        };
        
        Core.downloadFile(exportData, `postwoman_collections_${new Date().toISOString().split('T')[0]}.json`);
        Core.showNotification('Collections Exported', 'All collections exported successfully');
    }

    importPostmanCollection() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => ImportManager.handleCollectionImport(event);
        input.click();
    }

    importToCollection(collectionId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => this.handleRequestImport(event, collectionId);
        input.click();
    }

    async handleRequestImport(event, collectionId) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await Core.readFile(file);
            const importData = JSON.parse(text);
            
            const collection = this.getCollection(collectionId);
            if (!collection) return;
            
            let imported = 0;
            
            // Handle different formats
            if (importData.item && Array.isArray(importData.item)) {
                // Postman collection format
                importData.item.forEach(item => {
                    if (item.request) {
                        const request = this.convertPostmanRequest(item);
                        if (request) {
                            collection.requests.push(request);
                            imported++;
                        }
                    }
                });
            } else if (Array.isArray(importData)) {
                // Array of requests
                importData.forEach(req => {
                    if (req.url && req.method) {
                        collection.requests.push({
                            id: Core.generateId('req'),
                            ...req,
                            createdAt: new Date().toISOString()
                        });
                        imported++;
                    }
                });
            }
            
            if (imported > 0) {
                collection.updatedAt = new Date().toISOString();
                this.saveCollections();
                this.openCollection(collectionId);
                Core.showNotification('Requests Imported', `${imported} requests imported successfully`);
            } else {
                alert('No valid requests found in the file');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing requests: ' + error.message);
        }
    }

    convertPostmanRequest(postmanItem) {
        try {
            const postmanRequest = postmanItem.request;
            
            // Convert URL
            let url = '';
            if (typeof postmanRequest.url === 'string') {
                url = postmanRequest.url;
            } else if (postmanRequest.url && postmanRequest.url.raw) {
                url = postmanRequest.url.raw;
            }
            
            // Convert headers
            const headers = [];
            if (postmanRequest.header && Array.isArray(postmanRequest.header)) {
                postmanRequest.header.forEach(header => {
                    if (header.key && !header.disabled) {
                        headers.push({
                            key: header.key,
                            value: header.value || ''
                        });
                    }
                });
            }
            
            return {
                id: Core.generateId('req'),
                name: postmanItem.name || 'Imported Request',
                description: postmanItem.description || '',
                method: (postmanRequest.method || 'GET').toUpperCase(),
                url: url,
                headers: headers,
                params: [],
                cookies: [],
                auth: { type: 'none' },
                body: { type: 'none' },
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error converting Postman request:', error);
            return null;
        }
    }

    runCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        if (collection.requests.length === 0) {
            alert('No requests in this collection to run');
            return;
        }
        
        // For now, just load the first request
        // In a full implementation, this would run all requests sequentially
        this.loadRequestFromCollection(collectionId, 0);
        Core.showNotification('Collection Runner', 'Collection runner feature coming soon!');
    }

    searchCollections(query) {
        const container = document.getElementById('collectionsContainer');
        if (!container) return;
        
        const cards = container.querySelectorAll('.collection-card');
        
        cards.forEach(card => {
            const name = card.querySelector('.collection-title').textContent.toLowerCase();
            const description = card.querySelector('.collection-info').textContent.toLowerCase();
            const matches = name.includes(query.toLowerCase()) || description.includes(query.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
        });
    }

    getCollectionStats() {
        return {
            totalCollections: this.collections.length,
            totalRequests: this.collections.reduce((sum, col) => sum + col.requests.length, 0),
            methodCounts: this.collections.reduce((acc, col) => {
                col.requests.forEach(req => {
                    acc[req.method] = (acc[req.method] || 0) + 1;
                });
                return acc;
            }, {})
        };
    }
}

// Global instance
window.CollectionManager = new CollectionManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollectionManager;
}