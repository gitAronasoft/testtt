
/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality with API integration
 */

class AdminManager {
    constructor() {
        console.log('AdminManager constructor called');
        
        // Prevent multiple instances
        if (window.adminManagerInstance) {
            console.log('Returning existing AdminManager instance');
            return window.adminManagerInstance;
        }
        
        this.users = [];
        this.videos = [];
        this.stats = {};
        this.usersTable = null;
        this.currentUserId = null;
        this.isInitializingTable = false;
        this.dataLoaded = false;
        this.tableInitialized = false;
        this.handlersLoaded = false;
        
        // Store instance globally
        window.adminManagerInstance = this;
        console.log('New AdminManager instance created');
        
        this.init();
    }

    async init() {
        this.bindEvents();
        
        // Load page-specific data
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html') {
            await this.loadDashboardData();
        } else if (currentPage === 'users.html') {
            // For users page, only initialize table once
            await this.initUsersPage();
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

        // Only load data for non-dashboard and non-users pages
        const currentPage = window.location.pathname.split('/').pop();
        
        if (window.apiService && !this.dataLoaded && currentPage !== 'users.html') {
            try {
                if (currentPage === 'user-detail.html') {
                    const usersResponse = await window.apiService.get('/admin/users');
                    this.users = usersResponse.data || usersResponse.users || [];
                    this.dataLoaded = true;
                }
                
                if (currentPage === 'videos.html') {
                    // const videosResponse = await window.apiService.get('/videos');
                    // this.videos = videosResponse.data || videosResponse.videos || [];
                    this.dataLoaded = true;
                }
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

            // Show section loaders
            const metricsSection = document.querySelector('.admin-metrics');
            const usersSection = document.querySelector('.admin-users');
            const videosSection = document.querySelector('.admin-videos');

            if (window.commonUtils) {
                if (metricsSection) window.commonUtils.showSectionLoader(metricsSection, 'Loading admin metrics...');
                if (usersSection) window.commonUtils.showSectionLoader(usersSection, 'Loading user data...');
                if (videosSection) window.commonUtils.showSectionLoader(videosSection, 'Loading video data...');
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
            
            // Handle API error with proper user feedback
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Loading admin dashboard data');
            }
            
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

            // Hide section loaders
            const metricsSection = document.querySelector('.admin-metrics');
            const usersSection = document.querySelector('.admin-users');
            const videosSection = document.querySelector('.admin-videos');

            if (window.commonUtils) {
                if (metricsSection) window.commonUtils.hideSectionLoader(metricsSection);
                if (usersSection) window.commonUtils.hideSectionLoader(usersSection);
                if (videosSection) window.commonUtils.hideSectionLoader(videosSection);
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
        
        // Prevent multiple handler loads
        if (this.handlersLoaded) {
            return;
        }
        this.handlersLoaded = true;
        
        switch (currentPage) {
            case 'dashboard.html':
                this.initDashboard();
                break;
            case 'users.html':
                // Users page already initialized in init() method
                break;
            case 'videos.html':
                ///this.initVideosPage();
                break;
        }
    }

    initDashboard() {
        console.log('Admin dashboard initialized');
    }

    async initUsersPage() {
        // Wait for API service first
        let retries = 0;
        while (retries < 50 && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        // Only initialize if not already done and ensure single initialization
        if (!this.isInitializingTable && !this.usersTable && !this.tableInitialized) {
            this.tableInitialized = true;
            await this.loadUsersDataTable();
        }
    }

    // initVideosPage() {
    //     this.loadVideosGrid();
    // }

    async loadUsersDataTable() {
        // Prevent multiple simultaneous initializations
        if (this.isInitializingTable) {
            console.log('Table initialization already in progress');
            return;
        }
        
        this.isInitializingTable = true;

        try {
            // Wait for jQuery and DataTables to be available
            // if (typeof $ === 'undefined' || !$.fn.DataTable) {
            //     setTimeout(() => {
            //         this.isInitializingTable = false;
            //         this.loadUsersDataTable();
            //     }, 100);
            //     return;
            // }

            // Check if table element exists
            const tableElement = $('#usersTable');
            if (tableElement.length === 0) {
                console.error('Users table element not found');
                this.isInitializingTable = false;
                return;
            }

            // Load users data first (only if not already loaded)
            if (!this.users.length && !this.dataLoaded) {
                try {
                    console.log('Loading users data from API...');
                    const response = await fetch('/api/admin/users');
                    const result = await response.json();
                    if (result.success) {
                        this.users = result.data || [];
                        this.dataLoaded = true;
                        console.log(`Loaded ${this.users.length} users`);
                    } else {
                        this.users = [];
                    }
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

            // Properly destroy existing DataTable if it exists
            if ($.fn.DataTable.isDataTable('#usersTable')) {
                console.log('Destroying existing DataTable');
                tableElement.DataTable().clear().destroy();
                tableElement.empty(); // Clear table contents
                this.usersTable = null;
            }

            // Small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 150));

        // Initialize DataTable
        this.usersTable = tableElement.DataTable({
            data: this.users,
            responsive: true,
            pageLength: 25,
            order: [[0, 'asc']],
            columnDefs: [
                { 
                    targets: 0,
                    data: null,
                    width: '60px',
                    className: 'text-center',
                    orderable: false,
                    render: function(data, type, row, meta) {
                        return meta.row + 1; // Serial number starting from 1
                    }
                },
                { 
                    targets: 1,
                    data: null,
                    orderable: true,
                    render: function(data, type, row) {
                        const name = row.name || 'Unknown User';
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                        return `
                            <div class="d-flex align-items-center">
                                <div class="user-avatar me-3">
                                    ${initials}
                                </div>
                                <div>
                                    <div class="fw-semibold">${name}</div>
                                    <small class="text-muted">ID: ${row.id}</small>
                                </div>
                            </div>
                        `;
                    }
                },
                { 
                    targets: 2,
                    data: 'email',
                    render: function(data) {
                        return data || 'No email';
                    }
                },
                { 
                    targets: 3,
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
                    targets: 4,
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
                    targets: 5,
                    data: null,
                    render: function(data, type, row) {
                        return row.email_verified_at ? '<span class="badge bg-success">Verified</span>' : '<span class="badge bg-warning">Not Verified</span>';
                    }
                },
                {
                    targets: 6,
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
                    targets: 7,
                    data: null,
                    orderable: false,
                    width: '200px',
                    className: 'text-center',
                    render: function(data, type, row) {
                        return `
                            <div class="btn-group" role="group">
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-outline-info dropdown-toggle" type="button" data-bs-toggle="dropdown" title="View Options">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="adminManager.showUserDetails(${row.id})"><i class="fas fa-info-circle me-2"></i>Quick View</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="viewUserDetailsPage(${row.id})"><i class="fas fa-external-link-alt me-2"></i>Full Details</a></li>
                                    </ul>
                                </div>
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
                infoEmpty: "No users available",
                infoFiltered: "(filtered from _MAX_ total users)",
                zeroRecords: "No matching users found",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            searchDelay: 400,
            processing: true,
            drawCallback: function() {
                console.log('DataTable draw completed');
            }
        });
        
        console.log('DataTable initialized successfully with', this.users.length, 'users');
        
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        } finally {
            this.isInitializingTable = false;
        }
    }

    // User management methods
    async showUserDetails(userId) {
        try {
            // Find user in local data first
            let user = this.users.find(u => u.id == userId);
            
            // If not found locally, fetch from API
            if (!user) {
                const response = await fetch(`/api/admin/users?id=${userId}`);
                const result = await response.json();
                if (result.success) {
                    user = result.data;
                }
            }

            if (user) {
                // Populate user details modal
                document.getElementById('detailUserId').textContent = user.id;
                document.getElementById('detailUserName').textContent = user.name || 'Unknown User';
                document.getElementById('detailUserEmail').textContent = user.email || 'No email';
                document.getElementById('detailUserRole').textContent = (user.role || 'viewer').charAt(0).toUpperCase() + (user.role || 'viewer').slice(1);
                document.getElementById('detailUserRole').className = `badge bg-${this.getUserRoleBadgeClass(user.role)}`;
                
                // Status badge
                const statusEl = document.getElementById('detailUserStatus');
                statusEl.textContent = (user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1);
                statusEl.className = `badge bg-${user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : user.status === 'revoked' ? 'dark' : 'warning'}`;
                
                document.getElementById('detailJoinDate').textContent = user.joinDate ? new Date(user.joinDate).toLocaleDateString() : (user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown');
                document.getElementById('detailEmailVerified').textContent = user.email_verified_at ? 'Verified' : 'Not Verified';
                document.getElementById('detailEmailVerified').className = `badge bg-${user.email_verified_at ? 'success' : 'warning'}`;
                document.getElementById('detailLastLogin').textContent = 'Recently'; // Mock data for now
                
                // Mock additional data - in production, you'd fetch this from API
                document.getElementById('detailVideoCount').textContent = Math.floor(Math.random() * 10);
                document.getElementById('detailPurchaseCount').textContent = Math.floor(Math.random() * 20);
                document.getElementById('detailTotalSpent').textContent = `$${(Math.random() * 500).toFixed(2)}`;
                
                // Store current user ID for editing
                this.currentUserId = userId;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
                modal.show();
            } else {
                this.showAlert('User not found', 'danger');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showAlert('Failed to load user details', 'danger');
        }
    }

    async editUser(userId) {
        try {
            const response = await fetch(`/api/admin/users?id=${userId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const user = result.data;
                
                // Fill edit form
                document.getElementById('editUserId').value = user.id;
                document.getElementById('editFirstName').value = user.name?.split(' ')[0] || '';
                document.getElementById('editLastName').value = user.name?.split(' ').slice(1).join(' ') || '';
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editUserType').value = user.role;
                document.getElementById('editStatus').value = user.status || 'active';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.showAlert('Error loading user details', 'danger');
        }
    }

    async revokeUser(userId) {
        if (confirm('Are you sure you want to revoke access for this user?')) {
            try {
                const response = await fetch('/api/admin/users', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: userId,
                        status: 'revoked'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showAlert('User access revoked successfully', 'warning');
                    this.refreshUsersTable();
                } else {
                    this.showAlert(result.message || 'Failed to revoke user access', 'danger');
                }
            } catch (error) {
                console.error('Error revoking user:', error);
                this.showAlert('Error revoking user access', 'danger');
            }
        }
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                const response = await fetch('/api/admin/users', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: userId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showAlert('User deleted successfully', 'success');
                    this.refreshUsersTable();
                } else {
                    this.showAlert(result.message || 'Failed to delete user', 'danger');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showAlert('Error deleting user', 'danger');
            }
        }
    }

    async createUser(userData) {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('User created successfully', 'success');
                this.refreshUsersTable();
                return true;
            } else {
                this.showAlert(result.message || 'Failed to create user', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showAlert('Error creating user', 'danger');
            return false;
        }
    }

    async updateUser(userData) {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('User updated successfully', 'success');
                this.refreshUsersTable();
                return true;
            } else {
                this.showAlert(result.message || 'Failed to update user', 'danger');
                return false;
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showAlert('Error updating user', 'danger');
            return false;
        }
    }

    async refreshUsersTable() {
        if (this.usersTable && $.fn.DataTable.isDataTable('#usersTable')) {
            // Reload data
            try {
                const response = await fetch('/api/admin/users');
                const result = await response.json();
                
                if (result.success) {
                    this.users = result.data || [];
                    this.usersTable.clear();
                    this.usersTable.rows.add(this.users);
                    this.usersTable.draw();
                    
                    // Update total count
                    const totalUsersCount = document.getElementById('totalUsersCount');
                    if (totalUsersCount) {
                        totalUsersCount.textContent = this.users.length;
                    }
                }
            } catch (error) {
                console.error('Error refreshing users table:', error);
                this.showAlert('Error refreshing table', 'danger');
            }
        } else {
            // If table doesn't exist, reinitialize it
            await this.loadUsersDataTable();
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('main');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }

    async loadVideosGrid() {

           console.log('load grid');
        const videosGrid = document.getElementById('videosGrid');
        const loadingIndicator = document.getElementById('videosLoadingIndicator');
        const emptyState = document.getElementById('emptyState');
        
        if (!videosGrid) return;
        
        try {
            // Show loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
            }
            if (emptyState) {
                emptyState.classList.add('d-none');
            }
            
            // Load videos from API
            let response = await fetch('/api/videos');
            let result = await response.json();
            console.log('Videos API response:', result);
            
            if (result.success && result.data && result.data.videos) {
                // Transform videos data for admin display
                this.videos = result.data.videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    price: video.price,
                    thumbnail: video.thumbnail,
                    creator_name: video.creatorName,
                    creator_email: '',
                    upload_date: video.uploadDate,
                    views: video.views,
                    purchase_count: video.views,
                    status: video.status || 'published',
                    created_at: new Date().toISOString(),
                    youtube_thumbnail: video.thumbnail,
                    youtube_channel_title: video.creatorName,
                    youtube_views: video.views
                }));
            } else if (result.success && Array.isArray(result.data)) {
                // Handle case where data is directly an array
                this.videos = result.data;
            } else {
                throw new Error('Failed to load videos: ' + (result.message || 'Invalid response format'));
            }
            
            // Update stats cards
            this.updateVideoStats();
            
            // Render videos grid
            this.renderVideosGrid();
            
        } catch (error) {
            console.error('Error loading videos:', error);
            videosGrid.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>Error loading videos: ${error.message}</p>
                        <button class="btn btn-outline-primary btn-sm" onclick="adminManager.loadVideosGrid()">
                            <i class="fas fa-refresh me-1"></i>Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }

    renderVideosGrid() {
        const videosGrid = document.getElementById('videosGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!videosGrid) return;
        
        if (this.videos.length === 0) {
            if (emptyState) {
                emptyState.classList.remove('d-none');
            }
            videosGrid.innerHTML = '';
            return;
        }
        
        if (emptyState) {
            emptyState.classList.add('d-none');
        }
        
        videosGrid.innerHTML = '';
        
        this.videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'col-lg-4 col-md-6 mb-4';
            
            const statusClass = video.status === 'published' || video.status === 'active' ? 'success' : 
                              video.status === 'pending' ? 'warning' : 
                              video.status === 'flagged' ? 'danger' : 'secondary';
            
            const uploadDate = video.upload_date ? new Date(video.upload_date).toLocaleDateString() : 
                             video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Unknown';
            
            videoCard.innerHTML = `
                <div class="card h-100">
                    <div class="position-relative">
                        <img src="${video.thumbnail || video.youtube_thumbnail || 'https://via.placeholder.com/350x200/007bff/ffffff?text=Video+Thumbnail'}" 
                             class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-${statusClass}">${(video.status || 'active').charAt(0).toUpperCase() + (video.status || 'active').slice(1)}</span>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark">${video.duration || '00:00'}</span>
                        </div>
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge bg-success">$${parseFloat(video.price || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title" title="${video.title}">${video.title.length > 50 ? video.title.substring(0, 47) + '...' : video.title}</h6>
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-user me-2 text-muted"></i>
                            <span class="text-muted small">by ${video.creator_name || video.youtube_channel_title || 'Unknown Creator'}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="d-flex align-items-center text-muted small">
                                <i class="fas fa-eye me-1"></i>
                                <span>${(video.views || video.youtube_views || 0).toLocaleString()} views</span>
                            </div>
                            <div class="d-flex align-items-center text-muted small">
                                <i class="fas fa-calendar me-1"></i>
                                <span>${uploadDate}</span>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-success btn-sm flex-fill" onclick="adminManager.approveVideo(${video.id})" title="Approve Video">
                                <i class="fas fa-check me-1"></i>Approve
                            </button>
                            <button class="btn btn-danger btn-sm flex-fill" onclick="adminManager.rejectVideo(${video.id})" title="Reject Video">
                                <i class="fas fa-times me-1"></i>Reject
                            </button>
                            <button class="btn btn-outline-primary btn-sm" onclick="adminManager.showVideoDetails(${video.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            videosGrid.appendChild(videoCard);
        });
    }

    async loadVideosTable() {
        const tbody = document.querySelector('#videosTableBody');
        const loadingIndicator = document.getElementById('videosLoadingIndicator');
        const emptyState = document.getElementById('videosEmptyState');
        const totalCount = document.getElementById('totalVideosCount');
        
        if (!tbody) return;
        
        try {
            // Show loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
            }
            if (emptyState) {
                emptyState.classList.add('d-none');
            }
            
            // Try to load from admin videos endpoint first, fallback to regular videos endpoint
            let response = await fetch('/api/admin/videos');
            let result = await response.json();
            
            if (!result.success) {
                // Fallback to regular videos API
                response = await fetch('/api/videos');
                result = await response.json();
            }
            
            if (result.success && result.data && result.data.videos) {
                // Transform videos data for admin display
                this.videos = result.data.videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    price: video.price,
                    thumbnail: video.thumbnail,
                    creator_name: video.creatorName,
                    creator_email: '',
                    upload_date: video.uploadDate,
                    views: video.views,
                    purchase_count: video.views,
                    status: video.status || 'published',
                    created_at: new Date().toISOString()
                }));
            } else if (result.success && Array.isArray(result.data)) {
                // Handle case where data is directly an array
                this.videos = result.data;
            } else {
                throw new Error('Failed to load videos: ' + (result.message || 'Invalid response format'));
            }
            
            // Update total count
            if (totalCount) {
                totalCount.textContent = this.videos.length;
            }
            
            // Update stats cards
            this.updateVideoStats();
            
            // Clear existing content
            tbody.innerHTML = '';
            
            if (this.videos.length === 0) {
                if (emptyState) {
                    emptyState.classList.remove('d-none');
                }
            } else {
                this.videos.forEach(video => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span class="fw-bold">${video.id}</span></td>
                        <td>
                            <img src="${video.thumbnail || 'https://via.placeholder.com/60x40'}" 
                                 alt="${video.title}" class="rounded shadow-sm" 
                                 style="width: 60px; height: 40px; object-fit: cover;">
                        </td>
                        <td>
                            <div class="fw-bold">${video.title}</div>
                            <small class="text-muted">${video.description ? video.description.substring(0, 50) + '...' : 'No description'}</small>
                        </td>
                        <td>
                            <div>${video.creator_name || 'Unknown'}</div>
                            <small class="text-muted">${video.creator_email || ''}</small>
                        </td>
                        <td><span class="fw-bold text-success">$${video.price || '0.00'}</span></td>
                        <td>
                            <span class="badge bg-${this.getVideoStatusBadgeColor(video.status)}">${video.status || 'active'}</span>
                        </td>
                        <td><span class="fw-bold">${video.views || video.purchase_count || 0}</span></td>
                        <td>${video.upload_date || new Date(video.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-info btn-sm" onclick="adminManager.viewVideo(${video.id})" title="View Video">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-primary btn-sm" onclick="adminManager.editVideo(${video.id})" title="Edit Video">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-warning btn-sm" onclick="adminManager.toggleVideoStatus(${video.id})" title="Toggle Status">
                                    <i class="fas fa-toggle-on"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="adminManager.deleteVideo(${video.id})" title="Delete Video">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="text-danger">
                            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                            <p>Error loading videos: ${error.message}</p>
                            <button class="btn btn-outline-primary btn-sm" onclick="adminManager.loadVideosTable()">
                                <i class="fas fa-refresh me-1"></i>Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } finally {
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }

    updateVideoStats() {
        const totalVideos = document.getElementById('totalVideos');
        const publishedVideos = document.getElementById('publishedVideos');
        const pendingVideos = document.getElementById('pendingVideos');
        const flaggedVideos = document.getElementById('flaggedVideos');
        
        // Ensure this.videos is an array before using filter
        if (!Array.isArray(this.videos)) {
            console.warn('Videos data is not an array:', this.videos);
            this.videos = [];
        }
        
        if (totalVideos) totalVideos.textContent = this.videos.length;
        if (publishedVideos) publishedVideos.textContent = this.videos.filter(v => v.status === 'published' || v.status === 'active').length;
        if (pendingVideos) pendingVideos.textContent = this.videos.filter(v => v.status === 'pending').length;
        if (flaggedVideos) flaggedVideos.textContent = this.videos.filter(v => v.status === 'flagged').length;
    }

    getVideoStatusBadgeColor(status) {
        switch(status) {
            case 'published':
            case 'active': return 'success';
            case 'pending': return 'warning';
            case 'flagged': return 'danger';
            case 'draft': return 'secondary';
            default: return 'primary';
        }
    }

    // Video management methods
    async viewVideo(videoId) {
        window.open(`/video-player.html?id=${videoId}`, '_blank');
    }

    async editVideo(videoId) {
        // Redirect to video edit page or show modal
        this.showAlert('Video editing functionality coming soon', 'info');
    }

    async toggleVideoStatus(videoId) {
        try {
            const video = this.videos.find(v => v.id === videoId);
            if (!video) return;
            
            const newStatus = video.status === 'active' ? 'pending' : 'active';
            
            // Here you would call API to update video status
            this.showAlert(`Video status would be changed to ${newStatus}`, 'info');
            
        } catch (error) {
            console.error('Error toggling video status:', error);
            this.showAlert('Error updating video status', 'danger');
        }
    }

    async approveVideo(videoId) {
        try {
            const video = this.videos.find(v => v.id === videoId);
            if (!video) return;
            
            // Update video status to published
            const response = await fetch(`/api/endpoints/videos.php/${videoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...video,
                    status: 'published'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local data
                const videoIndex = this.videos.findIndex(v => v.id === videoId);
                if (videoIndex !== -1) {
                    this.videos[videoIndex].status = 'published';
                }
                
                this.showAlert('Video approved successfully', 'success');
                this.renderVideosGrid();
                this.updateVideoStats();
            } else {
                this.showAlert('Failed to approve video', 'danger');
            }
        } catch (error) {
            console.error('Error approving video:', error);
            this.showAlert('Error approving video', 'danger');
        }
    }

    async rejectVideo(videoId) {
        if (confirm('Are you sure you want to reject this video?')) {
            try {
                const video = this.videos.find(v => v.id === videoId);
                if (!video) return;
                
                // Update video status to rejected
                const response = await fetch(`/api/endpoints/videos.php/${videoId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...video,
                        status: 'rejected'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Update local data
                    const videoIndex = this.videos.findIndex(v => v.id === videoId);
                    if (videoIndex !== -1) {
                        this.videos[videoIndex].status = 'rejected';
                    }
                    
                    this.showAlert('Video rejected', 'warning');
                    this.renderVideosGrid();
                    this.updateVideoStats();
                } else {
                    this.showAlert('Failed to reject video', 'danger');
                }
            } catch (error) {
                console.error('Error rejecting video:', error);
                this.showAlert('Error rejecting video', 'danger');
            }
        }
    }

    async showVideoDetails(videoId) {
        try {
            const video = this.videos.find(v => v.id === videoId);
            if (!video) {
                this.showAlert('Video not found', 'danger');
                return;
            }
            
            // Populate modal with video details
            document.getElementById('modalVideoThumbnail').src = video.thumbnail || video.youtube_thumbnail || 'https://via.placeholder.com/300x200';
            document.getElementById('modalVideoTitle').textContent = video.title;
            document.getElementById('modalVideoCreator').textContent = video.creator_name || video.youtube_channel_title || 'Unknown Creator';
            document.getElementById('modalVideoDuration').textContent = video.duration || '00:00';
            document.getElementById('modalVideoDate').textContent = video.upload_date ? new Date(video.upload_date).toLocaleDateString() : 'Unknown';
            document.getElementById('modalVideoViews').textContent = (video.views || video.youtube_views || 0).toLocaleString();
            document.getElementById('modalVideoPrice').textContent = `$${parseFloat(video.price || 0).toFixed(2)}`;
            document.getElementById('modalVideoStatus').textContent = (video.status || 'active').charAt(0).toUpperCase() + (video.status || 'active').slice(1);
            document.getElementById('modalVideoStatus').className = `badge bg-${this.getVideoStatusBadgeColor(video.status)}`;
            document.getElementById('modalVideoDescription').textContent = video.description || 'No description available';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('videoDetailsModal'));
            modal.show();
        } catch (error) {
            console.error('Error showing video details:', error);
            this.showAlert('Error loading video details', 'danger');
        }
    }

    async deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/endpoints/videos.php/${videoId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Remove from local data
                    this.videos = this.videos.filter(v => v.id !== videoId);
                    
                    this.showAlert('Video deleted successfully', 'success');
                    this.renderVideosGrid();
                    this.updateVideoStats();
                } else {
                    this.showAlert('Failed to delete video', 'danger');
                }
            } catch (error) {
                console.error('Error deleting video:', error);
                this.showAlert('Error deleting video', 'danger');
            }
        }
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
            let user = this.users.find(u => u.id == userId);
            
            // If not found locally, fetch from API
            if (!user) {
                try {
                    const response = await fetch(`/api/admin/users?id=${userId}`);
                    const result = await response.json();
                    if (result.success && result.data) {
                        user = result.data;
                    }
                } catch (apiError) {
                    console.warn('API fetch failed, using local data');
                }
            }

            if (user) {
                // Populate user details modal
                document.getElementById('detailUserId').textContent = user.id;
                document.getElementById('detailUserName').textContent = user.name || 'Unknown User';
                document.getElementById('detailUserEmail').textContent = user.email || 'No email';
                
                // Role badge
                const roleEl = document.getElementById('detailUserRole');
                roleEl.textContent = (user.role || 'viewer').charAt(0).toUpperCase() + (user.role || 'viewer').slice(1);
                roleEl.className = `badge bg-${this.getUserRoleBadgeClass(user.role)}`;
                
                // Status badge
                const statusEl = document.getElementById('detailUserStatus');
                statusEl.textContent = (user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1);
                statusEl.className = `badge bg-${user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : user.status === 'revoked' ? 'dark' : 'warning'}`;
                
                // Date formatting
                const joinDate = user.created_at || user.joinDate;
                document.getElementById('detailJoinDate').textContent = joinDate ? new Date(joinDate).toLocaleDateString() : 'Unknown';
                
                // Email verification status
                const verifiedEl = document.getElementById('detailEmailVerified');
                verifiedEl.textContent = user.email_verified_at ? 'Verified' : 'Not Verified';
                verifiedEl.className = `badge bg-${user.email_verified_at ? 'success' : 'warning'}`;
                
                document.getElementById('detailLastLogin').textContent = user.lastActive || 'Recently';
                
                // Load additional stats from API
                this.loadUserStats(userId);
                
                // Store current user ID
                this.currentUserId = userId;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
                modal.show();
            } else {
                this.showAlert('User not found', 'danger');
            }
        } catch (error) {
            console.error('Error showing user details:', error);
            this.showAlert('Error loading user details', 'danger');
            window.apiService?.showErrorMessage('Failed to load user details');
        }
    }

    async loadUserStats(userId) {
        try {
            // Get user's video count if they're a creator
            const user = this.users.find(u => u.id == userId);
            let videoCount = 0;
            let purchaseCount = 0;
            let totalSpent = 0;
            
            if (user && user.role === 'creator') {
                try {
                    const videosResponse = await fetch(`/api/creator/videos?creator_id=${userId}`);
                    const videosResult = await videosResponse.json();
                    if (videosResult.success && videosResult.data) {
                        videoCount = videosResult.data.length || 0;
                    }
                } catch (error) {
                    console.log('Could not load creator videos');
                }
            }
            
            if (user && user.role === 'viewer') {
                try {
                    const purchasesResponse = await fetch(`/api/purchases?user_id=${userId}`);
                    const purchasesResult = await purchasesResponse.json();
                    if (purchasesResult.success && purchasesResult.data) {
                        purchaseCount = purchasesResult.data.length || 0;
                        totalSpent = purchasesResult.data.reduce((sum, purchase) => sum + (parseFloat(purchase.price) || 0), 0);
                    }
                } catch (error) {
                    console.log('Could not load user purchases');
                }
            }
            
            // Update the modal with real data
            document.getElementById('detailVideoCount').textContent = videoCount;
            document.getElementById('detailPurchaseCount').textContent = purchaseCount;
            document.getElementById('detailTotalSpent').textContent = `$${totalSpent.toFixed(2)}`;
        } catch (error) {
            console.error('Error loading user stats:', error);
            // Fallback to default values
            document.getElementById('detailVideoCount').textContent = '0';
            document.getElementById('detailPurchaseCount').textContent = '0';
            document.getElementById('detailTotalSpent').textContent = '$0.00';
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

// Global functions for user detail modal integration
window.editUserFromDetails = function() {
    if (window.adminManager && window.adminManager.currentUserId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
        modal.hide();
        
        setTimeout(() => {
            window.adminManager.editUser(window.adminManager.currentUserId);
        }, 300);
    }
};

window.viewUserDetailsPage = function(userId) {
    window.location.href = `user-detail.html?id=${userId}`;
};

// Helper function for editing user from details modal
window.editUserFromDetails = function() {
    if (window.adminManager && window.adminManager.currentUserId) {
        // Hide the details modal first
        const detailsModal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
        if (detailsModal) {
            detailsModal.hide();
        }
        
        // Small delay to ensure modal is closed before opening edit modal
        setTimeout(() => {
            window.adminManager.editUser(window.adminManager.currentUserId);
        }, 200);
    }
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
