class ViewerDashboard {
    constructor() {
        this.currentUser = null;
        this.navigation = null;
        this.panels = new Map();
        this.currentPanel = null;
        this.videoPlayerModal = null;
        this.purchaseModal = null;
    }

    async init() {
        try {
            // Check authentication and get user data
            this.currentUser = await this.checkAuth();

            if (!this.currentUser || this.currentUser.role !== 'viewer') {
                window.location.href = '/login.html';
                return;
            }

            // Initialize navigation
            this.navigation = new Navigation('viewer');
            this.navigation.render('sidebar', this.currentUser);

            // Initialize modals
            this.videoPlayerModal = new VideoPlayerModal();
            this.purchaseModal = new PurchaseModal();

            // Initialize panels
            this.initializePanels();

            // Show default panel
            this.showPanel('overview');

            // Load initial data
            await this.loadInitialData();

        } catch (error) {
            console.error('Failed to initialize viewer dashboard:', error);
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
        // Register all viewer panels
        this.panels.set('overview', new ViewerOverviewPanel());
        this.panels.set('videos', new ViewerVideosPanel());
        this.panels.set('purchases', new ViewerPurchasesPanel());
        this.panels.set('watchlist', new ViewerWatchlistPanel());
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

    async purchaseVideo(videoId, price) {
        const video = { id: videoId, price: price, title: 'Video', description: 'Video description' };

        this.purchaseModal.showPurchase(video, async () => {
            try {
                const response = await fetch('api/purchase.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ video_id: videoId })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Video purchased successfully!', 'success');
                    this.purchaseModal.hide();

                    // Refresh current panel to show updated data
                    if (this.currentPanel && this.panels.has(this.currentPanel)) {
                        await this.panels.get(this.currentPanel).refresh();
                    }
                } else {
                    showNotification('Purchase failed: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Purchase failed:', error);
                showNotification('Purchase failed. Please try again.', 'error');
            }
        });
    }

    async watchVideo(videoId) {
        try {
            // Find video data (this would typically come from the panel)
            const video = { id: videoId, title: 'Video Title', file_path: '/path/to/video.mp4' };

            this.videoPlayerModal.playVideo(video);

            // Increment view count
            await fetch('/api/videos.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `id=${videoId}&action=increment_views`
            });

        } catch (error) {
            console.error('Failed to play video:', error);
            showNotification('Failed to play video', 'error');
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

// Viewer Panel Base Class
class ViewerPanelBase {
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

// Viewer Overview Panel
class ViewerOverviewPanel extends ViewerPanelBase {
    constructor() {
        super('Overview');
    }

    async fetchData() {
        const [videosResponse, purchasesResponse] = await Promise.all([
            fetch('/api/videos.php'),
            fetch('api/purchase.php')
        ]);

        const videosResult = await videosResponse.json();
        const purchasesResult = await purchasesResponse.json();

        this.data = {
            videos: videosResult.success ? videosResult.videos : [],
            purchases: purchasesResult.success ? purchasesResult.purchases : []
        };
    }

    render() {
        const container = document.getElementById('overviewPanel');
        if (!container) return;

        const totalVideos = this.data.videos.length;
        const totalPurchases = this.data.purchases.length;
        const totalSpent = this.data.purchases.reduce((sum, purchase) => sum + purchase.price, 0);
        const freeVideos = this.data.videos.filter(v => v.price === 0).length;

        container.innerHTML = `
            <div class="container-fluid p-4">
                <!-- Welcome Section -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-0 bg-gradient-primary text-white">
                            <div class="card-body p-4">
                                <h2 class="mb-2">Welcome to VideoHub! 🎬</h2>
                                <p class="mb-0 opacity-75">Discover amazing content from creators around the world</p>
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
                                        <div class="text-muted small">Available Videos</div>
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
                                        <i class="fas fa-gift fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0">${freeVideos}</div>
                                        <div class="text-muted small">Free Videos</div>
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
                                        <i class="fas fa-shopping-cart fa-lg"></i>
                                    </div>
                                    <div>
                                        <div class="h3 fw-bold mb-0">${totalPurchases}</div>
                                        <div class="text-muted small">Your Purchases</div>
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
                                        <div class="h3 fw-bold mb-0">$${totalSpent.toFixed(2)}</div>
                                        <div class="text-muted small">Total Spent</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions & Featured Videos -->
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Quick Actions</h5>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" onclick="showPanel('videos')">
                                        <i class="fas fa-video me-2"></i>Browse All Videos
                                    </button>
                                    <button class="btn btn-outline-primary" onclick="showPanel('purchases')">
                                        <i class="fas fa-shopping-cart me-2"></i>My Purchases
                                    </button>
                                    <button class="btn btn-outline-success" onclick="showPanel('watchlist')">
                                        <i class="fas fa-bookmark me-2"></i>My Watchlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-transparent border-0 pb-0">
                                <h5 class="card-title">Featured Videos</h5>
                            </div>
                            <div class="card-body">
                                ${this.renderFeaturedVideos()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFeaturedVideos() {
        if (!this.data.videos || this.data.videos.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-video fa-2x mb-3 opacity-50"></i>
                    <p>No videos available yet</p>
                </div>
            `;
        }

        const featuredVideos = this.data.videos
            .sort((a, b) => b.views - a.views)
            .slice(0, 3);

        return featuredVideos.map(video => `
            <div class="d-flex align-items-center mb-3">
                <div class="bg-light rounded p-2 me-3">
                    <i class="fas fa-play text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-medium">${video.title}</div>
                    <small class="text-muted">${video.views} views • by ${video.uploader}</small>
                </div>
                <span class="badge bg-${video.price === 0 ? 'success' : 'warning'}">${video.price === 0 ? 'FREE' : '$' + video.price}</span>
            </div>
        `).join('');
    }
}

// Viewer Videos Panel
class ViewerVideosPanel extends ViewerPanelBase {
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
        const container = document.getElementById('videosPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>Browse Videos</h2>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary active" onclick="filterVideos('all')">All</button>
                        <button type="button" class="btn btn-outline-primary" onclick="filterVideos('free')">Free</button>
                        <button type="button" class="btn btn-outline-primary" onclick="filterVideos('paid')">Premium</button>
                        <button type="button" class="btn btn-outline-primary" onclick="filterVideos('purchased')">Purchased</button>
                    </div>
                </div>

                <div class="row" id="videosContainer">
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
                        <h4>No videos available</h4>
                        <p class="text-muted">Check back later for new content</p>
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
                            ${this.renderVideoBadge(video)}
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text text-muted small">${video.description?.substring(0, 80)}...</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">by ${video.uploader}</small>
                            <small class="text-muted">${video.views} views</small>
                        </div>
                        ${this.renderVideoActions(video)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderVideoBadge(video) {
        if (video.youtube_id) {
            return '<span class="badge bg-danger"><i class="fab fa-youtube"></i></span>';
        } else if (video.price === 0) {
            return '<span class="badge bg-success">FREE</span>';
        } else if (video.purchased) {
            return '<span class="badge bg-info">PURCHASED</span>';
        } else {
            return `<span class="badge bg-warning">$${video.price}</span>`;
        }
    }

    renderVideoActions(video) {
        if (video.youtube_id) {
            return `
                <button class="btn btn-danger w-100" onclick="playYouTubeVideo('${video.youtube_id}', '${video.title}')">
                    <i class="fab fa-youtube me-2"></i>Watch on YouTube
                </button>
            `;
        }

        const canWatch = video.price === 0 || video.purchased;

        if (canWatch) {
            return `
                <button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                    <i class="fas fa-play me-2"></i>Watch Now
                </button>
            `;
        } else {
            return `
                <button class="btn btn-primary w-100" onclick="purchaseVideo(${video.id}, ${video.price})">
                    <i class="fas fa-shopping-cart me-2"></i>Purchase for $${video.price.toFixed(2)}
                </button>
            `;
        }
    }
}

// Placeholder classes for other viewer panels
class ViewerPurchasesPanel extends ViewerPanelBase {
    constructor() {
        super('Purchases');
    }

    async fetchData() {
        const response = await fetch('api/purchase.php');
        const result = await response.json();

        if (result.success) {
            this.data = result.purchases;
        } else {
            throw new Error(result.message || 'Failed to fetch purchases');
        }
    }

    render() {
        console.log('Rendering viewer purchases panel with', this.data?.length, 'purchases');
    }
}

class ViewerWatchlistPanel extends ViewerPanelBase {
    constructor() {
        super('Watchlist');
    }

    async fetchData() {
        // Watchlist functionality not implemented yet
        this.data = [];
    }

    render() {
        console.log('Rendering viewer watchlist panel');
    }
}

// Initialize viewer dashboard
const viewerDashboard = new ViewerDashboard();

// Global functions for navigation and actions
window.showPanel = (panelName) => viewerDashboard.showPanel(panelName);
window.logout = () => viewerDashboard.logout();
window.purchaseVideo = (videoId, price) => viewerDashboard.purchaseVideo(videoId, price);
window.watchVideo = (videoId) => viewerDashboard.watchVideo(videoId);

// Placeholder for YouTube video player
window.playYouTubeVideo = (videoId, title) => {
    const modal = new Modal('youtubePlayerModal', { title: title, size: 'modal-xl', showFooter: false });
    modal.create();
    modal.setBody(`
        <div class="ratio ratio-16x9">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        </div>
    `);
    modal.show();
    modal.onHide(() => modal.destroy());
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    viewerDashboard.init();
});

// Export for testing
window.ViewerDashboard = ViewerDashboard;