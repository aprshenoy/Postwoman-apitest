// Request Manager - Handles HTTP requests and response processing

class RequestManager {
    constructor() {
        this.currentRequest = null;
        this.currentResponse = null;
        this.isLoading = false;
        this.controller = null; // For aborting requests
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateCurlCommand();
    }

    setupEventListeners() {
        // Auto-update cURL command when inputs change
        const inputs = [
            'url', 'method', 'currentEnvironment'
        ];
        
        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.updateCurlCommand());
                element.addEventListener('input', () => this.updateCurlCommand());
            }
        });

        // Listen for environment changes
        Core.on('environmentChanged', () => this.updateCurlCommand());
        Core.on('paramAdded', () => this.updateCurlCommand());
        Core.on('headerAdded', () => this.updateCurlCommand());
        Core.on('authFieldsChanged', () => this.updateCurlCommand());
        Core.on('bodyFieldsChanged', () => this.updateCurlCommand());
    }

    getCurrentRequestData() {
        return {
            method: this.getMethod(),
            url: this.getUrl(),
            headers: this.getHeaders(),
            params: this.getParams(),
            cookies: this.getCookies(),
            auth: this.getAuthData(),
            body: this.getBodyData()
        };
    }

    getMethod() {
        const methodSelect = document.getElementById('method');
        return methodSelect ? methodSelect.value : 'GET';
    }

    getUrl() {
        const urlInput = document.getElementById('url');
        return urlInput ? urlInput.value.trim() : '';
    }

    getHeaders() {
        const headers = [];
        const container = document.getElementById('headersContainer');
        if (!container) return headers;
        
        container.querySelectorAll('.key-value-pair').forEach(pair => {
            const key = pair.querySelector('.header-key')?.value?.trim();
            const value = pair.querySelector('.header-value')?.value?.trim();
            if (key && value) {
                headers.push({ key, value });
            }
        });
        
        // Add auth headers
        const authHeaders = this.getAuthHeaders();
        headers.push(...authHeaders);
        
        return headers;
    }

    getParams() {
        const params = [];
        const container = document.getElementById('paramsContainer');
        if (!container) return params;
        
        container.querySelectorAll('.key-value-pair').forEach(pair => {
            const key = pair.querySelector('.param-key')?.value?.trim();
            const value = pair.querySelector('.param-value')?.value?.trim();
            if (key && value) {
                params.push({ key, value });
            }
        });
        
        // Add API key to params if configured
        const auth = this.getAuthData();
        if (auth.type === 'apikey' && auth.location === 'query' && auth.key && auth.value) {
            params.push({ key: auth.key, value: auth.value });
        }
        
        return params;
    }

    getCookies() {
        const cookies = [];
        const container = document.getElementById('cookiesContainer');
        if (!container) return cookies;
        
        container.querySelectorAll('.key-value-pair').forEach(pair => {
            const key = pair.querySelector('.cookie-key')?.value?.trim();
            const value = pair.querySelector('.cookie-value')?.value?.trim();
            if (key && value) {
                cookies.push({ key, value });
            }
        });
        
        return cookies;
    }

    getAuthData() {
        const authType = document.getElementById('authType')?.value;
        
        switch (authType) {
            case 'bearer':
                return {
                    type: 'bearer',
                    token: document.getElementById('bearerToken')?.value?.trim() || ''
                };
            
            case 'basic':
                return {
                    type: 'basic',
                    username: document.getElementById('basicUsername')?.value?.trim() || '',
                    password: document.getElementById('basicPassword')?.value?.trim() || ''
                };
            
            case 'apikey':
                return {
                    type: 'apikey',
                    key: document.getElementById('apikeyKey')?.value?.trim() || '',
                    value: document.getElementById('apikeyValue')?.value?.trim() || '',
                    location: document.getElementById('apikeyLocation')?.value || 'header'
                };
            
            default:
                return { type: 'none' };
        }
    }

    getAuthHeaders() {
        const auth = this.getAuthData();
        const headers = [];
        
        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    headers.push({ key: 'Authorization', value: `Bearer ${auth.token}` });
                }
                break;
            
            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = btoa(`${auth.username}:${auth.password}`);
                    headers.push({ key: 'Authorization', value: `Basic ${credentials}` });
                }
                break;
            
            case 'apikey':
                if (auth.location === 'header' && auth.key && auth.value) {
                    headers.push({ key: auth.key, value: auth.value });
                }
                break;
        }
        
        return headers;
    }

    getBodyData() {
        const bodyType = document.getElementById('bodyType')?.value;
        
        switch (bodyType) {
            case 'json':
                const jsonInput = document.getElementById('jsonInput')?.value?.trim();
                return {
                    type: 'json',
                    data: jsonInput || ''
                };
            
            case 'form':
                const formData = {};
                const container = document.getElementById('formDataContainer');
                if (container) {
                    container.querySelectorAll('.key-value-pair').forEach(pair => {
                        const key = pair.querySelector('.form-key')?.value?.trim();
                        const value = pair.querySelector('.form-value')?.value?.trim();
                        if (key && value) {
                            formData[key] = value;
                        }
                    });
                }
                return {
                    type: 'form',
                    data: formData
                };
            
            case 'raw':
                const rawInput = document.getElementById('rawInput')?.value?.trim();
                return {
                    type: 'raw',
                    data: rawInput || ''
                };
            
            default:
                return { type: 'none' };
        }
    }

    loadRequest(requestData) {
        // Load method
        const methodSelect = document.getElementById('method');
        if (methodSelect) {
            methodSelect.value = requestData.method || 'GET';
        }
        
        // Load URL
        const urlInput = document.getElementById('url');
        if (urlInput) {
            urlInput.value = requestData.url || '';
        }
        
        // Load headers
        this.loadHeaders(requestData.headers || []);
        
        // Load params
        this.loadParams(requestData.params || []);
        
        // Load cookies
        this.loadCookies(requestData.cookies || []);
        
        // Load auth
        this.loadAuth(requestData.auth || { type: 'none' });
        
        // Load body
        this.loadBody(requestData.body || { type: 'none' });
        
        this.updateCurlCommand();
    }

    loadHeaders(headers) {
        const container = document.getElementById('headersContainer');
        if (!container) return;
        
        // Clear existing headers
        container.innerHTML = '';
        
        // Add headers
        headers.forEach(header => {
            this.addHeaderRow(header.key, header.value);
        });
        
        // Ensure we have at least one empty row
        if (headers.length === 0) {
            this.addHeaderRow();
        }
    }

    loadParams(params) {
        const container = document.getElementById('paramsContainer');
        if (!container) return;
        
        // Clear existing params
        container.innerHTML = '';
        
        // Add params
        params.forEach(param => {
            this.addParamRow(param.key, param.value);
        });
        
        // Ensure we have at least one empty row
        if (params.length === 0) {
            this.addParamRow();
        }
    }

    loadCookies(cookies) {
        const container = document.getElementById('cookiesContainer');
        if (!container) return;
        
        // Clear existing cookies
        container.innerHTML = '';
        
        // Add cookies
        cookies.forEach(cookie => {
            this.addCookieRow(cookie.key, cookie.value);
        });
        
        // Ensure we have at least one empty row
        if (cookies.length === 0) {
            this.addCookieRow();
        }
    }

    loadAuth(auth) {
        const authType = document.getElementById('authType');
        if (!authType) return;
        
        authType.value = auth.type || 'none';
        UI.toggleAuthFields();
        
        switch (auth.type) {
            case 'bearer':
                const bearerToken = document.getElementById('bearerToken');
                if (bearerToken) bearerToken.value = auth.token || '';
                break;
            
            case 'basic':
                const basicUsername = document.getElementById('basicUsername');
                const basicPassword = document.getElementById('basicPassword');
                if (basicUsername) basicUsername.value = auth.username || '';
                if (basicPassword) basicPassword.value = auth.password || '';
                break;
            
            case 'apikey':
                const apikeyKey = document.getElementById('apikeyKey');
                const apikeyValue = document.getElementById('apikeyValue');
                const apikeyLocation = document.getElementById('apikeyLocation');
                if (apikeyKey) apikeyKey.value = auth.key || '';
                if (apikeyValue) apikeyValue.value = auth.value || '';
                if (apikeyLocation) apikeyLocation.value = auth.location || 'header';
                break;
        }
    }

    loadBody(body) {
        const bodyType = document.getElementById('bodyType');
        if (!bodyType) return;
        
        bodyType.value = body.type || 'none';
        UI.toggleBodyFields();
        
        switch (body.type) {
            case 'json':
                const jsonInput = document.getElementById('jsonInput');
                if (jsonInput) {
                    jsonInput.value = typeof body.data === 'object' 
                        ? JSON.stringify(body.data, null, 2) 
                        : body.data || '';
                }
                break;
            
            case 'form':
                const formContainer = document.getElementById('formDataContainer');
                if (formContainer && body.data) {
                    formContainer.innerHTML = '';
                    Object.entries(body.data).forEach(([key, value]) => {
                        this.addFormDataRow(key, value);
                    });
                }
                break;
            
            case 'raw':
                const rawInput = document.getElementById('rawInput');
                if (rawInput) rawInput.value = body.data || '';
                break;
        }
    }

    addHeaderRow(key = '', value = '') {
        const container = document.getElementById('headersContainer');
        if (!container) return;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'key-value-pair';
        headerDiv.innerHTML = `
            <input type="text" placeholder="Header Name" class="header-key" value="${Core.escapeHtml(key)}">
            <input type="text" placeholder="Header Value (use {{variables}})" class="header-value" value="${Core.escapeHtml(value)}">
            <button class="remove-btn" onclick="this.parentNode.remove(); RequestManager.updateCurlCommand()">×</button>
        `;
        container.appendChild(headerDiv);
    }

    addParamRow(key = '', value = '') {
        const container = document.getElementById('paramsContainer');
        if (!container) return;
        
        const paramDiv = document.createElement('div');
        paramDiv.className = 'key-value-pair';
        paramDiv.innerHTML = `
            <input type="text" placeholder="Key" class="param-key" value="${Core.escapeHtml(key)}">
            <input type="text" placeholder="Value (use {{variables}})" class="param-value" value="${Core.escapeHtml(value)}">
            <button class="remove-btn" onclick="this.parentNode.remove(); RequestManager.updateCurlCommand()">×</button>
        `;
        container.appendChild(paramDiv);
    }

    addCookieRow(key = '', value = '') {
        const container = document.getElementById('cookiesContainer');
        if (!container) return;
        
        const cookieDiv = document.createElement('div');
        cookieDiv.className = 'key-value-pair';
        cookieDiv.innerHTML = `
            <input type="text" placeholder="Cookie Name" class="cookie-key" value="${Core.escapeHtml(key)}">
            <input type="text" placeholder="Cookie Value (use {{variables}})" class="cookie-value" value="${Core.escapeHtml(value)}">
            <button class="remove-btn" onclick="this.parentNode.remove(); RequestManager.updateCurlCommand()">×</button>
        `;
        container.appendChild(cookieDiv);
    }

    addFormDataRow(key = '', value = '') {
        const container = document.getElementById('formDataContainer');
        if (!container) return;
        
        const formDiv = document.createElement('div');
        formDiv.className = 'key-value-pair';
        formDiv.innerHTML = `
            <input type="text" placeholder="Key" class="form-key" value="${Core.escapeHtml(key)}">
            <input type="text" placeholder="Value (use {{variables}})" class="form-value" value="${Core.escapeHtml(value)}">
            <button class="remove-btn" onclick="this.parentNode.remove(); RequestManager.updateCurlCommand()">×</button>
        `;
        container.appendChild(formDiv);
    }

    updateCurlCommand() {
        const curlCode = document.getElementById('curlCode');
        if (!curlCode) return;
        
        const requestData = this.getCurrentRequestData();
        const processedData = this.processRequestData(requestData);
        
        let curlCommand = `curl -X ${processedData.method}`;
        
        // Add headers
        processedData.headers.forEach(header => {
            if (header.key && header.value) {
                curlCommand += ` \\\n  -H "${header.key}: ${header.value}"`;
            }
        });
        
        // Add cookies
        if (processedData.cookies.length > 0) {
            const cookieString = processedData.cookies
                .filter(cookie => cookie.key && cookie.value)
                .map(cookie => `${cookie.key}=${cookie.value}`)
                .join('; ');
            if (cookieString) {
                curlCommand += ` \\\n  -H "Cookie: ${cookieString}"`;
            }
        }
        
        // Add body
        if (processedData.body && processedData.body.type !== 'none') {
            const bodyContent = this.getBodyContent(processedData.body);
            if (bodyContent) {
                curlCommand += ` \\\n  -d '${bodyContent}'`;
            }
        }
        
        // Add URL with params
        let finalUrl = processedData.url;
        if (processedData.params.length > 0) {
            const paramString = processedData.params
                .filter(param => param.key && param.value)
                .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
                .join('&');
            if (paramString) {
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + paramString;
            }
        }
        
        curlCommand += ` \\\n  "${finalUrl}"`;
        
        curlCode.textContent = curlCommand;
    }

    processRequestData(requestData) {
        // Replace environment variables in all fields
        const processed = Core.deepClone(requestData);
        
        processed.url = EnvironmentManager.replaceVariables(processed.url);
        
        processed.headers = processed.headers.map(header => ({
            key: header.key,
            value: EnvironmentManager.replaceVariables(header.value)
        }));
        
        processed.params = processed.params.map(param => ({
            key: param.key,
            value: EnvironmentManager.replaceVariables(param.value)
        }));
        
        processed.cookies = processed.cookies.map(cookie => ({
            key: cookie.key,
            value: EnvironmentManager.replaceVariables(cookie.value)
        }));
        
        // Process auth
        if (processed.auth.type === 'bearer' && processed.auth.token) {
            processed.auth.token = EnvironmentManager.replaceVariables(processed.auth.token);
        } else if (processed.auth.type === 'basic') {
            processed.auth.username = EnvironmentManager.replaceVariables(processed.auth.username);
            processed.auth.password = EnvironmentManager.replaceVariables(processed.auth.password);
        } else if (processed.auth.type === 'apikey') {
            processed.auth.value = EnvironmentManager.replaceVariables(processed.auth.value);
        }
        
        // Process body
        if (processed.body.type === 'json' && processed.body.data) {
            processed.body.data = EnvironmentManager.replaceVariables(processed.body.data);
        } else if (processed.body.type === 'form' && processed.body.data) {
            Object.keys(processed.body.data).forEach(key => {
                processed.body.data[key] = EnvironmentManager.replaceVariables(processed.body.data[key]);
            });
        } else if (processed.body.type === 'raw' && processed.body.data) {
            processed.body.data = EnvironmentManager.replaceVariables(processed.body.data);
        }
        
        return processed;
    }

    getBodyContent(body) {
        switch (body.type) {
            case 'json':
                return body.data;
            
            case 'form':
                return new URLSearchParams(body.data).toString();
            
            case 'raw':
                return body.data;
            
            default:
                return null;
        }
    }

    async sendRequest() {
        const sendBtn = document.getElementById('sendBtn');
        const responseContainer = document.getElementById('responseContainer');
        
        if (!sendBtn || !responseContainer) return;
        
        const requestData = this.getCurrentRequestData();
        
        if (!requestData.url) {
            alert('Please enter a URL');
            return;
        }
        
        // Validate URL
        try {
            new URL(EnvironmentManager.replaceVariables(requestData.url));
        } catch (e) {
            alert('Please enter a valid URL');
            return;
        }
        
        // Show loading state
        this.isLoading = true;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
        UI.showLoading(responseContainer, 'Sending request...');
        
        try {
            const processedData = this.processRequestData(requestData);
            const response = await this.executeRequest(processedData);
            
            this.currentRequest = processedData;
            this.currentResponse = response;
            
            // Display response
            this.displayResponse(response);
            
            // Add to history
            HistoryManager.addToHistory(processedData, response);
            
        } catch (error) {
            this.displayError(error);
        } finally {
            // Reset button state
            this.isLoading = false;
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Request';
            UI.hideLoading(responseContainer);
        }
    }

    async executeRequest(requestData) {
        // Create abort controller for timeout
        this.controller = new AbortController();
        const timeoutId = setTimeout(() => this.controller.abort(), 30000); // 30 second timeout
        
        try {
            const fetchOptions = {
                method: requestData.method,
                signal: this.controller.signal
            };
            
            // Build headers object
            const headers = {};
            requestData.headers.forEach(header => {
                if (header.key && header.value) {
                    headers[header.key] = header.value;
                }
            });
            
            // Add cookies to headers
            if (requestData.cookies.length > 0) {
                const cookieString = requestData.cookies
                    .filter(cookie => cookie.key && cookie.value)
                    .map(cookie => `${cookie.key}=${cookie.value}`)
                    .join('; ');
                if (cookieString) {
                    headers['Cookie'] = cookieString;
                }
            }
            
            fetchOptions.headers = headers;
            
            // Add body for appropriate methods
            if (['POST', 'PUT', 'PATCH'].includes(requestData.method) && requestData.body.type !== 'none') {
                const bodyContent = this.getBodyContent(requestData.body);
                if (bodyContent) {
                    fetchOptions.body = bodyContent;
                    
                    // Set content type for form data
                    if (requestData.body.type === 'form' && !headers['Content-Type']) {
                        headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    }
                }
            }
            
            // Build final URL with params
            let finalUrl = requestData.url;
            if (requestData.params.length > 0) {
                const paramString = requestData.params
                    .filter(param => param.key && param.value)
                    .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
                    .join('&');
                if (paramString) {
                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + paramString;
                }
            }
            
            const startTime = Date.now();
            const response = await fetch(finalUrl, fetchOptions);
            const endTime = Date.now();
            
            clearTimeout(timeoutId);
            
            const duration = endTime - startTime;
            const responseText = await response.text();
            const size = new Blob([responseText]).size;
            
            // Parse response data
            let responseData;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    responseData = responseText;
                }
            } else {
                responseData = responseText;
            }
            
            // Extract response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            return {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                body: responseData,
                rawBody: responseText,
                size: size,
                duration: duration,
                url: finalUrl
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    displayResponse(response) {
        const responseContainer = document.getElementById('responseContainer');
        if (!responseContainer) return;
        
        const statusClass = this.getStatusClass(response.status);
        
        responseContainer.innerHTML = `
            <div class="response-header">
                <div class="response-status">
                    <span class="status-badge ${statusClass}">${response.status} ${response.statusText}</span>
                    <span class="response-meta">Time: ${response.duration}ms • Size: ${Core.formatFileSize(response.size)}</span>
                </div>
                <div class="response-actions">
                    <button class="btn-sm btn-edit" onclick="RequestManager.copyResponse()">Copy</button>
                    <button class="btn-sm btn-edit" onclick="RequestManager.saveResponse()">Save</button>
                    <button class="btn-sm btn-edit" onclick="RequestManager.showRawResponse()">Raw</button>
                </div>
            </div>
            
            ${Object.keys(response.headers).length > 0 ? `
                <div class="response-headers">
                    <h4>Response Headers (${Object.keys(response.headers).length})</h4>
                    <div class="headers-list">
                        ${Object.entries(response.headers).map(([key, value]) => 
                            `<div class="header-item">
                                <span class="header-key">${Core.escapeHtml(key)}:</span>
                                <span class="header-value">${Core.escapeHtml(value)}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="response-body-section">
                <h4>Response Body</h4>
                <pre class="response-body">${this.formatResponseBody(response.body)}</pre>
            </div>
        `;
    }

    displayError(error) {
        const responseContainer = document.getElementById('responseContainer');
        if (!responseContainer) return;
        
        responseContainer.innerHTML = `
            <div class="response-status">
                <span class="status-badge status-500">Error</span>
                <span class="response-meta">${error.message}</span>
            </div>
            <pre class="response-body error-body">Failed to send request: ${error.message}

Possible causes:
• Network connection issue
• CORS policy blocking the request
• Invalid URL or server not responding
• Request timeout

Check the browser console for more details.</pre>
        `;
    }

    getStatusClass(status) {
        if (status >= 200 && status < 300) return 'status-200';
        if (status >= 300 && status < 400) return 'status-300';
        if (status >= 400 && status < 500) return 'status-400';
        if (status >= 500) return 'status-500';
        return 'status-unknown';
    }

    formatResponseBody(body) {
        if (typeof body === 'object') {
            return JSON.stringify(body, null, 2);
        }
        return Core.escapeHtml(String(body));
    }

    copyResponse() {
        if (!this.currentResponse) return;
        
        const responseText = typeof this.currentResponse.body === 'object' 
            ? JSON.stringify(this.currentResponse.body, null, 2)
            : this.currentResponse.body;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(responseText).then(() => {
                Core.showNotification('Copied', 'Response copied to clipboard');
            });
        }
    }

    saveResponse() {
        if (!this.currentResponse) return;
        
        const responseText = typeof this.currentResponse.body === 'object' 
            ? JSON.stringify(this.currentResponse.body, null, 2)
            : this.currentResponse.body;
        
        const filename = `response_${this.currentResponse.status}_${Date.now()}.${
            typeof this.currentResponse.body === 'object' ? 'json' : 'txt'
        }`;
        
        Core.downloadFile(responseText, filename);
        Core.showNotification('Response Saved', 'Response saved to file');
    }

    showRawResponse() {
        if (!this.currentResponse) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90%;">
                <div class="modal-header">
                    <h3>Raw Response</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="raw-response-content">
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${Core.escapeHtml(this.currentResponse.rawBody)}</pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    toggleCurlSection() {
        const section = document.getElementById('curlSection');
        const btn = document.querySelector('.show-curl-btn');
        
        if (!section || !btn) return;
        
        if (section.classList.contains('visible')) {
            section.classList.remove('visible');
            btn.textContent = '🔧 Show cURL Command';
        } else {
            section.classList.add('visible');
            btn.textContent = '🔧 Hide cURL Command';
            this.updateCurlCommand();
        }
    }

    copyCurl() {
        const curlCode = document.getElementById('curlCode');
        if (!curlCode) return;
        
        const curlText = curlCode.textContent;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(curlText).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            });
        }
    }

    // Demo methods for SQS and Kafka (to be implemented with actual SDKs)
    async sendSqsMessage() {
        const responseContainer = document.getElementById('sqsResponseContainer');
        if (!responseContainer) return;
        
        const region = document.getElementById('sqsRegion')?.value || 'us-east-1';
        const queueUrl = EnvironmentManager.replaceVariables(document.getElementById('sqsQueueUrl')?.value || '');
        const messageBody = EnvironmentManager.replaceVariables(document.getElementById('sqsMessageBody')?.value || '');
        
        // For demo purposes - in real implementation, use AWS SDK
        responseContainer.innerHTML = `
            <div class="response-status">
                <span class="status-badge status-200">Demo Mode</span>
                <span class="response-meta">SQS Integration</span>
            </div>
            <pre class="response-body">SQS message would be sent with the following configuration:

Region: ${region}
Queue URL: ${queueUrl}
Message Body: ${messageBody}

Note: This is a demo. In a real implementation, you would integrate with the AWS SDK.</pre>
        `;
        
        Core.showNotification('SQS Demo', 'SQS message configuration displayed');
    }

    async sendKafkaMessage() {
        const responseContainer = document.getElementById('kafkaResponseContainer');
        if (!responseContainer) return;
        
        const brokers = EnvironmentManager.replaceVariables(document.getElementById('kafkaBrokers')?.value || '');
        const topic = EnvironmentManager.replaceVariables(document.getElementById('kafkaTopic')?.value || '');
        const message = EnvironmentManager.replaceVariables(document.getElementById('kafkaMessage')?.value || '');
        
        // For demo purposes - in real implementation, use Kafka client
        responseContainer.innerHTML = `
            <div class="response-status">
                <span class="status-badge status-200">Demo Mode</span>
                <span class="response-meta">Kafka Integration</span>
            </div>
            <pre class="response-body">Kafka message would be sent with the following configuration:

Brokers: ${brokers}
Topic: ${topic}
Message: ${message}

Note: This is a demo. In a real implementation, you would integrate with a Kafka client library.</pre>
        `;
        
        Core.showNotification('Kafka Demo', 'Kafka message configuration displayed');
    }
}

// Global instance
window.RequestManager = new RequestManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestManager;
}