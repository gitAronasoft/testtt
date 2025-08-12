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
        this.loadMockData(); // Fallback for demo
        this.bindEvents();
        this.loadPageSpecificHandlers();
        await this.loadDashboardData();
    }

    loadMockData() {
        // Initialize empty arrays - data will be loaded from dataService
        this.users = [];
        this.videos = [];
        this.stats = {};
    }

    async loadDashboardData() {
        try {
            // Wait for services to be ready
            if (!window.apiService || !window.dataService) {
                setTimeout(() => this.loadDashboardData(), 100);
                return;
            }

            // Try to load real data from API
            const [statsResult, usersResult, videosResult] = await Promise.all([
                window.apiService.getAdminStats(),
                window.apiService.getUsers({ limit: 10 }),
                window.apiService.getVideos({ status: 'all', limit: 10 })
            ]);

            if (statsResult.success) {
                this.stats = statsResult.data;
            }
            if (usersResult.success) {
                this.users = usersResult.data.users || usersResult.data;
            }
            if (videosResult.success) {
                this.videos = videosResult.data.videos || videosResult.data;
            }

            this.updateDashboardDisplay();
        } catch (error) {
            console.log('API not available, using demo data');
            this.updateDashboardDisplay();
        }
    }

    updateDashboardDisplay() {
        // Update stats cards
        document.getElementById('totalUsers')?.textContent = this.stats.totalUsers || '--';
        document.getElementById('totalVideos')?.textContent = this.stats.totalVideos || '--';
        document.getElementById('pendingVideos')?.textContent = this.stats.pendingVideos || '--';
        document.getElementById('totalViews')?.textContent = this.formatNumber(this.stats.totalViews) || '--';

        // Update recent activity
        this.loadRecentActivity();
    }

    loadRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        const activities = [
            {
                icon: 'fa-user', color: 'primary',
                text: `New user <strong>${this.users[0]?.firstName || 'John'} ${this.users[0]?.lastName || 'Doe'}</strong> registered`,
                time: '2 minutes ago'
            },
            {
                icon: 'fa-video', color: 'success',
                text: `Video <strong>"${this.videos[0]?.title || 'Tutorial Series #1'}"</strong> was approved`,
                time: '15 minutes ago'
            },
            {
                icon: 'fa-exclamation-triangle', color: 'warning',
                text: `Video flagged for review by <strong>${this.users[1]?.firstName || 'Mike'} ${this.users[1]?.lastName || 'Smith'}</strong>`,
                time: '1 hour ago'
            }
        ];

        activityContainer.innerHTML = activities.map(activity => `
            <div class="d-flex align-items-center">
                <div class="avatar bg-${activity.color} bg-opacity-10 text-${activity.color} rounded-circle p-2 me-3">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="flex-grow-1">
                    <p class="mb-1">${activity.text}</p>
                    <p class="text-muted text-sm mb-0">${activity.time}</p>
                </div>
            </div>
        `).join('');
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
            // Wait for services to be ready
            if (!window.apiService || !window.dataService) {
                setTimeout(() => this.setupUsersPage(), 100);
                return;
            }

            const result = await window.apiService.getUsers();
            if (result.success) {
                this.renderUsersTable(result.data.users || result.data);
            } else {
                this.renderUsersTable(this.users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.renderUsersTable(this.users);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${user.firstName} ${user.lastName}</div>
                            <div class="text-muted text-sm">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${user.type === 'creator' ? 'success' : 'info'} bg-opacity-10 text-${user.type === 'creator' ? 'success' : 'info'}">
                        ${user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.status === 'active' ? 'success' : 'secondary'}">
                        ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                </td>
                <td class="text-muted">${new Date(user.joinDate).toLocaleDateString()}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            Actions
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editUser(${user.id})">Edit</a></li>
                            <li><a class="dropdown-item" href="#" onclick="viewUser(${user.id})">View Details</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteUser(${user.id})">Delete</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async setupVideosPage() {
        try {
            // Wait for services to be ready
            if (!window.apiService || !window.dataService) {
                setTimeout(() => this.setupVideosPage(), 100);
                return;
            }

            const result = await window.apiService.getVideos({ status: 'all' });
            if (result.success) {
                this.renderVideosTable(result.data.videos || result.data);
            } else {
                this.renderVideosTable(this.videos);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
            this.renderVideosTable(this.videos);
        }
    }

    renderVideosTable(videos) {
        const tbody = document.getElementById('videosTableBody');
        if (!tbody) return;

        tbody.innerHTML = videos.map(video => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="video-thumbnail me-3" style="width: 60px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-play text-muted"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${video.title}</div>
                            <div class="text-muted text-sm">by ${video.creator}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusColor(video.status)} bg-opacity-10 text-${this.getStatusColor(video.status)}">
                        ${video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                    </span>
                </td>
                <td class="text-muted">${new Date(video.uploadDate).toLocaleDateString()}</td>
                <td class="text-muted">${this.formatNumber(video.views)}</td>
                <td class="text-muted">${video.duration}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            Actions
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="viewVideo(${video.id})">View</a></li>
                            ${video.status === 'pending' ? 
                                '<li><a class="dropdown-item text-success" href="#" onclick="approveVideo(' + video.id + ')">Approve</a></li>' +
                                '<li><a class="dropdown-item text-warning" href="#" onclick="rejectVideo(' + video.id + ')">Reject</a></li>'
                                : ''
                            }
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteVideo(${video.id})">Delete</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        const colors = {
            approved: 'success',
            pending: 'warning',
            rejected: 'danger',
            active: 'success',
            inactive: 'secondary'
        };
        return colors[status] || 'secondary';
    }

    setupProfilePage() {
        // Profile page setup
        console.log('Profile page loaded');
    }
}

// Global functions for onclick handlers
window.showAddUserModal = function() {
    if (window.apiService) {
        window.apiService.showSuccessMessage('Add User modal would open here');
    }
};

window.exportData = function() {
    if (window.apiService) {
        window.apiService.showSuccessMessage('Export functionality would start here');
    }
};

window.checkSystemHealth = async function() {
    try {
        const result = await window.apiService.getSystemHealth();
        if (result.success) {
            window.apiService.showSuccessMessage('System health check completed');
        } else {
            window.apiService.handleApiError(result, 'Health check failed');
        }
    } catch (error) {
        window.apiService.showSuccessMessage('Demo mode: System health check simulated');
    }
};

window.viewSystemLogs = function() {
    window.apiService.showSuccessMessage('System logs would be displayed here');
};

window.editUser = async function(userId) {
    console.log('Edit user:', userId);
    window.apiService.showSuccessMessage(`Edit user ${userId} functionality would open here`);
};

window.viewUser = async function(userId) {
    console.log('View user:', userId);
    window.apiService.showSuccessMessage(`User ${userId} details would be displayed here`);
};

window.deleteUser = async function(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const result = await window.apiService.deleteUser(userId);
            if (result.success) {
                window.apiService.showSuccessMessage('User deleted successfully');
                // Refresh the users table
                window.adminManager.setupUsersPage();
            } else {
                window.apiService.handleApiError(result, 'Failed to delete user');
            }
        } catch (error) {
            window.apiService.showSuccessMessage('Demo mode: User deletion simulated');
        }
    }
};

