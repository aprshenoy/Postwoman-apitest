/**
 * Collection Service
 * Handles all collection and request operations with Supabase
 */

class CollectionService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        
        console.log('📁 CollectionService initializing...');
        this.initialize();
    }

    /**
     * Initialize collection service
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
            console.log('✅ CollectionService initialized');

        } catch (error) {
            console.error('❌ Error initializing CollectionService:', error);
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
    // COLLECTION OPERATIONS
    // ============================================

    /**
     * Create a new collection
     * @param {Object} collectionData - Collection data
     */
    async createCollection(collectionData) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('📁 Creating collection:', collectionData.name);

            const { data, error } = await this.supabase
                .from('collections')
                .insert({
                    name: collectionData.name,
                    description: collectionData.description || '',
                    icon: collectionData.icon || '📁',
                    team_id: collectionData.team_id || null,
                    owner_id: currentUser.id,
                    is_public: collectionData.is_public || false
                })
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Collection created:', data.id);

            return {
                success: true,
                collection: data,
                message: 'Collection created successfully!'
            };

        } catch (error) {
            console.error('❌ Error creating collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to create collection'
            };
        }
    }

    /**
     * Get all collections for current user
     */
    async getMyCollections() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('📁 Loading user collections...');

            const { data, error } = await this.supabase
                .from('collections')
                .select('*')
                .or(`owner_id.eq.${currentUser.id},is_public.eq.true`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} collections`);

            return {
                success: true,
                collections: data
            };

        } catch (error) {
            console.error('❌ Error loading collections:', error);
            return {
                success: false,
                error: error.message || 'Failed to load collections',
                collections: []
            };
        }
    }

    /**
     * Get team collections
     * @param {string} teamId - Team ID
     */
    async getTeamCollections(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Loading team collections:', teamId);

            const { data, error } = await this.supabase
                .from('collections')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} team collections`);

            return {
                success: true,
                collections: data
            };

        } catch (error) {
            console.error('❌ Error loading team collections:', error);
            return {
                success: false,
                error: error.message || 'Failed to load team collections',
                collections: []
            };
        }
    }

    /**
     * Get single collection with all requests
     * @param {string} collectionId - Collection ID
     */
    async getCollection(collectionId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Loading collection:', collectionId);

            // Get collection details
            const { data: collection, error: collectionError } = await this.supabase
                .from('collections')
                .select('*')
                .eq('id', collectionId)
                .single();

            if (collectionError) throw collectionError;

            // Get folders in collection
            const { data: folders, error: foldersError } = await this.supabase
                .from('folders')
                .select('*')
                .eq('collection_id', collectionId)
                .order('created_at', { ascending: true });

            if (foldersError) throw foldersError;

            // Get requests in collection
            const { data: requests, error: requestsError } = await this.supabase
                .from('requests')
                .select('*')
                .eq('collection_id', collectionId)
                .order('created_at', { ascending: true });

            if (requestsError) throw requestsError;

            // Combine data
            collection.folders = folders || [];
            collection.requests = requests || [];

            console.log('✅ Collection loaded with', requests.length, 'requests');

            return {
                success: true,
                collection: collection
            };

        } catch (error) {
            console.error('❌ Error loading collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to load collection'
            };
        }
    }

    /**
     * Update collection
     * @param {string} collectionId - Collection ID
     * @param {Object} updates - Updates to apply
     */
    async updateCollection(collectionId, updates) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Updating collection:', collectionId);

            const { data, error } = await this.supabase
                .from('collections')
                .update(updates)
                .eq('id', collectionId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Collection updated');

            return {
                success: true,
                collection: data,
                message: 'Collection updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to update collection'
            };
        }
    }

    /**
     * Delete collection
     * @param {string} collectionId - Collection ID
     */
    async deleteCollection(collectionId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Deleting collection:', collectionId);

            const { error } = await this.supabase
                .from('collections')
                .delete()
                .eq('id', collectionId);

            if (error) throw error;

            console.log('✅ Collection deleted');

            return {
                success: true,
                message: 'Collection deleted successfully!'
            };

        } catch (error) {
            console.error('❌ Error deleting collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete collection'
            };
        }
    }

    /**
     * Share collection with team
     * @param {string} collectionId - Collection ID
     * @param {string} teamId - Team ID
     */
    async shareWithTeam(collectionId, teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Sharing collection with team:', collectionId, teamId);

            const { data, error } = await this.supabase
                .from('collections')
                .update({ team_id: teamId })
                .eq('id', collectionId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Collection shared with team');

            return {
                success: true,
                collection: data,
                message: 'Collection shared with team successfully!'
            };

        } catch (error) {
            console.error('❌ Error sharing collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to share collection'
            };
        }
    }

    // ============================================
    // FOLDER OPERATIONS
    // ============================================

    /**
     * Create folder in collection
     * @param {string} collectionId - Collection ID
     * @param {string} folderName - Folder name
     * @param {string} parentFolderId - Parent folder ID (optional)
     */
    async createFolder(collectionId, folderName, parentFolderId = null) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Creating folder:', folderName);

            const { data, error } = await this.supabase
                .from('folders')
                .insert({
                    name: folderName,
                    collection_id: collectionId,
                    parent_folder_id: parentFolderId
                })
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Folder created');

            return {
                success: true,
                folder: data,
                message: 'Folder created successfully!'
            };

        } catch (error) {
            console.error('❌ Error creating folder:', error);
            return {
                success: false,
                error: error.message || 'Failed to create folder'
            };
        }
    }

    /**
     * Update folder
     * @param {string} folderId - Folder ID
     * @param {Object} updates - Updates to apply
     */
    async updateFolder(folderId, updates) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Updating folder:', folderId);

            const { data, error } = await this.supabase
                .from('folders')
                .update(updates)
                .eq('id', folderId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Folder updated');

            return {
                success: true,
                folder: data,
                message: 'Folder updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating folder:', error);
            return {
                success: false,
                error: error.message || 'Failed to update folder'
            };
        }
    }

    /**
     * Delete folder
     * @param {string} folderId - Folder ID
     */
    async deleteFolder(folderId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📁 Deleting folder:', folderId);

            const { error } = await this.supabase
                .from('folders')
                .delete()
                .eq('id', folderId);

            if (error) throw error;

            console.log('✅ Folder deleted');

            return {
                success: true,
                message: 'Folder deleted successfully!'
            };

        } catch (error) {
            console.error('❌ Error deleting folder:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete folder'
            };
        }
    }

    // ============================================
    // REQUEST OPERATIONS
    // ============================================

    /**
     * Create request in collection
     * @param {string} collectionId - Collection ID
     * @param {Object} requestData - Request data
     */
    async createRequest(collectionId, requestData) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Creating request:', requestData.name);

            const { data, error } = await this.supabase
                .from('requests')
                .insert({
                    name: requestData.name || 'New Request',
                    method: requestData.method || 'GET',
                    url: requestData.url || '',
                    collection_id: collectionId,
                    folder_id: requestData.folder_id || null,
                    headers: requestData.headers || [],
                    query_params: requestData.query_params || [],
                    body: requestData.body || null,
                    auth: requestData.auth || null,
                    tests: requestData.tests || '',
                    pre_request_script: requestData.pre_request_script || ''
                })
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Request created');

            return {
                success: true,
                request: data,
                message: 'Request created successfully!'
            };

        } catch (error) {
            console.error('❌ Error creating request:', error);
            return {
                success: false,
                error: error.message || 'Failed to create request'
            };
        }
    }

    /**
     * Get request by ID
     * @param {string} requestId - Request ID
     */
    async getRequest(requestId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Loading request:', requestId);

            const { data, error } = await this.supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (error) throw error;

            console.log('✅ Request loaded');

            return {
                success: true,
                request: data
            };

        } catch (error) {
            console.error('❌ Error loading request:', error);
            return {
                success: false,
                error: error.message || 'Failed to load request'
            };
        }
    }

    /**
     * Update request
     * @param {string} requestId - Request ID
     * @param {Object} updates - Updates to apply
     */
    async updateRequest(requestId, updates) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Updating request:', requestId);

            const { data, error } = await this.supabase
                .from('requests')
                .update(updates)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Request updated');

            return {
                success: true,
                request: data,
                message: 'Request updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating request:', error);
            return {
                success: false,
                error: error.message || 'Failed to update request'
            };
        }
    }

    /**
     * Delete request
     * @param {string} requestId - Request ID
     */
    async deleteRequest(requestId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Deleting request:', requestId);

            const { error } = await this.supabase
                .from('requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            console.log('✅ Request deleted');

            return {
                success: true,
                message: 'Request deleted successfully!'
            };

        } catch (error) {
            console.error('❌ Error deleting request:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete request'
            };
        }
    }

    /**
     * Duplicate request
     * @param {string} requestId - Request ID to duplicate
     */
    async duplicateRequest(requestId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Duplicating request:', requestId);

            // Get original request
            const { data: original, error: getError } = await this.supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (getError) throw getError;

            // Create duplicate
            const duplicate = {
                name: `${original.name} (Copy)`,
                method: original.method,
                url: original.url,
                collection_id: original.collection_id,
                folder_id: original.folder_id,
                headers: original.headers,
                query_params: original.query_params,
                body: original.body,
                auth: original.auth,
                tests: original.tests,
                pre_request_script: original.pre_request_script
            };

            const { data, error } = await this.supabase
                .from('requests')
                .insert(duplicate)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Request duplicated');

            return {
                success: true,
                request: data,
                message: 'Request duplicated successfully!'
            };

        } catch (error) {
            console.error('❌ Error duplicating request:', error);
            return {
                success: false,
                error: error.message || 'Failed to duplicate request'
            };
        }
    }

    /**
     * Move request to different folder/collection
     * @param {string} requestId - Request ID
     * @param {string} collectionId - Target collection ID (optional)
     * @param {string} folderId - Target folder ID (optional)
     */
    async moveRequest(requestId, collectionId = null, folderId = null) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📝 Moving request:', requestId);

            const updates = {};
            if (collectionId) updates.collection_id = collectionId;
            if (folderId !== undefined) updates.folder_id = folderId;

            const { data, error } = await this.supabase
                .from('requests')
                .update(updates)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Request moved');

            return {
                success: true,
                request: data,
                message: 'Request moved successfully!'
            };

        } catch (error) {
            console.error('❌ Error moving request:', error);
            return {
                success: false,
                error: error.message || 'Failed to move request'
            };
        }
    }

    // ============================================
    // BULK OPERATIONS
    // ============================================

    /**
     * Import collection (bulk create)
     * @param {Object} collectionData - Full collection data with requests
     */
    async importCollection(collectionData) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('📦 Importing collection:', collectionData.name);

            // Create collection
            const { data: collection, error: collectionError } = await this.supabase
                .from('collections')
                .insert({
                    name: collectionData.name,
                    description: collectionData.description || '',
                    icon: collectionData.icon || '📁',
                    owner_id: currentUser.id,
                    is_public: false
                })
                .select()
                .single();

            if (collectionError) throw collectionError;

            // Create folders if any
            if (collectionData.folders && collectionData.folders.length > 0) {
                const foldersToInsert = collectionData.folders.map(folder => ({
                    name: folder.name,
                    collection_id: collection.id
                }));

                const { error: foldersError } = await this.supabase
                    .from('folders')
                    .insert(foldersToInsert);

                if (foldersError) console.error('Error creating folders:', foldersError);
            }

            // Create requests if any
            if (collectionData.requests && collectionData.requests.length > 0) {
                const requestsToInsert = collectionData.requests.map(req => ({
                    name: req.name || 'New Request',
                    method: req.method || 'GET',
                    url: req.url || '',
                    collection_id: collection.id,
                    headers: req.headers || [],
                    query_params: req.query_params || [],
                    body: req.body || null,
                    auth: req.auth || null
                }));

                const { error: requestsError } = await this.supabase
                    .from('requests')
                    .insert(requestsToInsert);

                if (requestsError) console.error('Error creating requests:', requestsError);
            }

            console.log('✅ Collection imported successfully');

            return {
                success: true,
                collection: collection,
                message: 'Collection imported successfully!'
            };

        } catch (error) {
            console.error('❌ Error importing collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to import collection'
            };
        }
    }

    /**
     * Export collection (get all data)
     * @param {string} collectionId - Collection ID
     */
    async exportCollection(collectionId) {
        try {
            const result = await this.getCollection(collectionId);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            console.log('✅ Collection exported');

            return {
                success: true,
                data: result.collection,
                message: 'Collection exported successfully!'
            };

        } catch (error) {
            console.error('❌ Error exporting collection:', error);
            return {
                success: false,
                error: error.message || 'Failed to export collection'
            };
        }
    }
}

// Initialize collection service
const collectionService = new CollectionService();

// Export for global access
if (typeof window !== 'undefined') {
    window.CollectionService = collectionService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = collectionService;
}