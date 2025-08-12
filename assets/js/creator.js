/**
 * VideoHub Creator Module
 * Handles creator dashboard functionality with API integration
 */

class CreatorManager {
    constructor() {
        this.stats = {};
        this.videos = [];
        this.earnings = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadDashboardData();
        this.loadPageSpecificHandlers();
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
                // Get current user info
                const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
                const creatorId = userSession.userId || 7; // Default to test creator
                
                // Load metrics from new metrics API
                const metricsResponse = await window.apiService.get(`/metrics/creator?creator_id=${creatorId}`);
                if (metricsResponse.success) {
                    this.stats = metricsResponse.data;
                    this.updateDashboardMetrics(this.stats);
                }
                
                // Load data from API
                const [videosResponse, earningsResponse] = await Promise.all([
                    window.apiService.getCreatorVideos(),
                    window.apiService.getCreatorEarnings()
                ]);
                
                // Ensure arrays are properly initialized
                this.videos = Array.isArray(videosResponse.data?.videos) ? videosResponse.data.videos : 
                             Array.isArray(videosResponse.videos) ? videosResponse.videos : 
                             Array.isArray(videosResponse.data) ? videosResponse.data : [];
                             
                this.earnings = Array.isArray(earningsResponse.data?.earnings) ? earningsResponse.data.earnings : 
                               Array.isArray(earningsResponse.earnings) ? earningsResponse.earnings : 
                               Array.isArray(earningsResponse.data) ? earningsResponse.data : [];
                
                console.log('Creator data loaded:', {
                    videosLength: this.videos.length,
                    earningsLength: this.earnings.length,
                    stats: this.stats
                });
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Set empty values on error
            this.updateDashboardMetrics({
                totalVideos: 0,
                totalViews: 0,
                totalEarnings: '0.00',
                subscribers: 0
            });
        }
    }

    updateDashboardMetrics(stats) {
        // Update dashboard metric displays
        const totalVideosEl = document.getElementById('totalVideos');
        const totalViewsEl = document.getElementById('totalViews');
        const totalEarningsEl = document.getElementById('totalEarnings');
        const subscribersEl = document.getElementById('subscribers');
        
        if (totalVideosEl) totalVideosEl.textContent = stats.totalVideos || 0;
        if (totalViewsEl) totalViewsEl.textContent = stats.totalViews || 0;
        if (totalEarningsEl) totalEarningsEl.textContent = '$' + (stats.totalEarnings || '0.00');
        if (subscribersEl) subscribersEl.textContent = stats.subscribers || 0;

        // Update earnings table
        this.updateEarningsTable();
    }

    updateEarningsTable() {
        const earningsTableBody = document.getElementById('earningsTable');
        if (!earningsTableBody) return;

        if (!this.earnings.length) {
            earningsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No earnings data available</td></tr>';
            return;
        }

        earningsTableBody.innerHTML = this.earnings.map(earning => `
            <tr>
                <td>${earning.videoTitle || 'N/A'}</td>
                <td>${earning.viewerName || 'N/A'}</td>
                <td>${earning.date || 'N/A'}</td>
                <td>$${earning.amount || '0.00'}</td>
            </tr>
        `).join('');
    }

    bindEvents() {
        // Upload button event
        const uploadBtn = document.querySelector('[data-bs-target="#uploadModal"]');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadModal());
        }

        // Video management events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-video-btn')) {
                const videoId = e.target.dataset.videoId;
                this.editVideo(videoId);
            }
            if (e.target.classList.contains('delete-video-btn')) {
                const videoId = e.target.dataset.videoId;
                this.deleteVideo(videoId);
            }
        });
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.initDashboard();
                break;
            case 'videos.html':
                this.initVideosPage();
                break;
            case 'earnings.html':
                this.initEarningsPage();
                break;
        }
    }

    initDashboard() {
        console.log('Creator dashboard initialized');
    }

    initVideosPage() {
        this.loadVideosTable();
    }

    initEarningsPage() {
        this.loadEarningsTable();
    }

    async loadVideosTable() {
        const tbody = document.getElementById('videosTableBody');
        if (!tbody) return;

        if (!this.videos.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No videos found</td></tr>';
            return;
        }

        tbody.innerHTML = this.videos.map(video => `
            <tr>
                <td>
                    <img src="${video.youtube_thumbnail || 'https://via.placeholder.com/60x40'}" 
                         alt="${video.title}" class="rounded" style="width: 60px; height: 40px; object-fit: cover;">
                </td>
                <td>${video.title}</td>
                <td>${video.category || 'General'}</td>
                <td>${video.views || 0}</td>
                <td>$${video.price || '0.00'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-video-btn" data-video-id="${video.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-video-btn" data-video-id="${video.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadEarningsTable() {
        const tbody = document.getElementById('earningsTableBody');
        if (!tbody) return;

        if (!this.earnings.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No earnings found</td></tr>';
            return;
        }

        tbody.innerHTML = this.earnings.map(earning => `
            <tr>
                <td>${earning.date || 'N/A'}</td>
                <td>${earning.videoTitle || 'N/A'}</td>
                <td>${earning.viewerName || 'N/A'}</td>
                <td>$${earning.amount || '0.00'}</td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
        `).join('');
    }

    showUploadModal() {
        console.log('Show upload modal');
    }

    editVideo(videoId) {
        console.log('Edit video:', videoId);
    }

    deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video?')) {
            console.log('Delete video:', videoId);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num || 0);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }
}

// Initialize creator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorManager = new CreatorManager();
});