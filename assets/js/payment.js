/**
 * Payment functionality for VideoShare platform
 * Handles video purchase flow with dummy payment integration
 */

class PaymentManager {
    constructor() {
        this.initializePaymentModal();
    }

    /**
     * Initialize payment modal
     */
    initializePaymentModal() {
        // Create payment modal if it doesn't exist
        if (!document.getElementById('paymentModal')) {
            const modalHtml = `
                <div class="modal fade" id="paymentModal" tabindex="-1" aria-labelledby="paymentModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="paymentModalLabel">
                                    <i class="fas fa-credit-card me-2"></i>Purchase Video
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div id="paymentContent">
                                    <!-- Payment content will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }

    /**
     * Show payment modal for video purchase
     */
    async showPaymentModal(videoId, videoTitle, price) {
        const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        const content = document.getElementById('paymentContent');
        
        // Set modal title
        document.getElementById('paymentModalLabel').innerHTML = 
            `<i class="fas fa-credit-card me-2"></i>Purchase: ${videoTitle}`;
        
        // Load payment form
        content.innerHTML = this.getPaymentFormHtml(videoId, videoTitle, price);
        
        // Setup form handlers
        this.setupPaymentForm(videoId);
        
        modal.show();
    }

    /**
     * Get payment form HTML
     */
    getPaymentFormHtml(videoId, videoTitle, price) {
        return `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-8">
                        <div class="card border-0 shadow-sm mb-3">
                            <div class="card-body">
                                <h6 class="card-title">Payment Details</h6>
                                <form id="paymentForm">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="firstName" class="form-label">First Name</label>
                                            <input type="text" class="form-control" id="firstName" value="John" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="lastName" class="form-label">Last Name</label>
                                            <input type="text" class="form-control" id="lastName" value="Doe" required>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email Address</label>
                                        <input type="email" class="form-control" id="email" value="john.doe@example.com" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="cardNumber" class="form-label">Card Number</label>
                                        <input type="text" class="form-control" id="cardNumber" placeholder="4242 4242 4242 4242" 
                                               value="4242 4242 4242 4242" maxlength="19" required>
                                        <div class="form-text">Use 4242 4242 4242 4242 for demo payments</div>
                                    </div>
                                    
                                    <div class="row mb-3">
                                        <div class="col-md-4">
                                            <label for="expiryMonth" class="form-label">Month</label>
                                            <select class="form-select" id="expiryMonth" required>
                                                <option value="12" selected>12</option>
                                                ${Array.from({length: 12}, (_, i) => 
                                                    `<option value="${(i+1).toString().padStart(2, '0')}">${(i+1).toString().padStart(2, '0')}</option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label for="expiryYear" class="form-label">Year</label>
                                            <select class="form-select" id="expiryYear" required>
                                                <option value="2028" selected>2028</option>
                                                ${Array.from({length: 10}, (_, i) => 
                                                    `<option value="${new Date().getFullYear() + i}">${new Date().getFullYear() + i}</option>`
                                                ).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label for="cvc" class="form-label">CVC</label>
                                            <input type="text" class="form-control" id="cvc" placeholder="123" value="123" maxlength="4" required>
                                        </div>
                                    </div>
                                    
                                    <div class="d-grid gap-2">
                                        <button type="submit" class="btn btn-primary btn-lg">
                                            <i class="fas fa-lock me-2"></i>Pay $${price}
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                            Cancel
                                        </button>
                                    </div>
                                    
                                    <div id="paymentStatus" class="mt-3"></div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card border-0 bg-light">
                            <div class="card-body">
                                <h6 class="card-title">Order Summary</h6>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Video Access:</span>
                                    <strong>${videoTitle}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Price:</span>
                                    <span>$${price}</span>
                                </div>
                                <hr>
                                <div class="d-flex justify-content-between">
                                    <strong>Total:</strong>
                                    <strong class="text-primary">$${price}</strong>
                                </div>
                                
                                <div class="mt-3 p-3 bg-white rounded">
                                    <div class="text-center">
                                        <i class="fas fa-shield-alt text-success fa-2x mb-2"></i>
                                        <p class="small mb-0">Secure 256-bit SSL encryption</p>
                                    </div>
                                </div>
                                
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <i class="fas fa-info-circle me-1"></i>
                                        This is a demo payment system. No real charges will be made.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup payment form handlers
     */
    setupPaymentForm(videoId) {
        const form = document.getElementById('paymentForm');
        const cardNumberInput = document.getElementById('cardNumber');
        
        // Format card number input
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            value = value.substring(0, 16);
            value = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = value;
        });

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processDummyPayment(videoId);
        });
    }

    /**
     * Process dummy payment
     */
    async processDummyPayment(videoId) {
        const statusDiv = document.getElementById('paymentStatus');
        const submitButton = document.querySelector('#paymentForm button[type="submit"]');
        
        // Show processing state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        
        statusDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-credit-card me-2"></i>Processing payment...
            </div>
        `;

        try {
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Call purchase API
            const response = await API.purchaseVideo(videoId);
            
            if (response.success) {
                statusDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-2"></i>Payment successful! You now have access to this video.
                    </div>
                `;
                
                // Close modal after delay
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                    
                    // Refresh the page or update video access
                    this.handleSuccessfulPurchase(videoId);
                }, 1500);
                
            } else {
                throw new Error(response.message || 'Payment failed');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle me-2"></i>Payment failed: ${error.message}
                </div>
            `;
            
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-lock me-2"></i>Try Again';
        }
    }

    /**
     * Handle successful purchase
     */
    handleSuccessfulPurchase(videoId) {
        // Update UI to show video is now accessible
        const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoCard) {
            const button = videoCard.querySelector('.purchase-btn, .watch-btn');
            if (button) {
                button.className = 'btn btn-success btn-sm';
                button.innerHTML = '<i class="fas fa-play me-1"></i>Watch Now';
                button.onclick = () => this.playVideo(videoId);
            }
        }
        
        // Show success toast
        this.showSuccessToast('Video purchased successfully! You can now watch it anytime.');
    }

    /**
     * Show success toast
     */
    showSuccessToast(message) {
        // Create toast element if it doesn't exist
        if (!document.getElementById('successToast')) {
            const toastHtml = `
                <div class="toast-container position-fixed bottom-0 end-0 p-3">
                    <div id="successToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="toast-header">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            <strong class="me-auto">Success</strong>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                        <div class="toast-body"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', toastHtml);
        }
        
        const toast = document.getElementById('successToast');
        const toastBody = toast.querySelector('.toast-body');
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    /**
     * Play video (placeholder for future video player)
     */
    playVideo(videoId) {
        // For now, just show an alert
        alert(`Playing video ${videoId}. Video player integration coming soon!`);
    }
}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.paymentManager = new PaymentManager();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}