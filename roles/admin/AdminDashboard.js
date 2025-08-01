
class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.navigation = null;
        this.panels = new Map();
        this.currentPanel = null;
    }

    async init() {
        try {
            // Check authentication and get user data
            this.currentUser = await this.checkAuth();
            
            if (!this.currentUser || this.currentUser.role !== 'admin') {
                window.location.href = '/login.html';
                return;
            }

            // Initialize navigation
            this.navigation = new Navigation('admin');
            this.navigation.render('sidebar', this.currentUser);

            // Initialize panels
            this.initializePanels();

            // Show default panel
            this.showPanel('overview');

            // Load initial data
            await this.loadInitialData();

        } catch (error) {
            console.error('Failed to initialize admin dashboard:', error);
            showNotification('Failed to initialize dashboard', 'error');
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return data.user;
            } else {
                throw new Error('Not authenticated');
            }
        } catch (error) {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            throw error;
        }
    }

    initializePanels() {
        // Register all admin panels
        this.panels.set('overview', new AdminOverviewPanel());
        this.panels.set('videos', new AdminVideosPanel());
        this.panels.set('users', new AdminUsersPanel());
        this.panels.set('analytics', new AdminAnalyticsPanel());
        this.panels.set('upload', new AdminUploadPanel());
        this.panels.set('youtube', new AdminYouTubePanel());
        this.panels.set('earnings', new AdminEarningsPanel());
    }

    async showPanel(panelName) {
        try {
            // Hide all panels
            document.querySelectorAll('.panel').forEach(panel => {
                panel.style.display = 'none';
            });

            // Close mobile navigation
            if (this.navigation) {
                this.navigation.close();
            }

            // Show target panel
            const panelElement = document.getElementById(`${panelName}Panel`);
            if (panelElement) {
                panelElement.style.display = 'block';
            }

            // Update navigation active state
            if (this.navigation) {
                this.navigation.updateActiveStates(panelName);
            }

            // Load panel data
            const panel = this.panels.get(panelName);
            if (panel && typeof panel.load === 'function') {
                await panel.load();
            }

            this.currentPanel = panelName;

        } catch (error) {
            console.error(`Failed to show panel ${panelName}:`, error);
            showNotification(`Failed to load ${panelName}`, 'error');
        }
    }

    async loadInitialData() {
        try {
            showLoading(true, 'Loading dashboard data...');
            
            // Load overview statistics
            if (this.panels.has('overview')) {
                await this.panels.get('overview').load();
            }

        } catch (error) {
            console.error('Failed to load initial data:', error);
            showNotification('Failed to load dashboard data', 'error');
        } finally {
            showLoading(false);
        }
    }

    async logout() {
        try {
            localStorage.removeItem('currentUser');
            
            await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });

            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = '/login.html';
        }
    }
}

// Admin Panel Base Class
class AdminPanelBase {
    constructor(panelName) {
        this.panelName = panelName;
        this.isLoaded = false;
        this.data = null;
    }

