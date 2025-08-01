class CreatorDashboard {
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

            if (!this.currentUser || !['creator', 'editor'].includes(this.currentUser.role)) {
                window.location.href = '/login.html';
                return;
            }

            // Initialize navigation
            this.navigation = new Navigation(this.currentUser.role);
            this.navigation.render('sidebar', this.currentUser);

            // Initialize panels
            this.initializePanels();

            // Show default panel
            this.showPanel('overview');

            // Load initial data
            await this.loadInitialData();

        } catch (error) {
            console.error('Failed to initialize creator dashboard:', error);
            showNotification('Failed to initialize dashboard', 'error');
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth.php', {
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
        // Register all creator panels
        this.panels.set('overview', new CreatorOverviewPanel());
        this.panels.set('myVideos', new CreatorVideosPanel());
        this.panels.set('upload', new CreatorUploadPanel());
        this.panels.set('earnings', new CreatorEarningsPanel());
        this.panels.set('paidUsers', new CreatorCustomersPanel());
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

            await fetch('/api/auth.php', {
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

// Creator Panel Base Class
class CreatorPanelBase {
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

// Creator Overview Panel
class CreatorOverviewPanel extends CreatorPanelBase {
    constructor() {
        super('Overview');
    }

    async fetchData() {
        // Fetch creator-specific data
        const [videosResponse, earningsResponse] = await Promise.all([
            fetch('/api/videos.php?filter=my_videos'),
            fetch('api/earnings.php?action=earnings')
        ]);

        const videosResult = await videosResponse.json();
        const earningsResult = await earningsResponse.json();

        this.data = {
            videos: videosResult.success ? videosResult.videos : [],
            earnings: earningsResult.success ? earningsResult.earnings : null
        };
    }

    render() {
        const container = document.getElementById('overviewPanel');
        if (!container) return;

        const totalVideos = this.data.videos.length;
        const totalViews = this.data.videos.reduce((sum, video) => sum + video.views, 0);
        const totalEarnings = this.data.earnings?.total_earnings || 0;
        const monthlyEarnings = this.data.earnings?.monthly_earnings || 0;

        container.innerHTML = `
            <div class="container-fluid p-4">
                <!-- Welcome Section -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-0 bg-gradient-primary text-white">
                            <div class="card-body p-4">
                                <h2 class="mb-2">Welcome back, Creator! 👋</h2>
                                <p class="mb-0 opacity-75">Here's how your content is performing</p>
                            </div>
                        </div>
                    </div>
                </div>

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
                                        <div class="h3 fw-bold mb-0">${totalVideos}</div>
                                        <div class="text-muted small">Your Videos</div>
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
                                        <div class="h3 fw-bold mb-0">${totalViews.toLocaleString()}</div>
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
                                    <div class="stat-icon bg-success bg-opacity-10 text-success rounded-3 p-3 me-3">
                                        <i class="fas fa-dollar-sign fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0">$${totalEarnings.toFixed(2)}</div>
                                        <div class="text-muted small">Total Earnings</div>
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
                                        <i class="fas fa-calendar fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0">$${monthlyEarnings.toFixed(2)}</div>
                                        <div class="text-muted small">This Month</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions & Recent Videos -->
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Quick Actions</h5>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" onclick="showPanel('upload')">
                                        <i class="fas fa-upload me-2"></i>Upload New Video
                                    </button>
                                    <button class="btn btn-outline-primary" onclick="showPanel('myVideos')">
                                        <i class="fas fa-video me-2"></i>Manage Videos
                                    </button>
                                    <button class="btn btn-outline-success" onclick="showPanel('earnings')">
                                        <i class="fas fa-chart-line me-2"></i>View Earnings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Recent Videos</h5>
                            </div>
                            <div class="card-body">
                                ${this.renderRecentVideos()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentVideos() {
        if (!this.data.videos || this.data.videos.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-video fa-2x mb-3 opacity-50"></i>
                    <p>No videos uploaded yet</p>
                    <button class="btn btn-primary btn-sm" onclick="showPanel('upload')">
                        Upload Your First Video
                    </button>
                </div>
            `;
        }

        const recentVideos = this.data.videos
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);

        return recentVideos.map(video => `
            <div class="d-flex align-items-center mb-3">
                <div class="bg-light rounded p-2 me-3">
                    <i class="fas fa-play text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-medium">${video.title}</div>
                    <small class="text-muted">${video.views} views • ${new Date(video.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }
}

// Creator Videos Panel
class CreatorVideosPanel extends CreatorPanelBase {
    constructor() {
        super('My Videos');
    }

    async fetchData() {
        const response = await fetch('/api/videos.php?filter=my_videos');
        const result = await response.json();

        if (result.success) {
            this.data = result.videos;
        } else {
            throw new Error(result.message || 'Failed to fetch videos');
        }
    }

    render() {
        const container = document.getElementById('myVideosPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>My Videos</h2>
                    <button class="btn btn-primary" onclick="showPanel('upload')">
                        <i class="fas fa-plus me-2"></i>Upload New Video
                    </button>
                </div>

                <div class="row" id="myVideosContainer">
                    ${this.renderVideos()}
                </div>
            </div>
        `;
    }

    renderVideos() {
        if (!this.data || this.data.length === 0) {
            return `
                <div class="col-12">
                    <div class="card border-0 shadow-sm text-center p-5">
                        <i class="fas fa-video fa-3x text-muted mb-3"></i>
                        <h4>No videos uploaded yet</h4>
                        <p class="text-muted">Start building your audience by uploading your first video</p>
                        <button class="btn btn-primary" onclick="showPanel('upload')">
                            <i class="fas fa-upload me-2"></i>Upload Video
                        </button>
                    </div>
                </div>
            `;
        }

        return this.data.map(video => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="position-relative">
                        ${video.youtube_thumbnail ? 
                            `<img src="${video.youtube_thumbnail}" class="card-img-top" style="height: 200px; object-fit: cover;">` :
                            `<div class="bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                <i class="fas fa-play-circle fa-3x text-primary"></i>
                            </div>`
                        }
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-${video.price === 0 ? 'success' : 'warning'}">${video.price === 0 ? 'FREE' : '$' + video.price}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text text-muted small">${video.description?.substring(0, 80)}...</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">${video.views} views</small>
                            <small class="text-muted">${new Date(video.created_at).toLocaleDateString()}</small>
                        </div>
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="editVideo(${video.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="watchVideo(${video.id})">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteVideo(${video.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Placeholder classes for other creator panels
class CreatorUploadPanel extends CreatorPanelBase {
    constructor() {
        super('Upload');
    }

    async fetchData() {
        this.data = {};
    }

    render() {
        console.log('Rendering creator upload panel');
    }
}

class CreatorEarningsPanel extends CreatorPanelBase {
    constructor() {
        super('Earnings');
    }

    async fetchData() {
        const response = await fetch('api/earnings.php?action=earnings');
        const result = await response.json();

        if (result.success) {
            this.data = result.earnings;
        } else {
            throw new Error(result.message || 'Failed to fetch earnings');
        }
    }

    render() {
        console.log('Rendering creator earnings panel with data:', this.data);
    }
}

class CreatorCustomersPanel extends CreatorPanelBase {
    constructor() {
        super('Customers');
    }

    async fetchData() {
        const response = await fetch('/api/earnings.php?action=paid_users');
        const result = await response.json();

        if (result.success) {
            this.data = result.paid_users;
        } else {
            throw new Error(result.message || 'Failed to fetch customers');
        }
    }

    render() {
        console.log('Rendering creator customers panel with', this.data?.length, 'customers');
    }
}

// Initialize creator dashboard
const creatorDashboard = new CreatorDashboard();

// Global functions for navigation
window.showPanel = (panelName) => creatorDashboard.showPanel(panelName);
window.logout = () => creatorDashboard.logout();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    creatorDashboard.init();
});

// Export for testing
window.CreatorDashboard = CreatorDashboard;