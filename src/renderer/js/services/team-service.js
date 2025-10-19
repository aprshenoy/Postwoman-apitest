/**
 * Team Service
 * Handles all team-related operations
 */

class TeamService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        
        console.log('👥 TeamService initializing...');
        this.initialize();
    }

    /**
     * Initialize team service
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
            console.log('✅ TeamService initialized');

        } catch (error) {
            console.error('❌ Error initializing TeamService:', error);
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

    /**
     * Create a new team
     * @param {string} name - Team name
     * @param {string} description - Team description (optional)
     */
    async createTeam(name, description = '') {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('👥 Creating team:', name);

            // Create team
            const { data: team, error: teamError } = await this.supabase
                .from('teams')
                .insert({
                    name: name,
                    description: description,
                    owner_id: currentUser.id
                })
                .select()
                .single();

            if (teamError) throw teamError;

            // Add creator as owner in team_members
            const { error: memberError } = await this.supabase
                .from('team_members')
                .insert({
                    team_id: team.id,
                    user_id: currentUser.id,
                    role: 'owner'
                });

            if (memberError) throw memberError;

            console.log('✅ Team created successfully:', team.id);

            return {
                success: true,
                team: team,
                message: 'Team created successfully!'
            };

        } catch (error) {
            console.error('❌ Error creating team:', error);
            return {
                success: false,
                error: error.message || 'Failed to create team'
            };
        }
    }

    /**
     * Get all teams for current user
     */
    async getMyTeams() {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('👥 Loading user teams...');

            // Get teams where user is a member
            const { data: memberships, error: memberError } = await this.supabase
                .from('team_members')
                .select(`
                    role,
                    team_id,
                    teams (
                        id,
                        name,
                        description,
                        avatar_url,
                        owner_id,
                        created_at
                    )
                `)
                .eq('user_id', currentUser.id);

            if (memberError) throw memberError;

            // Format the response
            const teams = memberships.map(m => ({
                ...m.teams,
                role: m.role
            }));

            console.log(`✅ Loaded ${teams.length} teams`);

            return {
                success: true,
                teams: teams
            };

        } catch (error) {
            console.error('❌ Error loading teams:', error);
            return {
                success: false,
                error: error.message || 'Failed to load teams',
                teams: []
            };
        }
    }

    /**
     * Get team details
     * @param {string} teamId - Team ID
     */
    async getTeam(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Loading team details:', teamId);

            const { data, error } = await this.supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (error) throw error;

            console.log('✅ Team details loaded');

            return {
                success: true,
                team: data
            };

        } catch (error) {
            console.error('❌ Error loading team:', error);
            return {
                success: false,
                error: error.message || 'Failed to load team'
            };
        }
    }

    /**
     * Update team details
     * @param {string} teamId - Team ID
     * @param {Object} updates - Team updates
     */
    async updateTeam(teamId, updates) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Updating team:', teamId);

            const { data, error } = await this.supabase
                .from('teams')
                .update(updates)
                .eq('id', teamId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Team updated successfully');

            return {
                success: true,
                team: data,
                message: 'Team updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating team:', error);
            return {
                success: false,
                error: error.message || 'Failed to update team'
            };
        }
    }

    /**
     * Delete team
     * @param {string} teamId - Team ID
     */
    async deleteTeam(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Deleting team:', teamId);

            const { error } = await this.supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

            if (error) throw error;

            console.log('✅ Team deleted successfully');

            return {
                success: true,
                message: 'Team deleted successfully!'
            };

        } catch (error) {
            console.error('❌ Error deleting team:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete team'
            };
        }
    }

    /**
     * Get team members
     * @param {string} teamId - Team ID
     */
    async getTeamMembers(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Loading team members:', teamId);

            const { data, error } = await this.supabase
                .from('team_members')
                .select(`
                    id,
                    role,
                    joined_at,
                    user_profiles (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('team_id', teamId);

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} team members`);

            return {
                success: true,
                members: data
            };

        } catch (error) {
            console.error('❌ Error loading team members:', error);
            return {
                success: false,
                error: error.message || 'Failed to load team members',
                members: []
            };
        }
    }

    /**
     * Add member to team
     * @param {string} teamId - Team ID
     * @param {string} userEmail - User email to add
     * @param {string} role - Role (member, admin)
     */
    async addTeamMember(teamId, userEmail, role = 'member') {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Adding team member:', userEmail);

            // First, find user by email
            const { data: userProfile, error: userError } = await this.supabase
                .from('user_profiles')
                .select('id')
                .eq('username', userEmail)
                .single();

            if (userError || !userProfile) {
                throw new Error('User not found');
            }

            // Add to team
            const { data, error } = await this.supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    user_id: userProfile.id,
                    role: role
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('User is already a member of this team');
                }
                throw error;
            }

            console.log('✅ Team member added successfully');

            return {
                success: true,
                member: data,
                message: 'Member added successfully!'
            };

        } catch (error) {
            console.error('❌ Error adding team member:', error);
            return {
                success: false,
                error: error.message || 'Failed to add team member'
            };
        }
    }

    /**
     * Update team member role
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID
     * @param {string} newRole - New role
     */
    async updateMemberRole(teamId, userId, newRole) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Updating member role:', userId, 'to', newRole);

            const { data, error } = await this.supabase
                .from('team_members')
                .update({ role: newRole })
                .eq('team_id', teamId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Member role updated successfully');

            return {
                success: true,
                member: data,
                message: 'Member role updated successfully!'
            };

        } catch (error) {
            console.error('❌ Error updating member role:', error);
            return {
                success: false,
                error: error.message || 'Failed to update member role'
            };
        }
    }

    /**
     * Remove member from team
     * @param {string} teamId - Team ID
     * @param {string} userId - User ID to remove
     */
    async removeMember(teamId, userId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Removing team member:', userId);

            const { error } = await this.supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId);

            if (error) throw error;

            console.log('✅ Team member removed successfully');

            return {
                success: true,
                message: 'Member removed successfully!'
            };

        } catch (error) {
            console.error('❌ Error removing team member:', error);
            return {
                success: false,
                error: error.message || 'Failed to remove member'
            };
        }
    }

    /**
     * Leave team (current user)
     * @param {string} teamId - Team ID
     */
    async leaveTeam(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('👥 Leaving team:', teamId);

            // Check if user is the owner
            const { data: team, error: teamError } = await this.supabase
                .from('teams')
                .select('owner_id')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;

            if (team.owner_id === currentUser.id) {
                throw new Error('Team owner cannot leave. Please transfer ownership or delete the team.');
            }

            // Remove from team
            const { error } = await this.supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            console.log('✅ Left team successfully');

            return {
                success: true,
                message: 'Left team successfully!'
            };

        } catch (error) {
            console.error('❌ Error leaving team:', error);
            return {
                success: false,
                error: error.message || 'Failed to leave team'
            };
        }
    }

    /**
     * Transfer team ownership
     * @param {string} teamId - Team ID
     * @param {string} newOwnerId - New owner user ID
     */
    async transferOwnership(teamId, newOwnerId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const currentUser = window.AuthService.getCurrentUser();

            console.log('👥 Transferring ownership:', teamId, 'to', newOwnerId);

            // Verify current user is the owner
            const { data: team, error: teamError } = await this.supabase
                .from('teams')
                .select('owner_id')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;

            if (team.owner_id !== currentUser.id) {
                throw new Error('Only the team owner can transfer ownership');
            }

            // Check if new owner is a team member
            const { data: membership, error: memberError } = await this.supabase
                .from('team_members')
                .select('*')
                .eq('team_id', teamId)
                .eq('user_id', newOwnerId)
                .single();

            if (memberError || !membership) {
                throw new Error('New owner must be a team member');
            }

            // Update team owner
            const { error: updateTeamError } = await this.supabase
                .from('teams')
                .update({ owner_id: newOwnerId })
                .eq('id', teamId);

            if (updateTeamError) throw updateTeamError;

            // Update new owner role to owner
            const { error: updateNewOwnerError } = await this.supabase
                .from('team_members')
                .update({ role: 'owner' })
                .eq('team_id', teamId)
                .eq('user_id', newOwnerId);

            if (updateNewOwnerError) throw updateNewOwnerError;

            // Update old owner role to admin
            const { error: updateOldOwnerError } = await this.supabase
                .from('team_members')
                .update({ role: 'admin' })
                .eq('team_id', teamId)
                .eq('user_id', currentUser.id);

            if (updateOldOwnerError) throw updateOldOwnerError;

            console.log('✅ Ownership transferred successfully');

            return {
                success: true,
                message: 'Ownership transferred successfully!'
            };

        } catch (error) {
            console.error('❌ Error transferring ownership:', error);
            return {
                success: false,
                error: error.message || 'Failed to transfer ownership'
            };
        }
    }

    /**
     * Search for users to invite (by username or email)
     * @param {string} query - Search query
     */
    async searchUsers(query) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('👥 Searching users:', query);

            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('id, username, full_name, avatar_url')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;

            console.log(`✅ Found ${data.length} users`);

            return {
                success: true,
                users: data
            };

        } catch (error) {
            console.error('❌ Error searching users:', error);
            return {
                success: false,
                error: error.message || 'Failed to search users',
                users: []
            };
        }
    }

    /**
     * Get user's role in a team
     * @param {string} teamId - Team ID
     */
    async getMyRole(teamId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (!window.AuthService.isAuthenticated()) {
                return { success: false, role: null };
            }

            const currentUser = window.AuthService.getCurrentUser();

            const { data, error } = await this.supabase
                .from('team_members')
                .select('role')
                .eq('team_id', teamId)
                .eq('user_id', currentUser.id)
                .single();

            if (error) {
                return { success: false, role: null };
            }

            return {
                success: true,
                role: data.role
            };

        } catch (error) {
            console.error('❌ Error getting user role:', error);
            return {
                success: false,
                role: null
            };
        }
    }

    /**
     * Check if user can perform action on team
     * @param {string} teamId - Team ID
     * @param {string} action - Action to check (e.g., 'edit', 'delete', 'add_member')
     */
    async canPerformAction(teamId, action) {
        try {
            const roleResult = await this.getMyRole(teamId);
            
            if (!roleResult.success || !roleResult.role) {
                return false;
            }

            const role = roleResult.role;
            const permissions = {
                owner: ['edit', 'delete', 'add_member', 'remove_member', 'change_role', 'transfer_ownership'],
                admin: ['edit', 'add_member', 'remove_member', 'change_role'],
                member: ['view', 'create_collection'],
                viewer: ['view']
            };

            return permissions[role]?.includes(action) || false;

        } catch (error) {
            console.error('❌ Error checking permissions:', error);
            return false;
        }
    }
}

// Initialize team service
const teamService = new TeamService();

// Export for global access
if (typeof window !== 'undefined') {
    window.TeamService = teamService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = teamService;
}