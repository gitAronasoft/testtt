
/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality with API integration
 */

class AdminManager {
    constructor() {
        this.users = [];
        this.videos = [];
        this.stats = {};
        this.usersTable = null;
        this.currentUserId = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        
        // Load page-specific data
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html') {
            await this.loadDashboardData();
        } else {
            await this.waitForAPIService();
        }
        
        this.loadPageSpecificHandlers();
    }

    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 50;
        
        while (retries < maxRetries && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (window.apiService) {
            try {
                const [usersResponse, videosResponse] = await Promise.all([
                    window.apiService.get('/admin/users'),
                    window.apiService.get('/videos')
                ]);
                
                this.users = usersResponse.data || usersResponse.users || [];
                this.videos = videosResponse.data || videosResponse.videos || [];
            } catch (error) {
                console.error('Failed to load data from API:', error);
                this.users = [];
                this.videos = [];
            }
        }
    }

    async loadDashboardData() {
        // Prevent multiple concurrent loads using global state
        if (window.VideoHubState && window.VideoHubState.isLoading('adminData')) {
            console.log('Admin data loading already in progress, skipping...');
            return;
        }

        try {
            if (window.VideoHubState) {
                window.VideoHubState.setLoading('adminData', true);
            }

            // Wait for API service to be available
            let retries = 0;
            const maxRetries = 50;
            
            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            if (window.apiService) {
                // Load admin metrics from new metrics API
                const metricsResponse = await window.apiService.get('/metrics/admin');
                if (metricsResponse.success) {
                    const metrics = metricsResponse.data;
                    this.updateDashboardMetrics(metrics);
                }
                
                // Load additional data for dashboard
                const [usersResponse, videosResponse] = await Promise.all([
                    window.apiService.get('/admin/users'),
                    window.apiService.get('/videos')
                ]);
                
                this.users = usersResponse.data || usersResponse.users || [];
                this.videos = videosResponse.data || videosResponse.videos || [];
                
                // Update sidebar badges
                this.updateSidebarBadges();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Set empty values on error
            this.updateDashboardMetrics({
                totalUsers: 0,
                totalVideos: 0,
                totalViews: 0,
                pendingVideos: 0
            });
        } finally {
            if (window.VideoHubState) {
                window.VideoHubState.setLoading('adminData', false);
            }
        }
    }

    updateDashboardMetrics(metrics) {
        // Update dashboard metric displays
        const totalUsersEl = document.getElementById('totalUsers');
        const totalVideosEl = document.getElementById('totalVideos');
        const totalViewsEl = document.getElementById('totalViews');
        const pendingVideosEl = document.getElementById('pendingVideos');
        
        if (totalUsersEl) totalUsersEl.textContent = metrics.totalUsers || 0;
        if (totalVideosEl) totalVideosEl.textContent = metrics.totalVideos || 0;
        if (totalViewsEl) totalViewsEl.textContent = metrics.totalViews || 0;
        if (pendingVideosEl) pendingVideosEl.textContent = metrics.pendingVideos || 0;
    }

    updateSidebarBadges() {
        // Sidebar badges removed for cleaner interface
    }

    bindEvents() {
        // Event listeners for admin functionality
        document.addEventListener('DOMContentLoaded', () => {
            this.loadPageSpecificHandlers();
            this.bindModalEvents();
        });
    }

    bindModalEvents() {
        // Add User Modal
        const saveUserBtn = document.getElementById('saveUser');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => this.handleAddUser());
        }

        // Edit User Modal
        const updateUserBtn = document.getElementById('updateUser');
        if (updateUserBtn) {
            updateUserBtn.addEventListener('click', () => this.handleUpdateUser());
        }

        // Confirm Delete
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.handleConfirmDelete());
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.initDashboard();
                break;
            case 'users.html':
                this.initUsersPage();
                break;
            case 'videos.html':
                this.initVideosPage();
                break;
        }
    }

    initDashboard() {
        console.log('Admin dashboard initialized');
    }

    async initUsersPage() {
        await this.loadUsersDataTable();
    }

    initVideosPage() {
        this.loadVideosTable();
    }

    async loadUsersDataTable() {
        // Wait for jQuery and DataTables to be available
        if (typeof $ === 'undefined' || !$.fn.DataTable) {
            setTimeout(() => this.loadUsersDataTable(), 100);
            return;
        }

        // Load users data first
        if (!this.users.length && window.apiService) {
            try {
                const response = await window.apiService.get('/admin/users');
                this.users = response.data || response.users || [];
            } catch (error) {
                console.error('Failed to load users:', error);
                this.users = [];
            }
        }

        // Update total users count
        const totalUsersCount = document.getElementById('totalUsersCount');
        if (totalUsersCount) {
            totalUsersCount.textContent = this.users.length;
        }

        // Initialize DataTable
        if (this.usersTable) {
            this.usersTable.destroy();
        }

        this.usersTable = $('#usersTable').DataTable({
            data: this.users,
            responsive: true,
            pageLength: 25,
            order: [[0, 'asc']],
            columns: [
                { 
                    data: 'id',
                    width: '60px'
                },
                { 
                    data: null,
                    render: function(data, type, row) {
                        const firstName = row.firstName || row.name || 'Unknown';
                        const lastName = row.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        return `
                            <div class="d-flex align-items-center">
                                <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                    <i class="fas fa-user text-primary"></i>
                                </div>
                                <div>
                                    <div class="fw-semibold">${fullName}</div>
                                    <small class="text-muted">ID: ${row.id}</small>
                                </div>
                            </div>
                        `;
                    }
                },
                { 
                    data: 'email',
                    render: function(data) {
                        return data || 'No email';
                    }
                },
                { 
                    data: 'role',
                    render: function(data) {
                        const badgeClass = {
                            'admin': 'danger',
                            'creator': 'success', 
                            'viewer': 'primary'
                        };
                        const roleText = data ? data.charAt(0).toUpperCase() + data.slice(1) : 'Viewer';
                        return `<span class="badge bg-${badgeClass[data] || 'secondary'}">${roleText}</span>`;
                    }
                },
                {
                    data: 'status',
                    render: function(data) {
                        const badgeClass = {
                            'active': 'success',
                            'inactive': 'warning',
                            'suspended': 'danger',
                            'revoked': 'dark'
                        };
                        const statusText = data ? data.charAt(0).toUpperCase() + data.slice(1) : 'Active';
                        return `<span class="badge bg-${badgeClass[data] || 'success'}">${statusText}</span>`;
                    }
                },
                {
                    data: 'joinDate',
                    render: function(data) {
                        if (!data) return 'Unknown';
                        try {
                            return new Date(data).toLocaleDateString();
                        } catch (e) {
                            return data;
                        }
                    }
                },
                {
                    data: null,
                    orderable: false,
                    width: '200px',
                    render: function(data, type, row) {
                        return `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-info" onclick="adminManager.showUserDetails(${row.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary" onclick="adminManager.editUser(${row.id})" title="Edit User">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning" onclick="adminManager.revokeUser(${row.id})" title="Revoke Access">
                                    <i class="fas fa-ban"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="adminManager.deleteUser(${row.id})" title="Delete User">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            language: {
                search: "Search users:",
                lengthMenu: "Show _MENU_ users per page",
                info: "Showing _START_ to _END_ of _TOTAL_ users",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            },
            dom: '<"row"<"col-sm-6"l><"col-sm-6"f>>rtip'
        });
    }

    async loadVideosTable() {
        if (!this.videos.length && window.apiService) {
            try {
                const response = await window.apiService.get('/videos');
                this.videos = response.data || response.videos || [];
            } catch (error) {
                console.error('Failed to load videos:', error);
                this.videos = [];
            }
        }
        
        const tbody = document.querySelector('#videosTable tbody');
        if (!tbody) return;
        
        if (this.videos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No videos found</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.videos.map(video => `
            <tr>
                <td>${video.id}</td>
                <td>
                    <img src="${video.youtube_thumbnail || 'https://via.placeholder.com/60x40'}" 
                         alt="${video.title}" class="rounded" style="width: 60px; height: 40px; object-fit: cover;">
                </td>
                <td>${video.title}</td>
                <td>${video.uploader_id}</td>
                <td>$${video.price || '0.00'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminManager.editVideo(${video.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminManager.deleteVideo(${video.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getUserRoleBadgeClass(role) {
        switch(role) {
            case 'admin': return 'danger';
            case 'creator': return 'success';
            case 'viewer': return 'primary';
            default: return 'secondary';
        }
    }

    // User Management Methods
    async showUserDetails(userId) {
        try {
            // Find user in local data first
            let user = this.users.find(u => u.id === userId);
            
            // If not found locally, fetch from API
            if (!user && window.apiService) {
                const response = await window.apiService.get(`/api/users/${userId}`);
                if (response.success) {
                    user = response.data;
                }
            }

            if (user) {
                // Populate user details modal
                document.getElementById('detailUserId').textContent = user.id;
                document.getElementById('detailUserName').textContent = `${user.firstName || user.name || 'Unknown'} ${user.lastName || ''}`.trim();
                document.getElementById('detailUserEmail').textContent = user.email || 'No email';
                document.getElementById('detailUserRole').textContent = (user.role || 'viewer').charAt(0).toUpperCase() + (user.role || 'viewer').slice(1);
                document.getElementById('detailUserRole').className = `badge bg-${this.getUserRoleBadgeClass(user.role)}`;
                
                // Status badge
                const statusEl = document.getElementById('detailUserStatus');
                statusEl.textContent = (user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1);
                statusEl.className = `badge bg-${user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : user.status === 'revoked' ? 'dark' : 'warning'}`;
                
                document.getElementById('detailJoinDate').textContent = user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'Unknown';
                document.getElementById('detailEmailVerified').textContent = user.email_verified_at ? 'Verified' : 'Not Verified';
                document.getElementById('detailEmailVerified').className = `badge bg-${user.email_verified_at ? 'success' : 'warning'}`;
                document.getElementById('detailLastLogin').textContent = 'Recently'; // Mock data
                
                // Mock additional data
                document.getElementById('detailVideoCount').textContent = Math.floor(Math.random() * 10);
                document.getElementById('detailPurchaseCount').textContent = Math.floor(Math.random() * 20);
                document.getElementById('detailTotalSpent').textContent = `$${(Math.random() * 500).toFixed(2)}`;
                
                // Store current user ID
                this.currentUserId = userId;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
                modal.show();
            } else {
                window.apiService?.showErrorMessage('User not found');
            }
        } catch (error) {
            console.error('Error showing user details:', error);
            window.apiService?.showErrorMessage('Failed to load user details');
        }
    }

    editUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                window.apiService?.showErrorMessage('User not found');
                return;
            }

            // Populate edit form
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFirstName').value = user.firstName || user.name || '';
            document.getElementById('editLastName').value = user.lastName || '';
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editUserType').value = user.role || 'viewer';
            document.getElementById('editStatus').value = user.status || 'active';

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } catch (error) {
            console.error('Error editing user:', error);
            window.apiService?.showErrorMessage('Failed to load user for editing');
        }
    }

    async revokeUser(userId) {
        if (confirm('Are you sure you want to revoke access for this user? They will no longer be able to access their dashboard.')) {
            try {
                // Update user status to revoked
                const response = await window.apiService.put(`/api/users/${userId}`, {
                    status: 'revoked'
                });

                if (response.success) {
                    // Update local data
                    const userIndex = this.users.findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        this.users[userIndex].status = 'revoked';
                    }
                    
                    // Refresh DataTable
                    this.usersTable.clear().rows.add(this.users).draw();
                    
                    window.apiService.showSuccessMessage('User access revoked successfully');
                } else {
                    window.apiService.handleApiError(response, 'Failed to revoke user access');
                }
            } catch (error) {
                console.error('Error revoking user:', error);
                // Demo mode - update locally
                const userIndex = this.users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.users[userIndex].status = 'revoked';
                    this.usersTable.clear().rows.add(this.users).draw();
                    window.apiService.showSuccessMessage('User access revoked successfully (demo mode)');
                }
            }
        }
    }

    deleteUser(userId) {
        this.currentUserId = userId;
        const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
        modal.show();
    }

    async handleConfirmDelete() {
        if (!this.currentUserId) return;

        try {
            const response = await window.apiService.delete(`/api/users/${this.currentUserId}`);
            
            if (response.success) {
                // Remove from local data
                this.users = this.users.filter(u => u.id !== this.currentUserId);
                
                // Refresh DataTable
                this.usersTable.clear().rows.add(this.users).draw();
                
                // Update count
                const totalUsersCount = document.getElementById('totalUsersCount');
                if (totalUsersCount) {
                    totalUsersCount.textContent = this.users.length;
                }
                
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
                modal.hide();
                
                window.apiService.showSuccessMessage('User deleted successfully');
            } else {
                window.apiService.handleApiError(response, 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            // Demo mode - remove locally
            this.users = this.users.filter(u => u.id !== this.currentUserId);
            this.usersTable.clear().rows.add(this.users).draw();
            
            const totalUsersCount = document.getElementById('totalUsersCount');
            if (totalUsersCount) {
                totalUsersCount.textContent = this.users.length;
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            modal.hide();
            
            window.apiService.showSuccessMessage('User deleted successfully (demo mode)');
        }
        
        this.currentUserId = null;
    }

    async handleAddUser() {
        const form = document.getElementById('addUserForm');
        const formData = new FormData(form);
        
        const userData = {
            name: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
            email: formData.get('email'),
            role: formData.get('userType'),
            status: formData.get('status') || 'active'
        };

        if (!userData.name || !userData.email || !userData.role) {
            window.apiService?.showErrorMessage('Please fill in all required fields');
            return;
        }

        try {
            const response = await window.apiService.post('/api/users', userData);
            
            if (response.success) {
                // Add to local data
                const newUser = {
                    id: response.data.id || Date.now(),
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    status: userData.status,
                    joinDate: new Date().toISOString()
                };
                
                this.users.push(newUser);
                
                // Refresh DataTable
                this.usersTable.clear().rows.add(this.users).draw();
                
                // Update count
                const totalUsersCount = document.getElementById('totalUsersCount');
                if (totalUsersCount) {
                    totalUsersCount.textContent = this.users.length;
                }
                
                // Hide modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                form.reset();
                
                window.apiService.showSuccessMessage('User created successfully');
            } else {
                window.apiService.handleApiError(response, 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            // Demo mode
            const newUser = {
                id: Date.now(),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                name: userData.name,
                email: userData.email,
                role: userData.role,
                status: userData.status,
                joinDate: new Date().toISOString()
            };
            
            this.users.push(newUser);
            this.usersTable.clear().rows.add(this.users).draw();
            
            const totalUsersCount = document.getElementById('totalUsersCount');
            if (totalUsersCount) {
                totalUsersCount.textContent = this.users.length;
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            modal.hide();
            form.reset();
            
            window.apiService.showSuccessMessage('User created successfully (demo mode)');
        }
    }

    async handleUpdateUser() {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        const userId = parseInt(formData.get('editUserId'));
        
        const userData = {
            name: `${formData.get('editFirstName')} ${formData.get('editLastName')}`.trim(),
            email: formData.get('editEmail'),
            role: formData.get('editUserType'),
            status: formData.get('editStatus')
        };

        try {
            const response = await window.apiService.put(`/api/users/${userId}`, userData);
            
            if (response.success) {
                // Update local data
                const userIndex = this.users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.users[userIndex] = {
                        ...this.users[userIndex],
                        firstName: formData.get('editFirstName'),
                        lastName: formData.get('editLastName'),
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        status: userData.status
                    };
                }
                
                // Refresh DataTable
                this.usersTable.clear().rows.add(this.users).draw();
                
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                
                window.apiService.showSuccessMessage('User updated successfully');
            } else {
                window.apiService.handleApiError(response, 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            // Demo mode
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                this.users[userIndex] = {
                    ...this.users[userIndex],
                    firstName: formData.get('editFirstName'),
                    lastName: formData.get('editLastName'),
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    status: userData.status
                };
                
                this.usersTable.clear().rows.add(this.users).draw();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                
                window.apiService.showSuccessMessage('User updated successfully (demo mode)');
            }
        }
    }

    editVideo(videoId) {
        console.log('Edit video:', videoId);
    }

    deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video?')) {
            console.log('Delete video:', videoId);
        }
    }
}

// Global functions
window.editUserFromDetails = function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
    modal.hide();
    
    setTimeout(() => {
        window.adminManager.editUser(window.adminManager.currentUserId);
    }, 300);
};

window.exportUsers = function() {
    if (window.adminManager.users.length === 0) {
        window.apiService?.showErrorMessage('No users to export');
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Join Date'];
    const csvContent = [
        headers.join(','),
        ...window.adminManager.users.map(user => [
            user.id,
            `"${(user.firstName || user.name || '') + ' ' + (user.lastName || '')}".trim()`,
            `"${user.email || ''}"`,
            user.role || 'viewer',
            user.status || 'active',
            user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'Unknown'
        ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `videohub_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    window.apiService?.showSuccessMessage('Users exported successfully');
};

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});
