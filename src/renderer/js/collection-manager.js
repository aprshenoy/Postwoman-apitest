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
        // Don't let this break the main functionality
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
        window.UI.showContextMenu(event, menuItems)
        ;
    }
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
    
    // Check if a collection is selected in the sidebar
    const selectedCollectionId = this.getSelectedCollectionId();
    
    if (selectedCollectionId) {
        // Save directly to selected collection
        this.saveToSelectedCollection(selectedCollectionId, requestData);
    } else {
        // Show modal to select collection
        this.showSaveRequestModal(requestData);
    }
}

saveToSelectedCollection(collectionId, requestData) {
    const collection = this.getCollection(collectionId);
    if (!collection) {
        this.showSaveRequestModal(requestData);
        return;
    }
    
    // Generate request name if not provided
    let requestName = requestData.name || '';
    if (!requestName.trim()) {
        try {
            const urlPath = new URL(requestData.url).pathname;
            requestName = `${requestData.method} ${urlPath}`;
        } catch (e) {
            requestName = `${requestData.method} Request`;
        }
    }
    
    // Check for selected folder
    const selectedFolder = this.getSelectedFolder(collectionId);
    
    const newRequest = {
        id: this.generateId('req'),
        name: requestName,
        description: '',
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers || [],
        params: requestData.params || [],
        cookies: requestData.cookies || [],
        auth: requestData.auth || { type: 'none' },
        body: requestData.body || { type: 'none' },
        folderId: selectedFolder, // Add folder support
        createdAt: new Date().toISOString()
    };
    
    // Add to collection
    if (selectedFolder) {
        // Add to folder
        const folder = this.getFolder(collectionId, selectedFolder);
        if (folder) {
            folder.requests.push(newRequest);
        } else {
            collection.requests.push(newRequest); // Fallback to collection root
        }
    } else {
        collection.requests.push(newRequest);
    }
    
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    this.updateDisplay();
    
    // Update sidebar
    const requestsList = document.getElementById('requestsList');
    if (requestsList) {
        this.updateRequestsList(collectionId);
    }
    
    // Update request name in workspace if it was auto-generated
    const nameInput = document.getElementById('requestName');
    if (nameInput && !nameInput.value.trim()) {
        nameInput.value = requestName;
    }
    
    this.showNotification('Request Saved', `"${requestName}" saved to ${collection.name}`);
}

getSelectedCollectionId() {
    const collectionSelect = document.getElementById('requestsCollectionSelect');
    return collectionSelect ? collectionSelect.value : null;
}

getSelectedFolder(collectionId) {
    // For now, return null (no folder selected)
    // This will be enhanced when we add folder UI
    return null;
}

getFolder(collectionId, folderId) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.folders) return null;
    
    return collection.folders.find(folder => folder.id === folderId);
}

// Enhanced loadRequestFromCollection method
loadRequestFromCollection(collectionId, requestIndex) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.requests[requestIndex]) return;
    
    const request = collection.requests[requestIndex];
    
    if (window.RequestManager && window.RequestManager.loadRequest) {
        window.RequestManager.loadRequest(request);
    }
    
    // Switch to workspace
    if (window.UI && window.UI.showSection) {
        window.UI.showSection('workspace');
    }
    
    this.showNotification('Request Loaded', `"${request.name}" loaded into workspace`);
}

