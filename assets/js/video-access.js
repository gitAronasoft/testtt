/**
 * Video Access Manager for VideoHub
 * Handles video access control and payment verification for viewers
 */

class VideoAccessManager {
    constructor() {
        this.apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
        this.userSession = null;
        this.currentVideo = null;
        
        this.init();
    }

    init() {
        // Get current user session
        this.userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
        
        // Set up video access handlers
        this.setupVideoAccessHandlers();
    }

    setupVideoAccessHandlers() {
        // Add click handlers for protected videos
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('video-access-btn') || e.target.closest('.video-access-btn')) {
                e.preventDefault();
                const videoId = e.target.dataset.videoId || e.target.closest('.video-access-btn').dataset.videoId;
                if (videoId) {
                    this.checkVideoAccess(videoId);
                }
            }
        });
    }

    /**
     * Check if user has access to a video and handle accordingly
     */
    async checkVideoAccess(videoId) {
        if (!this.userSession || !this.userSession.id) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/video-access/check/${videoId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userSession.id
                })
            });

            const result = await response.json();

            if (result.success) {
                if (result.has_access) {
                    // User has access - get video URL and play
                    this.playVideo(videoId);
                } else {
                    // User needs to pay - show payment modal
                    this.showPaymentModal(videoId, result.price);
                }
            } else {
                this.showError('Unable to check video access: ' + result.message);
            }

        } catch (error) {
            console.error('Error checking video access:', error);
            this.showError('Network error. Please try again.');
        }
    }

    /**
     * Get video streaming URL after access verification
     */
    async playVideo(videoId) {
        try {
            const response = await fetch(`${this.apiUrl}/video-access/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userSession.id,
                    video_id: videoId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentVideo = result.data;
                this.showVideoPlayer(result.data);
            } else {
                this.showError('Access denied: ' + result.message);
                
                // If payment is required, show payment modal
                if (result.price) {
                    this.showPaymentModal(videoId, result.price);
                }
            }

        } catch (error) {
            console.error('Error verifying video access:', error);
            this.showError('Network error. Please try again.');
        }
    }

    /**
     * Show video player modal
     */
    showVideoPlayer(videoData) {
        // Remove any existing video modal
        const existingModal = document.getElementById('videoPlayerModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create video player modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'videoPlayerModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-white">
                        <h5 class="modal-title">${videoData.title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="ratio ratio-16x9">
                            ${this.getVideoPlayerHTML(videoData)}
                        </div>
                        <div class="p-3">
                            <h6>${videoData.title}</h6>
                            <p class="text-muted">${videoData.description || 'No description available'}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">You have access to this video</small>
                                <span class="badge bg-success">
                                    <i class="fas fa-check-circle me-1"></i>Access Granted
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        // Remove modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Get appropriate video player HTML based on video type
     */
    getVideoPlayerHTML(videoData) {
        if (videoData.video_type === 'youtube') {
            return `
                <iframe 
                    src="${videoData.video_url}?autoplay=1" 
                    title="${videoData.title}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
        } else if (videoData.video_type === 'local') {
            return `
                <video controls autoplay class="w-100">
                    <source src="${videoData.video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            return `
                <div class="d-flex align-items-center justify-content-center bg-light text-muted" style="height: 300px;">
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Video format not supported</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Show payment modal for video purchase
     */
    showPaymentModal(videoId, price) {
        // Check if Stripe payment system is available
        if (!window.stripePaymentManager) {
            this.showError('Payment system not available. Please contact support.');
            return;
        }

        // Remove any existing payment modal
        const existingModal = document.getElementById('videoPaymentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create payment modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'videoPaymentModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-credit-card me-2"></i>Purchase Video Access
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            You need to purchase access to watch this video. This is a one-time payment.
                        </div>
                        
                        <div class="text-center mb-4">
                            <h3 class="text-primary">$${price.toFixed(2)}</h3>
                            <p class="text-muted">One-time access fee</p>
                        </div>

                        <!-- Stripe Payment Form -->
                        <div id="stripe-payment-section">
                            <form id="video-payment-form">
                                <div class="mb-3">
                                    <label class="form-label">Card Information</label>
                                    <div id="card-element" class="form-control" style="height: 40px; padding: 10px;">
                                        <!-- Stripe Elements will create form elements here -->
                                    </div>
                                    <div id="card-errors" role="alert" class="text-danger mt-2"></div>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button type="submit" id="video-payment-btn" class="btn btn-primary btn-lg">
                                        <i class="fas fa-lock me-2"></i>Pay $${price.toFixed(2)} Securely
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt me-1"></i>
                                Payments are secured by Stripe
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        // Initialize Stripe payment for this specific video
        this.initializeVideoPayment(videoId, price);

        // Remove modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Initialize Stripe payment for video purchase
     */
    async initializeVideoPayment(videoId, price) {
        try {
            // Initialize Stripe payment manager with video-specific details
            await window.stripePaymentManager.initializePayment({
                amount: price * 100, // Convert to cents
                currency: 'usd',
                description: `Video Access Purchase`,
                metadata: {
                    video_id: videoId,
                    user_id: this.userSession.id,
                    type: 'video_purchase'
                }
            }, 'card-element', 'card-errors');

            // Set up payment completion handler
            const paymentForm = document.getElementById('video-payment-form');
            paymentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleVideoPayment(videoId, price);
            });

        } catch (error) {
            console.error('Error initializing video payment:', error);
            this.showError('Payment system error. Please try again.');
        }
    }

    /**
     * Handle video payment completion
     */
    async handleVideoPayment(videoId, price) {
        try {
            const result = await window.stripePaymentManager.processPayment();
            
            if (result.success) {
                // Payment successful - close payment modal and play video
                const paymentModal = bootstrap.Modal.getInstance(document.getElementById('videoPaymentModal'));
                paymentModal.hide();
                
                this.showSuccess('Payment successful! Loading your video...');
                
                // Wait a moment then play the video
                setTimeout(() => {
                    this.playVideo(videoId);
                }, 1000);
                
            } else {
                this.showError('Payment failed: ' + (result.error || 'Unknown error'));
            }

        } catch (error) {
            console.error('Error processing video payment:', error);
            this.showError('Payment processing error. Please try again.');
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        const config = window.videoHubConfig;
        const basePath = config ? config.basePath : '';
        
        // Save current page for return after login
        sessionStorage.setItem('loginReturnUrl', window.location.href);
        
        window.location.href = `${basePath}/auth/login.html`;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Use global notification manager if available
        if (window.notificationManager) {
            if (type === 'error') {
                window.notificationManager.showError(message);
            } else if (type === 'success') {
                window.notificationManager.showSuccess(message);
            } else {
                window.notificationManager.showInfo(message);
            }
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize video access manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoAccessManager = new VideoAccessManager();
});

// Export to global scope
window.VideoAccessManager = VideoAccessManager;