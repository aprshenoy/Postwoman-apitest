// Collection Manager - Handles collection management and request organization (Fixed Version)

class CollectionManager {
    constructor() {
        this.collections = this.loadCollections();
        this.currentCollection = null;
        this.initialized = false;
        
        console.log('📁 CollectionManager initializing...');
        
        // Wait for Core and DOM before initializing
        this.waitForDOMAndInitialize();
    }

    async waitForDOMAndInitialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Wait for Core to be available
            let attempts = 0;
            while (attempts < 50 && (!window.Core || typeof window.Core.generateId !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (window.Core && typeof window.Core.generateId === 'function') {
                console.log('✅ CollectionManager: Core is ready, initializing...');
                this.initialize();
            } else {
                console.warn('⚠️ CollectionManager: Core not available, using fallback');
                this.initializeWithFallback();
            }
        } catch (error) {
            console.error('CollectionManager initialization error:', error);
            this.initializeWithFallback();
        }
    }

    initialize() {
        try {
            // Create default collection if none exist
            if (this.collections.length === 0) {
                const defaultCollection = {
                    id: this.generateId('col'), // Use our safe generateId method
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
            this.initialized = true;
            
            console.log('✅ CollectionManager initialized successfully');
            
            // Emit initialization event
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('collection-manager-initialized');
            }
        } catch (error) {
            console.error('❌ CollectionManager initialization failed:', error);
            this.initializeWithFallback();
        }
    }

    initializeWithFallback() {
        try {
            // Initialize without Core dependencies
            if (this.collections.length === 0) {
                const defaultCollection = {
                    id: this.generateFallbackId('col'),
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
            this.initialized = true;
            
            console.log('⚠️ CollectionManager initialized in fallback mode');
        } catch (error) {
            console.error('❌ CollectionManager fallback initialization failed:', error);
        }
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

    generateId(prefix = 'id') {
        try {
            if (window.Core && typeof window.Core.generateId === 'function') {
                return window.Core.generateId(prefix);
            } else {
                return this.generateFallbackId(prefix);
            }
        } catch (error) {
            console.warn('Error generating ID, using fallback:', error);
            return this.generateFallbackId(prefix);
        }
    }

    // Fallback ID generation method
    generateFallbackId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}_${timestamp}_${random}`;
    }

    // Safe Core event emission
    emitCoreEvent(eventName, data) {
        try {
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit(eventName, data);
            }
        } catch (error) {
            console.warn('Could not emit Core event:', eventName, error);
        }
    }

    saveCollections() {
        try {
            localStorage.setItem('postwoman_collections', JSON.stringify(this.collections));
            this.emitCoreEvent('collectionsUpdated', this.collections);
        } catch (error) {
            console.error('Error saving collections:', error);
        }
    }

    createCollection() {
    // Create modal for collection creation
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📁 Create New Collection</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleCreateCollection(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="collectionName">Collection Name *</label>
                        <input type="text" id="collectionName" required placeholder="Enter collection name" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="collectionDescription">Description</label>
                        <textarea id="collectionDescription" rows="3" placeholder="Optional description for your collection" maxlength="500"></textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Create Collection</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the name input
    const nameInput = modal.querySelector('#collectionName');
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Add this new method to handle the form submission
handleCreateCollection(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('collectionName');
    const descriptionInput = document.getElementById('collectionDescription');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
    if (!name) {
        alert('Please enter a collection name');
        return;
    }
    
    const newCollection = {
        id: this.generateId('col'),
        name: name,
        description: description,
        requests: [],
        variables: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    this.collections.push(newCollection);
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    // Close modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Collection Created', `"${name}" collection created successfully!`);
    
    // Track activity
    this.emitCoreEvent('collection-created');
    
    return newCollection;
}

// Also replace the renameCollection method to avoid prompt()
renameCollection(collectionId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    // Create modal for renaming
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>✏️ Rename Collection</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleRenameCollection(event, '${collectionId}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="newCollectionName">Collection Name *</label>
                        <input type="text" id="newCollectionName" required value="${this.escapeHtml(collection.name)}" maxlength="100">
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Rename Collection</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus and select the name input
    const nameInput = modal.querySelector('#newCollectionName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Add this new method to handle the rename form submission
handleRenameCollection(event, collectionId) {
    event.preventDefault();
    
    const nameInput = document.getElementById('newCollectionName');
    const newName = nameInput ? nameInput.value.trim() : '';
    
    if (!newName) {
        alert('Please enter a collection name');
        return;
    }
    
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    if (newName === collection.name) {
        // No change, just close modal
        document.querySelector('.modal').remove();
        return;
    }
    
    collection.name = newName;
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    // Close modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Collection Renamed', `Collection renamed to "${newName}"`);
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
        
        this.showNotification('Collection Deleted', 'Collection deleted successfully');
    }

    duplicateCollection(collectionId) {
        const originalCollection = this.getCollection(collectionId);
        if (!originalCollection) return;
        
        const duplicatedCollection = {
            ...this.deepClone(originalCollection),
            id: this.generateId('col'),
            name: `${originalCollection.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.collections.push(duplicatedCollection);
        this.saveCollections();
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        this.showNotification('Collection Duplicated', `"${duplicatedCollection.name}" created successfully!`);
    }


    getCollection(collectionId) {
        return this.collections.find(col => col.id === collectionId);
    }

// Fix for CollectionManager updateDisplay method
// Replace the updateDisplay method in your collection-manager.js file

updateDisplay() {
    const container = document.getElementById('collectionsContainer');
    if (!container) return;
    
    if (this.collections.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #64748b;">
                <h3>No Collections Yet</h3>
                <p>Create your first collection to organize your API requests</p>
                <button class="action-btn" onclick="createCollection()" style="margin-top: 1rem;">
                    ➕ Create Collection
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = this.collections.map(collection => `
        <div class="collection-card" onclick="openCollection('${collection.id}')">
            <div class="collection-header">
                <h3 class="collection-title">${this.escapeHtml(collection.name)}</h3>
                <div class="collection-menu">
                    <button class="collection-menu-btn" onclick="event.stopPropagation(); showCollectionMenu('${collection.id}', event)">
                        ⋮
                    </button>
                </div>
            </div>
            <div class="collection-info">
                ${collection.description ? this.escapeHtml(collection.description) : 'No description'}
            </div>
            <div class="collection-stats">
                <span>📄 ${collection.requests.length} requests</span>
                <span>📅 ${this.formatDate(collection.updatedAt)}</span>
            </div>
            <div class="collection-methods">
                ${this.getMethodCounts(collection.requests)}
            </div>
        </div>
    `).join('');
}

// Also fix the showCollectionMenu method to use global functions
showCollectionMenu(collectionId, event) {
    event.stopPropagation();
    
    const collection = this.getCollection(collectionId);
    if (!collection) return;

    const menuItems = [
        {
            icon: '👁️',
            label: 'View Collection',
            action: `openCollection('${collectionId}')`
        },
        {
            icon: '✏️',
            label: 'Rename',
            action: `renameCollection('${collectionId}')`
        },
        {
            icon: '📄',
            label: 'Duplicate',
            action: `duplicateCollection('${collectionId}')`
        },
        { separator: true },
        {
            icon: '📤',
            label: 'Export',
            action: `exportCollection('${collectionId}')`
        },
        {
            icon: '📥',
            label: 'Import Requests',
            action: `importToCollection('${collectionId}')`
        },
        { separator: true },
        {
            icon: '🗑️',
            label: 'Delete',
            action: `deleteCollection('${collectionId}')`,
            danger: true
        }
    ];

    if (window.UI && window.UI.showContextMenu) {
        window.UI.showContextMenu(event, menuItems);
    }
}

// Fix renderRequestsList method
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
                        <strong>${this.escapeHtml(request.name || 'Untitled Request')}</strong>
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem; word-break: break-all;">
                        ${this.escapeHtml(request.url)}
                    </div>
                    ${request.description ? `<div style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">${this.escapeHtml(request.description)}</div>` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-sm btn-edit" onclick="loadRequestFromCollection('${collectionId}', ${index})">
                        Load
                    </button>
                    <button class="btn-sm btn-edit" onclick="editRequest('${collectionId}', ${index})">
                        Edit
                    </button>
                    <button class="btn-sm btn-delete" onclick="removeRequestFromCollection('${collectionId}', ${index})">
                        ×
                    </button>
                </div>
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
// Additional methods that need prompt() fixes for CollectionManager

// Replace editRequest method in CollectionManager
editRequest(collectionId, requestIndex) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.requests[requestIndex]) return;
    
    const request = collection.requests[requestIndex];
    
    // Create modal for editing request
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>✏️ Edit Request</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleEditRequest(event, '${collectionId}', ${requestIndex})">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editRequestName">Request Name *</label>
                        <input type="text" id="editRequestName" required value="${this.escapeHtml(request.name)}" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="editRequestDescription">Description</label>
                        <textarea id="editRequestDescription" rows="3" maxlength="500">${this.escapeHtml(request.description || '')}</textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Update Request</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the name input
    const nameInput = modal.querySelector('#editRequestName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
}

// Add this method to CollectionManager
handleEditRequest(event, collectionId, requestIndex) {
    event.preventDefault();
    
    const nameInput = document.getElementById('editRequestName');
    const descriptionInput = document.getElementById('editRequestDescription');
    
    const newName = nameInput ? nameInput.value.trim() : '';
    const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
    
    if (!newName) {
        alert('Please enter a request name');
        return;
    }
    
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.requests[requestIndex]) return;
    
    const request = collection.requests[requestIndex];
    request.name = newName;
    request.description = newDescription;
    
    collection.updatedAt = new Date().toISOString();
    this.saveCollections();
    this.openCollection(collectionId); // Refresh the modal
    
    // Close edit modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Request Updated', 'Request details updated');
}

// Replace addCurrentRequestToCollection method in CollectionManager  
addCurrentRequestToCollection(collectionId) {
    if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
        this.showNotification('Error', 'Request Manager not available', { type: 'error' });
        return;
    }
    
    const requestData = window.RequestManager.getCurrentRequestData();
    if (!requestData.url) {
        alert('Please enter a URL for the request');
        return;
    }
    
    // Create modal for saving request
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const defaultName = `${requestData.method} ${this.getUrlPath(requestData.url)}`;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>💾 Save Request to Collection</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleAddCurrentRequestToCollection(event, '${collectionId}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="saveRequestName">Request Name *</label>
                        <input type="text" id="saveRequestName" required value="${this.escapeHtml(defaultName)}" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="saveRequestDescription">Description</label>
                        <textarea id="saveRequestDescription" rows="3" placeholder="Optional description" maxlength="500"></textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Save Request</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the name input
    const nameInput = modal.querySelector('#saveRequestName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
}

// Add this method to CollectionManager
handleAddCurrentRequestToCollection(event, collectionId) {
    event.preventDefault();
    
    const nameInput = document.getElementById('saveRequestName');
    const descriptionInput = document.getElementById('saveRequestDescription');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
    if (!name) {
        alert('Please enter a request name');
        return;
    }
    
    const requestData = window.RequestManager.getCurrentRequestData();
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    const request = {
        id: this.generateId('req'),
        name: name,
        description: description,
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
    
    // Close save modal
    document.querySelector('.modal').remove();
    
    this.showNotification('Request Saved', `Request "${name}" added to collection`);
}
   

    openCollection(collectionId) {
        const collection = this.getCollection(collectionId);
        if (!collection) return;
        
        this.currentCollection = collection;
        
        const modalBody = document.getElementById('collectionModalBody');
        const modalTitle = document.getElementById('collectionModalTitle');
        
        if (modalTitle) modalTitle.textContent = collection.name;
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="collection-details">
                    <div class="collection-meta">
                        <p><strong>Description:</strong> ${collection.description || 'No description'}</p>
                        <p><strong>Created:</strong> ${this.formatDate(collection.createdAt)}</p>
                        <p><strong>Last Updated:</strong> ${this.formatDate(collection.updatedAt)}</p>
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
        }
        
        this.showModal('collectionModal');
    }

    closeModal() {
        this.hideModal('collectionModal');
        this.currentCollection = null;
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
        
        this.showNotification('Request Removed', 'Request removed from collection');
    }

    loadRequestFromCollection(collectionId, requestIndex) {
        const collection = this.getCollection(collectionId);
        if (!collection || !collection.requests[requestIndex]) return;
        
        const request = collection.requests[requestIndex];
        
        if (window.RequestManager && window.RequestManager.loadRequest) {
            window.RequestManager.loadRequest(request);
        }
        
        // Switch to workspace and close modal
        if (window.UI && window.UI.showSection) {
            window.UI.showSection('workspace');
        }
        this.closeModal();
        
        this.showNotification('Request Loaded', `"${request.name}" loaded into workspace`);
    }



    saveCurrentRequest() {
        if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
            this.showNotification('Error', 'Request Manager not available', { type: 'error' });
            return;
        }
        
        const requestData = window.RequestManager.getCurrentRequestData();
        if (!requestData.url) {
            alert('Please enter a URL for the request');
            return;
        }
        
        // Pre-fill request name
        try {
            const urlObj = new URL(requestData.url);
            const nameInput = document.getElementById('requestName');
            if (nameInput) {
                nameInput.value = `${requestData.method} ${urlObj.pathname}`;
            }
        } catch (e) {
            const nameInput = document.getElementById('requestName');
            if (nameInput) {
                nameInput.value = `${requestData.method} Request`;
            }
        }
        
        this.updateTargetCollectionSelect();
        this.showModal('saveRequestModal');
    }

    closeSaveModal() {
        this.hideModal('saveRequestModal');
        const requestName = document.getElementById('requestName');
        const requestDescription = document.getElementById('requestDescription');
        const targetCollection = document.getElementById('targetCollection');
        
        if (requestName) requestName.value = '';
        if (requestDescription) requestDescription.value = '';
        if (targetCollection) targetCollection.value = '';
    }

    saveToCollection() {
        const nameInput = document.getElementById('requestName');
        const descriptionInput = document.getElementById('requestDescription');
        const collectionInput = document.getElementById('targetCollection');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const collectionId = collectionInput ? collectionInput.value : '';
        
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
                `<option value="${col.id}">${this.escapeHtml(col.name)}</option>`
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
        
        this.downloadFile(exportData, `${collection.name.replace(/[^a-z0-9]/gi, '_')}_collection.json`);
        this.showNotification('Collection Exported', `"${collection.name}" exported successfully`);
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
        
        this.downloadFile(exportData, `postwoman_collections_${new Date().toISOString().split('T')[0]}.json`);
        this.showNotification('Collections Exported', 'All collections exported successfully');
    }

    importPostmanCollection() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            if (window.ImportManager && window.ImportManager.handleCollectionImport) {
                window.ImportManager.handleCollectionImport(event);
            }
        };
        input.click();
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
        this.showNotification('Collection Runner', 'Collection runner feature coming soon!');
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Error cloning object:', error);
            return obj;
        }
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

    showModal(modalId) {
        if (window.UI && window.UI.showModal) {
            window.UI.showModal(modalId);
        } else if (window.Core && window.Core.showModal) {
            window.Core.showModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        if (window.UI && window.UI.hideModal) {
            window.UI.hideModal(modalId);
        } else if (window.Core && window.Core.hideModal) {
            window.Core.hideModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        }
    }

    // Health check
    healthCheck() {
        return {
            initialized: this.initialized,
            collectionCount: this.collections.length,
            totalRequests: this.collections.reduce((sum, col) => sum + col.requests.length, 0),
            currentCollection: this.currentCollection ? this.currentCollection.id : null
        };
    }
}

// Global instance
window.CollectionManager = new CollectionManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollectionManager;
}