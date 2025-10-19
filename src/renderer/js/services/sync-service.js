/**
 * Sync Service
 * Handles real-time synchronization between local storage and Supabase
 */

class SyncService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.syncEnabled = false;
        this.subscriptions = [];
        this.syncQueue = [];
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.autoSaveTimeout = null;
        
        console.log('🔄 SyncService initializing...');
        this.initialize();
    }

    /**
     * Initialize sync service
     */
    async initialize() {
        try {
            // Wait for Supabase client
            await this.waitForSupabase();
            
            this.supabase = window.SupabaseClient.getClient();
            
            if (!this.supabase) {
                console.error('❌ Supabase client not available');
                return;
            }

            this.initialized = true;
            console.log('✅ SyncService initialized');

            // Check if user is authenticated and enable sync
            if (window.AuthService && window.AuthService.isAuthenticated()) {
                await this.enableSync();
            }

            // Listen for auth state changes
            window.addEventListener('authStateChange', (event) => {
                const { event: authEvent } = event.detail;
                if (authEvent === 'SIGNED_IN') {
                    this.enableSync();
                } else if (authEvent === 'SIGNED_OUT') {
                    this.disableSync();
                }
            });

        } catch (error) {
            console.error('❌ Error initializing SyncService:', error);
        }
    }

    /**
     * Wait for Supabase client
     */
    async waitForSupabase(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.SupabaseClient && window.SupabaseClient.isInitialized()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Supabase client not initialized');
    }

    // ============================================
    // SYNC CONTROL
    // ============================================

    /**
     * Enable real-time sync
     */
    async enableSync() {
        if (this.syncEnabled) {
            console.log('ℹ️ Sync already enabled');
            return;
        }

        try {
            console.log('🔄 Enabling sync...');

            // Subscribe to collection changes
            this.subscribeToCollections();

            // Subscribe to request changes
            this.subscribeToRequests();

            // Subscribe to team changes
            this.subscribeToTeams();

            // Perform initial sync
            await this.performFullSync();

            this.syncEnabled = true;
            this.lastSyncTime = new Date();
            
            console.log('✅ Sync enabled');

            // Dispatch event
            window.dispatchEvent(new CustomEvent('syncEnabled'));

        } catch (error) {
            console.error('❌ Error enabling sync:', error);
        }
    }

    /**
     * Disable real-time sync
     */
    disableSync() {
        if (!this.syncEnabled) {
            return;
        }

        console.log('🔄 Disabling sync...');

        // Unsubscribe from all channels
        this.subscriptions.forEach(subscription => {
            this.supabase.removeChannel(subscription);
        });
        this.subscriptions = [];

        this.syncEnabled = false;
        
        console.log('✅ Sync disabled');

        // Dispatch event
        window.dispatchEvent(new CustomEvent('syncDisabled'));
    }

    /**
     * Check if sync is enabled
     */
    isSyncEnabled() {
        return this.syncEnabled;
    }

    /**
     * Get last sync time
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }

    // ============================================
    // REAL-TIME SUBSCRIPTIONS
    // ============================================

    /**
     * Subscribe to collection changes
     */
    subscribeToCollections() {
        if (!this.supabase || !window.AuthService.isAuthenticated()) {
            return;
        }

        const currentUser = window.AuthService.getCurrentUser();

        const subscription = this.supabase
            .channel('collections_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'collections',
                    filter: `owner_id=eq.${currentUser.id}`
                },
                (payload) => {
                    console.log('🔄 Collection change detected:', payload);
                    this.handleCollectionChange(payload);
                }
            )
            .subscribe();

        this.subscriptions.push(subscription);
        console.log('✅ Subscribed to collection changes');
    }

    /**
     * Subscribe to request changes
     */
    subscribeToRequests() {
        if (!this.supabase) {
            return;
        }

        const subscription = this.supabase
            .channel('requests_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'requests'
                },
                (payload) => {
                    console.log('🔄 Request change detected:', payload);
                    this.handleRequestChange(payload);
                }
            )
            .subscribe();

        this.subscriptions.push(subscription);
        console.log('✅ Subscribed to request changes');
    }

    /**
     * Subscribe to team changes
     */
    subscribeToTeams() {
        if (!this.supabase || !window.AuthService.isAuthenticated()) {
            return;
        }

        const subscription = this.supabase
            .channel('teams_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'teams'
                },
                (payload) => {
                    console.log('🔄 Team change detected:', payload);
                    this.handleTeamChange(payload);
                }
            )
            .subscribe();

        this.subscriptions.push(subscription);
        console.log('✅ Subscribed to team changes');
    }

    /**
     * Subscribe to team member changes
     */
    subscribeToTeamMembers() {
        if (!this.supabase || !window.AuthService.isAuthenticated()) {
            return;
        }

        const subscription = this.supabase
            .channel('team_members_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_members'
                },
                (payload) => {
                    console.log('🔄 Team member change detected:', payload);
                    this.handleTeamMemberChange(payload);
                }
            )
            .subscribe();

        this.subscriptions.push(subscription);
        console.log('✅ Subscribed to team member changes');
    }

    // ============================================
    // CHANGE HANDLERS
    // ============================================

    /**
     * Handle collection changes
     */
    handleCollectionChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                console.log('➕ New collection created:', newRecord.name);
                this.dispatchSyncEvent('collectionCreated', newRecord);
                break;

            case 'UPDATE':
                console.log('✏️ Collection updated:', newRecord.name);
                this.dispatchSyncEvent('collectionUpdated', newRecord);
                break;

            case 'DELETE':
                console.log('🗑️ Collection deleted:', oldRecord.id);
                this.dispatchSyncEvent('collectionDeleted', oldRecord);
                break;
        }

        // Trigger UI refresh if CollectionManager exists
        if (window.CollectionManager) {
            window.CollectionManager.loadCollections();
        }
    }

    /**
     * Handle request changes
     */
    handleRequestChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                console.log('➕ New request created:', newRecord.name);
                this.dispatchSyncEvent('requestCreated', newRecord);
                break;

            case 'UPDATE':
                console.log('✏️ Request updated:', newRecord.name);
                this.dispatchSyncEvent('requestUpdated', newRecord);
                break;

            case 'DELETE':
                console.log('🗑️ Request deleted:', oldRecord.id);
                this.dispatchSyncEvent('requestDeleted', oldRecord);
                break;
        }

        // Trigger UI refresh if needed
        if (window.CollectionManager) {
            // Reload the specific collection that contains this request
            window.CollectionManager.refreshCollection(newRecord?.collection_id || oldRecord?.collection_id);
        }
    }

    /**
     * Handle team changes
     */
    handleTeamChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                console.log('➕ New team created:', newRecord.name);
                this.dispatchSyncEvent('teamCreated', newRecord);
                break;

            case 'UPDATE':
                console.log('✏️ Team updated:', newRecord.name);
                this.dispatchSyncEvent('teamUpdated', newRecord);
                break;

            case 'DELETE':
                console.log('🗑️ Team deleted:', oldRecord.id);
                this.dispatchSyncEvent('teamDeleted', oldRecord);
                break;
        }

        // Trigger UI refresh if TeamManager exists
        if (window.TeamManager) {
            window.TeamManager.loadTeams();
        }
    }

    /**
     * Handle team member changes
     */
    handleTeamMemberChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                console.log('➕ Team member added:', newRecord.user_id);
                this.dispatchSyncEvent('teamMemberAdded', newRecord);
                break;

            case 'UPDATE':
                console.log('✏️ Team member updated:', newRecord.user_id);
                this.dispatchSyncEvent('teamMemberUpdated', newRecord);
                break;

            case 'DELETE':
                console.log('🗑️ Team member removed:', oldRecord.user_id);
                this.dispatchSyncEvent('teamMemberRemoved', oldRecord);
                break;
        }

        // Trigger UI refresh if TeamManager exists
        if (window.TeamManager) {
            window.TeamManager.refreshTeamMembers(newRecord?.team_id || oldRecord?.team_id);
        }
    }

    /**
     * Dispatch sync event
     */
    dispatchSyncEvent(eventName, data) {
        const event = new CustomEvent(eventName, {
            detail: data
        });
        window.dispatchEvent(event);
    }

    // ============================================
    // FULL SYNC
    // ============================================

    /**
     * Perform full sync (initial sync or manual sync)
     */
    async performFullSync() {
        if (this.isSyncing) {
            console.log('ℹ️ Sync already in progress');
            return;
        }

        try {
            this.isSyncing = true;
            console.log('🔄 Starting full sync...');

            // Sync collections
            await this.syncCollections();

            // Sync teams
            await this.syncTeams();

            this.lastSyncTime = new Date();
            console.log('✅ Full sync completed');

            // Dispatch event
            this.dispatchSyncEvent('syncCompleted', { timestamp: this.lastSyncTime });

            return {
                success: true,
                message: 'Sync completed successfully!'
            };

        } catch (error) {
            console.error('❌ Error during full sync:', error);
            
            // Dispatch error event
            this.dispatchSyncEvent('syncError', { error: error.message });

            return {
                success: false,
                error: error.message || 'Sync failed'
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync collections from server
     */
    async syncCollections() {
        try {
            if (!window.CollectionService) {
                console.warn('⚠️ CollectionService not available');
                return;
            }

            console.log('🔄 Syncing collections...');

            const result = await window.CollectionService.getMyCollections();

            if (result.success) {
                // Store in localStorage as backup
                localStorage.setItem('posterboy_collections_backup', JSON.stringify(result.collections));
                console.log(`✅ Synced ${result.collections.length} collections`);
            }

        } catch (error) {
            console.error('❌ Error syncing collections:', error);
        }
    }

    /**
     * Sync teams from server
     */
    async syncTeams() {
        try {
            if (!window.TeamService) {
                console.warn('⚠️ TeamService not available');
                return;
            }

            console.log('🔄 Syncing teams...');

            const result = await window.TeamService.getMyTeams();

            if (result.success) {
                // Store in localStorage as backup
                localStorage.setItem('posterboy_teams_backup', JSON.stringify(result.teams));
                console.log(`✅ Synced ${result.teams.length} teams`);
            }

        } catch (error) {
            console.error('❌ Error syncing teams:', error);
        }
    }

    // ============================================
    // AUTO-SAVE
    // ============================================

    /**
     * Queue item for auto-save
     * @param {string} type - Type of item (collection, request, etc.)
     * @param {string} id - Item ID
     * @param {Object} data - Data to save
     */
    queueAutoSave(type, id, data) {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Add to queue
        const existingIndex = this.syncQueue.findIndex(item => item.type === type && item.id === id);
        if (existingIndex >= 0) {
            this.syncQueue[existingIndex] = { type, id, data, timestamp: Date.now() };
        } else {
            this.syncQueue.push({ type, id, data, timestamp: Date.now() });
        }

        // Set new timeout
        this.autoSaveTimeout = setTimeout(() => {
            this.processAutoSaveQueue();
        }, 2000); // 2 seconds delay

        console.log('⏳ Item queued for auto-save:', type, id);
    }

    /**
     * Process auto-save queue
     */
    async processAutoSaveQueue() {
        if (this.syncQueue.length === 0) {
            return;
        }

        if (!this.syncEnabled) {
            console.log('ℹ️ Sync disabled, skipping auto-save');
            return;
        }

        console.log(`🔄 Processing ${this.syncQueue.length} auto-save items...`);

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                await this.autoSaveItem(item);
            } catch (error) {
                console.error('❌ Error auto-saving item:', error);
                // Re-queue failed items
                this.syncQueue.push(item);
            }
        }

        console.log('✅ Auto-save queue processed');
    }

    /**
     * Auto-save individual item
     */
    async autoSaveItem(item) {
        const { type, id, data } = item;

        switch (type) {
            case 'collection':
                if (window.CollectionService) {
                    if (id === 'new') {
                        await window.CollectionService.createCollection(data);
                    } else {
                        await window.CollectionService.updateCollection(id, data);
                    }
                }
                break;

            case 'request':
                if (window.CollectionService) {
                    if (id === 'new') {
                        await window.CollectionService.createRequest(data.collection_id, data);
                    } else {
                        await window.CollectionService.updateRequest(id, data);
                    }
                }
                break;

            case 'team':
                if (window.TeamService) {
                    if (id === 'new') {
                        await window.TeamService.createTeam(data.name, data.description);
                    } else {
                        await window.TeamService.updateTeam(id, data);
                    }
                }
                break;

            default:
                console.warn('⚠️ Unknown auto-save type:', type);
        }

        console.log('✅ Auto-saved:', type, id);
    }

    /**
     * Cancel pending auto-save
     */
    cancelAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        this.syncQueue = [];
        console.log('🚫 Auto-save cancelled');
    }

    // ============================================
    // CONFLICT RESOLUTION
    // ============================================

    /**
     * Resolve sync conflict
     * @param {string} type - Type of conflict
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @param {string} strategy - Resolution strategy (local, remote, merge)
     */
    async resolveConflict(type, localData, remoteData, strategy = 'remote') {
        console.log('⚠️ Resolving sync conflict:', type, strategy);

        try {
            switch (strategy) {
                case 'local':
                    // Keep local, overwrite remote
                    console.log('📤 Keeping local version');
                    return localData;

                case 'remote':
                    // Keep remote, overwrite local
                    console.log('📥 Keeping remote version');
                    return remoteData;

                case 'merge':
                    // Merge both (take latest timestamp for each field)
                    console.log('🔀 Merging versions');
                    return this.mergeData(localData, remoteData);

                default:
                    // Default to remote
                    return remoteData;
            }

        } catch (error) {
            console.error('❌ Error resolving conflict:', error);
            return remoteData; // Default to remote on error
        }
    }

    /**
     * Merge local and remote data
     */
    mergeData(localData, remoteData) {
        const merged = { ...remoteData };

        // If local version is newer, use local fields
        if (new Date(localData.updated_at) > new Date(remoteData.updated_at)) {
            Object.keys(localData).forEach(key => {
                if (key !== 'id' && key !== 'created_at') {
                    merged[key] = localData[key];
                }
            });
        }

        return merged;
    }

    // ============================================
    // OFFLINE SUPPORT
    // ============================================

    /**
     * Check online status
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Handle going online
     */
    async handleOnline() {
        console.log('🌐 Connection restored, syncing...');
        
        // Dispatch event
        this.dispatchSyncEvent('connectionRestored', {});

        // Perform full sync
        if (this.syncEnabled) {
            await this.performFullSync();
        }
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        console.log('📴 Connection lost, working offline...');
        
        // Dispatch event
        this.dispatchSyncEvent('connectionLost', {});
    }

    /**
     * Set up online/offline listeners
     */
    setupOnlineListeners() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            enabled: this.syncEnabled,
            syncing: this.isSyncing,
            online: this.isOnline(),
            lastSync: this.lastSyncTime,
            queueLength: this.syncQueue.length,
            subscriptions: this.subscriptions.length
        };
    }

    /**
     * Force sync now (manual trigger)
     */
    async forceSyncNow() {
        console.log('🔄 Force sync triggered');
        return await this.performFullSync();
    }

    /**
     * Clear sync queue
     */
    clearQueue() {
        this.syncQueue = [];
        console.log('🗑️ Sync queue cleared');
    }

    /**
     * Get pending changes count
     */
    getPendingChanges() {
        return this.syncQueue.length;
    }
}

// Initialize sync service
const syncService = new SyncService();

// Set up online/offline listeners
syncService.setupOnlineListeners();

// Export for global access
if (typeof window !== 'undefined') {
    window.SyncService = syncService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = syncService;
}