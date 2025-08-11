/**
 * Dashboard functionality for VideoShare platform
 * Handles dynamic data loading for creator and viewer dashboards
 */

// Helper function to get current user from localStorage
function getCurrentUser() {
    try {
        const userData = localStorage.getItem(CONFIG.STORAGE.USER);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

class Dashboard {
    constructor() {
        this.user = null;
        this.stats = null;
        this.init();
    }

    async init() {
        try {
            // Get current user
            this.user = getCurrentUser();
            if (!this.user) {
                window.location.href = '../login.html';
                return;
            }

            // Load dashboard based on user role
            if (this.user.role === 'creator') {
                await this.loadCreatorDashboard();
            } else {
                await this.loadViewerDashboard();
            }

            this.setupEventListeners();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('Failed to load dashboard');
        }
    }

    async loadCreatorDashboard() {
        try {
            // Update user name in navigation
            this.updateUserName();

            // Load stats
            const response = await API.getStats();
            if (response.success) {
                this.stats = response.data;
                this.renderCreatorStats();
                this.renderCreatorChart();
                this.renderRecentActivity();
            }

            // Load videos
            await this.loadCreatorVideos();

        } catch (error) {
            console.error('Error loading creator dashboard:', error);
            this.showError('Failed to load creator dashboard data');
        }
    }

    async loadViewerDashboard() {
        try {
            // Update user name in navigation
            this.updateUserName();

            // Load stats
            const response = await API.getStats();
            if (response.success) {
                this.stats = response.data;
                this.renderViewerStats();
            }

            // Load videos
            await this.loadVideos();

            // Load wallet info
            await this.loadWalletInfo();

        } catch (error) {
            console.error('Error loading viewer dashboard:', error);
            this.showError('Failed to load viewer dashboard data');
        }
    }

    updateUserName() {
        const nameElements = document.querySelectorAll('.navbar-brand, #navbarDropdown, [data-user-name]');
        nameElements.forEach(el => {
            if (el.textContent.includes('Creator Name') || el.textContent.includes('Viewer Name')) {
                el.innerHTML = el.innerHTML.replace(/(Creator|Viewer) Name/, this.user.name);
            }
        });
    }

    renderCreatorStats() {
        const stats = this.stats;
        
        // Update stats cards
        const updates = [
            { selector: '[data-stat="total-videos"]', value: stats.total_videos },
            { selector: '[data-stat="total-sales"]', value: stats.total_sales },
            { selector: '[data-stat="total-earnings"]', value: `$${parseFloat(stats.total_earnings).toFixed(2)}` },
            { selector: '[data-stat="total-views"]', value: (stats.total_views || 0).toLocaleString() }
        ];

        updates.forEach(update => {
            const element = document.querySelector(update.selector);
            if (element) {
                element.textContent = update.value;
            }
        });

        // Update cards with actual data
        this.updateStatsCards([
            { title: 'Total Videos', value: stats.total_videos, icon: 'fas fa-video', color: 'primary' },
            { title: 'Total Sales', value: stats.total_sales, icon: 'fas fa-shopping-cart', color: 'success' },
            { title: 'Total Earnings', value: `$${parseFloat(stats.total_earnings).toFixed(2)}`, icon: 'fas fa-dollar-sign', color: 'info' },
            { title: 'Total Views', value: (stats.total_views || 0).toLocaleString(), icon: 'fas fa-eye', color: 'warning' }
        ]);
    }

    renderViewerStats() {
        const stats = this.stats;
        
        this.updateStatsCards([
            { title: 'Videos Purchased', value: stats.total_purchases, icon: 'fas fa-video', color: 'primary' },
            { title: 'Total Spent', value: `$${parseFloat(stats.total_spent).toFixed(2)}`, icon: 'fas fa-credit-card', color: 'danger' },
            { title: 'Wallet Balance', value: `$${parseFloat(stats.wallet_balance).toFixed(2)}`, icon: 'fas fa-wallet', color: 'success' }
        ]);
    }

    updateStatsCards(statsData) {
        const container = document.querySelector('.stats-cards, .row.g-3');
        if (!container) return;

        container.innerHTML = '';
        
        statsData.forEach(stat => {
            const cardHtml = `
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body text-center">
                            <div class="stat-icon mb-3">
                                <i class="${stat.icon} fa-2x text-${stat.color}"></i>
                            </div>
                            <h3 class="fw-bold mb-1">${stat.value}</h3>
                            <p class="text-muted mb-0">${stat.title}</p>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    renderCreatorChart() {
        const chartCanvas = document.getElementById('earningsChart');
        if (!chartCanvas || !this.stats.monthly_earnings) return;

        const ctx = chartCanvas.getContext('2d');
        const monthlyData = this.stats.monthly_earnings;
        
        const labels = monthlyData.map(item => {
            const date = new Date(item.month + '-01');
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        
        const data = monthlyData.map(item => parseFloat(item.earnings));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Earnings',
                    data: data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container || !this.stats.recent_activity) return;

        const activities = this.stats.recent_activity;
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent activity</p>';
            return;
        }

        const activityHtml = activities.map(activity => `
            <div class="activity-item d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <strong>${activity.title}</strong>
                    <br>
                    <small class="text-muted">Purchased by ${activity.buyer_name}</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-success">+$${parseFloat(activity.amount).toFixed(2)}</div>
                    <small class="text-muted">${this.formatDate(activity.created_at)}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = activityHtml;
    }

    async loadCreatorVideos() {
        try {
            const response = await API.getVideos({ creator_id: this.user.id });
            if (response.success) {
                this.renderVideos(response.data.videos, 'creator');
            }
        } catch (error) {
            console.error('Error loading creator videos:', error);
        }
    }

    async loadVideos() {
        try {
            const response = await API.getVideos();
            if (response.success) {
                this.renderVideos(response.data.videos, 'viewer');
            }
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    }

    renderVideos(videos, userType) {
        const container = document.getElementById('videosContainer');
        if (!container) return;

        if (videos.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center text-muted">No videos available</p></div>';
            return;
        }

        const videosHtml = videos.map(video => this.createVideoCard(video, userType)).join('');
        container.innerHTML = videosHtml;

        // Add click handlers for video cards
        this.setupVideoCardHandlers();
    }

    createVideoCard(video, userType) {
        const isCreator = userType === 'creator';
        
        return `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="card video-card border-0 shadow-sm h-100" data-video-id="${video.id}">
                    <div class="video-thumbnail position-relative">
                        <img src="${video.thumbnail_path || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400'}" 
                             class="card-img-top" alt="${video.title}">
                        ${!isCreator ? `<div class="video-price">$${parseFloat(video.price).toFixed(2)}</div>` : ''}
                        <div class="play-overlay">
                            <i class="fas fa-play-circle"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text text-muted small">${video.description || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">
                                <i class="fas fa-user me-1"></i>${video.creator_name || 'Unknown Creator'}
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${video.view_count || 0} views
                            </small>
                        </div>
                        ${isCreator ? 
                            `<div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary edit-video" data-video-id="${video.id}">
                                    <i class="fas fa-edit me-1"></i>Edit
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-video" data-video-id="${video.id}">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                             </div>` :
                            `<button class="btn btn-primary w-100 purchase-video" data-video-id="${video.id}" data-price="${video.price}">
                                <i class="fas fa-shopping-cart me-2"></i>Purchase - $${parseFloat(video.price).toFixed(2)}
                             </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }

    setupVideoCardHandlers() {
        // Purchase video handlers
        document.querySelectorAll('.purchase-video').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const videoId = e.target.getAttribute('data-video-id');
                const price = e.target.getAttribute('data-price');
                await this.handlePurchaseVideo(videoId, price);
            });
        });

        // Edit/Delete handlers for creators
        document.querySelectorAll('.edit-video').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.target.getAttribute('data-video-id');
                this.handleEditVideo(videoId);
            });
        });

        document.querySelectorAll('.delete-video').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const videoId = e.target.getAttribute('data-video-id');
                await this.handleDeleteVideo(videoId);
            });
        });
    }

    async handlePurchaseVideo(videoId, price) {
        try {
            if (!this.stats.wallet_balance || this.stats.wallet_balance < parseFloat(price)) {
                this.showError('Insufficient wallet balance. Please add funds to your wallet.');
                return;
            }

            const response = await API.purchaseVideo(videoId);
            if (response.success) {
                this.showSuccess('Video purchased successfully!');
                // Refresh stats and videos
                await this.loadViewerDashboard();
            } else {
                this.showError(response.error || 'Failed to purchase video');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            this.showError('Failed to purchase video');
        }
    }

    handleEditVideo(videoId) {
        // Redirect to edit page
        window.location.href = `creator-upload.html?edit=${videoId}`;
    }

    async handleDeleteVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video?')) return;

        try {
            const response = await API.deleteVideo(videoId);
            if (response.success) {
                this.showSuccess('Video deleted successfully');
                await this.loadCreatorVideos();
                await this.loadCreatorDashboard();
            } else {
                this.showError(response.error || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Failed to delete video');
        }
    }

    async loadWalletInfo() {
        try {
            const response = await API.getWallet();
            if (response.success) {
                this.updateWalletDisplay(response.data.balance);
            }
        } catch (error) {
            console.error('Error loading wallet info:', error);
        }
    }

    updateWalletDisplay(balance) {
        const walletElements = document.querySelectorAll('[data-wallet-balance]');
        walletElements.forEach(el => {
            el.textContent = `$${parseFloat(balance).toFixed(2)}`;
        });
    }

    setupEventListeners() {
        // Add funds to wallet (demo functionality)
        document.querySelectorAll('.add-funds-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.handleAddFunds();
            });
        });

        // Refresh dashboard
        document.querySelectorAll('.refresh-dashboard').forEach(btn => {
            btn.addEventListener('click', () => {
                this.init();
            });
        });
    }

    async handleAddFunds() {
        const amount = prompt('Enter amount to add to wallet:', '10.00');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            this.showError('Please enter a valid amount');
            return;
        }

        try {
            const response = await API.updateWallet(parseFloat(amount));
            if (response.success) {
                this.showSuccess(`$${amount} added to wallet successfully!`);
                await this.loadWalletInfo();
                if (this.user.role === 'viewer') {
                    await this.loadViewerDashboard();
                }
            } else {
                this.showError(response.error || 'Failed to add funds');
            }
        } catch (error) {
            console.error('Add funds error:', error);
            this.showError('Failed to add funds to wallet');
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.content-area, .main-content');
        if (container) {
            container.insertAdjacentHTML('afterbegin', alertHtml);
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) alert.remove();
            }, 5000);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});