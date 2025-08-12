/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality with API integration
 */

class AdminManager {
    constructor() {
        this.users = [];
        this.videos = [];
        this.stats = {};
        this.recentActivity = [];
        this.notifications = [];
        this.systemStatus = {};
        this.init();
    }

    async init() {
        this.loadMockData(); // Fallback for demo
        this.bindEvents();
        
        // Only load admin dashboard data if needed, then load page-specific handlers
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html') {
            await this.loadDashboardData();
        } else {
            // Wait for API service to be available for other pages
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
                    window.apiService.getVideos()
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

    loadMockData() {
        // Initialize empty arrays - data will be loaded from API
        this.users = [];
        this.videos = [];
        this.stats = {};
    }

    async loadDashboardData() {
        try {
            // Wait for data service to be available
            let retries = 0;
            const maxRetries = 50;
            
            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            // Load admin-specific dashboard data
            const adminData = await this.loadAdminDashboardData();
            
            if (window.apiService) {
                // Use API service
                const [usersResponse, videosResponse] = await Promise.all([
                    window.apiService.get('/admin/users'),
                    window.apiService.getVideos()
                ]);
                
                this.users = usersResponse.data || usersResponse.users || [];
                this.videos = videosResponse.data || videosResponse.videos || [];
                
                // Use admin dashboard stats if available, otherwise calculate from data
                this.stats = adminData?.stats || {
                    totalUsers: this.users.length,
                    totalVideos: this.videos.length,
                    pendingVideos: this.videos.filter(v => v.status === 'pending').length,
                    totalViews: this.videos.reduce((sum, v) => sum + (v.views || 0), 0)
                };

                this.recentActivity = adminData?.recentActivity || [];
                this.notifications = adminData?.notifications || [];
                this.systemStatus = adminData?.systemStatus || {};
            } else {
                // Fallback data
                this.stats = {
                    totalUsers: 0,
                    totalVideos: 0,
                    pendingVideos: 0,
                    totalViews: 0
                };
                this.recentActivity = [];
                this.notifications = [];
                this.systemStatus = {};
            }

            this.updateDashboardDisplay();
            
            // Only load dashboard-specific content on dashboard page
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'dashboard.html') {
                this.loadRecentActivity();
                this.loadSystemStatus();
            }
            console.log('Admin data loaded:', { 
                users: this.users.length, 
                videos: this.videos.length,
                activities: this.recentActivity.length 
            });
        } catch (error) {
            console.error('Error loading admin data:', error);
            this.updateDashboardDisplay();
        }
    }

    async loadAdminDashboardData() {
        try {
            console.log('Fetching admin dashboard data from API...');
            
            // Wait for API service to be available
            let retries = 0;
            while (retries < 50 && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (window.apiService) {
                const response = await window.apiService.getAdminStats();
                if (response.success) {
                    console.log('Admin dashboard data loaded:', response.data);
                    return response.data;
                }
            }
            console.error('Failed to load admin dashboard data');
        } catch (error) {
            console.error('Error loading admin dashboard data:', error);
        }
        return null;
    }

    updateDashboardDisplay() {
        console.log('Updating dashboard display with stats:', this.stats);
        
        // Update stats cards
        const totalUsersEl = document.getElementById('totalUsers');
        const totalVideosEl = document.getElementById('totalVideos');
        const pendingVideosEl = document.getElementById('pendingVideos');
        const totalViewsEl = document.getElementById('totalViews');
        
        console.log('Found elements:', {
            totalUsers: !!totalUsersEl,
            totalVideos: !!totalVideosEl,
            pendingVideos: !!pendingVideosEl,
            totalViews: !!totalViewsEl
        });
        
        if (totalUsersEl) totalUsersEl.textContent = this.stats.totalUsers || '--';
        if (totalVideosEl) totalVideosEl.textContent = this.stats.totalVideos || '--';
        if (pendingVideosEl) pendingVideosEl.textContent = this.stats.pendingVideos || '--';
        if (totalViewsEl) totalViewsEl.textContent = this.formatNumber(this.stats.totalViews) || '--';
    }

    loadRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        console.log('Loading recent activity...', {
            containerFound: !!activityContainer,
            activitiesCount: this.recentActivity?.length || 0
        });
        
        if (!activityContainer) {
            console.log('Recent activity container not found (expected on non-dashboard pages)');
            return;
        }
        
        if (!this.recentActivity?.length) {
            console.log('No recent activity data available');
            return;
        }

        activityContainer.innerHTML = this.recentActivity.map(activity => `
            <div class="d-flex align-items-center mb-3">
                <div class="avatar bg-${activity.iconColor} bg-opacity-10 text-${activity.iconColor} rounded-circle p-2 me-3">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="flex-grow-1">
                    <p class="mb-1">${activity.message}</p>
                    <p class="text-muted text-sm mb-0">${activity.timeAgo}</p>
                </div>
            </div>
        `).join('');
        
        console.log('Recent activity loaded successfully');
    }

