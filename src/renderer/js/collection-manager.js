// Collection Manager - Handles collection management and request organization (Fixed Version)

class CollectionManager {
constructor() {
    // Initialize collections as empty array FIRST
    this.collections = [];
    this.currentCollection = null;
    this.initialized = false;
    
    // Drag & drop functionality
    this.draggedRequest = null;
    this.draggedFromCollection = null;
    this.draggedFromFolder = null;
    this.draggedFromIndex = null;
    
    console.log('📁 CollectionManager initializing...');
    
    // Load collections synchronously from storage
    const stored = localStorage.getItem('posterboy_collections');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            this.collections = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error parsing collections:', error);
            this.collections = [];
        }
    }
    
    // Wait for Core and DOM before initializing UI
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
                id: this.generateId('col'),
                name: 'Default Collection',
                description: 'Your default collection for API requests',
                requests: [],
                folders: [],
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.collections.push(defaultCollection);
            this.saveCollections();
        }
        
        this.updateDisplay();
        this.updateTargetCollectionSelect();
        
        // ALWAYS SELECT FIRST COLLECTION
        setTimeout(() => {
            this.ensureCollectionSelected();
        }, 500);
        
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
        // Always load from localStorage as primary source
        const stored = localStorage.getItem('posterboy_collections');
        if (stored) {
            const parsed = JSON.parse(stored);
            this.collections = Array.isArray(parsed) ? parsed : [];
            console.log(`📁 Loaded ${this.collections.length} collections from localStorage`);
        } else {
            this.collections = [];
        }
        
        // If authenticated, also try to sync from Supabase (async, won't block)
        if (window.authService && 
            typeof window.authService.isAuthenticated === 'function' && 
            window.authService.isAuthenticated() && 
            window.collectionService && 
            typeof window.collectionService.getMyCollections === 'function') {
            
            window.collectionService.getMyCollections().then(result => {
                if (result.success && Array.isArray(result.collections)) {
                    this.collections = result.collections;
                    localStorage.setItem('posterboy_collections', JSON.stringify(this.collections));
                    this.updateDisplay();
                    console.log('☁️ Collections synced from cloud');
                }
            }).catch(error => {
                console.warn('Could not sync collections from cloud:', error);
            });
        }
        
        return this.collections;
    } catch (error) {
        console.error('Error loading collections:', error);
        this.collections = [];
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

// Update existing method to track imports
async saveCollection(collection) {
    // Save to localStorage (immediate)
    localStorage.setItem('posterboy_collections', JSON.stringify(this.collections));
    
    // If authenticated, also save to Supabase
    if (window.AuthService && window.AuthService.isAuthenticated()) {
        if (window.SyncService) {
            // Queue for auto-save (debounced)
            window.SyncService.queueAutoSave('collection', collection.id || 'new', collection);
        }
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


async deleteCollection(collectionId) {
    const collection = this.getCollection(collectionId);
    
    if (!collection) {
        console.error('❌ Collection not found:', collectionId);
        return false;
    }
    
    const requestCount = this.getTotalRequestCount(collection);
    const confirmMessage = requestCount > 0 
        ? `Delete "${collection.name}" with ${requestCount} request(s)? This cannot be undone.`
        : `Delete "${collection.name}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return false;
    }
    
    // Ensure collections is an array
    if (!Array.isArray(this.collections)) {
        console.error('❌ Collections is not an array');
        this.collections = [];
        return false;
    }
    
    // Remove the collection
    this.collections = this.collections.filter(col => col.id !== collectionId);
    
    // If we deleted the current collection, switch to another
    if (this.currentCollection === collectionId) {
        this.currentCollection = this.collections.length > 0 ? this.collections[0].id : null;
    }
    
    await this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    this.showNotification('Collection Deleted', `"${collection.name}" deleted successfully`);
    
    // Emit event
    if (window.Core && typeof window.Core.emit === 'function') {
        window.Core.emit('collection:deleted', { collectionId });
    }
    
    return true;
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
    // Ensure collections is an array
    if (!Array.isArray(this.collections)) {
        console.warn('⚠️ Collections is not an array in getCollection');
        this.collections = [];
        return null;
    }
    
    return this.collections.find(col => col.id === collectionId) || null;
}

updateDisplay() {
    try {
        // CRITICAL: Ensure collections is always an array
        if (!Array.isArray(this.collections)) {
            console.warn('⚠️ Collections is not an array in updateDisplay, fixing...');
            this.collections = [];
        }
        
        const container = document.getElementById('collectionsContainer');
        if (!container) {
            console.warn('⚠️ collectionsContainer element not found');
            return;
        }
        
        if (this.collections.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <h3>No Collections Yet</h3>
                    <p>Create your first collection to organize your API requests</p>
                    <button class="action-btn" onclick="window.collectionManager.createCollection()" style="margin-top: 1rem;">
                        ➕ Create Collection
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.collections.map(collection => {
            const totalRequests = this.getTotalRequestCount(collection);
            const folderCount = collection.folders ? collection.folders.length : 0;
            
            return `
                <div class="collection-card" onclick="window.collectionManager.openCollection('${collection.id}')">
                    <div class="collection-header">
                        <h3 class="collection-title">${this.escapeHtml(collection.name)}</h3>
                        <div class="collection-menu">
                            <button class="collection-menu-btn" onclick="event.stopPropagation(); window.collectionManager.showCollectionMenu('${collection.id}', event)">
                                ⋮
                            </button>
                        </div>
                    </div>
                    <div class="collection-info">
                        ${collection.description ? 
                            `<p class="collection-description">${this.escapeHtml(collection.description)}</p>` : 
                            '<p class="collection-description text-muted">No description</p>'}
                    </div>
                    <div class="collection-stats">
                        <span class="stat-item">
                            <span class="stat-icon">📄</span>
                            <span class="stat-value">${totalRequests}</span>
                            <span class="stat-label">requests</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-icon">📁</span>
                            <span class="stat-value">${folderCount}</span>
                            <span class="stat-label">folders</span>
                        </span>
                    </div>
                    <div class="collection-footer">
                        <small class="text-muted">Updated ${this.formatDate(collection.updatedAt)}</small>
                    </div>
                </div>
            `;
        }).join('');
        
        // Also update the dropdow
        this.updateCollectionDropdown();
        
        console.log('✅ Display updated successfully');
    } catch (error) {
        console.error('❌ Error updating display:', error);
    }
}

renderCollections() {
     this.updateDisplay();
}

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


getMethodCounts(collection) {
    const methods = {};
    
    // Count methods from root requests
    if (Array.isArray(collection.requests)) {
        collection.requests.forEach(req => {
            if (req.method) {
                methods[req.method] = (methods[req.method] || 0) + 1;
            }
        });
    }
    
    // Count methods from folder requests
    if (Array.isArray(collection.folders)) {
        collection.folders.forEach(folder => {
            if (Array.isArray(folder.requests)) {
                folder.requests.forEach(req => {
                    if (req.method) {
                        methods[req.method] = (methods[req.method] || 0) + 1;
                    }
                });
            }
        });
    }

    return Object.entries(methods).map(([method, count]) => 
        `<span class="method-count method-${method.toLowerCase()}">${method} (${count})</span>`
    ).join('');
}

// Add this method to debug collection structure
debugCollectionStructure(collection) {
    console.log('🔍 Collection Structure Debug:');
    console.log('Collection:', collection.name);
    console.log('Root requests:', collection.requests?.length || 0);
    console.log('Folders:', collection.folders?.length || 0);
    
    if (collection.folders) {
        collection.folders.forEach(folder => {
            console.log(`  Folder "${folder.name}":`, folder.requests?.length || 0, 'requests');
        });
    }
    
    const totalCount = this.getTotalRequestCount(collection);
    console.log('Total calculated requests:', totalCount);
    
    return totalCount;
}


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



// Fixed getUrlPath to show better URL display
getUrlPath(url) {
    if (!url || typeof url !== 'string') {
        return 'No URL';
    }
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
        return 'No URL';
    }
    
    try {
        // If it's a complete URL, show the host + path
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
            const urlObj = new URL(trimmedUrl);
            const hostPath = urlObj.host + urlObj.pathname + urlObj.search;
            
            // Truncate if too long
            if (hostPath.length > 35) {
                return hostPath.substring(0, 32) + '...';
            }
            return hostPath;
        }
        
        // If it's a relative path or contains variables, show as-is
        if (trimmedUrl.length > 35) {
            return trimmedUrl.substring(0, 32) + '...';
        }
        return trimmedUrl;
        
    } catch (e) {
        // If URL parsing fails, just show the trimmed URL
        if (trimmedUrl.length > 35) {
            return trimmedUrl.substring(0, 32) + '...';
        }
        return trimmedUrl;
    }
}

// Helper method for better URL display in sidebar
formatUrlForSidebar(url) {
    if (!url || typeof url !== 'string') {
        return 'No URL';
    }
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
        return 'No URL';
    }
    
    // Handle environment variables in URL
    const urlWithVariables = trimmedUrl.replace(/\{\{([^}]+)\}\}/g, '{var}');
    
    try {
        // Complete URL with protocol
        if (urlWithVariables.startsWith('http://') || urlWithVariables.startsWith('https://')) {
            const urlObj = new URL(urlWithVariables);
            let display = urlObj.hostname;
            
            // Add port if not default
            if (urlObj.port && 
                !((urlObj.protocol === 'http:' && urlObj.port === '80') || 
                  (urlObj.protocol === 'https:' && urlObj.port === '443'))) {
                display += ':' + urlObj.port;
            }
            
            // Add path if not just /
            if (urlObj.pathname && urlObj.pathname !== '/') {
                display += urlObj.pathname;
            }
            
            // Add query params indicator if present
            if (urlObj.search) {
                display += urlObj.search.length > 10 ? '?...' : urlObj.search;
            }
            
            return display.length > 35 ? display.substring(0, 32) + '...' : display;
        }
        
        // Relative URL or path
        return urlWithVariables.length > 35 ? urlWithVariables.substring(0, 32) + '...' : urlWithVariables;
        
    } catch (e) {
        // Fallback for invalid URLs
        return urlWithVariables.length > 35 ? urlWithVariables.substring(0, 32) + '...' : urlWithVariables;
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

// Enhanced handleCreateCollection with auto-selection
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
        folders: [], // Initialize with folders support
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
    
    // AUTO-SELECT THE NEW COLLECTION
    this.autoSelectCollection(newCollection.id);
    
    this.showNotification('Collection Created', `"${name}" collection created and selected!`);
    
    // Track activity safely
    try {
        this.emitCoreEvent('collection-created', { collectionId: newCollection.id });
    } catch (error) {
        console.warn('Could not track collection creation activity:', error);
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

loadCollectionRequests() {
    const select = document.getElementById('requestsCollectionSelect');
    const collectionId = select ? select.value : null;
    
    if (!collectionId) {
        const requestsList = document.getElementById('requestsList') || 
                            document.querySelector('.requests-list');
        if (requestsList) {
            requestsList.innerHTML = `
                <div class="empty-requests">
                    <h4>No Collection Selected</h4>
                    <p>Choose a collection to view its requests and folders</p>
                </div>
            `;
        }
        return;
    }
    
    this.updateRequestsList(collectionId);
}

updateRequestsList(collectionId) {
    const collection = this.getCollection(collectionId);
    const requestsList = document.getElementById('requestsList') || 
                        document.querySelector('.requests-list');
    
    if (!requestsList) {
        console.warn('⚠️ requests list element not found');
        return;
    }
    
    if (!collection) {
        requestsList.innerHTML = '<div class="empty-requests">Collection not found</div>';
        return;
    }
    
    const folders = collection.folders || [];
    const rootRequests = collection.requests.filter(req => !req.folderId) || [];
    
    let html = '';
    
    // Render folders
    if (folders.length > 0) {
        folders.forEach(folder => {
            const folderRequests = folder.requests || [];
            html += `
                <div class="sidebar-folder" data-folder-id="${folder.id}">
                    <div class="sidebar-folder-header" onclick="this.parentElement.classList.toggle('open')">
                        <span class="folder-icon">📁</span>
                        <span class="folder-name">${this.escapeHtml(folder.name)}</span>
                        <span class="folder-count">(${folderRequests.length})</span>
                    </div>
                    <div class="sidebar-folder-requests">
                        ${this.renderSidebarRequests(folderRequests, collectionId, folder.id)}
                    </div>
                </div>
            `;
        });
    }
    
    // Render root requests
    if (rootRequests.length > 0) {
        html += '<div class="sidebar-root-requests">';
        html += this.renderSidebarRequests(rootRequests, collectionId, null);
        html += '</div>';
    }
    
    if (html === '') {
        html = `
            <div class="empty-requests">
                <p>No requests in this collection</p>
                <button onclick="window.collectionManager.showAddRequestModal('${collectionId}')" class="btn-sm">
                    Add Request
                </button>
            </div>
        `;
    }
    
    requestsList.innerHTML = html;
}


renderSidebarRequests(requests, collectionId, folderId) {
    if (!requests || requests.length === 0) {
        return '<div class="empty-folder-requests">No requests</div>';
    }
    
    return requests.map((request, index) => `
        <div class="sidebar-request" 
             onclick="window.collectionManager.loadRequestFromCollection('${collectionId}', ${index}, ${folderId ? `'${folderId}'` : 'null'})"
             title="${this.escapeHtml(request.url)}">
            <span class="method-badge method-${request.method.toLowerCase()}">${request.method}</span>
            <span class="request-name">${this.escapeHtml(request.name)}</span>
        </div>
    `).join('');
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
// Enhanced deleteFolder with better confirmation
deleteFolder(collectionId, folderId) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    const folder = this.getFolder(collectionId, folderId);
    if (!folder) return;
    
    const requestCount = (folder.requests || []).length;
    let confirmMessage = `Delete folder "${folder.name}"?`;
    
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
    
    this.showNotification('Folder Deleted', `"${folder.name}" folder deleted. ${requestCount > 0 ? 'Requests moved to collection root.' : ''}`);
}

// Refresh sidebar if needed
refreshSidebarIfNeeded(collectionId) {
    const requestsSelect = document.getElementById('requestsCollectionSelect');
    if (requestsSelect && requestsSelect.value === collectionId) {
        this.updateRequestsList(collectionId);
    }
}


// Update existing method to handle all cases properly
getTotalRequestCount(collection) {
    if (!collection) return 0;
    
    let count = 0;
    
    // Count root requests (not in folders)
    if (Array.isArray(collection.requests)) {
        const rootRequests = collection.requests.filter(req => !req.folderId);
        count += rootRequests.length;
    }
    
    // Count requests in folders
    if (Array.isArray(collection.folders)) {
        collection.folders.forEach(folder => {
            if (Array.isArray(folder.requests)) {
                count += folder.requests.length;
            }
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
            posterboy_export: true,
            version: '1.0.0',
            collections: this.collections,
            exported_at: new Date().toISOString()
        };
        
        this.downloadFile(exportData, `posterboy_collections_${new Date().toISOString().split('T')[0]}.json`);
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

    // ================== COLLECTION SWITCHING WITH AUTO-SAVE ==================

// Prompt user for auto-save
async promptAutoSave() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💾 Unsaved Changes</h3>
                </div>
                <div class="modal-body">
                    <p>You have unsaved changes in the current request. Would you like to save it before switching collections?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="saveAndSwitch">Save & Switch</button>
                    <button class="btn btn-secondary" id="discardAndSwitch">Discard & Switch</button>
                    <button class="btn btn-secondary" id="cancelSwitch">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('saveAndSwitch').onclick = () => {
            modal.remove();
            resolve(true);
        };
        
        document.getElementById('discardAndSwitch').onclick = () => {
            modal.remove();
            resolve(false);
        };
        
        document.getElementById('cancelSwitch').onclick = () => {
            modal.remove();
            // Reset the dropdown to previous selection
            const select = document.getElementById('requestsCollectionSelect');
            if (select && this.currentCollection) {
                select.value = this.currentCollection.id;
            }
            resolve(null); // Cancel operation
        };
    });
}

// Auto-save current request to the current collection
async autoSaveCurrentRequest() {
    try {
        if (!window.RequestManager || !window.RequestManager.getCurrentRequestData) {
            return false;
        }
        
        const requestData = window.RequestManager.getCurrentRequestData();
        if (!requestData.url) {
            return false; // Nothing to save
        }
        
        // Get current collection
        const currentCollectionId = document.getElementById('requestsCollectionSelect')?.value;
        if (!currentCollectionId) {
            return false;
        }
        
        const collection = this.getCollection(currentCollectionId);
        if (!collection) {
            return false;
        }
        
        // Generate auto-save name if no name provided
        let requestName = requestData.name || '';
        if (!requestName.trim()) {
            try {
                const urlPath = new URL(requestData.url).pathname;
                requestName = `${requestData.method} ${urlPath}`.trim();
            } catch (e) {
                requestName = `${requestData.method} Request`;
            }
        }
        
        const newRequest = {
            id: this.generateId('req'),
            name: requestName,
            description: '(Auto-saved)',
            method: requestData.method,
            url: requestData.url,
            headers: requestData.headers || [],
            params: requestData.params || [],
            cookies: requestData.cookies || [],
            auth: requestData.auth || { type: 'none' },
            body: requestData.body || { type: 'none' },
            folderId: null, // Auto-save to collection root
            createdAt: new Date().toISOString()
        };
        
        collection.requests.push(newRequest);
        collection.updatedAt = new Date().toISOString();
        this.saveCollections();
        
        this.showNotification('Auto-saved', `Request "${requestName}" auto-saved to ${collection.name}`);
        return true;
    } catch (error) {
        console.error('Error auto-saving request:', error);
        return false;
    }
}

// ================== REQUEST CREATION & MANAGEMENT ==================

// Create a new blank request
createNewRequest() {
    // Clear the workspace
    if (window.UI && window.UI.clearForm) {
        window.UI.clearForm();
    }
    
    // Set focus to request name input
    const nameInput = document.getElementById('requestName');
    if (nameInput) {
        nameInput.focus();
        nameInput.placeholder = 'New Request';
    }
    
    // Switch to workspace if not already there
    if (window.UI && window.UI.showSection) {
        window.UI.showSection('workspace');
    }
    
    this.showNotification('New Request', 'Started creating a new request');
}

// Delete request with confirmation
deleteRequest(collectionId, requestIndex, fromFolder = null) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    let request;
    let requestList;
    
    if (fromFolder) {
        const folder = this.getFolder(collectionId, fromFolder);
        if (!folder || !folder.requests[requestIndex]) return;
        request = folder.requests[requestIndex];
        requestList = folder.requests;
    } else {
        if (!collection.requests[requestIndex]) return;
        request = collection.requests[requestIndex];
        requestList = collection.requests;
    }
    
    if (!confirm(`Are you sure you want to delete "${request.name}"? This action cannot be undone.`)) {
        return;
    }
    
    // Remove request from list
    requestList.splice(requestIndex, 1);
    collection.updatedAt = new Date().toISOString();
    
    this.saveCollections();
    
    // Refresh the requests list
    const selectedCollectionId = document.getElementById('requestsCollectionSelect')?.value;
    if (selectedCollectionId === collectionId) {
        this.updateRequestsList(collectionId);
    }
    
    // Refresh collection modal if open
    if (this.currentCollection && this.currentCollection.id === collectionId) {
        this.openCollection(collectionId);
    }
    
    this.showNotification('Request Deleted', `"${request.name}" has been deleted`);
}

async saveCollections() {
    try {
        // CRITICAL: Ensure collections is an array before saving
        if (!Array.isArray(this.collections)) {
            console.error('❌ Collections is not an array, cannot save!');
            this.collections = [];
            return;
        }
        
        // Save to localStorage immediately
        localStorage.setItem('posterboy_collections', JSON.stringify(this.collections));
        console.log('💾 Collections saved to localStorage');
        
        // If authenticated, also save to Supabase
        if (window.authService && 
            typeof window.authService.isAuthenticated === 'function' && 
            window.authService.isAuthenticated()) {
            
            if (window.syncService && typeof window.syncService.syncCollections === 'function') {
                try {
                    await window.syncService.syncCollections(this.collections);
                    console.log('☁️ Collections synced to cloud');
                } catch (error) {
                    console.warn('⚠️ Could not sync to cloud:', error);
                    // Don't throw - localStorage save succeeded
                }
            }
        }
        
        // Emit save event
        if (window.Core && typeof window.Core.emit === 'function') {
            window.Core.emit('collectionsUpdated', this.collections);
        }
    } catch (error) {
        console.error('❌ Error saving collections:', error);
    }
}



// ================== DRAG & DROP FUNCTIONALITY ==================

// Enable drag and drop for request items
enableDragAndDrop() {
    // This will be called when updating the requests list
    const requestItems = document.querySelectorAll('.request-item[draggable="true"]');
    
    requestItems.forEach(item => {
        item.addEventListener('dragstart', this.handleDragStart.bind(this));
        item.addEventListener('dragover', this.handleDragOver.bind(this));
        item.addEventListener('drop', this.handleDrop.bind(this));
        item.addEventListener('dragend', this.handleDragEnd.bind(this));
    });
    
    // Also enable drop on folders
    const folderItems = document.querySelectorAll('.sidebar-folder-header');
    folderItems.forEach(folder => {
        folder.addEventListener('dragover', this.handleDragOver.bind(this));
        folder.addEventListener('drop', this.handleDropOnFolder.bind(this));
    });
}

// Handle drag start
handleDragStart(e) {
    const requestItem = e.target.closest('.request-item');
    if (!requestItem) return;
    
    // Extract data from the request item
    const collectionId = document.getElementById('requestsCollectionSelect')?.value;
    const requestIndex = parseInt(requestItem.dataset.requestIndex);
    const folderId = requestItem.dataset.folderId || null;
    
    this.draggedRequest = {
        collectionId: collectionId,
        requestIndex: requestIndex,
        folderId: folderId
    };
    
    requestItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
}

// Fixed handle drag over - only highlight target element
handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Clear all existing drag-over states first
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    // Only add to the immediate target
    const requestItem = e.target.closest('.request-item');
    const folderHeader = e.target.closest('.sidebar-folder-header');
    
    if (requestItem && requestItem !== e.target.closest('.dragging')) {
        requestItem.classList.add('drag-over');
    } else if (folderHeader) {
        folderHeader.classList.add('drag-over');
    }
}

// Handle drop on request item (reordering)
handleDrop(e) {
    e.preventDefault();
    
    const targetItem = e.target.closest('.request-item');
    if (!targetItem || !this.draggedRequest) return;
    
    const targetIndex = parseInt(targetItem.dataset.requestIndex);
    const targetFolderId = targetItem.dataset.folderId || null;
    const collectionId = document.getElementById('requestsCollectionSelect')?.value;
    
    // Don't drop on itself
    if (this.draggedRequest.collectionId === collectionId && 
        this.draggedRequest.requestIndex === targetIndex && 
        this.draggedRequest.folderId === targetFolderId) {
        return;
    }
    
    this.moveRequest(
        this.draggedRequest.collectionId,
        this.draggedRequest.requestIndex,
        this.draggedRequest.folderId,
        collectionId,
        targetIndex,
        targetFolderId
    );
    
    // Clean up
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
}

// Handle drop on folder
handleDropOnFolder(e) {
    e.preventDefault();
    
    const folderHeader = e.target.closest('.sidebar-folder-header');
    if (!folderHeader || !this.draggedRequest) return;
    
    const folderId = folderHeader.dataset.folderId;
    const collectionId = document.getElementById('requestsCollectionSelect')?.value;
    
    // Move to end of folder
    this.moveRequestToFolder(
        this.draggedRequest.collectionId,
        this.draggedRequest.requestIndex,
        this.draggedRequest.folderId,
        collectionId,
        folderId
    );
}

// Handle drag end
handleDragEnd(e) {
    // Clean up drag state
    document.querySelectorAll('.dragging').forEach(item => {
        item.classList.remove('dragging');
    });
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    this.draggedRequest = null;
}

// Move request between positions/folders
// Fixed move request - preserve folder states
moveRequest(fromCollectionId, fromIndex, fromFolderId, toCollectionId, toIndex, toFolderId) {
    const fromCollection = this.getCollection(fromCollectionId);
    const toCollection = this.getCollection(toCollectionId);
    
    if (!fromCollection || !toCollection) return;
    
    // Store current folder states before refresh
    const folderStates = this.saveFolderStates();
    
    // Get the request being moved
    let request;
    let fromList;
    
    if (fromFolderId) {
        const fromFolder = this.getFolder(fromCollectionId, fromFolderId);
        if (!fromFolder) return;
        fromList = fromFolder.requests;
    } else {
        fromList = fromCollection.requests.filter(req => !req.folderId);
    }
    
    if (!fromList[fromIndex]) return;
    request = fromList[fromIndex];
    
    // Remove from source
    fromList.splice(fromIndex, 1);
    
    // Add to destination
    let toList;
    if (toFolderId) {
        const toFolder = this.getFolder(toCollectionId, toFolderId);
        if (!toFolder) return;
        toList = toFolder.requests;
        request.folderId = toFolderId;
    } else {
        toList = toCollection.requests;
        request.folderId = null;
    }
    
    // Insert at the target position
    toList.splice(toIndex, 0, request);
    
    // Update timestamps
    fromCollection.updatedAt = new Date().toISOString();
    if (fromCollectionId !== toCollectionId) {
        toCollection.updatedAt = new Date().toISOString();
    }
    
    this.saveCollections();
    
    // Refresh displays and restore folder states
    const selectedCollectionId = document.getElementById('requestsCollectionSelect')?.value;
    if (selectedCollectionId === fromCollectionId || selectedCollectionId === toCollectionId) {
        this.updateRequestsList(selectedCollectionId);
        
        // Restore folder states after refresh
        setTimeout(() => {
            this.restoreFolderStates(folderStates);
        }, 100);
    }
    
    this.showNotification('Request Moved', `"${request.name}" moved successfully`);
}

// Move request to folder (append to end)
moveRequestToFolder(fromCollectionId, fromIndex, fromFolderId, toCollectionId, toFolderId) {
    const fromCollection = this.getCollection(fromCollectionId);
    const toCollection = this.getCollection(toCollectionId);
    
    if (!fromCollection || !toCollection) return;
    
    const toFolder = this.getFolder(toCollectionId, toFolderId);
    if (!toFolder) return;
    
    // Get the request being moved
    let request;
    let fromList;
    
    if (fromFolderId) {
        const fromFolder = this.getFolder(fromCollectionId, fromFolderId);
        if (!fromFolder) return;
        fromList = fromFolder.requests;
    } else {
        fromList = fromCollection.requests.filter(req => !req.folderId);
    }
    
    if (!fromList[fromIndex]) return;
    request = fromList[fromIndex];
    
    // Remove from source
    fromList.splice(fromIndex, 1);
    
    // Add to target folder
    request.folderId = toFolderId;
    toFolder.requests.push(request);
    
    // Update timestamps
    fromCollection.updatedAt = new Date().toISOString();
    if (fromCollectionId !== toCollectionId) {
        toCollection.updatedAt = new Date().toISOString();
    }
    
    this.saveCollections();
    
    // Refresh displays
    const selectedCollectionId = document.getElementById('requestsCollectionSelect')?.value;
    if (selectedCollectionId === fromCollectionId || selectedCollectionId === toCollectionId) {
        this.updateRequestsList(selectedCollectionId);
    }
    
    this.showNotification('Request Moved', `"${request.name}" moved to folder "${toFolder.name}"`);
}

// ================== COLLECTION SELECTION FIXES ==================

ensureCollectionSelected() {
    // Ensure collections is an array
    if (!Array.isArray(this.collections)) {
        this.collections = [];
    }
    
    if (this.collections.length === 0) {
        console.log('ℹ️ No collections available to select');
        return;
    }
    
    const select = document.getElementById('requestsCollectionSelect');
    if (select && !select.value) {
        select.value = this.collections[0].id;
        this.loadCollectionRequests();
        console.log('✅ Auto-selected first collection:', this.collections[0].name);
    }
}

// Handle multiple imported collections
handleImportedCollections(importedCollections) {
    const results = [];
    let successCount = 0;
    
    if (!Array.isArray(importedCollections)) {
        importedCollections = [importedCollections];
    }
    
    importedCollections.forEach((collection, index) => {
        const result = this.addImportedCollection(collection);
        results.push(result);
        
        if (result.success) {
            successCount++;
        }
    });
    
    // Show summary notification
    if (successCount > 0) {
        this.showNotification(
            'Import Complete', 
            `Successfully imported ${successCount} collection(s)`,
            { type: 'success' }
        );
    }
    
    if (results.some(r => !r.success)) {
        const failedCount = results.filter(r => !r.success).length;
        this.showNotification(
            'Import Warning', 
            `${failedCount} collection(s) failed to import`,
            { type: 'warning' }
        );
    }
    
    return results;
}
updateCollectionDropdown() {
    const dropdownIds = ['requestsCollectionSelect', 'targetCollection', 'collectionSelect'];
    
    dropdownIds.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Save current value
        const currentValue = select.value;
        
        // Clear dropdown
        select.innerHTML = '<option value="">Select Collection</option>';
        
        // CRITICAL: Ensure collections is an array
        if (!Array.isArray(this.collections)) {
            console.warn(`⚠️ Collections is not an array in updateCollectionDropdown for ${selectId}`);
            this.collections = [];
            return;
        }
        
        // Populate dropdown
        this.collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            const totalRequests = this.getTotalRequestCount(collection);
            option.textContent = `${collection.name} (${totalRequests})`;
            
            if (collection.id === currentValue) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // Restore selection if valid
        if (currentValue && this.collections.find(c => c.id === currentValue)) {
            select.value = currentValue;
        }
    });
    
    console.log('📋 Collection dropdowns updated');
}

// Add validation for imported collections
validateCollection(collection) {
    const errors = [];
    
    // Check required fields
    if (!collection.name || typeof collection.name !== 'string') {
        errors.push('Collection name is required');
    }
    
    if (!collection.id || typeof collection.id !== 'string') {
        errors.push('Collection ID is required');
    }
    
    // Ensure arrays exist
    if (!Array.isArray(collection.requests)) {
        collection.requests = [];
    }
    
    if (!Array.isArray(collection.folders)) {
        collection.folders = [];
    }
    
    // Ensure variables object exists
    if (!collection.variables || typeof collection.variables !== 'object') {
        collection.variables = {};
    }
    
    // Validate requests
    collection.requests.forEach((request, index) => {
        if (!request.id) {
            request.id = this.generateId('req');
        }
        if (!request.name) {
            request.name = `Request ${index + 1}`;
        }
        if (!request.method) {
            request.method = 'GET';
        }
        if (!request.url) {
            request.url = '';
        }
        if (!Array.isArray(request.headers)) {
            request.headers = [];
        }
        if (!Array.isArray(request.params)) {
            request.params = [];
        }
        if (!Array.isArray(request.cookies)) {
            request.cookies = [];
        }
        if (!request.auth) {
            request.auth = { type: 'none' };
        }
        if (!request.body) {
            request.body = { type: 'none' };
        }
        if (!request.createdAt) {
            request.createdAt = new Date().toISOString();
        }
    });
    
    // Validate folders
    collection.folders.forEach((folder, index) => {
        if (!folder.id) {
            folder.id = this.generateId('folder');
        }
        if (!folder.name) {
            folder.name = `Folder ${index + 1}`;
        }
        if (!Array.isArray(folder.requests)) {
            folder.requests = [];
        }
        if (!folder.createdAt) {
            folder.createdAt = new Date().toISOString();
        }
        if (!folder.updatedAt) {
            folder.updatedAt = new Date().toISOString();
        }
        
        // Validate folder requests
        folder.requests.forEach((request, reqIndex) => {
            if (!request.id) {
                request.id = this.generateId('req');
            }
            if (!request.name) {
                request.name = `Request ${reqIndex + 1}`;
            }
            request.folderId = folder.id; // Ensure proper folder association
        });
    });
    
    // Ensure timestamps
    if (!collection.createdAt) {
        collection.createdAt = new Date().toISOString();
    }
    if (!collection.updatedAt) {
        collection.updatedAt = new Date().toISOString();
    }
    
    return { isValid: errors.length === 0, errors, collection };
}

// Safer method to add imported collections
addImportedCollection(importedCollection) {
    try {
        // Ensure collections array exists
        if (!this.collections) {
            this.collections = [];
        }
        
        // Validate the collection
        const validation = this.validateCollection(importedCollection);
        
        if (!validation.isValid) {
            console.warn('Collection validation issues:', validation.errors);
            // Continue with corrected collection
        }
        
        const collection = validation.collection;
        
        // Check for duplicate names and adjust
        let finalName = collection.name;
        let counter = 1;
        while (this.collections.find(col => col.name === finalName)) {
            finalName = `${collection.name} (${counter})`;
            counter++;
        }
        collection.name = finalName;
        
        // Add to collections
        this.collections.push(collection);
        this.saveCollections();
        this.updateDisplay();
        
        // Update dropdowns safely
        if (this.updateTargetCollectionSelect) {
            this.updateTargetCollectionSelect();
        }
        if (this.updateCollectionDropdown) {
            this.updateCollectionDropdown();
        }
        
        // Auto-select the imported collection
        setTimeout(() => {
            if (this.autoSelectCollection) {
                this.autoSelectCollection(collection.id);
            }
        }, 100);
        
        console.log(`✅ Added imported collection: ${collection.name}`);
        return { success: true, collection };
        
    } catch (error) {
        console.error('Error adding imported collection:', error);
        return { success: false, error: error.message };
    }
}
// Fixed missing saveCurrentRequest method
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
    
    // Get selected collection (should always be one selected now)
    const selectedCollectionId = this.getSelectedCollectionId();
    
    if (selectedCollectionId) {
        // Save directly to selected collection
        this.saveToSelectedCollection(selectedCollectionId, requestData);
    } else {
        // This shouldn't happen now, but as fallback create default collection
        this.createDefaultCollectionAndSave(requestData);
    }
}

// Create default collection and save request
createDefaultCollectionAndSave(requestData) {
    const defaultCollection = {
        id: this.generateId('col'),
        name: 'Default Collection',
        description: 'Default collection for your API requests',
        requests: [],
        folders: [],
        variables: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    this.collections.push(defaultCollection);
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    // Auto-select the new collection
    this.autoSelectCollection(defaultCollection.id);
    
    // Now save to it
    this.saveToSelectedCollection(defaultCollection.id, requestData);
}

// ================== FOLDER STATE PRESERVATION ==================

// Save current folder open/closed states
saveFolderStates() {
    const states = {};
    const folderElements = document.querySelectorAll('.sidebar-folder-requests');
    
    folderElements.forEach(element => {
        const folderId = element.id.replace('folder-', '');
        states[folderId] = element.style.display !== 'none';
    });
    
    return states;
}

// Restore folder open/closed states
restoreFolderStates(states) {
    Object.entries(states).forEach(([folderId, isOpen]) => {
        const folderElement = document.getElementById(`folder-${folderId}`);
        const toggleElement = document.getElementById(`toggle-${folderId}`);
        
        if (folderElement && toggleElement) {
            if (isOpen) {
                folderElement.style.display = 'block';
                toggleElement.textContent = '📂';
            } else {
                folderElement.style.display = 'none';
                toggleElement.textContent = '📁';
            }
        }
    });
}

// ================== NEW COLLECTION AUTO-SELECTION ==================

// Auto-select a collection in the dropdown and workspace
// Fixed auto-select a collection in the dropdown and workspace
autoSelectCollection(collectionId) {
    // Update the requests sidebar dropdown
    const requestsSelect = document.getElementById('requestsCollectionSelect');
    if (requestsSelect) {
        // Update dropdown options first
        this.updateCollectionDropdown();
        
        // Then set the value
        requestsSelect.value = collectionId;
        
        // Trigger the change event to update the requests list
        this.updateRequestsList(collectionId);
    }
    
    // Update any target collection dropdowns
    const targetSelect = document.getElementById('targetCollection');
    if (targetSelect) {
        this.updateTargetCollectionSelect();
        targetSelect.value = collectionId;
    }
    
    // Switch to workspace to start using the collection
    if (window.UI && window.UI.showSection) {
        window.UI.showSection('workspace');
    }
    
    // Clear any existing workspace content
    if (window.UI && window.UI.clearForm) {
        window.UI.clearForm();
    }
}

// ================== CONTEXT MENU FUNCTIONALITY ==================

// Show context menu for request items
showRequestContextMenu(event, collectionId, requestIndex, folderId = null) {
    event.preventDefault();
    event.stopPropagation();
    
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    let request;
    if (folderId) {
        const folder = this.getFolder(collectionId, folderId);
        if (!folder || !folder.requests[requestIndex]) return;
        request = folder.requests[requestIndex];
    } else {
        const rootRequests = collection.requests.filter(req => !req.folderId);
        if (!rootRequests[requestIndex]) return;
        request = rootRequests[requestIndex];
    }
    
    const menuItems = [
        {
            icon: '🚀',
            label: 'Load Request',
            action: folderId ? 
                `loadFolderRequestToWorkspace('${collectionId}', '${folderId}', ${requestIndex})` :
                `loadRequestToWorkspace('${collectionId}', ${requestIndex})`
        },
        {
            icon: '📄',
            label: 'Duplicate Request',
            action: `window.CollectionManager.duplicateRequest('${collectionId}', ${requestIndex}, '${folderId || ''}')`
        },
        {
            icon: '✏️',
            label: 'Edit Request',
            action: folderId ?
                `window.CollectionManager.editFolderRequest('${collectionId}', '${folderId}', ${requestIndex})` :
                `editRequest('${collectionId}', ${requestIndex})`
        },
        { separator: true },
        {
            icon: '🗑️',
            label: 'Delete Request',
            action: `window.CollectionManager.deleteRequest('${collectionId}', ${requestIndex}, '${folderId || ''}')`,
            danger: true
        }
    ];
    
    if (window.UI && window.UI.showContextMenu) {
        window.UI.showContextMenu(event, menuItems);
    }
}

// Duplicate a request
duplicateRequest(collectionId, requestIndex, folderId = null) {
    const collection = this.getCollection(collectionId);
    if (!collection) return;
    
    let originalRequest;
    let targetList;
    
    if (folderId) {
        const folder = this.getFolder(collectionId, folderId);
        if (!folder || !folder.requests[requestIndex]) return;
        originalRequest = folder.requests[requestIndex];
        targetList = folder.requests;
    } else {
        const rootRequests = collection.requests.filter(req => !req.folderId);
        if (!rootRequests[requestIndex]) return;
        originalRequest = rootRequests[requestIndex];
        targetList = collection.requests;
    }
    
    const duplicatedRequest = {
        ...this.deepClone(originalRequest),
        id: this.generateId('req'),
        name: `${originalRequest.name} (Copy)`,
        createdAt: new Date().toISOString()
    };
    
    // Add duplicate after the original
    const insertIndex = requestIndex + 1;
    if (folderId) {
        targetList.splice(insertIndex, 0, duplicatedRequest);
    } else {
        // For root requests, find the actual index in the full collection
        const actualIndex = collection.requests.findIndex(req => req.id === originalRequest.id);
        collection.requests.splice(actualIndex + 1, 0, duplicatedRequest);
    }
    
    collection.updatedAt = new Date().toISOString();
    this.saveCollections();
    
    // Refresh the requests list
    this.updateRequestsList(collectionId);
    
    this.showNotification('Request Duplicated', `"${duplicatedRequest.name}" created successfully`);
}

// Edit a request in a folder
editFolderRequest(collectionId, folderId, requestIndex) {
    const folder = this.getFolder(collectionId, folderId);
    if (!folder || !folder.requests[requestIndex]) return;
    
    const request = folder.requests[requestIndex];
    this.editRequestModal(collectionId, request, (newName, newDescription) => {
        // Save callback for folder request
        request.name = newName;
        request.description = newDescription;
        folder.requests[requestIndex] = request;
        const collection = this.getCollection(collectionId);
        if (collection) {
            collection.updatedAt = new Date().toISOString();
        }
        this.saveCollections();
        this.updateRequestsList(collectionId);
    });
}

// Generic edit request modal
editRequestModal(collectionId, request, saveCallback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>✏️ Edit Request</h3>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <form onsubmit="event.preventDefault(); window.CollectionManager.handleGenericEditRequest(event)">
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
    
    // Store the callback for later use
    modal._saveCallback = saveCallback;
    
    // Focus the name input
    const nameInput = modal.querySelector('#editRequestName');
    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }
}

// Handle generic edit request form submission
handleGenericEditRequest(event) {
    event.preventDefault();
    
    const modal = event.target.closest('.modal');
    const nameInput = document.getElementById('editRequestName');
    const descriptionInput = document.getElementById('editRequestDescription');
    
    const newName = nameInput ? nameInput.value.trim() : '';
    const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
    
    if (!newName) {
        alert('Please enter a request name');
        return;
    }
    
    // Update the request object using the callback
    if (modal._saveCallback) {
        modal._saveCallback(newName, newDescription);
    }
    
    // Close modal
    modal.remove();
    
    this.showNotification('Request Updated', 'Request details updated');
}
    // Utility methods
escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return 'N/A';
    }
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