// Enhanced method to handle current request save with proper name handling
handleSaveCurrentRequest(collectionId, requestName, description) {
    if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
        this.showNotification('Error', 'Request Manager not available', { type: 'error' });
        return;
    }
    
    const requestData = window.RequestManager.getCurrentRequestData();
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    // Use provided name or current name from workspace
    const finalName = requestName || requestData.name || `${requestData.method} Request`;
    
    const request = {
        id: this.generateId('req'),
        name: finalName,
        description: description || '',
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
    this.updateDisplay();
    
    // Update the workspace request name if it was auto-generated
    const nameInput = document.getElementById('requestName');
    if (nameInput && !nameInput.value.trim()) {
        nameInput.value = finalName;
    }
    
    this.showNotification('Request Saved', `Request "${finalName}" added to collection`);
    
    return request;
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
    
    if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
        this.showNotification('Error', 'Request Manager not available', { type: 'error' });
        return;
    }
    
    const requestData = window.RequestManager.getCurrentRequestData();
    const collection = this.getCollection(collectionId);
    if (!collection) {
        alert('Selected collection not found');
        return;
    }
    
    const request = {
        id: this.generateId('req'),
        name: name,
        description: description,
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers || [],
        params: requestData.params || [],
        cookies: requestData.cookies || [],
        auth: requestData.auth || { type: 'none' },
        body: requestData.body || { type: 'none' },
        folderId: null, // Can be enhanced later for folder selection
        createdAt: new Date().toISOString()
    };
    
    collection.requests.push(request);
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    this.updateDisplay();
    
    // Close modal
    this.closeSaveModal();
    
    // Update request name in workspace
    if (nameInput) {
        const workspaceNameInput = document.getElementById('requestName');
        if (workspaceNameInput) {
            workspaceNameInput.value = name;
        }
    }
    
    // Refresh requests sidebar if showing this collection
    const requestsSelect = document.getElementById('requestsCollectionSelect');
    if (requestsSelect && requestsSelect.value === collectionId) {
        this.updateRequestsList(collectionId);
    }
    
    this.showNotification('Request Saved', `"${name}" added to ${collection.name}`);
}


