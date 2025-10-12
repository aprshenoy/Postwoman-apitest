// Import Manager - Handles importing from various formats (Postman, Insomnia, etc.) (Fixed Version)

class ImportManager {
    constructor() {
        this.supportedFormats = [
            'postman_collection',
            'postman_environment',
            'insomnia_export',
            'openapi_spec',
            'posterboy_export',
            'curl_commands',
            'har_file'
        ];
        this.initialized = false;
        
        console.log('📥 ImportManager initializing...');
        this.initialize();
    }

    initialize() {
        try {
            // Set up file input handlers
            this.setupFileHandlers();
            this.initialized = true;
            
            console.log('✅ ImportManager initialized successfully');
            
            // Emit initialization event
            if (window.Core && typeof window.Core.emit === 'function') {
                window.Core.emit('import-manager-initialized');
            }
        } catch (error) {
            console.error('❌ ImportManager initialization failed:', error);
        }
    }

    setupFileHandlers() {
        // Global file input for imports
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => this.handleFileImport(event));
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await this.readFile(file);
            const importResult = await this.detectAndImport(content, file.name);
            
            if (importResult.success) {
                this.showNotification('Import Successful', importResult.message);
                this.refreshDisplays();
            } else {
                alert('Import failed: ' + importResult.error);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing file: ' + error.message);
        } finally {
            // Reset file input
            event.target.value = '';
        }
    }

async handleCollectionImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Check if CollectionManager is available
        if (!window.CollectionManager) {
            throw new Error('CollectionManager is not available. Please refresh the page and try again.');
        }
        
        const text = await this.readFile(file);
        const importData = JSON.parse(text);
        
        // Check if it's a Postman collection
        if (this.isPostmanCollection(importData)) {
            const result = await this.importPostmanCollectionToManager(importData);
            if (result.success) {
                this.showNotification('Collection Imported', result.message);
                this.refreshDisplays();
            } else {
                alert('Collection import failed: ' + result.error);
            }
        } else if (this.isPosterboyCollection(importData)) {
            const result = await this.importPosterboyCollectionToManager(importData);
            if (result.success) {
                this.showNotification('Collection Imported', result.message);
                this.refreshDisplays();
            } else {
                alert('Collection import failed: ' + result.error);
            }
        } else {
            throw new Error('Unsupported collection format. Please ensure you are importing a valid Postman collection or PosterBoy export file.');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        alert('Error importing collection: ' + error.message);
    } finally {
        // Safely reset file input
        try {
            if (event && event.target && event.target.value !== undefined) {
                event.target.value = '';
            }
        } catch (resetError) {
            console.warn('Could not reset file input:', resetError);
        }
    }
}

