/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality with API integration
 */

class AdminManager {
    constructor() {
        this.users = [];
        this.videos = [];
        this.stats = {};
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
        try {
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
                totalPurchases: 0,
                totalRevenue: '0.00'
            });
        }
    }

    updateDashboardMetrics(metrics) {
        // Update dashboard metric displays
        const totalUsersEl = document.getElementById('totalUsers');
        const totalVideosEl = document.getElementById('totalVideos');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const totalPurchasesEl = document.getElementById('totalPurchases');
        
        if (totalUsersEl) totalUsersEl.textContent = metrics.totalUsers || 0;
        if (totalVideosEl) totalVideosEl.textContent = metrics.totalVideos || 0;
        if (totalRevenueEl) totalRevenueEl.textContent = '$' + (metrics.totalRevenue || '0.00');
        if (totalPurchasesEl) totalPurchasesEl.textContent = metrics.totalPurchases || 0;
    }

    updateSidebarBadges() {
        // Update sidebar navigation badges with real counts
        const usersBadge = document.querySelector('a[href="users.html"] .badge');
        const videosBadge = document.querySelector('a[href="videos.html"] .badge');
        
        if (usersBadge) usersBadge.textContent = this.users.length || 0;
        if (videosBadge) videosBadge.textContent = this.videos.length || 0;
    }

    bindEvents() {
        // Event listeners for admin functionality
        document.addEventListener('DOMContentLoaded', () => {
            this.loadPageSpecificHandlers();
        });
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
            case 'analytics.html':
                this.initAnalyticsPage();
                break;
        }
    }

    initDashboard() {
        console.log('Admin dashboard initialized');
    }

    initUsersPage() {
        this.loadUsersTable();
    }

    initVideosPage() {
        this.loadVideosTable();
    }

    initAnalyticsPage() {
        console.log('Analytics page initialized');
    }

    async loadUsersTable() {
        if (!this.users.length && window.apiService) {
            try {
                const response = await window.apiService.get('/admin/users');
                this.users = response.data || response.users || [];
            } catch (error) {
                console.error('Failed to load users:', error);
                this.users = [];
            }
        }
        
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${this.getUserRoleBadgeClass(user.role)}">${user.role || 'viewer'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminManager.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminManager.deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
        
        const tbody = document.getElementById('videosTable');
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

    editUser(userId) {
        console.log('Edit user:', userId);
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            console.log('Delete user:', userId);
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

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});