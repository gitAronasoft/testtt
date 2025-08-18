
/**
 * VideoHub Stripe Payment Module
 * Handles real Stripe payment processing for video purchases - Stripe ONLY
 */

class StripePaymentManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.cardElement = null;
        this.currentPaymentIntent = null;
        this.publishableKey = null;
        this.isInitialized = false;
        this.currentModal = null;
        this.currentModalId = null;
        this.cardComplete = false; // Track card completion state
        this.init();
    }

    async init() {
        try {
            await this.loadStripeKey();
            this.initializeStripe();
            this.bindEvents();
            this.isInitialized = true;
            console.log('Stripe Payment Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Stripe:', error);
            this.showError('Payment system initialization failed. Please refresh the page.');
        }
    }

    async loadStripeKey() {
        try {
            const response = await fetch(this.getApiUrl('/api/config/stripe-key'));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to load Stripe configuration`);
            }
            
            const data = await response.json();
            if (!data.success || !data.publishable_key) {
                throw new Error('Invalid Stripe configuration response');
            }
            
            this.publishableKey = data.publishable_key;
        } catch (error) {
            console.error('Could not load Stripe key from API:', error);
            throw new Error('Unable to load payment configuration');
        }
    }

    initializeStripe() {
        if (!this.publishableKey) {
            throw new Error('Stripe publishable key not found');
        }

        try {
            this.stripe = Stripe(this.publishableKey);
            this.elements = this.stripe.elements();
            console.log('Stripe initialized successfully');
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            throw new Error('Failed to initialize Stripe');
        }
    }

    bindEvents() {
        // Handle purchase button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('purchase-video-btn')) {
                e.preventDefault();
                this.handlePurchaseClick(e.target);
            }
        });

        // Handle payment form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id && e.target.id.startsWith('stripe-payment-form')) {
                e.preventDefault();
                this.processStripePayment(e.target);
            }
        });
    }

    async handlePurchaseClick(button) {
        if (!this.isInitialized) {
            this.showError('Payment system is not ready. Please refresh the page.');
            return;
        }

        const videoId = button.dataset.videoId;
        const videoTitle = button.dataset.videoTitle;
        const videoPrice = parseFloat(button.dataset.videoPrice);

        if (!videoId || isNaN(videoPrice) || videoPrice < 0) {
            this.showError('Invalid video information');
            return;
        }

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                this.showError('Please log in to purchase videos');
                return;
            }

            this.showStripePaymentModal(videoId, videoTitle, videoPrice);
        } catch (error) {
            console.error('Error initiating purchase:', error);
            this.showError('Failed to start purchase process');
        }
    }

    showStripePaymentModal(videoId, videoTitle, videoPrice) {
        // Clean up any existing modals first
        this.cleanupExistingModals();

        // Create unique IDs to prevent conflicts
        const timestamp = Date.now();
        const modalId = `stripePaymentModal_${timestamp}`;
        const formId = `stripe-payment-form-${timestamp}`;
        const cardElementId = `card-element-${timestamp}`;
        const cardErrorsId = `card-errors-${timestamp}`;
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">
                                <i class="fas fa-credit-card me-2"></i>Purchase Video
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3 p-3 bg-light rounded">
                                <h6 class="mb-2">${this.escapeHtml(videoTitle)}</h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-muted">One-time purchase</span>
                                    <span class="h4 text-primary mb-0">$${videoPrice.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <form id="${formId}" novalidate>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Card Details</label>
                                    <div id="${cardElementId}" class="form-control" style="height: 45px; padding: 10px; border: 2px solid #dee2e6; border-radius: 8px;"></div>
                                    <div id="${cardErrorsId}" class="text-danger mt-2 small" style="display: none;"></div>
                                </div>
                                
                                <input type="hidden" class="video-id-input" value="${videoId}">
                                <input type="hidden" class="video-price-input" value="${videoPrice}">
                                
                                <button type="submit" class="submit-payment-btn btn btn-primary w-100 py-2" disabled>
                                    <span class="spinner-border spinner-border-sm me-2" style="display: none;"></span>
                                    <span class="button-text">Pay $${videoPrice.toFixed(2)}</span>
                                </button>
                            </form>
                            
                            <div class="mt-3 text-center">
                                <small class="text-muted">
                                    <i class="fas fa-shield-alt me-1"></i>
                                    Secured by Stripe • SSL Encrypted
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        
        // Store current modal reference
        this.currentModal = modal;
        this.currentModalId = modalId;
        
        // Clean up when modal is hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
            this.cleanupCurrentModal();
        });

        // Show modal with animation
        modal.show();

        // Mount card element after modal is fully shown
        modalElement.addEventListener('shown.bs.modal', () => {
            this.mountCardElement(modalId, cardElementId, cardErrorsId);
        }, { once: true });
    }

    cleanupExistingModals() {
        // Remove all existing payment modals
        const existingModals = document.querySelectorAll('[id*="stripePaymentModal"]');
        existingModals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
            modal.remove();
        });
        
        // Remove any modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Clean up Stripe elements completely
        this.destroyCardElement();
        
        // Reset body styles
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
    }

    destroyCardElement() {
        // Unmount existing card element
        if (this.cardElement) {
            try {
                this.cardElement.unmount();
                this.cardElement.destroy();
            } catch (e) {
                // Element might not be mounted or already destroyed, ignore error
            }
            this.cardElement = null;
            this.cardComplete = false; // Reset completion state
        }
        
        // Reset elements instance to allow fresh card creation
        if (this.stripe) {
            this.elements = this.stripe.elements();
        }
    }

    cleanupCurrentModal() {
        if (this.currentModalId) {
            const modalEl = document.getElementById(this.currentModalId);
            if (modalEl) {
                modalEl.remove();
            }
        }
        
        // Clean up Stripe elements
        this.destroyCardElement();
        
        this.currentModal = null;
        this.currentModalId = null;
    }

    mountCardElement(modalId, cardElementId, cardErrorsId) {
        const cardElementContainer = document.getElementById(cardElementId);
        const cardErrors = document.getElementById(cardErrorsId);
        const submitButton = document.querySelector(`#${modalId} .submit-payment-btn`);

        if (!cardElementContainer) {
            console.error('Card element container not found');
            this.showError('Payment form not ready. Please try again.');
            return;
        }

        if (!this.stripe) {
            console.error('Stripe not properly initialized');
            this.showError('Payment system not available. Please refresh the page.');
            return;
        }

        try {
            // Reset card completion state for new element
            this.cardComplete = false;
            
            // Create fresh elements instance for this modal to avoid conflicts
            this.elements = this.stripe.elements();
            
            // Create a fresh card element for this modal
            const style = {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                },
            };

            this.cardElement = this.elements.create('card', { 
                style: style,
                hidePostalCode: true
            });

            // Mount the card element
            this.cardElement.mount(cardElementContainer);

            // Handle real-time validation
            this.cardElement.on('change', (event) => {
                // Update card completion state
                this.cardComplete = event.complete && !event.error;
                
                if (event.error) {
                    if (cardErrors) {
                        cardErrors.textContent = event.error.message;
                        cardErrors.style.display = 'block';
                    }
                    if (submitButton) {
                        submitButton.disabled = true;
                    }
                } else {
                    if (cardErrors) {
                        cardErrors.style.display = 'none';
                    }
                    if (submitButton) {
                        // Enable button only if card is complete and valid
                        submitButton.disabled = event.empty || !event.complete;
                    }
                }
            });

            // Handle card focus
            this.cardElement.on('focus', () => {
                cardElementContainer.style.borderColor = '#007bff';
                cardElementContainer.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
            });

            this.cardElement.on('blur', () => {
                cardElementContainer.style.borderColor = '#dee2e6';
                cardElementContainer.style.boxShadow = 'none';
            });

            console.log('Card element mounted successfully');
        } catch (error) {
            console.error('Error mounting card element:', error);
            this.showError('Failed to load payment form. Please refresh the page and try again.');
        }
    }

    async processStripePayment(form) {
        const videoId = form.querySelector('.video-id-input').value;
        const videoPrice = parseFloat(form.querySelector('.video-price-input').value);
        const submitButton = form.querySelector('.submit-payment-btn');
        const spinner = submitButton.querySelector('.spinner-border');
        const buttonText = submitButton.querySelector('.button-text');
        
        // Validate card element before processing
        if (!this.cardElement) {
            this.showError('Payment form not ready. Please refresh the page and try again.');
            return;
        }

        // Check if card is complete using tracked state
        if (!this.cardComplete) {
            this.showError('Please complete your card information before submitting.');
            return;
        }
        
        // Disable button and show loading
        submitButton.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Processing...';

        let processingNotification = null;

        try {
            // Create payment intent
            processingNotification = this.showProcessingNotification('Creating secure payment...');
            const paymentIntentResponse = await this.createPaymentIntent(videoId, videoPrice);
            
            if (!paymentIntentResponse.success) {
                throw new Error(paymentIntentResponse.message || 'Failed to create payment');
            }

            // Update notification
            this.hideProcessingNotification(processingNotification);
            processingNotification = this.showProcessingNotification('Processing your payment...');

            // Confirm payment with Stripe
            const {error, paymentIntent} = await this.stripe.confirmCardPayment(
                paymentIntentResponse.client_secret,
                {
                    payment_method: {
                        card: this.cardElement,
                    }
                }
            );

            if (error) {
                // Handle specific card errors
                if (error.type === 'card_error' || error.type === 'validation_error') {
                    throw new Error(error.message);
                } else {
                    throw new Error('Payment processing failed. Please try again.');
                }
            }

            if (paymentIntent.status === 'succeeded') {
                // Update notification
                this.hideProcessingNotification(processingNotification);
                processingNotification = this.showProcessingNotification('Finalizing your purchase...');

                // Confirm payment on backend
                await this.confirmPayment(paymentIntent.id, videoId);
                
                // Hide processing notification and show success
                this.hideProcessingNotification(processingNotification);
                this.showSuccess('🎉 Payment successful! You can now watch the video.');
                
                if (this.currentModal) {
                    this.currentModal.hide();
                }
                
                // Reload page after short delay to show updated purchase status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error('Payment was not completed successfully');
            }

        } catch (error) {
            console.error('Payment failed:', error);
            
            // Hide processing notification
            if (processingNotification) {
                this.hideProcessingNotification(processingNotification);
            }
            
            this.showError(this.getErrorMessage(error.message));
        } finally {
            // Reset button state
            submitButton.disabled = false;
            spinner.style.display = 'none';
            buttonText.textContent = `Pay $${videoPrice.toFixed(2)}`;
        }
    }

    async createPaymentIntent(videoId, videoPrice) {
        const userId = this.getCurrentUserId();
        
        try {
            const response = await fetch(this.getApiUrl('/payments/create-payment-intent'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_id: videoId,
                    user_id: userId,
                    amount: videoPrice
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Payment request failed`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw new Error('Unable to process payment request');
        }
    }

    async confirmPayment(paymentIntentId, videoId) {
        const userId = this.getCurrentUserId();
        
        try {
            const response = await fetch(this.getApiUrl('/payments/confirm-payment'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId,
                    video_id: videoId,
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Payment confirmation failed`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error confirming payment:', error);
            throw new Error('Payment confirmation failed');
        }
    }

    getCurrentUserId() {
        const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
        return userSession.id || userSession.userId;
    }

    getApiUrl(endpoint) {
        const config = window.videoHubConfig;
        if (config) {
            return config.getUrl(`/api${endpoint}`);
        }
        // Fallback - use the same base path detection as other API calls
        return `/video-platform/api${endpoint}`;
    }

    getErrorMessage(errorMessage) {
        const errorMap = {
            'Your card was declined.': '💳 Your card was declined. Please try a different payment method or contact your bank.',
            'Your card has insufficient funds.': '💰 Insufficient funds. Please use a different card or add funds to your account.',
            'Your card has expired.': '📅 Your card has expired. Please use a different payment method.',
            'Your card number is incorrect.': '🔢 Please check your card number and try again.',
            'Your card number is incomplete.': '🔢 Please complete your card number.',
            'Your card\'s expiration date is incomplete.': '📅 Please complete your card\'s expiration date.',
            'Your card\'s security code is incomplete.': '🔐 Please complete your card\'s security code (CVV).',
            'Your card\'s security code is incorrect.': '🔐 Please check your security code (CVV) and try again.',
            'Your card\'s expiration date is incorrect.': '📅 Please check your card\'s expiration date and try again.',
            'Your card does not support this type of purchase.': '🚫 This card cannot be used for online purchases. Please try a different card.',
            'Your card was not authorized.': '⚠️ Your card was not authorized. Please contact your bank or try a different card.',
            'An error occurred while processing your card.': '❌ There was a problem processing your card. Please try again.',
            'Your card number is not a valid credit card number.': '💳 Please enter a valid card number.',
            'Your card\'s security code is invalid.': '🔐 Please enter a valid security code (CVV).',
            'Processing error': '⚙️ There was a problem processing your payment. Please try again.',
            'Network communication with Stripe failed': '🌐 Connection error. Please check your internet and try again.',
            'Payment processing error': '💫 Payment processing temporarily unavailable. Please try again in a moment.'
        };

        // Check for partial matches for more specific error handling
        const lowerErrorMessage = errorMessage.toLowerCase();
        
        if (lowerErrorMessage.includes('network') || lowerErrorMessage.includes('connection')) {
            return '🌐 Connection error. Please check your internet connection and try again.';
        }
        
        if (lowerErrorMessage.includes('timeout')) {
            return '⏱️ Request timed out. Please try again.';
        }
        
        if (lowerErrorMessage.includes('rate limit')) {
            return '⚡ Too many attempts. Please wait a moment and try again.';
        }

        return errorMap[errorMessage] || `💫 ${errorMessage || 'Payment failed. Please check your card details and try again.'}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showProcessingNotification(message) {
        if (window.notificationManager) {
            return window.notificationManager.processing(message);
        } else if (window.commonUtils && window.commonUtils.showNotification) {
            return window.commonUtils.showNotification(message, 'info', 0);
        }
    }

    showError(message) {
        if (window.notificationManager) {
            return window.notificationManager.error(message);
        } else if (window.commonUtils && window.commonUtils.showNotification) {
            return window.commonUtils.showNotification(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }

    showSuccess(message) {
        if (window.notificationManager) {
            return window.notificationManager.success(message);
        } else if (window.commonUtils && window.commonUtils.showNotification) {
            return window.commonUtils.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    hideProcessingNotification(notification) {
        if (notification && window.notificationManager) {
            window.notificationManager.remove(notification);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.Stripe) {
        window.stripePaymentManager = new StripePaymentManager();
    } else {
        console.error('Stripe.js not loaded - Payment functionality unavailable');
    }
});

// Global function for backward compatibility
window.purchaseVideo = function(videoId, videoTitle, videoPrice) {
    if (window.stripePaymentManager && window.stripePaymentManager.isInitialized) {
        window.stripePaymentManager.showStripePaymentModal(videoId, videoTitle, videoPrice);
    } else {
        console.error('Stripe payment manager not initialized');
        if (window.commonUtils && window.commonUtils.showNotification) {
            window.commonUtils.showNotification('Payment system not ready. Please refresh the page.', 'error');
        } else {
            alert('Payment system not ready. Please refresh the page.');
        }
    }
};