window.viewVideo = function(videoId) {
    window.apiService.showSuccessMessage(`Video ${videoId} details would be displayed here`);
};

window.approveVideo = async function(videoId) {
    try {
        const result = await window.apiService.approveVideo(videoId);
        if (result.success) {
            window.apiService.showSuccessMessage('Video approved successfully');
            window.adminManager.setupVideosPage();
        } else {
            window.apiService.handleApiError(result, 'Failed to approve video');
        }
    } catch (error) {
        window.apiService.showSuccessMessage('Demo mode: Video approval simulated');
    }
};

window.rejectVideo = async function(videoId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
        try {
            const result = await window.apiService.rejectVideo(videoId, reason);
            if (result.success) {
                window.apiService.showSuccessMessage('Video rejected successfully');
                window.adminManager.setupVideosPage();
            } else {
                window.apiService.handleApiError(result, 'Failed to reject video');
            }
        } catch (error) {
            window.apiService.showSuccessMessage('Demo mode: Video rejection simulated');
        }
    }
};

window.deleteVideo = async function(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const result = await window.apiService.deleteVideo(videoId);
            if (result.success) {
                window.apiService.showSuccessMessage('Video deleted successfully');
                window.adminManager.setupVideosPage();
            } else {
                window.apiService.handleApiError(result, 'Failed to delete video');
            }
        } catch (error) {
            window.apiService.showSuccessMessage('Demo mode: Video deletion simulated');
        }
    }
};

// Initialize admin manager
document.addEventListener('DOMContentLoaded', function() {
    window.adminManager = new AdminManager();
});