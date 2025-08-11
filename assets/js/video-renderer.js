/**
 * Video Renderer for VideoShare platform
 * Handles dynamic video display and purchase functionality
 */

class VideoRenderer {
    constructor() {
        this.videos = [];
        this.userPurchases = [];
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem(CONFIG.STORAGE.USER);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Load and render videos for Browse page
     */
    async loadBrowseVideos() {
        try {
            const response = await API.getVideos();
            console.log('Video renderer received response:', response);
            
            // Handle different response structures
            if (response && response.success) {
                this.videos = response.data?.videos || response.data || response.videos || [];
            } else if (Array.isArray(response)) {
                this.videos = response;
            } else {
                this.videos = [];
            }
            
            console.log('Videos loaded for rendering:', this.videos.length);
            await this.loadUserPurchases();
            this.renderVideos('browse');
        } catch (error) {
            console.error('Error loading browse videos:', error);
            this.showError('Failed to load videos');
        }
    }

    /**
     * Load and render videos for Library page
     */
    async loadLibraryVideos() {
        try {
            const response = await API.getPurchases();
            if (response.success) {
                this.videos = response.data.purchased_videos || [];
                this.renderVideos('library');
            }
        } catch (error) {
            console.error('Error loading library videos:', error);
            this.showError('Failed to load your library');
        }
    }

    /**
     * Load user purchases
     */
    async loadUserPurchases() {
        if (!this.currentUser) {
            this.userPurchases = [];
            return;
        }

        try {
            const response = await API.getPurchases();
            console.log('Purchases response:', response);
            
            if (response && response.success) {
                this.userPurchases = response.data?.purchases || response.data || [];
            } else if (Array.isArray(response)) {
                this.userPurchases = response;
            } else {
                this.userPurchases = [];
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
            this.userPurchases = [];
        }
    }

    /**
     * Check if user has purchased a video
     */
    hasPurchased(videoId) {
        return this.userPurchases.some(purchase => 
            purchase.video_id == videoId && purchase.status === 'completed'
        );
    }

    /**
     * Render videos
     */
    renderVideos(mode = 'browse') {
        console.log(`Rendering ${this.videos.length} videos in ${mode} mode`);
        
        const containers = {
            'browse': document.querySelector('#videosContainer'),
            'library': document.querySelector('#libraryContainer, .library-grid')
        };

        let container = containers[mode];
        console.log('Found container:', container);
        
        if (!container) {
            console.error('Videos container not found for mode:', mode);
            // Only try fallback if it's specifically a video-related container
            if (mode === 'browse') {
                const fallback = document.querySelector('.row.video-grid');
                if (fallback) {
                    console.log('Using fallback container:', fallback);
                    container = fallback;
                } else {
                    console.error('No suitable video container found');
                    return;
                }
            } else {
                return;
            }
        }

        if (this.videos.length === 0) {
            console.log('No videos to display, showing empty state');
            container.innerHTML = this.getEmptyStateHtml(mode);
            return;
        }

        console.log('Rendering video cards...');
        const videoCards = this.videos.map(video => this.getVideoCardHtml(video, mode)).join('');
        container.innerHTML = videoCards;
        this.setupVideoCardListeners();
        
        // Update video count
        const countElement = document.getElementById('videoCount');
        if (countElement) {
            countElement.textContent = `${this.videos.length} videos found`;
        }
    }

    /**
     * Get video card HTML
     */
    getVideoCardHtml(video, mode = 'browse') {
        const purchased = this.hasPurchased(video.id);
        const thumbnailUrl = video.thumbnail_path || video.thumbnail_url || this.getDefaultThumbnail();
        
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card video-card h-100 shadow-sm border-0" data-video-id="${video.id}">
                    <div class="video-thumbnail position-relative" style="height: 200px; overflow: hidden;">
                        <img src="${thumbnailUrl}" 
                             alt="${video.title}" 
                             class="img-fluid w-100 h-100" 
                             style="object-fit: cover;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="default-thumbnail d-none position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-play-circle text-white" style="font-size: 3rem; opacity: 0.8;"></i>
                        </div>
                        <div class="video-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                             style="background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s;">
                            <i class="fas fa-play text-white" style="font-size: 2rem;"></i>
                        </div>
                        ${video.view_count ? `
                            <div class="position-absolute top-0 end-0 m-2">
                                <span class="badge bg-dark bg-opacity-75">
                                    <i class="fas fa-eye me-1"></i>${video.view_count.toLocaleString()}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title fw-bold mb-2">${this.escapeHtml(video.title)}</h6>
                        <p class="card-text text-muted small flex-grow-1 mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${this.escapeHtml(video.description || 'No description available')}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted d-flex align-items-center">
                                <i class="fas fa-user-circle me-1"></i>
                                ${this.escapeHtml(video.creator_name || 'Unknown Creator')}
                            </small>
                            <span class="text-primary fw-bold">$${parseFloat(video.price || 0).toFixed(2)}</span>
                        </div>
                        <div class="mt-auto">
                            ${this.getActionButtonHtml(video, purchased, mode)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get action button HTML based on purchase status
     */
    getActionButtonHtml(video, purchased, mode) {
        if (!this.currentUser) {
            return `
                <button class="btn btn-outline-primary btn-sm w-100 login-required" data-video-id="${video.id}">
                    <i class="fas fa-sign-in-alt me-1"></i>Login to Purchase
                </button>
            `;
        }

        if (purchased || mode === 'library') {
            return `
                <button class="btn btn-success btn-sm w-100 play-video" data-video-id="${video.id}">
                    <i class="fas fa-play me-1"></i>Watch Now
                </button>
            `;
        }

        return `
            <button class="btn btn-primary btn-sm w-100 purchase-video" 
                    data-video-id="${video.id}" 
                    data-video-title="${this.escapeHtml(video.title)}" 
                    data-video-price="${video.price}">
                <i class="fas fa-shopping-cart me-1"></i>Purchase $${parseFloat(video.price || 0).toFixed(2)}
            </button>
        `;
    }

    /**
     * Get empty state HTML
     */
    getEmptyStateHtml(mode) {
        if (mode === 'library') {
            return `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-video fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No Videos in Your Library</h5>
                        <p class="text-muted">Purchase some videos to build your collection!</p>
                        <a href="viewer-dashboard.html" class="btn btn-primary">
                            <i class="fas fa-shopping-cart me-2"></i>Browse Videos
                        </a>
                    </div>
                </div>
            `;
        }

        return `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No Videos Available</h5>
                    <p class="text-muted">Check back later for new content!</p>
                </div>
            </div>
        `;
    }

    /**
     * Setup video card event listeners
     */
    setupVideoCardListeners() {
        // Purchase buttons
        document.querySelectorAll('.purchase-video').forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.target.getAttribute('data-video-id');
                const videoTitle = e.target.getAttribute('data-video-title');
                const videoPrice = e.target.getAttribute('data-video-price');
                
                if (window.paymentManager) {
                    window.paymentManager.showPaymentModal(videoId, videoTitle, videoPrice);
                }
            });
        });

        // Play buttons
        document.querySelectorAll('.play-video').forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.target.getAttribute('data-video-id');
                this.playVideo(videoId);
            });
        });

        // Login required buttons
        document.querySelectorAll('.login-required').forEach(button => {
            button.addEventListener('click', () => {
                window.location.href = '../login.html';
            });
        });

        // Video card hover effects
        document.querySelectorAll('.video-card').forEach(card => {
            const overlay = card.querySelector('.video-overlay');
            if (overlay) {
                card.addEventListener('mouseenter', () => {
                    overlay.style.opacity = '1';
                });
                
                card.addEventListener('mouseleave', () => {
                    overlay.style.opacity = '0';
                });
            }
        });
    }

    /**
     * Play video (placeholder for future video player)
     */
    playVideo(videoId) {
        // For now, show a modal with video player placeholder
        this.showVideoPlayer(videoId);
    }

    /**
     * Show video player modal
     */
    showVideoPlayer(videoId) {
        const video = this.videos.find(v => v.id == videoId);
        if (!video) return;

        const modalHtml = `
            <div class="modal fade" id="videoPlayerModal" tabindex="-1" aria-labelledby="videoPlayerModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="videoPlayerModalLabel">${this.escapeHtml(video.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="ratio ratio-16x9">
                                <div class="bg-dark d-flex align-items-center justify-content-center text-white">
                                    <div class="text-center">
                                        <i class="fas fa-play-circle fa-5x mb-3" style="opacity: 0.5;"></i>
                                        <h5>Video Player Integration</h5>
                                        <p>YouTube integration coming soon!</p>
                                        <p class="small text-muted">Video ID: ${videoId}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <h6>Description</h6>
                                <p class="text-muted">${this.escapeHtml(video.description || 'No description available')}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">By ${this.escapeHtml(video.creator_name)}</small>
                                    <small class="text-muted">Views: ${(video.view_count || 0).toLocaleString()}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('videoPlayerModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('videoPlayerModal'));
        modal.show();
    }

    /**
     * Get default thumbnail
     */
    getDefaultThumbnail() {
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:%23764ba2;stop-opacity:1" /></linearGradient></defs><rect width="400" height="200" fill="url(%23grad)"/><circle cx="200" cy="100" r="30" fill="white" opacity="0.8"/><polygon points="190,85 190,115 215,100" fill="%23667eea"/></svg>';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error message
     */
    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Initialize video renderer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.videoRenderer = new VideoRenderer();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoRenderer;
}