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
        this.loadMockData(); // Fallback for demo
        this.bindEvents();
        this.loadPageSpecificHandlers();
        await this.loadDashboardData();
    }

    loadMockData() {
        // Initialize empty arrays - data will be loaded from dataService
        this.stats = {};
        this.videos = [];
        this.earnings = [];
    }

    async loadDashboardData() {
        try {
            // Try to load real data from API
            const [statsResult, videosResult, earningsResult] = await Promise.all([
                window.apiService.getCreatorStats(),
                window.apiService.getCreatorVideos({ limit: 5 }),
                window.apiService.getCreatorEarnings({ limit: 10 })
            ]);

            if (statsResult.success) {
                this.stats = statsResult.data;
            }
            if (videosResult.success) {
                this.videos = videosResult.data.videos || videosResult.data;
            }
            if (earningsResult.success) {
                this.earnings = earningsResult.data.earnings || earningsResult.data;
            }

            this.updateDashboardDisplay();
        } catch (error) {
            console.log('API not available, using demo data');
            this.updateDashboardDisplay();
        }
    }

    updateDashboardDisplay() {
        // Update stats cards
        document.getElementById('totalVideos')?.textContent = this.stats.totalVideos || '--';
        document.getElementById('totalViews')?.textContent = this.formatNumber(this.stats.totalViews) || '--';
        document.getElementById('totalEarnings')?.textContent = this.formatCurrency(this.stats.totalEarnings) || '--';
        document.getElementById('subscribers')?.textContent = this.stats.subscribers || '--';

        // Update earnings table and recent videos
        this.loadEarningsTable();
        this.loadRecentVideos();
    }

    loadEarningsTable() {
        const tbody = document.getElementById('earningsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.earnings.slice(0, 10).map(earning => `
            <tr>
                <td class="px-4 py-3">
                    <div class="d-flex align-items-center">
                        <div class="video-thumbnail me-3" style="width: 40px; height: 24px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-play text-muted" style="font-size: 10px;"></i>
                        </div>
                        <div>
                            <div class="fw-semibold text-sm">${earning.videoTitle}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div>
                        <div class="fw-semibold text-sm">${earning.viewerName}</div>
                        <div class="text-muted text-xs">${earning.viewerEmail}</div>
                    </div>
                </td>
                <td class="px-4 py-3 text-muted text-sm">${new Date(earning.purchaseDate).toLocaleDateString()}</td>
                <td class="px-4 py-3">
                    <span class="fw-bold text-success">${this.formatCurrency(earning.price)}</span>
                </td>
                <td class="px-4 py-3">
                    <span class="badge bg-${earning.status === 'completed' ? 'success' : 'warning'} bg-opacity-10 text-${earning.status === 'completed' ? 'success' : 'warning'}">
                        ${earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    loadRecentVideos() {
        const container = document.getElementById('recentVideos');
        if (!container) return;

        container.innerHTML = this.videos.slice(0, 5).map(video => `
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <div class="video-thumbnail me-3" style="width: 50px; height: 30px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-play text-muted" style="font-size: 12px;"></i>
                    </div>
                    <div>
                        <div class="fw-semibold text-sm">${video.title}</div>
                        <div class="text-muted text-xs">${new Date(video.uploadDate).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-sm">${this.formatNumber(video.views)}</div>
                    <div class="text-muted text-xs">views</div>
                </div>
            </div>
        `).join('');
    }

    formatNumber(num) {
        if (!num) return '0';
        return new Intl.NumberFormat().format(num);
    }

    formatCurrency(amount) {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(amount);
    }

    bindEvents() {
        // Upload video form submission
        const uploadForm = document.getElementById('uploadVideoForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleVideoUpload(e));
        }

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
        const refreshBtn = document.querySelector('[onclick*="refresh"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        await this.loadDashboardData();

        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-refresh me-1"></i> Refresh';
            refreshBtn.disabled = false;
        }

        window.apiService.showSuccessMessage('Dashboard refreshed successfully');
    }

    async handleVideoUpload(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const videoData = {
            title: formData.get('videoTitle'),
            description: formData.get('videoDescription'),
            price: parseFloat(formData.get('videoPrice')),
            category: formData.get('videoCategory')
        };

        // Validate form
        if (!this.validateVideoForm(form, videoData)) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Uploading...';
        submitBtn.disabled = true;

        try {
            const result = await window.apiService.uploadVideo(videoData, formData.get('videoFile'));
            
            if (result.success) {
                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal'));
                modal.hide();
                form.reset();
                form.classList.remove('was-validated');
                
                // Refresh videos list
                await this.loadDashboardData();
                
                window.apiService.showSuccessMessage('Video uploaded successfully');
            } else {
                window.apiService.handleApiError(result, 'Failed to upload video');
            }
        } catch (error) {
            // Demo mode
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal'));
            modal.hide();
            form.reset();
            form.classList.remove('was-validated');
            window.apiService.showSuccessMessage('Video uploaded successfully (demo mode)');
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateVideoForm(form, data) {
        let isValid = true;
        
        // Title validation
        const titleInput = form.querySelector('#videoTitle');
        if (!data.title || data.title.length < 3) {
            titleInput.classList.add('is-invalid');
            isValid = false;
        } else {
            titleInput.classList.remove('is-invalid');
            titleInput.classList.add('is-valid');
        }
        
        // Price validation
        const priceInput = form.querySelector('#videoPrice');
        if (!data.price || data.price < 0) {
            priceInput.classList.add('is-invalid');
            isValid = false;
        } else {
            priceInput.classList.remove('is-invalid');
            priceInput.classList.add('is-valid');
        }

        // Category validation
        const categoryInput = form.querySelector('#videoCategory');
        if (!data.category) {
            categoryInput.classList.add('is-invalid');
            isValid = false;
        } else {
            categoryInput.classList.remove('is-invalid');
            categoryInput.classList.add('is-valid');
        }

        // File validation
        const fileInput = form.querySelector('#videoFile');
        if (!fileInput.files || fileInput.files.length === 0) {
            fileInput.classList.add('is-invalid');
            isValid = false;
        } else {
            fileInput.classList.remove('is-invalid');
            fileInput.classList.add('is-valid');
        }

        form.classList.add('was-validated');
        return isValid;
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.setupDashboard();
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

    async setupVideosPage() {
        try {
            const result = await window.apiService.getCreatorVideos();
            if (result.success) {
                this.renderVideosGrid(result.data.videos || result.data);
            } else {
                this.renderVideosGrid(this.videos);
            }
        } catch (error) {
            this.renderVideosGrid(this.videos);
        }
    }

    renderVideosGrid(videos) {
        const grid = document.getElementById('videosGrid');
        if (!grid) return;

        grid.innerHTML = videos.map(video => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card video-card shadow-sm border-0">
                    <div class="position-relative">
                        <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                        <div class="video-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                            <div class="play-button bg-success bg-opacity-75 text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-${this.getStatusColor(video.status)} bg-opacity-90">
                                ${video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                            </span>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark bg-opacity-75 text-white">
                                ${video.duration || '00:00'}
                            </span>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        <h6 class="card-title fw-bold mb-2">${video.title}</h6>
                        <p class="card-text text-muted small mb-3" style="height: 40px; overflow: hidden;">
                            ${video.description || 'No description available'}
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-success fw-bold">${this.formatCurrency(video.price || 0)}</span>
                            <span class="text-muted small">
                                <i class="fas fa-eye me-1"></i>
                                ${this.formatNumber(video.views)}
                            </span>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="text-muted small">
                                <i class="fas fa-heart me-1"></i>
                                ${this.formatNumber(video.likes || 0)}
                            </span>
                            <span class="text-success fw-semibold">
                                ${video.earnings ? this.formatCurrency(video.earnings) : '$0.00'} earned
                            </span>
                        </div>
                        
                        <div class="text-muted small mb-3">
                            Uploaded ${new Date(video.uploadDate).toLocaleDateString()}
                        </div>
                        
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="editVideo(${video.id})" title="Edit video">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-success" onclick="viewVideoStats(${video.id})" title="View stats">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="duplicateVideo(${video.id})" title="Duplicate">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteVideo(${video.id})" title="Delete video">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add hover effects with CSS if not already added
        if (!document.getElementById('video-card-styles')) {
            const style = document.createElement('style');
            style.id = 'video-card-styles';
            style.textContent = `
                .video-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .video-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
                }
                .video-overlay {
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    background: rgba(0,0,0,0.3);
                }
                .video-card:hover .video-overlay {
                    opacity: 1;
                }
                .play-button {
                    transform: scale(0.8);
                    transition: transform 0.2s ease;
                }
                .video-card:hover .play-button {
                    transform: scale(1);
                }
            `;
            document.head.appendChild(style);
        }
    }

    getStatusColor(status) {
        const colors = {
            published: 'success',
            pending: 'warning',
            draft: 'secondary',
            rejected: 'danger'
        };
        return colors[status] || 'secondary';
    }

    setupProfilePage() {
        // Profile page is handled by profile.js
    }
}

// Global functions
window.exportEarnings = function() {
    window.apiService.showSuccessMessage('Earnings export would start here');
};

window.editVideo = function(videoId) {
    window.apiService.showSuccessMessage(`Edit video ${videoId} functionality would open here`);
};

window.viewVideoStats = function(videoId) {
    window.apiService.showSuccessMessage(`Video ${videoId} stats would be displayed here`);
};

window.deleteVideo = async function(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const result = await window.apiService.deleteVideo(videoId);
            if (result.success) {
                window.apiService.showSuccessMessage('Video deleted successfully');
                window.creatorManager.setupVideosPage();
            } else {
                window.apiService.handleApiError(result, 'Failed to delete video');
            }
        } catch (error) {
            window.apiService.showSuccessMessage('Demo mode: Video deletion simulated');
        }
    }
};

window.duplicateVideo = async function(videoId) {
    try {
        const result = await window.apiService.duplicateVideo(videoId);
        if (result.success) {
            window.apiService.showSuccessMessage('Video duplicated successfully');
            window.creatorManager.setupVideosPage();
        } else {
            window.apiService.handleApiError(result, 'Failed to duplicate video');
        }
    } catch (error) {
        window.apiService.showSuccessMessage('Demo mode: Video duplication simulated');
    }
};

// Initialize creator manager
document.addEventListener('DOMContentLoaded', function() {
    window.creatorManager = new CreatorManager();
});