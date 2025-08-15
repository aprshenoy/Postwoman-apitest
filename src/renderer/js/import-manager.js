// Import Manager - Handles importing from various formats (Postman, Insomnia, etc.)

class ImportManager {
    constructor() {
        this.supportedFormats = [
            'postman_collection',
            'postman_environment',
            'insomnia_export',
            'openapi_spec',
            'postwoman_export',
            'curl_commands',
            'har_file'
        ];
        this.initialize();
    }

    initialize() {
        // Set up file input handlers
        this.setupFileHandlers();
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
                Core.showNotification('Import Successful', importResult.message);
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
            const content = await this.readFile(file);
            const result = await this.importCollection(content, file.name);
            
            if (result.success) {
                Core.showNotification('Collection Imported', result.message);
                CollectionManager.updateDisplay();
            } else {
                alert('Collection import failed: ' + result.error);
            }
        } catch (error) {
            console.error('Collection import error:', error);
            alert('Error importing collection: ' + error.message);
        } finally {
            event.target.value = '';
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
                
                case 'postwoman_export':
                    return await this.importPostwomanExport(data);
                
                case 'har_file':
                    return await this.importHarFile(data);
                
                default:
                    return {
                        success: false,
                        error: 'Unsupported file format. Please import a valid Postman collection, environment, or PostWoman export file.'
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
        
        // PostWoman Export
        if (data.postwoman_export || data.postwoman_collection || data.postwoman_environments) {
            return 'postwoman_export';
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
        } else if (format === 'postwoman_export') {
            return await this.importPostwomanExport(data);
        } else {
            return {
                success: false,
                error: 'Unsupported collection format'
            };
        }
    }

    async importPostmanCollection(postmanCollection) {
        try {
            if (!postmanCollection.info || !postmanCollection.item) {
                return {
                    success: false,
                    error: 'Invalid Postman collection format'
                };
            }

            const collection = {
                id: Core.generateId('col'),
                name: postmanCollection.info.name || 'Imported Postman Collection',
                description: postmanCollection.info.description || 'Imported from Postman',
                requests: [],
                variables: this.extractPostmanVariables(postmanCollection),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Process items (requests and folders)
            collection.requests = this.processPostmanItems(postmanCollection.item);

            // Check for duplicate collection names
            const existingCollection = CollectionManager.collections.find(col => col.name === collection.name);
            if (existingCollection) {
                collection.name += ' (Imported)';
            }

            CollectionManager.collections.push(collection);
            CollectionManager.saveCollections();

            return {
                success: true,
                message: `"${collection.name}" imported with ${collection.requests.length} requests`
            };

        } catch (error) {
            console.error('Postman import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
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
                id: Core.generateId('req'),
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
            if (!EnvironmentManager.environments[environmentName]) {
                EnvironmentManager.environments[environmentName] = {};
            }

            Object.assign(EnvironmentManager.environments[environmentName], variables);
            EnvironmentManager.saveEnvironments();

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
                        id: Core.generateId('col'),
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
            collections.forEach(collection => {
                CollectionManager.collections.push(collection);
            });
            CollectionManager.saveCollections();

            // Save environments
            Object.assign(EnvironmentManager.environments, environments);
            EnvironmentManager.saveEnvironments();

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
                id: Core.generateId('req'),
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
                id: Core.generateId('col'),
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

            CollectionManager.collections.push(collection);
            CollectionManager.saveCollections();

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
                id: Core.generateId('req'),
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

    async importPostwomanExport(postwomanData) {
        try {
            let imported = 0;

            // Import collections
            if (postwomanData.collections && Array.isArray(postwomanData.collections)) {
                postwomanData.collections.forEach(collection => {
                    // Check for duplicates
                    const existing = CollectionManager.collections.find(col => col.name === collection.name);
                    if (existing) {
                        collection.name += ' (Imported)';
                    }
                    
                    collection.id = Core.generateId('col');
                    collection.updatedAt = new Date().toISOString();
                    
                    CollectionManager.collections.push(collection);
                    imported++;
                });
                CollectionManager.saveCollections();
            }

            // Import environments
            if (postwomanData.environments) {
                Object.assign(EnvironmentManager.environments, postwomanData.environments);
                EnvironmentManager.saveEnvironments();
            }

            // Import single collection
            if (postwomanData.info && postwomanData.item) {
                const result = await this.importPostmanCollection(postwomanData);
                return result;
            }

            return {
                success: true,
                message: `PostWoman data imported: ${imported} collections and environments`
            };

        } catch (error) {
            console.error('PostWoman import error:', error);
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
                id: Core.generateId('col'),
                name: 'Imported cURL Commands',
                description: 'Imported from cURL commands',
                requests: curlCommands,
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CollectionManager.collections.push(collection);
            CollectionManager.saveCollections();

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
            id: Core.generateId('req'),
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
                id: Core.generateId('col'),
                name: 'HAR Import',
                description: 'Imported from HAR file',
                requests: requests,
                variables: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CollectionManager.collections.push(collection);
            CollectionManager.saveCollections();

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
            id: Core.generateId('req'),
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
        if (typeof CollectionManager !== 'undefined') {
            CollectionManager.updateDisplay();
            CollectionManager.updateTargetCollectionSelect();
        }
        
        if (typeof EnvironmentManager !== 'undefined') {
            EnvironmentManager.updateDisplay();
            EnvironmentManager.updateEnvironmentSelect();
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
            'PostWoman Export': {
                extension: '.json',
                description: 'PostWoman export files'
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
}

// Global instance
window.ImportManager = new ImportManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportManager;
}