    async load() {
        if (this.isLoaded) return;
        
        try {
            showLoading(true, `Loading ${this.panelName}...`);
            await this.fetchData();
            this.render();
            this.isLoaded = true;
        } catch (error) {
            console.error(`Failed to load ${this.panelName}:`, error);
            showNotification(`Failed to load ${this.panelName}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    async fetchData() {
        // Override in subclasses
    }

    render() {
        // Override in subclasses
    }

    refresh() {
        this.isLoaded = false;
        return this.load();
    }
}

// Admin Overview Panel
class AdminOverviewPanel extends AdminPanelBase {
    constructor() {
        super('Overview');
    }

    async fetchData() {
        const response = await fetch('api/admin.php?action=analytics');
        const result = await response.json();
        
        if (result.success) {
            this.data = result.analytics;
        } else {
            throw new Error(result.message || 'Failed to fetch analytics');
        }
    }

    render() {
        const container = document.getElementById('overviewPanel');
        if (!container || !this.data) return;

        container.innerHTML = `
            <div class="container-fluid p-4">
                <!-- Stats Grid -->
                <div class="row g-4 mb-6">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3">
                                        <i class="fas fa-video fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0" id="totalVideos">${this.data.total_videos.toLocaleString()}</div>
                                        <div class="text-muted small">Total Videos</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-success bg-opacity-10 text-success rounded-3 p-3 me-3">
                                        <i class="fas fa-users fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0" id="activeUsers">${this.data.total_users.toLocaleString()}</div>
                                        <div class="text-muted small">Active Users</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-info bg-opacity-10 text-info rounded-3 p-3 me-3">
                                        <i class="fas fa-eye fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0" id="totalViews">${this.data.total_views.toLocaleString()}</div>
                                        <div class="text-muted small">Total Views</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-warning bg-opacity-10 text-warning rounded-3 p-3 me-3">
                                        <i class="fas fa-dollar-sign fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0" id="totalRevenue">$${this.data.total_revenue.toFixed(2)}</div>
                                        <div class="text-muted small">Total Revenue</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity & Popular Videos -->
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Recent Activity</h5>
                            </div>
                            <div class="card-body">
                                <div class="list-group list-group-flush" id="recentActivity">
                                    ${this.renderRecentActivity()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Popular Videos</h5>
                            </div>
                            <div class="card-body">
                                <div class="list-group list-group-flush" id="popularVideos">
                                    ${this.renderPopularVideos()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        if (!this.data.recent_activity || this.data.recent_activity.length === 0) {
            return '<div class="text-muted text-center py-3">No recent activity</div>';
        }

        return this.data.recent_activity.map(activity => {
            const icon = activity.type === 'upload' ? 'fa-video text-primary' : 
                         activity.type === 'purchase' ? 'fa-shopping-cart text-success' : 
                         'fa-user text-info';
            
            return `
                <div class="list-group-item border-0 px-0">
                    <div class="d-flex align-items-center">
                        <i class="fas ${icon} me-3"></i>
                        <div class="flex-grow-1">
                            <div class="fw-medium">${activity.title}</div>
                            <small class="text-muted">by ${activity.user} • ${this.formatTimeAgo(activity.time)}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderPopularVideos() {
        if (!this.data.popular_videos || this.data.popular_videos.length === 0) {
            return '<div class="text-muted text-center py-3">No videos found</div>';
        }

        return this.data.popular_videos.map(video => `
            <div class="list-group-item border-0 px-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-medium">${video.title}</div>
                        <small class="text-muted">${video.uploader}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${video.views.toLocaleString()} views</span>
                </div>
            </div>
        `).join('');
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
}

// Additional admin panels would be defined here (AdminVideosPanel, AdminUsersPanel, etc.)
// For brevity, I'll create placeholder classes

class AdminVideosPanel extends AdminPanelBase {
    constructor() {
        super('Videos');
    }

    async fetchData() {
        const response = await fetch('/api/videos.php');
        const result = await response.json();
        
        if (result.success) {
            this.data = result.videos;
        } else {
            throw new Error(result.message || 'Failed to fetch videos');
        }
    }

    render() {
        // Video management implementation
        console.log('Rendering admin videos panel with', this.data?.length, 'videos');
    }
}

class AdminUsersPanel extends AdminPanelBase {
    constructor() {
        super('Users');
    }

    async fetchData() {
        const response = await fetch('/api/admin.php?action=users');
        const result = await response.json();
        
        if (result.success) {
            this.data = result.users;
        } else {
            throw new Error(result.message || 'Failed to fetch users');
        }
    }

    render() {
        // User management implementation
        console.log('Rendering admin users panel with', this.data?.length, 'users');
    }
}

class AdminAnalyticsPanel extends AdminPanelBase {
    constructor() {
        super('Analytics');
    }

    async fetchData() {
        // Analytics data fetching
        this.data = { charts: [], metrics: [] };
    }

    render() {
        // Analytics charts implementation
        console.log('Rendering admin analytics panel');
    }
}

class AdminUploadPanel extends AdminPanelBase {
    constructor() {
        super('Upload');
    }

    async fetchData() {
        // No data fetching needed for upload form
        this.data = {};
    }

    render() {
        // Upload form implementation
        console.log('Rendering admin upload panel');
    }
}

class AdminYouTubePanel extends AdminPanelBase {
    constructor() {
        super('YouTube');
    }

    async fetchData() {
        // YouTube integration data
        this.data = {};
    }

    render() {
        // YouTube integration implementation
        console.log('Rendering admin YouTube panel');
    }
}

class AdminEarningsPanel extends AdminPanelBase {
    constructor() {
        super('Earnings');
    }

    async fetchData() {
        const response = await fetch('/api/earnings.php?action=earnings');
        const result = await response.json();
        
        if (result.success) {
            this.data = result.earnings;
        } else {
            throw new Error(result.message || 'Failed to fetch earnings');
        }
    }

    render() {
        // Earnings overview implementation
        console.log('Rendering admin earnings panel with data:', this.data);
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();

// Global functions for navigation
window.showPanel = (panelName) => adminDashboard.showPanel(panelName);
window.logout = () => adminDashboard.logout();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard.init();
});

// Export for testing
window.AdminDashboard = AdminDashboard;
