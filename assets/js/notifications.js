/**
 * VideoHub Notification System
 * Provides toast notifications, loading states, and form validation
 */

class NotificationManager {
    constructor() {
        this.init();
    }

    init() {
        this.createToastContainer();
        this.setupGlobalErrorHandling();
    }

    createToastContainer() {
        // Check if toast container already exists
        if (document.getElementById('toast-container')) return;

        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    showToast(message, type = 'info', duration = 4000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        // Set toast styling based on type
        const typeClasses = {
            success: 'text-bg-success',
            error: 'text-bg-danger',
            warning: 'text-bg-warning',
            info: 'text-bg-primary'
        };
        toast.classList.add(typeClasses[type] || typeClasses.info);

        // Set toast content
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body fw-medium">
                    <i class="fas ${this.getIconForType(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Add toast to container
        toastContainer.appendChild(toast);

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: duration > 0,
            delay: duration
        });
        
        bsToast.show();

        // Remove toast from DOM after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });

        return toastId;
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    showSuccess(message) {
        return this.showToast(message, 'success');
    }

    showError(message) {
        return this.showToast(message, 'error', 6000);
    }

    showWarning(message) {
        return this.showToast(message, 'warning', 5000);
    }

    showInfo(message) {
        return this.showToast(message, 'info');
    }

    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An unexpected error occurred. Please try again.');
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            // Only show user-friendly errors for non-development environments
            if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
                this.showError('Something went wrong. Please refresh the page and try again.');
            }
        });
    }
}

/**
 * Button Loading Manager
 * Handles button loading states with spinners
 */
class ButtonLoader {
    static setLoading(button, loadingText = 'Processing...') {
        if (!button) return;

        // Store original content and state
        button.dataset.originalText = button.innerHTML;
        button.dataset.originalDisabled = button.disabled;

        // Set loading state
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${loadingText}`;
    }

    static removeLoading(button) {
        if (!button) return;

        // Restore original content and state
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        
        if (button.dataset.originalDisabled === 'false') {
            button.disabled = false;
        }

        // Clean up data attributes
        delete button.dataset.originalText;
        delete button.dataset.originalDisabled;
    }
}

/**
 * Form Validation Manager
 * Provides comprehensive form validation with Bootstrap styling
 */
class FormValidator {
    constructor(form) {
        this.form = form;
        this.rules = {};
        this.init();
    }

    init() {
        if (!this.form) return;

        // Add Bootstrap validation classes
        this.form.classList.add('needs-validation');
        this.form.noValidate = true;

        // Setup real-time validation
        this.setupRealTimeValidation();
    }

    addRule(fieldName, rules) {
        this.rules[fieldName] = rules;
        return this;
    }

    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            // Clear validation on input (for better UX)
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    this.clearFieldValidation(input);
                }
            });
        });
    }

    validateField(field) {
        const fieldName = field.name || field.id;
        const rules = this.rules[fieldName];
        
        if (!rules) {
            // Basic HTML5 validation
            return this.validateHtml5(field);
        }

        // Custom validation rules
        for (const rule of rules) {
            const isValid = rule.validator(field.value, field);
            if (!isValid) {
                this.showFieldError(field, rule.message);
                return false;
            }
        }

        this.showFieldValid(field);
        return true;
    }

    validateHtml5(field) {
        if (field.checkValidity()) {
            this.showFieldValid(field);
            return true;
        } else {
            this.showFieldError(field, field.validationMessage);
            return false;
        }
    }

    showFieldError(field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');

        // Find or create feedback element
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            field.parentNode.appendChild(feedback);
        }
        feedback.textContent = message;
    }

    showFieldValid(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');

        // Remove error feedback
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    clearFieldValidation(field) {
        field.classList.remove('is-valid', 'is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    validateForm() {
        let isValid = true;
        const inputs = this.form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    reset() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            this.clearFieldValidation(input);
        });
    }

    // Common validation rules
    static rules = {
        required: (value) => value && value.toString().trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        minLength: (min) => (value) => value && value.length >= min,
        maxLength: (max) => (value) => !value || value.length <= max,
        numeric: (value) => !value || /^\d+$/.test(value),
        decimal: (value) => !value || /^\d*\.?\d+$/.test(value),
        password: (value) => value && value.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value),
        match: (matchField) => (value, field) => {
            const matchElement = field.form.querySelector(`[name="${matchField}"], #${matchField}`);
            return matchElement && value === matchElement.value;
        }
    };
}

/**
 * Loading Overlay Manager
 * Provides full-screen loading overlays
 */
class LoadingOverlay {
    static show(message = 'Loading...') {
        // Remove existing overlay
        this.hide();

        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        overlay.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            z-index: 99999;
            backdrop-filter: blur(2px);
        `;

        overlay.innerHTML = `
            <div class="text-center text-white">
                <div class="spinner-border mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="h5">${message}</div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    static hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
    
    // Make utilities globally available
    window.ButtonLoader = ButtonLoader;
    window.FormValidator = FormValidator;
    window.LoadingOverlay = LoadingOverlay;
    
    // Legacy compatibility
    window.commonUtils = {
        showToast: (message, type) => window.notificationManager.showToast(message, type),
        showSuccess: (message) => window.notificationManager.showSuccess(message),
        showError: (message) => window.notificationManager.showError(message),
        showWarning: (message) => window.notificationManager.showWarning(message),
        showInfo: (message) => window.notificationManager.showInfo(message)
    };
});