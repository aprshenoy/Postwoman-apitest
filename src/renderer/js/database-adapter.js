// Database Adapter - Future-ready database abstraction layer
// This allows easy switching between localStorage, IndexedDB, and server-side databases

class DatabaseAdapter {
    constructor() {
        this.storage = this.detectStorageType();
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Detect the best available storage option
    detectStorageType() {
        // Priority: Server API > IndexedDB > localStorage
        if (this.isServerAvailable()) {
            return 'server';
        } else if (this.isIndexedDBAvailable()) {
            return 'indexeddb';
        } else {
            return 'localstorage';
        }
    }

    isServerAvailable() {
        // TODO: Check if server API is available
        return false; // For now, always false
    }

    isIndexedDBAvailable() {
        return 'indexedDB' in window;
    }

    // Generic CRUD operations
    async create(table, data) {
        try {
            const record = {
                id: this.generateId(),
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            switch (this.storage) {
                case 'server':
                    return await this.serverCreate(table, record);
                case 'indexeddb':
                    return await this.indexedDBCreate(table, record);
                default:
                    return this.localStorageCreate(table, record);
            }
        } catch (error) {
            console.error('Database create error:', error);
            throw error;
        }
    }

    async read(table, id = null) {
        try {
            switch (this.storage) {
                case 'server':
                    return await this.serverRead(table, id);
                case 'indexeddb':
                    return await this.indexedDBRead(table, id);
                default:
                    return this.localStorageRead(table, id);
            }
        } catch (error) {
            console.error('Database read error:', error);
            throw error;
        }
    }

    async update(table, id, data) {
        try {
            const updateData = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            switch (this.storage) {
                case 'server':
                    return await this.serverUpdate(table, id, updateData);
                case 'indexeddb':
                    return await this.indexedDBUpdate(table, id, updateData);
                default:
                    return this.localStorageUpdate(table, id, updateData);
            }
        } catch (error) {
            console.error('Database update error:', error);
            throw error;
        }
    }

    async delete(table, id) {
        try {
            switch (this.storage) {
                case 'server':
                    return await this.serverDelete(table, id);
                case 'indexeddb':
                    return await this.indexedDBDelete(table, id);
                default:
                    return this.localStorageDelete(table, id);
            }
        } catch (error) {
            console.error('Database delete error:', error);
            throw error;
        }
    }

    // Query operations
    async query(table, filters = {}, options = {}) {
        try {
            switch (this.storage) {
                case 'server':
                    return await this.serverQuery(table, filters, options);
                case 'indexeddb':
                    return await this.indexedDBQuery(table, filters, options);
                default:
                    return this.localStorageQuery(table, filters, options);
            }
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // localStorage implementation
    localStorageCreate(table, record) {
        const records = this.localStorageRead(table) || [];
        records.push(record);
        localStorage.setItem(`posterboy_${table}`, JSON.stringify(records));
        return record;
    }

    localStorageRead(table, id = null) {
        const data = localStorage.getItem(`posterboy_${table}`);
        const records = data ? JSON.parse(data) : [];
        
        if (id) {
            return records.find(record => record.id === id);
        }
        return records;
    }

    localStorageUpdate(table, id, data) {
        const records = this.localStorageRead(table) || [];
        const index = records.findIndex(record => record.id === id);
        
        if (index !== -1) {
            records[index] = { ...records[index], ...data };
            localStorage.setItem(`posterboy_${table}`, JSON.stringify(records));
            return records[index];
        }
        return null;
    }

    localStorageDelete(table, id) {
        const records = this.localStorageRead(table) || [];
        const filteredRecords = records.filter(record => record.id !== id);
        localStorage.setItem(`posterboy_${table}`, JSON.stringify(filteredRecords));
        return true;
    }

    localStorageQuery(table, filters = {}, options = {}) {
        let records = this.localStorageRead(table) || [];
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            records = records.filter(record => {
                if (typeof value === 'object' && value.operator) {
                    return this.applyOperator(record[key], value.operator, value.value);
                }
                return record[key] === value;
            });
        });

        // Apply sorting
        if (options.sortBy) {
            records.sort((a, b) => {
                const direction = options.sortOrder === 'desc' ? -1 : 1;
                if (a[options.sortBy] < b[options.sortBy]) return -1 * direction;
                if (a[options.sortBy] > b[options.sortBy]) return 1 * direction;
                return 0;
            });
        }

        // Apply pagination
        if (options.limit) {
            const offset = options.offset || 0;
            records = records.slice(offset, offset + options.limit);
        }

        return records;
    }

    // IndexedDB implementation (placeholder for future enhancement)
    async indexedDBCreate(table, record) {
        // TODO: Implement IndexedDB operations
        return this.localStorageCreate(table, record);
    }

    async indexedDBRead(table, id) {
        // TODO: Implement IndexedDB operations
        return this.localStorageRead(table, id);
    }

    async indexedDBUpdate(table, id, data) {
        // TODO: Implement IndexedDB operations
        return this.localStorageUpdate(table, id, data);
    }

    async indexedDBDelete(table, id) {
        // TODO: Implement IndexedDB operations
        return this.localStorageDelete(table, id);
    }

    async indexedDBQuery(table, filters, options) {
        // TODO: Implement IndexedDB operations
        return this.localStorageQuery(table, filters, options);
    }

    // Server API implementation (placeholder for future enhancement)
    async serverCreate(table, record) {
        if (!this.isOnline) {
            this.addToSyncQueue('create', table, record);
            return this.localStorageCreate(table, record);
        }
        
        // TODO: Implement server API calls
        try {
            const response = await fetch(`/api/${table}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(record)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Fallback to localStorage
            this.addToSyncQueue('create', table, record);
            return this.localStorageCreate(table, record);
        }
    }

    async serverRead(table, id) {
        if (!this.isOnline) {
            return this.localStorageRead(table, id);
        }
        
        // TODO: Implement server API calls
        try {
            const url = id ? `/api/${table}/${id}` : `/api/${table}`;
            const response = await fetch(url);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Fallback to localStorage
            return this.localStorageRead(table, id);
        }
    }

    async serverUpdate(table, id, data) {
        if (!this.isOnline) {
            this.addToSyncQueue('update', table, { id, data });
            return this.localStorageUpdate(table, id, data);
        }
        
        // TODO: Implement server API calls
        try {
            const response = await fetch(`/api/${table}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Fallback to localStorage
            this.addToSyncQueue('update', table, { id, data });
            return this.localStorageUpdate(table, id, data);
        }
    }

    async serverDelete(table, id) {
        if (!this.isOnline) {
            this.addToSyncQueue('delete', table, { id });
            return this.localStorageDelete(table, id);
        }
        
        // TODO: Implement server API calls
        try {
            const response = await fetch(`/api/${table}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return true;
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Fallback to localStorage
            this.addToSyncQueue('delete', table, { id });
            return this.localStorageDelete(table, id);
        }
    }

    async serverQuery(table, filters, options) {
        if (!this.isOnline) {
            return this.localStorageQuery(table, filters, options);
        }
        
        // TODO: Implement server API calls
        try {
            const params = new URLSearchParams();
            
            // Add filters to query params
            Object.entries(filters).forEach(([key, value]) => {
                params.append(`filter[${key}]`, JSON.stringify(value));
            });
            
            // Add options to query params
            Object.entries(options).forEach(([key, value]) => {
                params.append(key, value);
            });
            
            const response = await fetch(`/api/${table}?${params}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            // Fallback to localStorage
            return this.localStorageQuery(table, filters, options);
        }
    }

    // Utility methods
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    applyOperator(value, operator, targetValue) {
        switch (operator) {
            case 'eq': return value === targetValue;
            case 'ne': return value !== targetValue;
            case 'gt': return value > targetValue;
            case 'gte': return value >= targetValue;
            case 'lt': return value < targetValue;
            case 'lte': return value <= targetValue;
            case 'in': return Array.isArray(targetValue) && targetValue.includes(value);
            case 'nin': return Array.isArray(targetValue) && !targetValue.includes(value);
            case 'contains': return String(value).toLowerCase().includes(String(targetValue).toLowerCase());
            case 'startsWith': return String(value).toLowerCase().startsWith(String(targetValue).toLowerCase());
            case 'endsWith': return String(value).toLowerCase().endsWith(String(targetValue).toLowerCase());
            default: return value === targetValue;
        }
    }

    addToSyncQueue(operation, table, data) {
        this.syncQueue.push({
            operation,
            table,
            data,
            timestamp: Date.now()
        });
        
        // Save sync queue to localStorage
        localStorage.setItem('posterboy_sync_queue', JSON.stringify(this.syncQueue));
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                switch (item.operation) {
                    case 'create':
                        await this.serverCreate(item.table, item.data);
                        break;
                    case 'update':
                        await this.serverUpdate(item.table, item.data.id, item.data.data);
                        break;
                    case 'delete':
                        await this.serverDelete(item.table, item.data.id);
                        break;
                }
            } catch (error) {
                // Re-add failed items to sync queue
                this.syncQueue.push(item);
                console.error('Sync error:', error);
            }
        }

        // Update sync queue in localStorage
        localStorage.setItem('posterboy_sync_queue', JSON.stringify(this.syncQueue));
    }

    // Load sync queue from localStorage on initialization
    loadSyncQueue() {
        const stored = localStorage.getItem('posterboy_sync_queue');
        if (stored) {
            try {
                this.syncQueue = JSON.parse(stored);
            } catch (error) {
                console.error('Error loading sync queue:', error);
                this.syncQueue = [];
            }
        }
    }

    // Migration utilities for future database changes
    async migrate(migrations) {
        for (const migration of migrations) {
            try {
                await migration.up(this);
                console.log(`Migration ${migration.name} completed`);
            } catch (error) {
                console.error(`Migration ${migration.name} failed:`, error);
                throw error;
            }
        }
    }

    // Export/Import functionality
    async exportData(tables = []) {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            data: {}
        };

        for (const table of tables) {
            exportData.data[table] = await this.read(table);
        }

        return exportData;
    }

    async importData(importData, options = {}) {
        const { merge = false, overwrite = false } = options;

        for (const [table, records] of Object.entries(importData.data)) {
            if (!merge) {
                // Clear existing data
                const existingRecords = await this.read(table);
                for (const record of existingRecords) {
                    await this.delete(table, record.id);
                }
            }

            // Import new data
            for (const record of records) {
                if (merge && !overwrite) {
                    // Check if record exists
                    const existing = await this.read(table, record.id);
                    if (!existing) {
                        await this.create(table, record);
                    }
                } else {
                    await this.create(table, record);
                }
            }
        }
    }

    // Performance monitoring
    async benchmark(operation, iterations = 100) {
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            await operation();
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        
        console.log(`Average operation time: ${avgTime.toFixed(2)}ms`);
        return avgTime;
    }
}

// Global database instance
window.DB = new DatabaseAdapter();

// Load sync queue on initialization
window.DB.loadSyncQueue();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseAdapter;
}