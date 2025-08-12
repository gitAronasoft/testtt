/**
 * VideoHub Payment Module
 * Handles payment processing, validation, and transaction management
 */

class PaymentManager {
    constructor() {
        this.currentTransaction = null;
        this.paymentMethods = [];
        this.init();
    }

    init() {
        this.loadPaymentMethods();
        this.bindEvents();
        this.setupDemoMode();
    }

    loadPaymentMethods() {
        // Mock payment methods
        this.paymentMethods = [
            {
                id: 'card',
                name: 'Credit/Debit Card',
                icon: 'fas fa-credit-card',
                enabled: true,
                processingFee: 0.99
            },
            {
                id: 'paypal',
                name: 'PayPal',
                icon: 'fab fa-paypal',
                enabled: true,
                processingFee: 0.50
            },
            {
                id: 'apple_pay',
                name: 'Apple Pay',
                icon: 'fab fa-apple',
                enabled: false,
                processingFee: 0.30
            },
            {
                id: 'google_pay',
                name: 'Google Pay',
                icon: 'fab fa-google',
                enabled: false,
                processingFee: 0.30
            }
        ];
    }

    bindEvents() {
        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'paymentMethod') {
                this.handlePaymentMethodChange(e.target.value);
            }
        });

        // Payment form submission
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'paymentForm') {
                e.preventDefault();
                this.processPayment();
            }
        });

        // Card input formatting
        document.addEventListener('input', (e) => {
            if (e.target.id === 'cardNumber') {
                this.formatCardNumber(e.target);
            }
            if (e.target.id === 'expiryDate') {
                this.formatExpiryDate(e.target);
            }
            if (e.target.id === 'cvv') {
                this.formatCVV(e.target);
            }
        });

        // Real-time validation
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('payment-input')) {
                this.validateField(e.target);
            }
        });
    }

    setupDemoMode() {
        // Add demo mode notification to payment forms
        const paymentForms = document.querySelectorAll('.payment-form, #paymentForm');
        paymentForms.forEach(form => {
            if (!form.querySelector('.demo-notice')) {
                const demoNotice = document.createElement('div');
                demoNotice.className = 'alert alert-info demo-notice';
                demoNotice.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Demo Mode:</strong> No real payments will be processed. Use test card: 4242 4242 4242 4242
                `;
                form.insertBefore(demoNotice, form.firstChild);
            }
        });
    }

    // Payment Processing Methods
    async processPayment() {
        const paymentData = this.collectPaymentData();
        
        if (!this.validatePaymentData(paymentData)) {
            return;
        }

        try {
            this.showPaymentProcessing();
            
            // Simulate payment processing
            const result = await this.simulatePaymentProcessing(paymentData);
            
            if (result.success) {
                this.handlePaymentSuccess(result);
            } else {
                this.handlePaymentError(result.error);
            }
            
        } catch (error) {
            this.handlePaymentError('Payment processing failed. Please try again.');
        } finally {
            this.hidePaymentProcessing();
        }
    }

    async simulatePaymentProcessing(paymentData) {
        // Simulate API call delay
        await this.delay(2000 + Math.random() * 2000);
        
        // Simulate different payment outcomes
        const random = Math.random();
        
        if (random < 0.85) {
            // Success (85% chance)
            return {
                success: true,
                transactionId: this.generateTransactionId(),
                amount: paymentData.amount,
                currency: paymentData.currency,
                paymentMethod: paymentData.paymentMethod,
                timestamp: new Date().toISOString()
            };
        } else if (random < 0.95) {
            // Decline (10% chance)
            return {
                success: false,
                error: 'Payment declined. Please check your payment details or try a different payment method.'
            };
        } else {
            // Error (5% chance)
            return {
                success: false,
                error: 'Payment processing error. Please try again later.'
            };
        }
    }

    collectPaymentData() {
        const form = document.getElementById('paymentForm') || document.querySelector('.payment-form');
        if (!form) return null;

        const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';
        const amount = parseFloat(form.querySelector('#amount')?.value || document.getElementById('purchasePrice')?.textContent || 0);
        
        const data = {
            paymentMethod: paymentMethod,
            amount: amount,
            currency: 'USD',
            processingFee: this.getProcessingFee(paymentMethod),
            total: amount + this.getProcessingFee(paymentMethod)
        };

        // Collect payment method specific data
        if (paymentMethod === 'card') {
            data.card = {
                number: form.querySelector('#cardNumber')?.value?.replace(/\s/g, '') || '',
                expiryDate: form.querySelector('#expiryDate')?.value || '',
                cvv: form.querySelector('#cvv')?.value || '',
                holderName: form.querySelector('#cardHolderName')?.value || ''
            };
        } else if (paymentMethod === 'paypal') {
            data.paypal = {
                email: form.querySelector('#paypalEmail')?.value || ''
            };
        }

        return data;
    }

    validatePaymentData(data) {
        if (!data) {
            this.showPaymentError('Please fill in all required fields.');
            return false;
        }

        if (!data.amount || data.amount <= 0) {
            this.showPaymentError('Invalid payment amount.');
            return false;
        }

        if (data.paymentMethod === 'card') {
            return this.validateCardData(data.card);
        } else if (data.paymentMethod === 'paypal') {
            return this.validatePayPalData(data.paypal);
        }

        return true;
    }

    validateCardData(card) {
        if (!this.validateCardNumber(card.number)) {
            this.showPaymentError('Please enter a valid card number.');
            return false;
        }

        if (!this.validateExpiryDate(card.expiryDate)) {
            this.showPaymentError('Please enter a valid expiry date.');
            return false;
        }

        if (!this.validateCVV(card.cvv)) {
            this.showPaymentError('Please enter a valid CVV.');
            return false;
        }

        if (!card.holderName.trim()) {
            this.showPaymentError('Please enter the cardholder name.');
            return false;
        }

        return true;
    }

    validatePayPalData(paypal) {
        if (!this.validateEmail(paypal.email)) {
            this.showPaymentError('Please enter a valid PayPal email address.');
            return false;
        }
        return true;
    }

    // Card Validation Methods
    validateCardNumber(cardNumber) {
        // Remove spaces and check if it's numeric
        const cleaned = cardNumber.replace(/\s/g, '');
        
        if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
            return false;
        }

        // Luhn algorithm
        return this.luhnCheck(cleaned);
    }

    luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    validateExpiryDate(expiryDate) {
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            return false;
        }

        const [month, year] = expiryDate.split('/').map(num => parseInt(num, 10));
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;

        if (month < 1 || month > 12) {
            return false;
        }

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            return false;
        }

        return true;
    }

    validateCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Card Type Detection
    detectCardType(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        
        const cardTypes = {
            visa: /^4/,
            mastercard: /^5[1-5]/,
            amex: /^3[47]/,
            discover: /^6(?:011|5)/,
            dinersclub: /^3[0689]/,
            jcb: /^35/
        };

        for (const [type, pattern] of Object.entries(cardTypes)) {
            if (pattern.test(cleaned)) {
                return type;
            }
        }

        return 'unknown';
    }

    // Input Formatting Methods
    formatCardNumber(input) {
        let value = input.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        const matches = value.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            input.value = parts.join(' ');
        } else {
            input.value = value;
        }

        // Update card type icon
        this.updateCardTypeIcon(input, value);
    }

    formatExpiryDate(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        
        input.value = value;
    }

    formatCVV(input) {
        input.value = input.value.replace(/\D/g, '').substring(0, 4);
    }

    updateCardTypeIcon(input, cardNumber) {
        const cardType = this.detectCardType(cardNumber);
        const iconElement = input.parentNode.querySelector('.card-type-icon');
        
        if (iconElement) {
            const icons = {
                visa: 'fab fa-cc-visa',
                mastercard: 'fab fa-cc-mastercard',
                amex: 'fab fa-cc-amex',
                discover: 'fab fa-cc-discover',
                dinersclub: 'fab fa-cc-diners-club',
                jcb: 'fab fa-cc-jcb',
                unknown: 'fas fa-credit-card'
            };
            
            iconElement.className = `card-type-icon ${icons[cardType] || icons.unknown}`;
        }
    }

    // Payment Method Management
    handlePaymentMethodChange(method) {
        this.showPaymentMethodForm(method);
        this.updatePaymentSummary(method);
    }

    showPaymentMethodForm(method) {
        // Hide all payment forms
        const forms = document.querySelectorAll('.payment-method-form');
        forms.forEach(form => form.style.display = 'none');

        // Show selected payment method form
        const selectedForm = document.getElementById(`${method}Form`);
        if (selectedForm) {
            selectedForm.style.display = 'block';
        }
    }

    updatePaymentSummary(method) {
        const processingFee = this.getProcessingFee(method);
        const amount = parseFloat(document.getElementById('purchasePrice')?.textContent || 0);
        const total = amount + processingFee;

        const processingFeeElement = document.querySelector('.processing-fee');
        const totalElement = document.querySelector('.total-amount');

        if (processingFeeElement) {
            processingFeeElement.textContent = `$${processingFee.toFixed(2)}`;
        }

        if (totalElement) {
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    }

    getProcessingFee(method) {
        const paymentMethod = this.paymentMethods.find(pm => pm.id === method);
        return paymentMethod ? paymentMethod.processingFee : 0.99;
    }

    // UI State Management
    showPaymentProcessing() {
        const submitButton = document.querySelector('#paymentForm button[type="submit"], .payment-submit');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing...
            `;
        }

        // Show processing overlay
        this.showProcessingOverlay();
    }

    hidePaymentProcessing() {
        const submitButton = document.querySelector('#paymentForm button[type="submit"], .payment-submit');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <i class="fas fa-credit-card me-2"></i>Complete Payment
            `;
        }

        this.hideProcessingOverlay();
    }

    showProcessingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'paymentProcessingOverlay';
        overlay.className = 'payment-processing-overlay';
        overlay.innerHTML = `
            <div class="processing-content">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Processing...</span>
                </div>
                <h5>Processing Payment</h5>
                <p class="text-muted">Please do not refresh or close this page</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideProcessingOverlay() {
        const overlay = document.getElementById('paymentProcessingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Payment Result Handling
    handlePaymentSuccess(result) {
        this.currentTransaction = result;
        
        // Store transaction for receipt
        this.storeTransaction(result);
        
        // Show success message
        this.showPaymentSuccess(result);
        
        // Trigger success callback if available
        if (window.onPaymentSuccess) {
            window.onPaymentSuccess(result);
        }
        
        // Redirect or update UI
        setTimeout(() => {
            this.redirectAfterPayment(result);
        }, 3000);
    }

    handlePaymentError(error) {
        this.showPaymentError(error);
        
        // Trigger error callback if available
        if (window.onPaymentError) {
            window.onPaymentError(error);
        }
    }

    showPaymentSuccess(result) {
        window.commonUtils?.showToast(`Payment successful! Transaction ID: ${result.transactionId}`, 'success', 8000);
        
        // Update modal content if in modal
        const modal = document.querySelector('.modal.show');
        if (modal) {
            this.showSuccessInModal(modal, result);
        }
    }

    showSuccessInModal(modal, result) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
                    <h4 class="text-success">Payment Successful!</h4>
                    <p class="text-muted mb-4">Your purchase has been completed successfully.</p>
                    <div class="card bg-light">
                        <div class="card-body">
                            <div class="row text-start">
                                <div class="col-6"><strong>Transaction ID:</strong></div>
                                <div class="col-6">${result.transactionId}</div>
                                <div class="col-6"><strong>Amount:</strong></div>
                                <div class="col-6">$${result.amount.toFixed(2)}</div>
                                <div class="col-6"><strong>Date:</strong></div>
                                <div class="col-6">${new Date(result.timestamp).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-primary" onclick="window.location.reload()">
                    Continue
                </button>
            `;
        }
    }

    showPaymentError(error) {
        window.commonUtils?.showToast(error, 'danger', 8000);
    }

    // Transaction Management
    storeTransaction(transaction) {
        const transactions = this.getStoredTransactions();
        transactions.push(transaction);
        localStorage.setItem('videohub_transactions', JSON.stringify(transactions));
    }

    getStoredTransactions() {
        const stored = localStorage.getItem('videohub_transactions');
        return stored ? JSON.parse(stored) : [];
    }

    getTransaction(transactionId) {
        const transactions = this.getStoredTransactions();
        return transactions.find(t => t.transactionId === transactionId);
    }

    redirectAfterPayment(result) {
        // Default redirect logic
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('browse.html')) {
            // Refresh browse page to update purchased status
            window.location.reload();
        } else if (currentPage.includes('purchases.html')) {
            // Refresh purchases page
            window.location.reload();
        } else {
            // Go to purchases page
            window.location.href = 'purchases.html';
        }
    }

    // Field Validation
    validateField(field) {
        const fieldType = field.id || field.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldType) {
            case 'cardNumber':
                isValid = this.validateCardNumber(field.value);
                errorMessage = 'Please enter a valid card number';
                break;
            case 'expiryDate':
                isValid = this.validateExpiryDate(field.value);
                errorMessage = 'Please enter a valid expiry date (MM/YY)';
                break;
            case 'cvv':
                isValid = this.validateCVV(field.value);
                errorMessage = 'Please enter a valid CVV';
                break;
            case 'cardHolderName':
                isValid = field.value.trim().length >= 2;
                errorMessage = 'Please enter the cardholder name';
                break;
            case 'paypalEmail':
                isValid = this.validateEmail(field.value);
                errorMessage = 'Please enter a valid email address';
                break;
        }

        this.updateFieldValidation(field, isValid, errorMessage);
        return isValid;
    }

    updateFieldValidation(field, isValid, errorMessage) {
        field.classList.remove('is-valid', 'is-invalid');
        
        // Remove existing feedback
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        if (field.value.trim() === '') {
            // Don't show validation for empty fields unless they've been focused
            return;
        }

        if (isValid) {
            field.classList.add('is-valid');
        } else {
            field.classList.add('is-invalid');
            
            // Add error feedback
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = errorMessage;
            field.parentNode.appendChild(feedback);
        }
    }

    // Utility Methods
    generateTransactionId() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 5).toUpperCase();
        return `TXN_${timestamp}_${random}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API Methods
    initializePayment(options = {}) {
        this.currentTransaction = null;
        
        // Set up payment form with options
        if (options.amount) {
            const amountElement = document.getElementById('amount');
            if (amountElement) {
                amountElement.value = options.amount;
            }
        }

        if (options.currency) {
            this.currency = options.currency;
        }

        // Initialize default payment method
        const defaultMethod = options.defaultMethod || 'card';
        const methodRadio = document.querySelector(`input[name="paymentMethod"][value="${defaultMethod}"]`);
        if (methodRadio) {
            methodRadio.checked = true;
            this.handlePaymentMethodChange(defaultMethod);
        }
    }

    getPaymentMethods() {
        return this.paymentMethods.filter(method => method.enabled);
    }

    setPaymentCallback(onSuccess, onError) {
        window.onPaymentSuccess = onSuccess;
        window.onPaymentError = onError;
    }
}

// CSS for payment processing overlay
const paymentStyles = `
    .payment-processing-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .processing-content {
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        text-align: center;
        max-width: 300px;
    }

    .card-type-icon {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.2rem;
        color: #6c757d;
    }

    .payment-method-form {
        display: none;
        margin-top: 1rem;
    }

    .payment-method-form.active {
        display: block;
    }

    .payment-input {
        position: relative;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = paymentStyles;
document.head.appendChild(styleSheet);

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.paymentManager = new PaymentManager();
});

// Export for other modules
window.PaymentManager = PaymentManager;