    loadSystemStatus() {
        if (!this.systemStatus || Object.keys(this.systemStatus).length === 0) return;

        // Update server status
        this.updateSystemStatusIndicator('server', this.systemStatus.server);
        this.updateSystemStatusIndicator('database', this.systemStatus.database);
        this.updateSystemStatusIndicator('storage', this.systemStatus.storage);
        this.updateSystemStatusIndicator('cdn', this.systemStatus.cdn);
    }

    updateSystemStatusIndicator(service, statusData) {
        const indicator = document.querySelector(`[data-service="${service}"]`);
        if (!indicator) return;

        const statusColor = statusData.status === 'online' ? 'success' : 
                           statusData.status === 'warning' ? 'warning' : 'danger';
        
        indicator.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <div class="bg-${statusColor} rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                    <span class="text-sm">${service.charAt(0).toUpperCase() + service.slice(1)}</span>
                </div>
                <span class="badge bg-${statusColor}">${statusData.status}</span>
            </div>
        `;
    }

    formatNumber(num) {
        if (!num) return '0';
        return new Intl.NumberFormat().format(num);
    }

    bindEvents() {
        // Refresh button
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="refresh"]') || 
                e.target.closest('[onclick*="refresh"]')) {
                e.preventDefault();
                this.refreshDashboard();
            }
        });
    }

    async refreshDashboard() {
        // Show loading state
        const refreshBtn = document.querySelector('[onclick*="refresh"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        await this.loadDashboardData();

        // Reset button
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-refresh me-1"></i> Refresh';
            refreshBtn.disabled = false;
        }

        if (window.apiService) {
            window.apiService.showSuccessMessage('Dashboard refreshed successfully');
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.setupDashboard();
                break;
            case 'users.html':
                this.setupUsersPage();
                break;
            case 'videos.html':
                this.setupVideosPage();
                break;
            case 'analytics.html':
                this.setupAnalyticsPage();
                break;
            case 'profile.html':
                this.setupProfilePage();
                break;
        }
    }

    setupDashboard() {
        // Dashboard is already set up in init()
    }

    async setupUsersPage() {
        try {
            console.log('Setting up users page with', this.users.length, 'users');
            if (!this.users || this.users.length === 0) {
                await this.waitForDataService();
            }
            this.renderUsersTable(this.users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.renderUsersTable([]);
        }
    }

    renderUsersTable(users) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3" style="width: 35px; height: 35px;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${user.name}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${this.getRoleBadgeClass(user.role)}">${user.role}</span>
                </td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(user.status)}">${user.status}</span>
                </td>
                <td>${this.formatDate(user.joinDate)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="adminManager.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="adminManager.deleteUser(${user.id})" ${user.role === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeClass(role) {
        const classes = {
            admin: 'bg-danger text-white',
            creator: 'bg-success text-white',
            viewer: 'bg-info text-white'
        };
        return classes[role] || 'bg-secondary text-white';
    }

    getStatusBadgeClass(status) {
        const classes = {
            active: 'bg-success text-white',
            inactive: 'bg-secondary text-white',
            suspended: 'bg-warning text-dark'
        };
        return classes[status] || 'bg-secondary text-white';
    }

    formatDate(dateString) {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString();
    }

    async setupVideosPage() {
        try {
            console.log('Setting up videos page with', this.videos.length, 'videos');
            if (!this.videos || this.videos.length === 0) {
                await this.waitForDataService();
            }
            this.renderVideosGrid(this.videos);
            this.updateVideoStats();
        } catch (error) {
            console.error('Error loading videos:', error);
            this.renderVideosGrid([]);
        }
    }

    renderVideosGrid(videos) {
        const videosGrid = document.getElementById('videosGrid');
        if (!videosGrid) return;

        if (!videos || videos.length === 0) {
            videosGrid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No videos found</p></div>';
            return;
        }

        videosGrid.innerHTML = videos.map(video => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    <div class="position-relative">
                        <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge ${this.getStatusBadgeClass(video.status)}">${video.status}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="text-muted small mb-1">by ${video.creatorName}</p>
                        <p class="text-muted small mb-2">${video.duration} • ${this.formatNumber(video.views)} views</p>
                        <p class="card-text text-truncate">${video.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-success fw-bold">$${video.price}</span>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="adminManager.viewVideo(${video.id})" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${video.status === 'pending' ? 
                                    `<button class="btn btn-outline-success" onclick="adminManager.approveVideo(${video.id})" title="Approve">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-outline-warning" onclick="adminManager.rejectVideo(${video.id})" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>` : ''
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateVideoStats() {
        const totalVideos = this.videos.length;
        const publishedVideos = this.videos.filter(v => v.status === 'published').length;
        const pendingVideos = this.videos.filter(v => v.status === 'pending').length;
        const flaggedVideos = this.videos.filter(v => v.status === 'flagged').length;

        // Update stat cards on videos page if they exist
        const totalCard = document.querySelector('.card.bg-primary h4');
        const publishedCard = document.querySelector('.card.bg-success h4');
        const pendingCard = document.querySelector('.card.bg-warning h4');
        const flaggedCard = document.querySelector('.card.bg-danger h4');

        if (totalCard) totalCard.textContent = totalVideos;
        if (publishedCard) publishedCard.textContent = publishedVideos;
        if (pendingCard) pendingCard.textContent = pendingVideos;
        if (flaggedCard) flaggedCard.textContent = flaggedVideos;
    }

    async setupAnalyticsPage() {
        try {
            const analyticsData = await this.loadAnalyticsData();
            if (analyticsData) {
                this.renderAnalyticsCharts(analyticsData);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadAnalyticsData() {
        try {
            if (window.apiService) {
                const response = await window.apiService.getAnalytics();
                if (response.success) {
                    return response.data;
                }
            }
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
        return null;
    }

    renderAnalyticsCharts(data) {
        // Update overview metrics
        const totalUsersEl = document.querySelector('[data-metric="total-users"] h3');
        const totalVideosEl = document.querySelector('[data-metric="total-videos"] h3');
        const totalRevenueEl = document.querySelector('[data-metric="total-revenue"] h3');
        const totalViewsEl = document.querySelector('[data-metric="total-views"] h3');

        if (totalUsersEl) totalUsersEl.textContent = data.overview.totalUsers;
        if (totalVideosEl) totalVideosEl.textContent = data.overview.totalVideos;
        if (totalRevenueEl) totalRevenueEl.textContent = `$${data.overview.totalRevenue.toLocaleString()}`;
        if (totalViewsEl) totalViewsEl.textContent = data.overview.totalViews.toLocaleString();

        // Update growth percentages
        const usersGrowthEl = document.querySelector('[data-growth="users"]');
        const videosGrowthEl = document.querySelector('[data-growth="videos"]');
        const revenueGrowthEl = document.querySelector('[data-growth="revenue"]');
        const viewsGrowthEl = document.querySelector('[data-growth="views"]');

        if (usersGrowthEl) usersGrowthEl.textContent = `+${data.overview.monthlyGrowth.users}%`;
        if (videosGrowthEl) videosGrowthEl.textContent = `+${data.overview.monthlyGrowth.videos}%`;
        if (revenueGrowthEl) revenueGrowthEl.textContent = `+${data.overview.monthlyGrowth.revenue}%`;
        if (viewsGrowthEl) viewsGrowthEl.textContent = `+${data.overview.monthlyGrowth.views}%`;
    }

    setupProfilePage() {
        // Profile page setup
        console.log('Profile page loaded');
    }

    // Action methods for user interactions
    editUser(userId) {
        console.log('Edit user:', userId);
        // Implementation would open edit modal
        if (window.CommonUtils) {
            window.CommonUtils.prototype.showToast('Edit user functionality coming soon', 'info');
        }
    }

    deleteUser(userId) {
        console.log('Delete user:', userId);
        // Implementation would show confirmation dialog
        if (window.CommonUtils) {
            window.CommonUtils.prototype.showToast('Delete user functionality coming soon', 'warning');
        }
    }

    viewVideo(videoId) {
        console.log('View video:', videoId);
        // Implementation would open video details modal
        if (window.CommonUtils) {
            window.CommonUtils.prototype.showToast('View video details coming soon', 'info');
        }
    }

    approveVideo(videoId) {
        console.log('Approve video:', videoId);
        // Implementation would update video status
        if (window.CommonUtils) {
            window.CommonUtils.prototype.showToast('Video approval functionality coming soon', 'success');
        }
    }

    rejectVideo(videoId) {
        console.log('Reject video:', videoId);
        // Implementation would update video status
        if (window.CommonUtils) {
            window.CommonUtils.prototype.showToast('Video rejection functionality coming soon', 'warning');
        }
    }
}

// Initialize AdminManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}