// Enhanced renderRequestsList method with better styling and actions
renderRequestsList(requests, collectionId) {
    if (requests.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 2rem;">No requests in this collection yet</p>';
    }

    return requests.map((request, index) => `
        <div class="request-item" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;" onclick="loadRequestFromCollection('${collectionId}', ${index})">
                    <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <span class="method-badge method-${request.method.toLowerCase()}" style="margin-right: 0.75rem;">
                            ${request.method}
                        </span>
                        <strong>${this.escapeHtml(request.name || 'Untitled Request')}</strong>
                    </div>
                    <div style="color: #64748b; font-size: 0.9rem; word-break: break-all;">
                        ${this.escapeHtml(this.truncateUrl(request.url))}
                    </div>
                    ${request.description ? `<div style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">${this.escapeHtml(request.description)}</div>` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-sm btn-edit" onclick="event.stopPropagation(); loadRequestFromCollection('${collectionId}', ${index})" title="Load to Workspace">
                        Load
                    </button>
                    <button class="btn-sm btn-edit" onclick="event.stopPropagation(); editRequest('${collectionId}', ${index})" title="Edit Request">
                        Edit
                    </button>
                    <button class="btn-sm btn-delete" onclick="event.stopPropagation(); removeRequestFromCollection('${collectionId}', ${index})" title="Remove Request">
                        ×
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper method to truncate URL for display
truncateUrl(url, maxLength = 40) {
    if (!url || url.length <= maxLength) return url;
    
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        
        if (path.length <= maxLength) {
            return path;
        }
        
        return path.substring(0, maxLength - 3) + '...';
    } catch (e) {
        return url.substring(0, maxLength - 3) + '...';
    }
}

// folder functionality

// Create a new folder
createFolder(collectionId, folderName, parentFolderId = null) {
    const collection = this.getCollection(collectionId);
    if (!collection) return null;
    
    if (!collection.folders) {
        collection.folders = [];
    }
    
    const newFolder = {
        id: this.generateId('folder'),
        name: folderName,
        description: '',
        parentId: parentFolderId,
        requests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    collection.folders.push(newFolder);
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    this.updateDisplay();
    
    return newFolder;
}



// ================== FOLDER FUNCTIONALITY ==================
// Add these enhanced sidebar methods to your collection-manager.js

// Create folder from sidebar
createFolderFromSidebar() {
    const selectedCollectionId = this.getSelectedCollectionId();
    
    if (!selectedCollectionId) {
        this.showSelectCollectionModal();
        return;
    }
    
    this.showCreateFolderModal(selectedCollectionId);
}

// Show modal to select or create collection
showSelectCollectionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'selectCollectionModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📁 Create Folder</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div class="modal-body">
                <p>To create a folder, you need to select a collection first.</p>
                
                <div class="form-group">
                    <label for="selectCollectionForFolder">Select Collection:</label>
                    <select id="selectCollectionForFolder" class="collection-dropdown">
                        <option value="">Choose a collection...</option>
                        ${this.collections.map(col => 
                            `<option value="${col.id}">${this.escapeHtml(col.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="action-group" style="margin-top: 1rem;">
                    <p><strong>Or create a new collection:</strong></p>
                    <button class="btn btn-secondary" onclick="window.CollectionManager.createCollectionThenFolder()">
                        📁 Create New Collection
                    </button>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="window.CollectionManager.proceedWithSelectedCollection()">
                    Continue to Create Folder
                </button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Proceed with selected collection
proceedWithSelectedCollection() {
    const select = document.getElementById('selectCollectionForFolder');
    const collectionId = select ? select.value : '';
    
    if (!collectionId) {
        alert('Please select a collection');
        return;
    }
    
    // Close selection modal
    const modal = document.getElementById('selectCollectionModal');
    if (modal) {
        modal.remove();
    }
    
    // Update sidebar to show selected collection
    const sidebarSelect = document.getElementById('requestsCollectionSelect');
    if (sidebarSelect) {
        sidebarSelect.value = collectionId;
        this.updateRequestsList(collectionId);
    }
    
    // Show create folder modal
    this.showCreateFolderModal(collectionId);
}

// Create collection then folder
createCollectionThenFolder() {
    // Close selection modal
    const modal = document.getElementById('selectCollectionModal');
    if (modal) {
        modal.remove();
    }
    
    // Store that we want to create a folder after collection creation
    this._createFolderAfterCollection = true;
    
    // Show create collection modal
    this.createCollection();
}

// Enhanced handleCreateCollection to support folder creation afterward
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
        folders: [], // Initialize with empty folders array
        variables: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    this.collections.push(newCollection);
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    // Close modal
    const modal = document.querySelector('.modal[style*="block"]') || 
                 document.querySelector('#createCollectionModal') ||
                 event.target.closest('.modal');
    
    if (modal) {
        modal.remove();
    }
    
    this.showNotification('Collection Created', `"${name}" collection created successfully!`);
    
    // Track activity safely
    try {
        this.emitCoreEvent('collection-created', { collectionId: newCollection.id });
    } catch (error) {
        console.warn('Could not track collection creation activity:', error);
    }
    
    // If we were supposed to create a folder after collection creation
    if (this._createFolderAfterCollection) {
        this._createFolderAfterCollection = false;
        
        // Update sidebar to show new collection
        const sidebarSelect = document.getElementById('requestsCollectionSelect');
        if (sidebarSelect) {
            sidebarSelect.value = newCollection.id;
            this.updateRequestsList(newCollection.id);
        }
        
        // Show create folder modal
        setTimeout(() => {
            this.showCreateFolderModal(newCollection.id);
        }, 500);
    }
    
    return newCollection;
}

// Enhanced updateSidebarForSection to include folder creation
updateSidebarForSection(sectionName) {
    const sidebar = document.getElementById('requestsSidebar');
    if (!sidebar) return;

    const requestsHeader = sidebar.querySelector('.requests-header');
    const requestsList = sidebar.querySelector('.requests-list');
    
    if (!requestsHeader || !requestsList) return;

    if (sectionName === 'history') {
        // Update sidebar for history
        requestsHeader.innerHTML = `
            <h3>History</h3>
            <div class="collection-actions">
                <button class="collection-action-btn" onclick="clearHistory()" title="Clear History">
                    🗑️ Clear All
                </button>
                <button class="collection-action-btn" onclick="exportHistory()" title="Export History">
                    📤 Export
                </button>
            </div>
        `;
        
        // Load history items
        this.loadHistoryToSidebar();
        
    } else {
        // Default to requests view with enhanced folder support
        requestsHeader.innerHTML = `
            <h3>Requests</h3>
            <div class="collection-selector">
                <select id="requestsCollectionSelect" class="collection-dropdown" onchange="loadCollectionRequests()">
                    <option value="">Select Collection</option>
                </select>
            </div>
            <div class="collection-actions">
                <button class="collection-action-btn" onclick="window.CollectionManager.createCollection()" title="New Collection">
                    📁 New Collection
                </button>
                <button class="collection-action-btn" onclick="window.CollectionManager.createFolderFromSidebar()" title="Create Folder">
                    📂 New Folder
                </button>
            </div>
        `;
        
        // Re-initialize collection dropdown
        this.updateCollectionDropdown();
        
        requestsList.innerHTML = `
            <div class="empty-requests">
                <h4>No Collection Selected</h4>
                <p>Choose a collection to view its requests and folders</p>
            </div>
        `;
    }
}

// Enhanced updateRequestsList to show folders
updateRequestsList(collectionId) {
    const container = document.getElementById('requestsList');
    if (!container || !collectionId) return;
    
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    // Initialize folders if they don't exist
    if (!collection.folders) {
        collection.folders = [];
    }
    
    const folders = collection.folders;
    const rootRequests = collection.requests.filter(req => !req.folderId);
    
    if (folders.length === 0 && rootRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-requests">
                <h4>Empty Collection</h4>
                <p>This collection has no requests or folders yet.</p>
                <button class="collection-action-btn" onclick="saveCurrentRequest()" style="margin-top: 8px; width: 100%;">
                    💾 Save Current Request
                </button>
                <button class="collection-action-btn" onclick="window.CollectionManager.showCreateFolderModal('${collectionId}')" style="margin-top: 4px; width: 100%;">
                    📂 Create Folder
                </button>
            </div>
        `;
        return;
    }
    
    let content = '';
    
    // Add collection actions
    content += `
        <div class="sidebar-collection-actions" style="margin-bottom: 1rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 6px;">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <button class="collection-action-btn" onclick="saveCurrentRequest()" style="flex: 1;">
                    💾 Save
                </button>
                <button class="collection-action-btn" onclick="window.CollectionManager.showCreateFolderModal('${collectionId}')" style="flex: 1;">
                    📂 Folder
                </button>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center;">
                ${folders.length} folders • ${this.getTotalRequestCount(collection)} requests
            </div>
        </div>
    `;
    
    // Add folders
    if (folders.length > 0) {
        content += `<div class="sidebar-folders">`;
        folders.forEach(folder => {
            const folderRequests = folder.requests || [];
            content += `
                <div class="sidebar-folder-item" style="margin-bottom: 0.5rem;">
                    <div class="sidebar-folder-header" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: var(--bg-secondary); border-radius: 4px; cursor: pointer;" onclick="toggleSidebarFolder('${folder.id}')">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="folder-toggle" id="toggle-${folder.id}">📁</span>
                            <span style="font-weight: 500; font-size: 0.875rem;">${this.escapeHtml(folder.name)}</span>
                            <span style="font-size: 0.75rem; color: var(--text-tertiary);">(${folderRequests.length})</span>
                        </div>
                        <div class="sidebar-folder-actions" onclick="event.stopPropagation();">
                            <button class="request-action-btn" onclick="window.CollectionManager.editFolder('${collectionId}', '${folder.id}')" title="Edit">
                                ✏️
                            </button>
                        </div>
                    </div>
                    <div class="sidebar-folder-requests" id="folder-${folder.id}" style="display: none; margin-left: 1rem; border-left: 2px solid var(--border-color); padding-left: 0.5rem;">
                        ${folderRequests.map((request, index) => `
                            <div class="request-item" onclick="loadFolderRequestToWorkspace('${collectionId}', '${folder.id}', ${index})" style="margin: 0.25rem 0;">
                                <div class="request-method method-${request.method.toLowerCase()}">${request.method}</div>
                                <div class="request-details">
                                    <div class="request-name">${this.escapeHtml(request.name || 'Untitled Request')}</div>
                                    <div class="request-url">${this.escapeHtml(this.getUrlPath(request.url))}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${folderRequests.length === 0 ? '<div style="padding: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem; font-style: italic;">Empty folder</div>' : ''}
                    </div>
                </div>
            `;
        });
        content += `</div>`;
    }
    
    // Add root requests
    if (rootRequests.length > 0) {
        content += `
            <div class="sidebar-root-requests">
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem; padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border-radius: 4px;">
                    📄 Collection Root (${rootRequests.length})
                </div>
                ${rootRequests.map((request, index) => `
                    <div class="request-item" onclick="loadRequestToWorkspace('${collectionId}', ${index})" style="margin: 0.25rem 0;">
                        <div class="request-method method-${request.method.toLowerCase()}">${request.method}</div>
                        <div class="request-details">
                            <div class="request-name">${this.escapeHtml(request.name || 'Untitled Request')}</div>
                            <div class="request-url">${this.escapeHtml(this.getUrlPath(request.url))}</div>
                        </div>
                        <div class="request-actions">
                            <button class="request-action-btn" onclick="event.stopPropagation(); editRequest('${collectionId}', ${index})" title="Edit">
                                ✏️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = content;
}

// Helper function to load folder request
loadFolderRequestToWorkspace(collectionId, folderId, requestIndex) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    const folder = this.getFolder(collectionId, folderId);
    if (!folder || !folder.requests[requestIndex]) return;
    
    const request = folder.requests[requestIndex];
    
    if (window.RequestManager && window.RequestManager.loadRequest) {
        window.RequestManager.loadRequest(request);
    }
    
    // Switch to workspace
    if (window.UI && window.UI.showSection) {
        window.UI.showSection('workspace');
    }
    
    // Update active state
    document.querySelectorAll('.request-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const clickedItem = event.target.closest('.request-item');
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    this.showNotification('Request Loaded', `"${request.name}" loaded from folder "${folder.name}"`);
}

// Toggle sidebar folder
toggleSidebarFolder(folderId) {
    const folderElement = document.getElementById(`folder-${folderId}`);
    const toggleElement = document.getElementById(`toggle-${folderId}`);
    
    if (folderElement && toggleElement) {
        if (folderElement.style.display === 'none') {
            folderElement.style.display = 'block';
            toggleElement.textContent = '📂';
        } else {
            folderElement.style.display = 'none';
            toggleElement.textContent = '📁';
        }
    }
}

// Show create folder modal
showCreateFolderModal(collectionId) {
    console.log('Creating folder modal for collection:', collectionId);
    
    const collection = this.getCollection(collectionId);
    if (!collection) {
        this.showNotification('Error', 'Collection not found', { type: 'error' });
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'createFolderModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📁 Create New Folder</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleCreateFolder(event, '${collectionId}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="folderName">Folder Name *</label>
                        <input type="text" id="folderName" required placeholder="Enter folder name" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="folderDescription">Description</label>
                        <textarea id="folderDescription" rows="3" placeholder="Optional folder description" maxlength="500"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="parentFolder">Parent Folder</label>
                        <select id="parentFolder">
                            <option value="">Root (No parent)</option>
                            ${this.getFolderOptions(collectionId)}
                        </select>
                    </div>
                    
                    <div class="collection-info">
                        <p><strong>Collection:</strong> ${this.escapeHtml(collection.name)}</p>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Create Folder</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the name input
    const nameInput = modal.querySelector('#folderName');
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

// Handle create folder form submission
handleCreateFolder(event, collectionId) {
    event.preventDefault();
    console.log('Handling create folder for collection:', collectionId);
    
    const nameInput = document.getElementById('folderName');
    const descriptionInput = document.getElementById('folderDescription');
    const parentSelect = document.getElementById('parentFolder');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const parentId = parentSelect ? parentSelect.value : '';
    
    if (!name) {
        alert('Please enter a folder name');
        return;
    }
    
    const collection = this.getCollection(collectionId);
    if (!collection) {
        alert('Collection not found');
        return;
    }
    
    // Initialize folders array if it doesn't exist
    if (!collection.folders) {
        collection.folders = [];
    }
    
    const newFolder = {
        id: this.generateId('folder'),
        name: name,
        description: description,
        parentId: parentId || null,
        requests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    collection.folders.push(newFolder);
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    this.updateDisplay();
    
    // Close modal
    const modal = document.getElementById('createFolderModal');
    if (modal) {
        modal.remove();
    }
    
    // Refresh the collection view if it's open
    if (this.currentCollection && this.currentCollection.id === collectionId) {
        this.openCollection(collectionId);
    }
    
    // Refresh sidebar if this collection is selected
    this.refreshSidebarIfNeeded(collectionId);
    
    this.showNotification('Folder Created', `"${name}" folder created successfully!`);
    
    return newFolder;
}

// Get folder options for dropdown
getFolderOptions(collectionId, excludeId = null) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.folders) return '';
    
    return collection.folders
        .filter(folder => folder.id !== excludeId && !folder.parentId) // Only show root folders as parents for now
        .map(folder => `<option value="${folder.id}">${this.escapeHtml(folder.name)}</option>`)
        .join('');
}

// Get folder by ID
getFolder(collectionId, folderId) {
    const collection = this.getCollection(collectionId);
    if (!collection || !collection.folders) return null;
    
    return collection.folders.find(folder => folder.id === folderId);
}

// Edit folder
editFolder(collectionId, folderId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    const folder = this.getFolder(collectionId, folderId);
    if (!folder) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'editFolderModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>✏️ Edit Folder</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="window.CollectionManager.handleEditFolder(event, '${collectionId}', '${folderId}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editFolderName">Folder Name *</label>
                        <input type="text" id="editFolderName" required value="${this.escapeHtml(folder.name)}" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="editFolderDescription">Description</label>
                        <textarea id="editFolderDescription" rows="3" maxlength="500">${this.escapeHtml(folder.description || '')}</textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Update Folder</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const nameInput = modal.querySelector('#editFolderName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
}

// Handle edit folder
handleEditFolder(event, collectionId, folderId) {
    event.preventDefault();
    
    const nameInput = document.getElementById('editFolderName');
    const descriptionInput = document.getElementById('editFolderDescription');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
    if (!name) {
        alert('Please enter a folder name');
        return;
    }
    
    const folder = this.getFolder(collectionId, folderId);
    if (!folder) return;
    
    folder.name = name;
    folder.description = description;
    folder.updatedAt = new Date().toISOString();
    
    const collection = this.getCollection(collectionId);
    if (collection) {
        collection.updatedAt = new Date().toISOString();
    }
    
    this.saveCollections();
    
    // Close modal
    const modal = document.getElementById('editFolderModal');
    if (modal) {
        modal.remove();
    }
    
    // Refresh collection view
    if (this.currentCollection && this.currentCollection.id === collectionId) {
        this.openCollection(collectionId);
    }
    
    this.refreshSidebarIfNeeded(collectionId);
    
    this.showNotification('Folder Updated', `"${name}" folder updated successfully!`);
}

// Delete folder
deleteFolder(collectionId, folderId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    const folder = this.getFolder(collectionId, folderId);
    if (!folder) return;
    
    const requestCount = (folder.requests || []).length;
    let confirmMessage = `Are you sure you want to delete the "${folder.name}" folder?`;
    
    if (requestCount > 0) {
        confirmMessage += `\n\nThis folder contains ${requestCount} request${requestCount > 1 ? 's' : ''}. They will be moved to the collection root.`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Move requests to collection root
    if (folder.requests && folder.requests.length > 0) {
        folder.requests.forEach(request => {
            request.folderId = null;
            collection.requests.push(request);
        });
    }
    
    // Remove folder
    collection.folders = collection.folders.filter(f => f.id !== folderId);
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    
    // Refresh collection view
    if (this.currentCollection && this.currentCollection.id === collectionId) {
        this.openCollection(collectionId);
    }
    
    this.refreshSidebarIfNeeded(collectionId);
    
    this.showNotification('Folder Deleted', `"${folder.name}" folder deleted. Requests moved to collection root.`);
}

// Refresh sidebar if needed
refreshSidebarIfNeeded(collectionId) {
    const requestsSelect = document.getElementById('requestsCollectionSelect');
    if (requestsSelect && requestsSelect.value === collectionId) {
        this.updateRequestsList(collectionId);
    }
}

// Get total request count including folders
getTotalRequestCount(collection) {
    let count = collection.requests.filter(req => !req.folderId).length;
    
    if (collection.folders) {
        collection.folders.forEach(folder => {
            count += (folder.requests || []).length;
        });
    }
    
    return count;
}

// Enhanced collection view with folders
renderCollectionDetails(collection) {
    const folders = collection.folders || [];
    const rootRequests = collection.requests.filter(req => !req.folderId);
    
    return `
        <div class="collection-details">
            <div class="collection-meta">
                <p><strong>Description:</strong> ${collection.description || 'No description'}</p>
                <p><strong>Created:</strong> ${this.formatDate(collection.createdAt)}</p>
                <p><strong>Last Updated:</strong> ${this.formatDate(collection.updatedAt)}</p>
                <p><strong>Total Requests:</strong> ${this.getTotalRequestCount(collection)}</p>
                <p><strong>Folders:</strong> ${folders.length}</p>
            </div>
            
            <div class="collection-actions" style="margin: 1rem 0; padding: 1rem 0; border-top: 1px solid #e2e8f0;">
                <button class="action-btn" onclick="window.CollectionManager.showAddRequestModal('${collection.id}')">
                    ➕ Add Current Request
                </button>
                <button class="action-btn" onclick="window.CollectionManager.showCreateFolderModal('${collection.id}')">
                    📁 Create Folder
                </button>
                <button class="action-btn" onclick="exportCollection('${collection.id}')">
                    📤 Export Collection
                </button>
                <button class="action-btn" onclick="runCollection('${collection.id}')">
                    ▶️ Run Collection
                </button>
            </div>
            
            <div class="collection-content">
                <h4 style="margin-bottom: 1rem; color: #0ea5e9;">Collection Contents</h4>
                
                ${folders.length > 0 ? `
                    <div class="folders-section">
                        <h5>📁 Folders</h5>
                        ${folders.map(folder => this.renderFolderItem(collection.id, folder)).join('')}
                    </div>
                ` : ''}
                
                ${rootRequests.length > 0 ? `
                    <div class="root-requests-section">
                        <h5>📄 Requests</h5>
                        ${this.renderRequestsList(rootRequests, collection.id)}
                    </div>
                ` : ''}
                
                ${folders.length === 0 && rootRequests.length === 0 ? `
                    <div class="empty-collection">
                        <p>This collection is empty. Add some requests or create folders to organize them.</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Render folder item
renderFolderItem(collectionId, folder) {
    const folderRequests = folder.requests || [];
    
    return `
        <div class="folder-item" style="margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
            <div class="folder-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div class="folder-info">
                    <h6 style="margin: 0; color: #0ea5e9;">📁 ${this.escapeHtml(folder.name)}</h6>
                    ${folder.description ? `<p style="margin: 0; color: #64748b; font-size: 0.875rem;">${this.escapeHtml(folder.description)}</p>` : ''}
                </div>
                <div class="folder-actions">
                    <button class="btn-sm btn-edit" onclick="window.CollectionManager.editFolder('${collectionId}', '${folder.id}')" title="Edit Folder">
                        ✏️
                    </button>
                    <button class="btn-sm btn-delete" onclick="window.CollectionManager.deleteFolder('${collectionId}', '${folder.id}')" title="Delete Folder">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="folder-stats" style="margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; color: #64748b;">${folderRequests.length} requests</span>
            </div>
            
            ${folderRequests.length > 0 ? `
                <div class="folder-requests">
                    ${this.renderRequestsList(folderRequests, collectionId, folder.id)}
                </div>
            ` : `
                <div class="empty-folder" style="padding: 1rem; text-align: center; color: #64748b; border: 2px dashed #e2e8f0; border-radius: 6px;">
                    <p style="margin: 0; font-size: 0.875rem;">Empty folder</p>
                </div>
            `}
        </div>
    `;
}

// Update the openCollection method to use the new folder-aware renderer
openCollection(collectionId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    this.currentCollection = collection;
    
    const modalBody = document.getElementById('collectionModalBody');
    const modalTitle = document.getElementById('collectionModalTitle');
    
    if (modalTitle) modalTitle.textContent = collection.name;
    
    if (modalBody) {
        modalBody.innerHTML = this.renderCollectionDetails(collection);
    }
    
    this.showModal('collectionModal');
}

// Move request to folder
moveRequestToFolder(collectionId, requestIndex, targetFolderId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    // Remove request from current location
    const request = collection.requests[requestIndex];
    if (!request) return;
    
    collection.requests.splice(requestIndex, 1);
    
    // Add to target folder or collection root
    if (targetFolderId) {
        const folder = this.getFolder(collectionId, targetFolderId);
        if (folder) {
            folder.requests.push(request);
            request.folderId = targetFolderId;
        } else {
            collection.requests.push(request);
            request.folderId = null;
        }
    } else {
        collection.requests.push(request);
        request.folderId = null;
    }
    
    collection.updatedAt = new Date().toISOString();
    this.saveCollections();
}






// New method to show add request modal with better UX
showAddRequestModal(collectionId) {
    if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
        this.showNotification('Error', 'Request Manager not available', { type: 'error' });
        return;
    }
    
    const requestData = window.RequestManager.getCurrentRequestData();
    if (!requestData.url) {
        alert('Please enter a URL for the request first');
        return;
    }
    
    // Close collection modal first
    this.closeModal();
    
    // Pre-fill and show save modal
    const defaultName = requestData.name || `${requestData.method} ${this.getUrlPath(requestData.url)}`;
    
    const nameInput = document.getElementById('requestName');
    const descriptionInput = document.getElementById('requestDescription');
    const collectionSelect = document.getElementById('targetCollection');
    
    if (nameInput) nameInput.value = defaultName;
    if (descriptionInput) descriptionInput.value = '';
    if (collectionSelect) {
        this.updateTargetCollectionSelect();
        collectionSelect.value = collectionId;
    }
    
    this.showModal('saveRequestModal');
}

// Enhanced method to get all collections for dropdowns
getCollectionsForDropdown() {
    return this.collections.map(collection => ({
        id: collection.id,
        name: collection.name,
        requestCount: collection.requests.length
    }));
}

// Method to find requests across all collections
findRequestsByName(searchTerm) {
    const results = [];
    
    this.collections.forEach(collection => {
        collection.requests.forEach((request, index) => {
            if (request.name && request.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                    collectionId: collection.id,
                    collectionName: collection.name,
                    requestIndex: index,
                    request: request
                });
            }
        });
    });
    
    return results;
}

// Method to get recent requests across all collections
getRecentRequests(limit = 10) {
    const allRequests = [];
    
    this.collections.forEach(collection => {
        collection.requests.forEach((request, index) => {
            allRequests.push({
                collectionId: collection.id,
                collectionName: collection.name,
                requestIndex: index,
                request: request,
                createdAt: new Date(request.createdAt || collection.createdAt)
            });
        });
    });
    
    // Sort by creation date (newest first) and limit
    return allRequests
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
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
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: this.buildPostmanItems(collection),
        variable: Object.entries(collection.variables || {}).map(([key, value]) => ({
            key: key,
            value: value,
            type: 'string'
        }))
    };
    
    this.downloadFile(exportData, `${collection.name.replace(/[^a-z0-9]/gi, '_')}_collection.json`);
    this.showNotification('Collection Exported', `"${collection.name}" exported with folder structure`);
}

buildPostmanItems(collection) {
    const items = [];
    const folders = collection.folders || [];
    const rootRequests = collection.requests.filter(req => !req.folderId);
    
    // Add folders first
    folders.forEach(folder => {
        const folderItem = {
            name: folder.name,
            description: folder.description || '',
            item: (folder.requests || []).map(request => this.buildPostmanRequest(request))
        };
        items.push(folderItem);
    });
    
    // Add root requests
    rootRequests.forEach(request => {
        items.push(this.buildPostmanRequest(request));
    });
    
    return items;
}

// Build individual Postman request
buildPostmanRequest(request) {
    return {
        name: request.name,
        request: {
            method: request.method,
            header: (request.headers || []).map(header => ({
                key: header.key,
                value: header.value,
                type: 'text'
            })),
            url: {
                raw: request.url,
                query: (request.params || []).map(param => ({
                    key: param.key,
                    value: param.value
                }))
            },
            body: this.buildPostmanBody(request.body),
            auth: this.buildPostmanAuth(request.auth)
        },
        response: []
    };
}

// Build Postman-compatible body
buildPostmanBody(body) {
    if (!body || body.type === 'none') return undefined;
    
    switch (body.type) {
        case 'json':
            return {
                mode: 'raw',
                raw: typeof body.data === 'object' ? JSON.stringify(body.data, null, 2) : body.data,
                options: {
                    raw: {
                        language: 'json'
                    }
                }
            };
        case 'form':
            return {
                mode: 'urlencoded',
                urlencoded: Array.isArray(body.data) 
                    ? body.data.map(field => ({ key: field.key, value: field.value, type: 'text' }))
                    : Object.entries(body.data || {}).map(([key, value]) => ({ key, value, type: 'text' }))
            };
        case 'raw':
            return {
                mode: 'raw',
                raw: body.data
            };
        default:
            return undefined;
    }
}

// Build Postman-compatible auth
buildPostmanAuth(auth) {
    if (!auth || auth.type === 'none') return undefined;
    
    switch (auth.type) {
        case 'bearer':
            return {
                type: 'bearer',
                bearer: [{ key: 'token', value: auth.token, type: 'string' }]
            };
        case 'basic':
            return {
                type: 'basic',
                basic: [
                    { key: 'username', value: auth.username, type: 'string' },
                    { key: 'password', value: auth.password, type: 'string' }
                ]
            };
        case 'apikey':
            return {
                type: 'apikey',
                apikey: [
                    { key: 'key', value: auth.key, type: 'string' },
                    { key: 'value', value: auth.value, type: 'string' },
                    { key: 'in', value: auth.location || 'header', type: 'string' }
                ]
            };
        default:
            return undefined;
    }
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