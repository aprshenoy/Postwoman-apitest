// Teams Manager - Handles team collaboration features

class TeamsManager {
    constructor() {
        this.teams = this.loadTeams();
        this.currentTeam = null;
        this.userRole = 'member'; // owner, admin, member
        this.isOnline = navigator.onLine;
        this.initialize();
    }

    initialize() {
        this.updateDisplay();
        this.setupOnlineStatusListener();
    }

    loadTeams() {
        try {
            const stored = localStorage.getItem('postwoman_teams');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading teams:', error);
            return [];
        }
    }

    saveTeams() {
        try {
            localStorage.setItem('postwoman_teams', JSON.stringify(this.teams));
            Core.emit('teamsUpdated', this.teams);
        } catch (error) {
            console.error('Error saving teams:', error);
        }
    }

    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            Core.emit('teamConnectionStatusChanged', true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            Core.emit('teamConnectionStatusChanged', false);
        });
    }

    updateDisplay() {
        const container = document.getElementById('teamsContainer');
        if (!container) return;

        if (this.teams.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = this.renderTeamsList();
    }

    renderEmptyState() {
        return `
            <div class="teams-empty-state">
                <div class="feature-card">
                    <h3>👥 Team Collaboration</h3>
                    <p>Work together with your team on API collections and environments. Share requests, collaborate in real-time, and manage access permissions.</p>
                    
                    <div class="features-list">
                        <h4>Features:</h4>
                        <ul>
                            <li>🔄 Real-time collaboration on collections</li>
                            <li>👥 Team member management</li>
                            <li>🔒 Role-based access control</li>
                            <li>📊 Team analytics and insights</li>
                            <li>💬 Comments and discussions</li>
                            <li>📋 Shared environments</li>
                            <li>🔔 Activity notifications</li>
                        </ul>
                    </div>
                    
                    <div class="team-actions" style="margin-top: 2rem;">
                        <button class="action-btn" onclick="TeamsManager.createTeam()">
                            ➕ Create Team
                        </button>
                        <button class="action-btn" onclick="TeamsManager.joinTeam()">
                            🔗 Join Team
                        </button>
                    </div>
                    
                    <div class="coming-soon-notice" style="margin-top: 2rem; padding: 1rem; background: #fef3c7; border-radius: 8px; color: #92400e;">
                        <strong>Coming Soon!</strong> Team collaboration features are currently in development. 
                        For now, you can export and share collections manually.
                    </div>
                </div>
            </div>
        `;
    }

    renderTeamsList() {
        return `
            <div class="teams-header">
                <div class="teams-status">
                    <span class="connection-status ${this.isOnline ? 'online' : 'offline'}">
                        ${this.isOnline ? '🟢 Online' : '🔴 Offline'}
                    </span>
                </div>
                <div class="teams-actions">
                    <button class="action-btn" onclick="TeamsManager.createTeam()">➕ Create Team</button>
                    <button class="action-btn" onclick="TeamsManager.joinTeam()">🔗 Join Team</button>
                </div>
            </div>

            <div class="teams-grid">
                ${this.teams.map(team => this.renderTeamCard(team)).join('')}
            </div>
        `;
    }

    renderTeamCard(team) {
        const isActive = this.currentTeam && this.currentTeam.id === team.id;
        
        return `
            <div class="team-card ${isActive ? 'active' : ''}" onclick="TeamsManager.selectTeam('${team.id}')">
                <div class="team-header">
                    <div class="team-avatar">
                        ${team.avatar || '👥'}
                    </div>
                    <div class="team-info">
                        <h3 class="team-name">${Core.escapeHtml(team.name)}</h3>
                        <p class="team-description">${Core.escapeHtml(team.description || 'No description')}</p>
                    </div>
                    <div class="team-menu">
                        <button class="team-menu-btn" onclick="event.stopPropagation(); TeamsManager.showTeamMenu('${team.id}', event)">
                            ⋮
                        </button>
                    </div>
                </div>
                
                <div class="team-stats">
                    <span class="stat-item">
                        <span class="stat-icon">👥</span>
                        <span class="stat-value">${team.members?.length || 0}</span>
                        <span class="stat-label">Members</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">📁</span>
                        <span class="stat-value">${team.collections?.length || 0}</span>
                        <span class="stat-label">Collections</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">🌍</span>
                        <span class="stat-value">${team.environments?.length || 0}</span>
                        <span class="stat-label">Environments</span>
                    </span>
                </div>
                
                <div class="team-members">
                    <div class="members-preview">
                        ${(team.members || []).slice(0, 5).map(member => 
                            `<div class="member-avatar" title="${Core.escapeHtml(member.name || member.email)}">
                                ${this.getInitials(member.name || member.email)}
                            </div>`
                        ).join('')}
                        ${team.members && team.members.length > 5 ? 
                            `<div class="member-count">+${team.members.length - 5}</div>` : ''
                        }
                    </div>
                </div>
                
                <div class="team-role">
                    <span class="role-badge role-${team.userRole || 'member'}">
                        ${this.getRoleIcon(team.userRole || 'member')} ${team.userRole || 'member'}
                    </span>
                </div>
            </div>
        `;
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getRoleIcon(role) {
        const icons = {
            'owner': '👑',
            'admin': '⚡',
            'member': '👤'
        };
        return icons[role] || '👤';
    }

    createTeam() {
        const modal = this.createTeamModal();
        document.body.appendChild(modal);
    }

    createTeamModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>👥 Create New Team</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <form onsubmit="TeamsManager.handleCreateTeam(event)">
                    <div class="form-group">
                        <label for="teamName">Team Name *</label>
                        <input type="text" id="teamName" required placeholder="Enter team name" maxlength="50">
                    </div>
                    
                    <div class="form-group">
                        <label for="teamDescription">Description</label>
                        <textarea id="teamDescription" rows="3" placeholder="Describe your team's purpose" maxlength="200"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="teamAvatar">Team Avatar (Emoji)</label>
                        <input type="text" id="teamAvatar" placeholder="👥" maxlength="2">
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="teamPublic"> 
                            Make team discoverable by others
                        </label>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="send-button">Create Team</button>
                        <button type="button" class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        return modal;
    }

    handleCreateTeam(event) {
        event.preventDefault();
        
        const name = document.getElementById('teamName').value.trim();
        const description = document.getElementById('teamDescription').value.trim();
        const avatar = document.getElementById('teamAvatar').value.trim() || '👥';
        const isPublic = document.getElementById('teamPublic').checked;
        
        if (!name) {
            alert('Please enter a team name');
            return;
        }
        
        const newTeam = {
            id: Core.generateId('team'),
            name: name,
            description: description,
            avatar: avatar,
            isPublic: isPublic,
            userRole: 'owner',
            members: [{
                id: 'current-user',
                name: 'You',
                email: 'user@example.com',
                role: 'owner',
                joinedAt: new Date().toISOString()
            }],
            collections: [],
            environments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.teams.push(newTeam);
        this.saveTeams();
        this.updateDisplay();
        
        // Close modal
        document.querySelector('.modal').remove();
        
        Core.showNotification('Team Created', `Team "${name}" created successfully!`);
    }

    joinTeam() {
        const modal = this.createJoinTeamModal();
        document.body.appendChild(modal);
    }

    createJoinTeamModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔗 Join Team</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <div class="join-team-options">
                    <div class="join-option">
                        <h4>Join by Invitation Link</h4>
                        <form onsubmit="TeamsManager.handleJoinByLink(event)">
                            <div class="form-group">
                                <label for="inviteLink">Invitation Link</label>
                                <input type="url" id="inviteLink" placeholder="https://postwoman.app/invite/..." required>
                            </div>
                            <button type="submit" class="action-btn">Join Team</button>
                        </form>
                    </div>
                    
                    <div class="join-divider">OR</div>
                    
                    <div class="join-option">
                        <h4>Join by Team Code</h4>
                        <form onsubmit="TeamsManager.handleJoinByCode(event)">
                            <div class="form-group">
                                <label for="teamCode">Team Code</label>
                                <input type="text" id="teamCode" placeholder="ABC123" required maxlength="10" style="text-transform: uppercase;">
                            </div>
                            <button type="submit" class="action-btn">Join Team</button>
                        </form>
                    </div>
                    
                    <div class="join-divider">OR</div>
                    
                    <div class="join-option">
                        <h4>Discover Public Teams</h4>
                        <button class="action-btn" onclick="TeamsManager.browsePublicTeams()">
                            🔍 Browse Teams
                        </button>
                    </div>
                </div>
                
                <div class="demo-notice" style="margin-top: 2rem; padding: 1rem; background: #e0f2fe; border-radius: 8px; color: #0369a1;">
                    <strong>Demo Mode:</strong> Team joining features are currently in development. 
                    You can create local demo teams for testing.
                </div>
            </div>
        `;
        
        return modal;
    }

    handleJoinByLink(event) {
        event.preventDefault();
        const link = document.getElementById('inviteLink').value;
        
        // Demo implementation
        this.simulateJoinTeam('Demo Team via Link');
        document.querySelector('.modal').remove();
    }

    handleJoinByCode(event) {
        event.preventDefault();
        const code = document.getElementById('teamCode').value.toUpperCase();
        
        // Demo implementation
        this.simulateJoinTeam(`Demo Team (${code})`);
        document.querySelector('.modal').remove();
    }

    simulateJoinTeam(teamName) {
        const demoTeam = {
            id: Core.generateId('team'),
            name: teamName,
            description: 'A demo team for testing collaboration features',
            avatar: '🚀',
            isPublic: false,
            userRole: 'member',
            members: [
                {
                    id: 'demo-owner',
                    name: 'Team Owner',
                    email: 'owner@example.com',
                    role: 'owner',
                    joinedAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'current-user',
                    name: 'You',
                    email: 'user@example.com',
                    role: 'member',
                    joinedAt: new Date().toISOString()
                }
            ],
            collections: [
                {
                    id: 'demo-collection',
                    name: 'Shared API Collection',
                    description: 'A collection shared by the team',
                    requestCount: 5
                }
            ],
            environments: [
                {
                    id: 'demo-env',
                    name: 'Team Development',
                    description: 'Shared development environment'
                }
            ],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.teams.push(demoTeam);
        this.saveTeams();
        this.updateDisplay();
        
        Core.showNotification('Joined Team', `Successfully joined "${teamName}"!`);
    }

    browsePublicTeams() {
        Core.showNotification('Coming Soon', 'Public team discovery is in development');
    }

    selectTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;
        
        this.currentTeam = team;
        this.showTeamDetails(team);
    }

    showTeamDetails(team) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${team.avatar} ${Core.escapeHtml(team.name)}</h3>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <div class="team-details">
                    ${this.renderTeamDetailsContent(team)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderTeamDetailsContent(team) {
        return `
            <div class="team-info-section">
                <div class="team-basic-info">
                    <p><strong>Description:</strong> ${Core.escapeHtml(team.description || 'No description')}</p>
                    <p><strong>Created:</strong> ${Core.formatDate(team.createdAt)}</p>
                    <p><strong>Your Role:</strong> ${this.getRoleIcon(team.userRole)} ${team.userRole}</p>
                    <p><strong>Status:</strong> ${team.isPublic ? '🌐 Public' : '🔒 Private'}</p>
                </div>
            </div>
            
            <div class="team-sections">
                <div class="team-section">
                    <h4>👥 Members (${team.members.length})</h4>
                    <div class="members-list">
                        ${team.members.map(member => `
                            <div class="member-item">
                                <div class="member-avatar">${this.getInitials(member.name)}</div>
                                <div class="member-info">
                                    <div class="member-name">${Core.escapeHtml(member.name)}</div>
                                    <div class="member-email">${Core.escapeHtml(member.email)}</div>
                                </div>
                                <div class="member-role">
                                    <span class="role-badge role-${member.role}">
                                        ${this.getRoleIcon(member.role)} ${member.role}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="team-section">
                    <h4>📁 Shared Collections (${team.collections.length})</h4>
                    ${team.collections.length > 0 ? `
                        <div class="collections-list">
                            ${team.collections.map(collection => `
                                <div class="collection-item">
                                    <div class="collection-name">${Core.escapeHtml(collection.name)}</div>
                                    <div class="collection-description">${Core.escapeHtml(collection.description || '')}</div>
                                    <div class="collection-meta">${collection.requestCount || 0} requests</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-state">No shared collections yet</p>'}
                </div>
                
                <div class="team-section">
                    <h4>🌍 Shared Environments (${team.environments.length})</h4>
                    ${team.environments.length > 0 ? `
                        <div class="environments-list">
                            ${team.environments.map(env => `
                                <div class="environment-item">
                                    <div class="environment-name">${Core.escapeHtml(env.name)}</div>
                                    <div class="environment-description">${Core.escapeHtml(env.description || '')}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-state">No shared environments yet</p>'}
                </div>
            </div>
            
            <div class="team-actions-section">
                <div class="team-actions">
                    ${team.userRole === 'owner' || team.userRole === 'admin' ? `
                        <button class="action-btn" onclick="TeamsManager.inviteMembers('${team.id}')">
                            ➕ Invite Members
                        </button>
                        <button class="action-btn" onclick="TeamsManager.manageTeam('${team.id}')">
                            ⚙️ Manage Team
                        </button>
                    ` : ''}
                    <button class="action-btn" onclick="TeamsManager.shareCollection('${team.id}')">
                        📤 Share Collection
                    </button>
                    <button class="action-btn" onclick="TeamsManager.shareEnvironment('${team.id}')">
                        🌍 Share Environment
                    </button>
                    ${team.userRole !== 'owner' ? `
                        <button class="btn-delete" onclick="TeamsManager.leaveTeam('${team.id}')">
                            🚪 Leave Team
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showTeamMenu(teamId, event) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        const menuItems = [
            {
                icon: '👁️',
                label: 'View Details',
                action: `TeamsManager.selectTeam('${teamId}')`
            }
        ];

        if (team.userRole === 'owner' || team.userRole === 'admin') {
            menuItems.push(
                {
                    icon: '➕',
                    label: 'Invite Members',
                    action: `TeamsManager.inviteMembers('${teamId}')`
                },
                {
                    icon: '⚙️',
                    label: 'Manage Team',
                    action: `TeamsManager.manageTeam('${teamId}')`
                }
            );
        }

        menuItems.push({ separator: true });

        if (team.userRole === 'owner') {
            menuItems.push({
                icon: '🗑️',
                label: 'Delete Team',
                action: `TeamsManager.deleteTeam('${teamId}')`,
                danger: true
            });
        } else {
            menuItems.push({
                icon: '🚪',
                label: 'Leave Team',
                action: `TeamsManager.leaveTeam('${teamId}')`,
                danger: true
            });
        }

        UI.showContextMenu(event, menuItems);
    }

    inviteMembers(teamId) {
        Core.showNotification('Coming Soon', 'Member invitation feature is in development');
    }

    manageTeam(teamId) {
        Core.showNotification('Coming Soon', 'Team management interface is in development');
    }

    shareCollection(teamId) {
        Core.showNotification('Coming Soon', 'Collection sharing feature is in development');
    }

    shareEnvironment(teamId) {
        Core.showNotification('Coming Soon', 'Environment sharing feature is in development');
    }

    leaveTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        if (!confirm(`Are you sure you want to leave "${team.name}"?`)) {
            return;
        }

        this.teams = this.teams.filter(t => t.id !== teamId);
        this.saveTeams();
        this.updateDisplay();

        if (this.currentTeam && this.currentTeam.id === teamId) {
            this.currentTeam = null;
        }

        Core.showNotification('Left Team', `You have left "${team.name}"`);
    }

    deleteTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        if (team.userRole !== 'owner') {
            alert('Only team owners can delete teams');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
            return;
        }

        this.teams = this.teams.filter(t => t.id !== teamId);
        this.saveTeams();
        this.updateDisplay();

        if (this.currentTeam && this.currentTeam.id === teamId) {
            this.currentTeam = null;
        }

        Core.showNotification('Team Deleted', `Team "${team.name}" has been deleted`);
    }

    exportTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        const exportData = {
            postwoman_team_export: true,
            version: '1.0.0',
            team: team,
            exported_at: new Date().toISOString()
        };

        Core.downloadFile(exportData, `team_${team.name.replace(/[^a-z0-9]/gi, '_')}.json`);
        Core.showNotification('Team Exported', `Team "${team.name}" exported successfully`);
    }

    getTeamStats() {
        return {
            totalTeams: this.teams.length,
            ownedTeams: this.teams.filter(t => t.userRole === 'owner').length,
            totalMembers: this.teams.reduce((sum, team) => sum + (team.members?.length || 0), 0),
            sharedCollections: this.teams.reduce((sum, team) => sum + (team.collections?.length || 0), 0),
            sharedEnvironments: this.teams.reduce((sum, team) => sum + (team.environments?.length || 0), 0)
        };
    }
}

// Global instance
window.TeamsManager = new TeamsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamsManager;
}