async importPosterboyCollectionToManager(posterboyData) {
    try {
        // Ensure CollectionManager is available and initialized
        if (!window.CollectionManager) {
            throw new Error('CollectionManager not available');
        }
        
        // Ensure collections array exists
        if (!window.CollectionManager.collections) {
            window.CollectionManager.collections = [];
        }
        
        const collections = posterboyData.collections || [posterboyData];
        let importedCount = 0;
        
        for (const collectionData of collections) {
            // Generate new IDs to avoid conflicts
            const newCollection = {
                ...collectionData,
                id: this.generateId('col'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Regenerate request IDs
            if (newCollection.requests) {
                newCollection.requests.forEach(request => {
                    request.id = this.generateId('req');
                });
            }
            
            // Regenerate folder IDs
            if (newCollection.folders) {
                const folderIdMap = new Map();
                
                newCollection.folders.forEach(folder => {
                    const oldId = folder.id;
                    folder.id = this.generateId('folder');
                    folderIdMap.set(oldId, folder.id);
                    
                    // Regenerate request IDs in folders
                    if (folder.requests) {
                        folder.requests.forEach(request => {
                            request.id = this.generateId('req');
                        });
                    }
                });
                
                // Update parent references
                newCollection.folders.forEach(folder => {
                    if (folder.parentId && folderIdMap.has(folder.parentId)) {
                        folder.parentId = folderIdMap.get(folder.parentId);
                    }
                });
                
                // Update request folder references
                if (newCollection.requests) {
                    newCollection.requests.forEach(request => {
                        if (request.folderId && folderIdMap.has(request.folderId)) {
                            request.folderId = folderIdMap.get(request.folderId);
                        }
                    });
                }
            }
            
            // Use the safer method to add collection
            if (window.CollectionManager.addImportedCollection) {
                const result = window.CollectionManager.addImportedCollection(newCollection);
                if (result.success) {
                    importedCount++;
                }
            } else {
                // Fallback method
                window.CollectionManager.collections.push(newCollection);
                importedCount++;
            }
        }
        
        // Save and refresh displays
        window.CollectionManager.saveCollections();
        window.CollectionManager.updateDisplay();
        if (window.CollectionManager.updateTargetCollectionSelect) {
            window.CollectionManager.updateTargetCollectionSelect();
        }
        
        return {
            success: true,
            message: `${importedCount} collection(s) imported successfully`
        };
        
    } catch (error) {
        console.error('PosterBoy import error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async importPostmanCollectionToManager(postmanData) {
    try {
        // Ensure CollectionManager is available and initialized
        if (!window.CollectionManager) {
            throw new Error('CollectionManager not available');
        }
        
        // Ensure collections array exists
        if (!window.CollectionManager.collections) {
            window.CollectionManager.collections = [];
        }
        
        const collectionName = postmanData.info?.name || 'Imported Collection';
        
        const newCollection = {
            id: this.generateId('col'),
            name: collectionName,
            description: postmanData.info?.description || 'Imported from Postman',
            requests: [],
            folders: [],
            variables: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Process variables
        if (postmanData.variable) {
            postmanData.variable.forEach(variable => {
                if (variable.key && variable.value !== undefined) {
                    newCollection.variables[variable.key] = variable.value;
                }
            });
        }
        
        // Process items (folders and requests)
        if (postmanData.item) {
            this.processPostmanItemsSync(postmanData.item, newCollection);
        }
        
        // Check for duplicate names
        const existingCollection = window.CollectionManager.collections.find(col => col.name === newCollection.name);
        if (existingCollection) {
            newCollection.name += ' (Imported)';
        }
        
        // Use the safer method to add collection
        if (window.CollectionManager.addImportedCollection) {
            const result = window.CollectionManager.addImportedCollection(newCollection);
            if (!result.success) {
                throw new Error(result.error);
            }
        } else {
            // Fallback method
            window.CollectionManager.collections.push(newCollection);
            window.CollectionManager.saveCollections();
            window.CollectionManager.updateDisplay();
            if (window.CollectionManager.updateTargetCollectionSelect) {
                window.CollectionManager.updateTargetCollectionSelect();
            }
        }
        
        return {
            success: true,
            message: `"${collectionName}" imported successfully with ${newCollection.folders.length} folders and ${this.getTotalRequestCount(newCollection)} requests`
        };
        
    } catch (error) {
        console.error('Postman import error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

getTotalRequestCount(collection) {
    if (!collection) return 0;
    
    let count = 0;
    
    // Count root requests (not in folders)
    if (Array.isArray(collection.requests)) {
        const rootRequests = collection.requests.filter(req => !req.folderId);
        count += rootRequests.length;
        console.log(`Root requests: ${rootRequests.length}`);
    }
    
    // Count requests in folders
    if (Array.isArray(collection.folders)) {
        collection.folders.forEach(folder => {
            if (Array.isArray(folder.requests)) {
                count += folder.requests.length;
                console.log(`Folder "${folder.name}": ${folder.requests.length} requests`);
            }
        });
    }
    
    console.log(`Total requests in collection "${collection.name}": ${count}`);
    return count;
}

isPostmanCollection(data) {
    return data.info && data.info.schema && data.info.schema.includes('postman');
}

isPosterboyCollection(data) {
    return data.posterboy_export || data.posterboy_collection || data.collections;
}

refreshDisplays() {
    // Refresh all displays after import
    if (window.CollectionManager) {
        if (window.CollectionManager.updateDisplay) {
            window.CollectionManager.updateDisplay();
        }
        if (window.CollectionManager.updateTargetCollectionSelect) {
            window.CollectionManager.updateTargetCollectionSelect();
        }
        if (window.CollectionManager.updateCollectionDropdown) {
            window.CollectionManager.updateCollectionDropdown();
        }
        if (window.CollectionManager.ensureCollectionSelected) {
            window.CollectionManager.ensureCollectionSelected();
        }
    }
    
    if (window.EnvironmentManager && window.EnvironmentManager.updateDisplay) {
        window.EnvironmentManager.updateDisplay();
        if (window.EnvironmentManager.updateEnvironmentSelect) {
            window.EnvironmentManager.updateEnvironmentSelect();
        }
    }
}

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async detectAndImport(content, filename) {
        try {
            const data = JSON.parse(content);
            const format = this.detectFormat(data, filename);
            
            switch (format) {
                case 'postman_collection':
                    return await this.importPostmanCollection(data);
                
                case 'postman_environment':
                    return await this.importPostmanEnvironment(data);
                
                case 'insomnia_export':
                    return await this.importInsomniaExport(data);
                
                case 'openapi_spec':
                    return await this.importOpenAPISpec(data);
                
                case 'posterboy_export':
                    return await this.importPosterboyExport(data);
                
                case 'har_file':
                    return await this.importHarFile(data);
                
                default:
                    return {
                        success: false,
                        error: 'Unsupported file format. Please import a valid Postman collection, environment, or PosterBoy export file.'
                    };
            }
        } catch (error) {
            // Try as plain text for cURL commands
            if (content.includes('curl ')) {
                return await this.importCurlCommands(content);
            }
            
            return {
                success: false,
                error: 'Invalid file format or corrupted data'
            };
        }
    }

    detectFormat(data, filename) {
        // Postman Collection
        if (data.info && data.item && data.info.schema) {
            return 'postman_collection';
        }
        
        // Postman Environment
        if (data.name && data.values && Array.isArray(data.values)) {
            return 'postman_environment';
        }
        
        // Insomnia Export
        if (data._type === 'export' && data.resources) {
            return 'insomnia_export';
        }
        
        // OpenAPI Specification
        if (data.openapi || data.swagger) {
            return 'openapi_spec';
        }
        
        // PosterBoy Export
        if (data.posterboy_export || data.posterboy_collection || data.posterboy_environments) {
            return 'posterboy_export';
        }
        
        // HAR File
        if (data.log && data.log.entries) {
            return 'har_file';
        }
        
        // Check filename for hints
        if (filename.toLowerCase().includes('postman')) {
            if (filename.toLowerCase().includes('environment')) {
                return 'postman_environment';
            }
            return 'postman_collection';
        }
        
        if (filename.toLowerCase().includes('insomnia')) {
            return 'insomnia_export';
        }
        
        if (filename.toLowerCase().includes('.har')) {
            return 'har_file';
        }
        
        return 'unknown';
    }

    async importCollection(content, filename) {
        const data = JSON.parse(content);
        const format = this.detectFormat(data, filename);
        
        if (format === 'postman_collection') {
            return await this.importPostmanCollection(data);
        } else if (format === 'posterboy_export') {
            return await this.importPosterboyExport(data);
        } else {
            return {
                success: false,
                error: 'Unsupported collection format'
            };
        }
    }

processPostmanItemsSync(items, collection, parentFolderId = null) {
    for (const item of items) {
        if (item.item) {
            // This is a folder
            const folder = {
                id: this.generateId('folder'),
                name: item.name,
                description: item.description || '',
                parentId: parentFolderId,
                requests: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            collection.folders.push(folder);
            
            // Process folder items recursively
            this.processPostmanItemsSync(item.item, collection, folder.id);
            
        } else if (item.request) {
            // This is a request
            const request = this.convertPostmanRequestSync(item);
            
            if (parentFolderId) {
                // Add to folder
                const folder = collection.folders.find(f => f.id === parentFolderId);
                if (folder) {
                    request.folderId = parentFolderId;
                    folder.requests.push(request);
                    console.log(`Added request "${request.name}" to folder "${folder.name}"`);
                } else {
                    // Fallback to collection root
                    request.folderId = null;
                    collection.requests.push(request);
                    console.log(`Added request "${request.name}" to collection root (folder not found)`);
                }
            } else {
                // Add to collection root
                request.folderId = null;
                collection.requests.push(request);
                console.log(`Added request "${request.name}" to collection root`);
            }
        }
    }
}

convertPostmanRequestSync(postmanItem) {
    const postmanRequest = postmanItem.request;
    
    const request = {
        id: this.generateId('req'),
        name: postmanItem.name,
        description: postmanItem.description || '',
        method: postmanRequest.method || 'GET',
        url: this.extractPostmanUrl(postmanRequest.url),
        headers: this.convertPostmanHeaders(postmanRequest.header),
        params: this.convertPostmanParams(postmanRequest.url),
        cookies: [], // Postman doesn't export cookies separately
        auth: this.convertPostmanAuth(postmanRequest.auth),
        body: this.convertPostmanBody(postmanRequest.body),
        folderId: null, // Will be set by caller
        createdAt: new Date().toISOString()
    };
    
    return request;
}

    processPostmanItems(items, folderPath = '') {
        const requests = [];

        items.forEach(item => {
            if (item.item) {
                // This is a folder, process recursively
                const folderName = folderPath ? `${folderPath}/${item.name}` : item.name;
                const folderRequests = this.processPostmanItems(item.item, folderName);
                requests.push(...folderRequests);
            } else if (item.request) {
                // This is a request
                const request = this.convertPostmanRequest(item, folderPath);
                if (request) {
                    requests.push(request);
                }
            }
        });

        return requests;
    }

    convertPostmanRequest(postmanItem, folderPath = '') {
        try {
            const postmanRequest = postmanItem.request;

            // Handle different URL formats
            let url = '';
            if (typeof postmanRequest.url === 'string') {
                url = postmanRequest.url;
            } else if (postmanRequest.url && postmanRequest.url.raw) {
                url = postmanRequest.url.raw;
            } else if (postmanRequest.url) {
                // Reconstruct URL from parts
                const protocol = postmanRequest.url.protocol || 'https';
                const host = Array.isArray(postmanRequest.url.host) ? 
                    postmanRequest.url.host.join('.') : postmanRequest.url.host;
                const path = Array.isArray(postmanRequest.url.path) ? 
                    '/' + postmanRequest.url.path.join('/') : postmanRequest.url.path || '';

                url = `${protocol}://${host}${path}`;

                // Add query parameters
                if (postmanRequest.url.query && postmanRequest.url.query.length > 0) {
                    const queryString = postmanRequest.url.query
                        .filter(q => q.key && !q.disabled)
                        .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || '')}`)
                        .join('&');
                    if (queryString) {
                        url += '?' + queryString;
                    }
                }
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

            // Convert query parameters
            const params = [];
            if (postmanRequest.url && postmanRequest.url.query) {
                postmanRequest.url.query.forEach(param => {
                    if (param.key && !param.disabled) {
                        params.push({
                            key: param.key,
                            value: param.value || ''
                        });
                    }
                });
            }

            // Convert authentication
            const auth = this.convertPostmanAuth(postmanRequest.auth);

            // Convert body
            const body = this.convertPostmanBody(postmanRequest.body);

            // Create request name with folder path
            const name = folderPath ? `${folderPath}/${postmanItem.name}` : postmanItem.name;

            return {
                id: this.generateId('req'),
                name: name || 'Untitled Request',
                description: postmanItem.description || '',
                method: (postmanRequest.method || 'GET').toUpperCase(),
                url: url,
                headers: headers,
                params: params,
                cookies: [],
                auth: auth,
                body: body,
                createdAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error converting Postman request:', error);
            return null;
        }
    }

    convertPostmanAuth(postmanAuth) {
        if (!postmanAuth || !postmanAuth.type) {
            return { type: 'none' };
        }

        switch (postmanAuth.type) {
            case 'bearer':
                return {
                    type: 'bearer',
                    token: this.getPostmanAuthValue(postmanAuth.bearer, 'token') || ''
                };

            case 'basic':
                return {
                    type: 'basic',
                    username: this.getPostmanAuthValue(postmanAuth.basic, 'username') || '',
                    password: this.getPostmanAuthValue(postmanAuth.basic, 'password') || ''
                };

            case 'apikey':
                return {
                    type: 'apikey',
                    key: this.getPostmanAuthValue(postmanAuth.apikey, 'key') || '',
                    value: this.getPostmanAuthValue(postmanAuth.apikey, 'value') || '',
                    location: this.getPostmanAuthValue(postmanAuth.apikey, 'in') === 'query' ? 'query' : 'header'
                };

            default:
                console.warn('Unsupported Postman auth type:', postmanAuth.type);
                return { type: 'none' };
        }
    }

    getPostmanAuthValue(authObject, key) {
        if (!authObject) return null;

        if (Array.isArray(authObject)) {
            const item = authObject.find(item => item.key === key);
            return item ? item.value : null;
        } else if (authObject[key]) {
            return authObject[key];
        }

        return null;
    }

    convertPostmanBody(postmanBody) {
        if (!postmanBody || !postmanBody.mode) {
            return { type: 'none' };
        }

        switch (postmanBody.mode) {
            case 'raw':
                let rawData = postmanBody.raw || '';
                let bodyType = 'raw';

                // Check if it's JSON
                if (postmanBody.options && postmanBody.options.raw && 
                    postmanBody.options.raw.language === 'json') {
                    bodyType = 'json';
                } else {
                    try {
                        JSON.parse(rawData);
                        bodyType = 'json';
                    } catch (e) {
                        // Keep as raw
                    }
                }

                return {
                    type: bodyType,
                    data: rawData
                };

            case 'formdata':
                const formData = {};
                if (postmanBody.formdata && Array.isArray(postmanBody.formdata)) {
                    postmanBody.formdata.forEach(item => {
                        if (item.key && !item.disabled) {
                            formData[item.key] = item.value || '';
                        }
                    });
                }
                return {
                    type: 'form',
                    data: formData
                };

            case 'urlencoded':
                const urlencodedData = {};
                if (postmanBody.urlencoded && Array.isArray(postmanBody.urlencoded)) {
                    postmanBody.urlencoded.forEach(item => {
                        if (item.key && !item.disabled) {
                            urlencodedData[item.key] = item.value || '';
                        }
                    });
                }
                return {
                    type: 'form',
                    data: urlencodedData
                };

            default:
                return { type: 'none' };
        }
    }

    extractPostmanVariables(postmanCollection) {
        const variables = {};

        // Extract collection variables
        if (postmanCollection.variable && Array.isArray(postmanCollection.variable)) {
            postmanCollection.variable.forEach(variable => {
                if (variable.key) {
                    variables[variable.key] = variable.value || '';
                }
            });
        }

        return variables;
    }

    async importPostmanEnvironment(postmanEnvironment) {
        try {
            if (!postmanEnvironment.name || !postmanEnvironment.values) {
                return {
                    success: false,
                    error: 'Invalid Postman environment format'
                };
            }

            const environmentName = postmanEnvironment.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const variables = {};

            postmanEnvironment.values.forEach(variable => {
                if (variable.key && variable.enabled !== false) {
                    variables[variable.key] = variable.value || '';
                }
            });

            // Add to environments
            if (window.EnvironmentManager) {
                if (!window.EnvironmentManager.environments[environmentName]) {
                    window.EnvironmentManager.environments[environmentName] = {};
                }

                Object.assign(window.EnvironmentManager.environments[environmentName], variables);
                window.EnvironmentManager.saveEnvironments();
            }

            return {
                success: true,
                message: `Postman environment "${postmanEnvironment.name}" imported with ${Object.keys(variables).length} variables`
            };

        } catch (error) {
            console.error('Postman environment import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async importInsomniaExport(insomniaData) {
        try {
            if (!insomniaData.resources || !Array.isArray(insomniaData.resources)) {
                return {
                    success: false,
                    error: 'Invalid Insomnia export format'
                };
            }

            const collections = [];
            const environments = {};
            
            // Group resources by workspace
            const workspaces = {};
            
            insomniaData.resources.forEach(resource => {
                if (resource._type === 'workspace') {
                    workspaces[resource._id] = {
                        name: resource.name,
                        requests: [],
                        environments: []
                    };
                }
            });

            // Process requests and environments
            insomniaData.resources.forEach(resource => {
                if (resource._type === 'request') {
                    const request = this.convertInsomniaRequest(resource);
                    if (request) {
                        const workspaceId = resource.parentId;
                        if (workspaces[workspaceId]) {
                            workspaces[workspaceId].requests.push(request);
                        }
                    }
                } else if (resource._type === 'environment') {
                    const envName = resource.name || 'Imported Environment';
                    environments[envName] = resource.data || {};
                }
            });

            // Create collections from workspaces
            Object.values(workspaces).forEach(workspace => {
                if (workspace.requests.length > 0) {
                    const collection = {
                        id: this.generateId('col'),
                        name: workspace.name || 'Imported Insomnia Workspace',
                        description: 'Imported from Insomnia',
                        requests: workspace.requests,
                        variables: {},
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    collections.push(collection);
                }
            });

            // Save collections
            if (window.CollectionManager) {
                collections.forEach(collection => {
                    window.CollectionManager.collections.push(collection);
                });
                window.CollectionManager.saveCollections();
            }

            // Save environments
            if (window.EnvironmentManager) {
                Object.assign(window.EnvironmentManager.environments, environments);
                window.EnvironmentManager.saveEnvironments();
            }

            return {
                success: true,
                message: `Imported ${collections.length} collections and ${Object.keys(environments).length} environments from Insomnia`
            };

        } catch (error) {
            console.error('Insomnia import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    convertInsomniaRequest(insomniaRequest) {
        try {
            return {
                id: this.generateId('req'),
                name: insomniaRequest.name || 'Untitled Request',
                description: insomniaRequest.description || '',
                method: insomniaRequest.method || 'GET',
                url: insomniaRequest.url || '',
                headers: this.convertInsomniaHeaders(insomniaRequest.headers),
                params: this.convertInsomniaParams(insomniaRequest.parameters),
                cookies: [],
                auth: this.convertInsomniaAuth(insomniaRequest.authentication),
                body: this.convertInsomniaBody(insomniaRequest.body),
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error converting Insomnia request:', error);
            return null;
        }
    }

    convertInsomniaHeaders(headers) {
        if (!headers || !Array.isArray(headers)) return [];
        
        return headers.map(header => ({
            key: header.name || '',
            value: header.value || ''
        })).filter(h => h.key);
    }

    convertInsomniaParams(parameters) {
        if (!parameters || !Array.isArray(parameters)) return [];
        
        return parameters.map(param => ({
            key: param.name || '',
            value: param.value || ''
        })).filter(p => p.key);
    }

    convertInsomniaAuth(auth) {
        if (!auth || auth.disabled) {
            return { type: 'none' };
        }

        switch (auth.type) {
            case 'bearer':
                return {
                    type: 'bearer',
                    token: auth.token || ''
                };
            case 'basic':
                return {
                    type: 'basic',
                    username: auth.username || '',
                    password: auth.password || ''
                };
            default:
                return { type: 'none' };
        }
    }

    convertInsomniaBody(body) {
        if (!body) return { type: 'none' };

        switch (body.mimeType) {
            case 'application/json':
                return {
                    type: 'json',
                    data: body.text || ''
                };
            case 'application/x-www-form-urlencoded':
                const formData = {};
                if (body.params && Array.isArray(body.params)) {
                    body.params.forEach(param => {
                        if (param.name) {
                            formData[param.name] = param.value || '';
                        }
                    });
                }
                return {
                    type: 'form',
                    data: formData
                };
            default:
                return {
                    type: 'raw',
                    data: body.text || ''
                };
        }
    }

    async importOpenAPISpec(openApiSpec) {
        try {
            const version = openApiSpec.openapi || openApiSpec.swagger;
            if (!version) {
                return {
                    success: false,
                    error: 'Invalid OpenAPI specification'
                };
            }

            const info = openApiSpec.info || {};
            const servers = openApiSpec.servers || [{ url: 'https://api.example.com' }];
            const baseUrl = servers[0].url;

            const collection = {
                id: this.generateId('col'),
                name: info.title || 'OpenAPI Collection',
                description: info.description || 'Imported from OpenAPI specification',
                requests: [],
                variables: {
                    baseUrl: baseUrl
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Convert paths to requests
            if (openApiSpec.paths) {
                Object.entries(openApiSpec.paths).forEach(([path, pathItem]) => {
                    Object.entries(pathItem).forEach(([method, operation]) => {
                        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
                            const request = this.convertOpenAPIOperation(path, method, operation, baseUrl);
                            if (request) {
                                collection.requests.push(request);
                            }
                        }
                    });
                });
            }

            if (window.CollectionManager) {
                window.CollectionManager.collections.push(collection);
                window.CollectionManager.saveCollections();
            }

            return {
                success: true,
                message: `OpenAPI specification imported as "${collection.name}" with ${collection.requests.length} requests`
            };

        } catch (error) {
            console.error('OpenAPI import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    convertOpenAPIOperation(path, method, operation, baseUrl) {
        try {
            const url = `{{baseUrl}}${path}`;
            
            return {
                id: this.generateId('req'),
                name: operation.summary || `${method.toUpperCase()} ${path}`,
                description: operation.description || '',
                method: method.toUpperCase(),
                url: url,
                headers: [],
                params: this.extractOpenAPIParams(operation.parameters),
                cookies: [],
                auth: { type: 'none' },
                body: this.extractOpenAPIBody(operation.requestBody),
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error converting OpenAPI operation:', error);
            return null;
        }
    }

    extractOpenAPIParams(parameters) {
        if (!parameters || !Array.isArray(parameters)) return [];
        
        return parameters
            .filter(param => param.in === 'query')
            .map(param => ({
                key: param.name || '',
                value: param.example || param.default || ''
            }));
    }

    extractOpenAPIBody(requestBody) {
        if (!requestBody || !requestBody.content) {
            return { type: 'none' };
        }

        const contentTypes = Object.keys(requestBody.content);
        const firstContentType = contentTypes[0];

        if (firstContentType.includes('json')) {
            const schema = requestBody.content[firstContentType].schema;
            const example = requestBody.content[firstContentType].example || 
                           this.generateExampleFromSchema(schema);
            
            return {
                type: 'json',
                data: typeof example === 'string' ? example : JSON.stringify(example, null, 2)
            };
        }

        return { type: 'none' };
    }

    generateExampleFromSchema(schema) {
        if (!schema) return {};
        
        if (schema.example) return schema.example;
        if (schema.type === 'object' && schema.properties) {
            const example = {};
            Object.entries(schema.properties).forEach(([key, prop]) => {
                example[key] = prop.example || this.getDefaultValueForType(prop.type);
            });
            return example;
        }
        
        return {};
    }

    getDefaultValueForType(type) {
        switch (type) {
            case 'string': return 'string';
            case 'number': return 0;
            case 'boolean': return true;
            case 'array': return [];
            case 'object': return {};
            default: return null;
        }
    }

    async importPosterboyExport(posterboyData) {
        try {
            let imported = 0;

            // Import collections
            if (posterboyData.collections && Array.isArray(posterboyData.collections) && window.CollectionManager) {
                posterboyData.collections.forEach(collection => {
                    // Check for duplicates
                    const existing = window.CollectionManager.collections.find(col => col.name === collection.name);
                    if (existing) {
                        collection.name += ' (Imported)';
                    }
                    
                    collection.id = this.generateId('col');
                    collection.updatedAt = new Date().toISOString();
                    
                    window.CollectionManager.collections.push(collection);
                    imported++;
                });
                window.CollectionManager.saveCollections();
            }

            // Import environments
            if (posterboyData.environments && window.EnvironmentManager) {
                Object.assign(window.EnvironmentManager.environments, posterboyData.environments);
                window.EnvironmentManager.saveEnvironments();
            }

            // Import single collection
            if (posterboyData.info && posterboyData.item) {
                const result = await this.importPostmanCollection(posterboyData);
                return result;
            }

            return {
                success: true,
                message: `PosterBoy data imported: ${imported} collections and environments`
            };

        } catch (error) {
            console.error('PosterBoy import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async importCurlCommands(curlText) {
        try {
            const curlCommands = this.parseCurlCommands(curlText);
            
            if (curlCommands.length === 0) {
                return {
                    success: false,
                    error: 'No valid cURL commands found'
                };
            }

            const collection = {
                id: this.generateId('col'),
                name: 'Imported cURL Commands',
                description: 'Imported from cURL commands',
                requests: curlCommands,
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (window.CollectionManager) {
                window.CollectionManager.collections.push(collection);
                window.CollectionManager.saveCollections();
            }

            return {
                success: true,
                message: `Imported ${curlCommands.length} cURL commands as requests`
            };

        } catch (error) {
            console.error('cURL import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    parseCurlCommands(curlText) {
        const commands = [];
        const curlRegex = /curl\s+(?:(?:-[^\s]+\s+[^\s]+)|(?:[^\s]+))/g;
        const matches = curlText.match(curlRegex);

        if (matches) {
            matches.forEach((command, index) => {
                try {
                    const request = this.parseSingleCurlCommand(command);
                    if (request) {
                        request.name = `cURL Request ${index + 1}`;
                        commands.push(request);
                    }
                } catch (error) {
                    console.warn('Error parsing cURL command:', error);
                }
            });
        }

        return commands;
    }

    parseSingleCurlCommand(curlCommand) {
        const request = {
            id: this.generateId('req'),
            name: 'cURL Request',
            description: 'Imported from cURL command',
            method: 'GET',
            url: '',
            headers: [],
            params: [],
            cookies: [],
            auth: { type: 'none' },
            body: { type: 'none' },
            createdAt: new Date().toISOString()
        };

        // Extract method
        const methodMatch = curlCommand.match(/-X\s+(\w+)/);
        if (methodMatch) {
            request.method = methodMatch[1].toUpperCase();
        }

        // Extract URL
        const urlMatch = curlCommand.match(/(?:curl\s+)?(?:-[^\s]+\s+[^\s]+\s+)*['"]?([^'">\s]+)['"]?/);
        if (urlMatch) {
            request.url = urlMatch[1];
        }

        // Extract headers
        const headerMatches = curlCommand.matchAll(/-H\s+['"]([^'"]+)['"]/g);
        for (const match of headerMatches) {
            const headerParts = match[1].split(':');
            if (headerParts.length >= 2) {
                request.headers.push({
                    key: headerParts[0].trim(),
                    value: headerParts.slice(1).join(':').trim()
                });
            }
        }

        // Extract body data
        const dataMatch = curlCommand.match(/-d\s+['"]([^'"]+)['"]/);
        if (dataMatch) {
            const bodyData = dataMatch[1];
            try {
                JSON.parse(bodyData);
                request.body = {
                    type: 'json',
                    data: bodyData
                };
            } catch (e) {
                request.body = {
                    type: 'raw',
                    data: bodyData
                };
            }
        }

        return request.url ? request : null;
    }

    async importHarFile(harData) {
        try {
            if (!harData.log || !harData.log.entries) {
                return {
                    success: false,
                    error: 'Invalid HAR file format'
                };
            }

            const requests = [];

            harData.log.entries.forEach((entry, index) => {
                try {
                    const request = this.convertHarEntry(entry, index);
                    if (request) {
                        requests.push(request);
                    }
                } catch (error) {
                    console.warn('Error converting HAR entry:', error);
                }
            });

            if (requests.length === 0) {
                return {
                    success: false,
                    error: 'No valid requests found in HAR file'
                };
            }

            const collection = {
                id: this.generateId('col'),
                name: 'HAR Import',
                description: 'Imported from HAR file',
                requests: requests,
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (window.CollectionManager) {
                window.CollectionManager.collections.push(collection);
                window.CollectionManager.saveCollections();
            }

            return {
                success: true,
                message: `Imported ${requests.length} requests from HAR file`
            };

        } catch (error) {
            console.error('HAR import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    convertHarEntry(entry, index) {
        const harRequest = entry.request;
        
        if (!harRequest || !harRequest.url) {
            return null;
        }

        const url = new URL(harRequest.url);
        
        return {
            id: this.generateId('req'),
            name: `HAR Request ${index + 1} - ${harRequest.method} ${url.pathname}`,
            description: `Imported from HAR - ${url.hostname}`,
            method: harRequest.method || 'GET',
            url: harRequest.url,
            headers: (harRequest.headers || []).map(h => ({
                key: h.name,
                value: h.value
            })),
            params: (harRequest.queryString || []).map(p => ({
                key: p.name,
                value: p.value
            })),
            cookies: (harRequest.cookies || []).map(c => ({
                key: c.name,
                value: c.value
            })),
            auth: { type: 'none' },
            body: this.convertHarBody(harRequest.postData),
            createdAt: new Date().toISOString()
        };
    }

    convertHarBody(postData) {
        if (!postData) {
            return { type: 'none' };
        }

        if (postData.mimeType && postData.mimeType.includes('json')) {
            return {
                type: 'json',
                data: postData.text || ''
            };
        }

        if (postData.params && Array.isArray(postData.params)) {
            const formData = {};
            postData.params.forEach(param => {
                if (param.name) {
                    formData[param.name] = param.value || '';
                }
            });
            return {
                type: 'form',
                data: formData
            };
        }

        return {
            type: 'raw',
            data: postData.text || ''
        };
    }

    refreshDisplays() {
        // Refresh all displays after import
        if (window.CollectionManager && window.CollectionManager.updateDisplay) {
            window.CollectionManager.updateDisplay();
            if (window.CollectionManager.updateTargetCollectionSelect) {
                window.CollectionManager.updateTargetCollectionSelect();
            }
        }
        
        if (window.EnvironmentManager && window.EnvironmentManager.updateDisplay) {
            window.EnvironmentManager.updateDisplay();
            if (window.EnvironmentManager.updateEnvironmentSelect) {
                window.EnvironmentManager.updateEnvironmentSelect();
            }
        }
    }

    getSupportedFormats() {
        return {
            'Postman Collection': {
                extension: '.json',
                description: 'Postman collection files'
            },
            'Postman Environment': {
                extension: '.json',
                description: 'Postman environment files'
            },
            'Insomnia Export': {
                extension: '.json',
                description: 'Insomnia workspace export'
            },
            'OpenAPI Specification': {
                extension: '.json',
                description: 'OpenAPI/Swagger specification'
            },
            'PosterBoy Export': {
                extension: '.json',
                description: 'PosterBoy export files'
            },
            'cURL Commands': {
                extension: '.txt',
                description: 'Text file with cURL commands'
            },
            'HAR File': {
                extension: '.har',
                description: 'HTTP Archive files'
            }
        };
    }

    // Utility methods
    generateId(prefix = 'id') {
        try {
            if (window.Core && typeof window.Core.generateId === 'function') {
                return window.Core.generateId(prefix);
            } else {
                return this.generateFallbackId(prefix);
            }
        } catch (error) {
            return this.generateFallbackId(prefix);
        }
    }

    generateFallbackId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}_${timestamp}_${random}`;
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
            supportedFormats: this.supportedFormats.length
        };
    }

    
async handleCollectionImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Store reference to input element early to safely reset it later
    const inputElement = event.target;
    
    try {
        // Check if CollectionManager is available
        if (!window.CollectionManager) {
            throw new Error('CollectionManager is not available. Please refresh the page and try again.');
        }
        
        const text = await this.readFile(file);
        const importData = JSON.parse(text);
        
        // Check if it's a Postman collection
        if (this.isPostmanCollection(importData)) {
            const result = await this.importPostmanCollectionToManager(importData);
            if (result.success) {
                this.showNotification('Collection Imported', result.message);
                this.refreshDisplays();
            } else {
                alert('Collection import failed: ' + result.error);
            }
        } else if (this.isPosterboyCollection(importData)) {
            const result = await this.importPosterboyCollectionToManager(importData);
            if (result.success) {
                this.showNotification('Collection Imported', result.message);
                this.refreshDisplays();
            } else {
                alert('Collection import failed: ' + result.error);
            }
        } else {
            throw new Error('Unsupported collection format. Please ensure you are importing a valid Postman collection or PosterBoy export file.');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        alert('Error importing collection: ' + error.message);
    } finally {
        // Safely reset file input with comprehensive null checks
        this.safeResetFileInput(inputElement);
    }
}

// Add this new method to safely reset file input
safeResetFileInput(inputElement) {
    try {
        // Multiple safety checks
        if (inputElement && 
            typeof inputElement === 'object' && 
            inputElement.nodeType === 1 && // Ensure it's an Element node
            inputElement.tagName === 'INPUT' &&
            'value' in inputElement) {
            
            inputElement.value = '';
            console.log('File input reset successfully');
        } else {
            console.log('File input element not available for reset (this is normal)');
        }
    } catch (resetError) {
        // This is not critical, just log it
        console.log('Could not reset file input (this is normal):', resetError.message);
    }
}
// Check if it's a Postman collection
isPostmanCollection(data) {
    return data.info && data.info.schema && data.info.schema.includes('postman');
}

// Check if it's a PosterBoy collection
isPosterboyCollection(data) {
    return data.posterboy_export || data.posterboy_collection;
}

// Import Postman collection with folder support
async importPostmanCollection(postmanData) {
    const collectionName = postmanData.info.name || 'Imported Collection';
    
    const newCollection = {
        id: this.generateId('col'),
        name: collectionName,
        description: postmanData.info.description || 'Imported from Postman',
        requests: [],
        folders: [],
        variables: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Process variables
    if (postmanData.variable) {
        postmanData.variable.forEach(variable => {
            if (variable.key && variable.value !== undefined) {
                newCollection.variables[variable.key] = variable.value;
            }
        });
    }
    
    // Process items (folders and requests)
    if (postmanData.item) {
        await this.processPostmanItems(postmanData.item, newCollection);
    }
    
    this.collections.push(newCollection);
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    this.showNotification(
        'Collection Imported', 
        `"${collectionName}" imported successfully with ${newCollection.folders.length} folders and ${this.getTotalRequestCount(newCollection)} requests`
    );
}

// Process Postman items (recursive for nested folders)
async processPostmanItems(items, collection, parentFolderId = null) {
    for (const item of items) {
        if (item.item) {
            // This is a folder
            const folder = {
                id: this.generateId('folder'),
                name: item.name,
                description: item.description || '',
                parentId: parentFolderId,
                requests: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            collection.folders.push(folder);
            
            // Process folder items recursively
            await this.processPostmanItems(item.item, collection, folder.id);
            
        } else if (item.request) {
            // This is a request
            const request = await this.convertPostmanRequest(item);
            request.folderId = parentFolderId;
            
            if (parentFolderId) {
                // Add to folder
                const folder = collection.folders.find(f => f.id === parentFolderId);
                if (folder) {
                    folder.requests.push(request);
                } else {
                    collection.requests.push(request); // Fallback
                }
            } else {
                // Add to collection root
                collection.requests.push(request);
            }
        }
    }
}

// Convert Postman request to PosterBoy format
async convertPostmanRequest(postmanItem) {
    const postmanRequest = postmanItem.request;
    
    const request = {
        id: this.generateId('req'),
        name: postmanItem.name,
        description: postmanItem.description || '',
        method: postmanRequest.method || 'GET',
        url: this.extractPostmanUrl(postmanRequest.url),
        headers: this.convertPostmanHeaders(postmanRequest.header),
        params: this.convertPostmanParams(postmanRequest.url),
        cookies: [], // Postman doesn't export cookies separately
        auth: this.convertPostmanAuth(postmanRequest.auth),
        body: this.convertPostmanBody(postmanRequest.body),
        folderId: null, // Will be set by caller
        createdAt: new Date().toISOString()
    };
    
    return request;
}

// Extract URL from Postman format
extractPostmanUrl(urlData) {
    if (typeof urlData === 'string') {
        return urlData;
    }
    
    if (urlData && urlData.raw) {
        return urlData.raw;
    }
    
    if (urlData && urlData.protocol && urlData.host && urlData.path) {
        const protocol = Array.isArray(urlData.protocol) ? urlData.protocol.join('') : urlData.protocol;
        const host = Array.isArray(urlData.host) ? urlData.host.join('.') : urlData.host;
        const path = Array.isArray(urlData.path) ? urlData.path.join('/') : urlData.path;
        return `${protocol}://${host}/${path}`;
    }
    
    return '';
}

// Convert Postman headers
convertPostmanHeaders(headers) {
    if (!Array.isArray(headers)) return [];
    
    return headers
        .filter(header => !header.disabled)
        .map(header => ({
            key: header.key || '',
            value: header.value || ''
        }));
}

// Convert Postman query parameters
convertPostmanParams(urlData) {
    if (!urlData || !urlData.query) return [];
    
    return urlData.query
        .filter(param => !param.disabled)
        .map(param => ({
            key: param.key || '',
            value: param.value || ''
        }));
}

// Convert Postman auth
convertPostmanAuth(auth) {
    if (!auth) return { type: 'none' };
    
    switch (auth.type) {
        case 'bearer':
            const bearerToken = auth.bearer?.find(item => item.key === 'token');
            return {
                type: 'bearer',
                token: bearerToken?.value || ''
            };
        case 'basic':
            const username = auth.basic?.find(item => item.key === 'username');
            const password = auth.basic?.find(item => item.key === 'password');
            return {
                type: 'basic',
                username: username?.value || '',
                password: password?.value || ''
            };
        case 'apikey':
            const key = auth.apikey?.find(item => item.key === 'key');
            const value = auth.apikey?.find(item => item.key === 'value');
            const location = auth.apikey?.find(item => item.key === 'in');
            return {
                type: 'apikey',
                key: key?.value || '',
                value: value?.value || '',
                location: location?.value || 'header'
            };
        default:
            return { type: 'none' };
    }
}

// Convert Postman body
convertPostmanBody(body) {
    if (!body) return { type: 'none' };
    
    switch (body.mode) {
        case 'raw':
            // Check if it's JSON
            if (body.options?.raw?.language === 'json') {
                try {
                    return {
                        type: 'json',
                        data: JSON.parse(body.raw)
                    };
                } catch (e) {
                    return {
                        type: 'json',
                        data: body.raw
                    };
                }
            }
            return {
                type: 'raw',
                data: body.raw || ''
            };
        case 'urlencoded':
            const formData = {};
            if (Array.isArray(body.urlencoded)) {
                body.urlencoded.forEach(field => {
                    if (field.key && !field.disabled) {
                        formData[field.key] = field.value || '';
                    }
                });
            }
            return {
                type: 'form',
                data: formData
            };
        case 'formdata':
            const formDataFields = {};
            if (Array.isArray(body.formdata)) {
                body.formdata.forEach(field => {
                    if (field.key && !field.disabled && field.type !== 'file') {
                        formDataFields[field.key] = field.value || '';
                    }
                });
            }
            return {
                type: 'form',
                data: formDataFields
            };
        default:
            return { type: 'none' };
    }
}

// Import PosterBoy collection
async importPosterBoyCollection(posterboyData) {
    const collections = posterboyData.collections || [posterboyData];
    
    for (const collectionData of collections) {
        // Generate new IDs to avoid conflicts
        const newCollection = {
            ...collectionData,
            id: this.generateId('col'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Regenerate request IDs
        if (newCollection.requests) {
            newCollection.requests.forEach(request => {
                request.id = this.generateId('req');
            });
        }
        
        // Regenerate folder IDs
        if (newCollection.folders) {
            const folderIdMap = new Map();
            
            newCollection.folders.forEach(folder => {
                const oldId = folder.id;
                folder.id = this.generateId('folder');
                folderIdMap.set(oldId, folder.id);
                
                // Regenerate request IDs in folders
                if (folder.requests) {
                    folder.requests.forEach(request => {
                        request.id = this.generateId('req');
                    });
                }
            });
            
            // Update parent references
            newCollection.folders.forEach(folder => {
                if (folder.parentId && folderIdMap.has(folder.parentId)) {
                    folder.parentId = folderIdMap.get(folder.parentId);
                }
            });
            
            // Update request folder references
            newCollection.requests.forEach(request => {
                if (request.folderId && folderIdMap.has(request.folderId)) {
                    request.folderId = folderIdMap.get(request.folderId);
                }
            });
        }
        
        this.collections.push(newCollection);
    }
    
    this.saveCollections();
    this.updateDisplay();
    this.updateTargetCollectionSelect();
    
    this.showNotification(
        'Collection(s) Imported', 
        `${collections.length} collection(s) imported successfully`
    );
}

// Helper method to read file
async readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
}

// Global instance
window.ImportManager = new ImportManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportManager;
}