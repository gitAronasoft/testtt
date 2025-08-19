/**
 * VideoHub Notification System
 * Provides toast notifications, loading states, and form validation
 */

class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            this.container.innerHTML = `
                <style>
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 400px;
                }

                .notification {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    margin-bottom: 12px;
                    padding: 16px 20px;
                    border-left: 4px solid;
                    display: flex;
                    align-items: center;
                    animation: slideIn 0.3s ease-out;
                    position: relative;
                    overflow: hidden;
                }

                .notification.success {
                    border-left-color: #28a745;
                    background: #f8fff9;
                }

                .notification.error {
                    border-left-color: #dc3545;
                    background: #fff8f8;
                }

                .notification.info {
                    border-left-color: #007bff;
                    background: #f8fbff;
                }

                .notification.warning {
                    border-left-color: #ffc107;
                    background: #fffdf8;
                }

                .notification-icon {
                    margin-right: 12px;
                    font-size: 18px;
                }

                .notification.success .notification-icon {
                    color: #28a745;
                }

                .notification.error .notification-icon {
                    color: #dc3545;
                }

                .notification.info .notification-icon {
                    color: #007bff;
                }

                .notification.warning .notification-icon {
                    color: #ffc107;
                }

                .notification-content {
                    flex: 1;
                    font-weight: 500;
                    color: #333;
                    line-height: 1.4;
                }

                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #999;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 12px;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notification-close:hover {
                    color: #666;
                }

                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: rgba(0,0,0,0.1);
                    animation: progress linear;
                }

                .notification.success .notification-progress {
                    background: #28a745;
                }

                .notification.error .notification-progress {
                    background: #dc3545;
                }

                .notification.info .notification-progress {
                    background: #007bff;
                }

                .notification.warning .notification-progress {
                    background: #ffc107;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }

                @keyframes progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                </style>
            `;
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000, persistent = false) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle', 
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const progressDuration = persistent ? 0 : duration;

        notification.innerHTML = `
            <i class="notification-icon ${icons[type] || icons.info}"></i>
            <div class="notification-content">${message}</div>
            <button class="notification-close" type="button">&times;</button>
            ${!persistent ? `<div class="notification-progress" style="animation-duration: ${progressDuration}ms;"></div>` : ''}
        `;

        this.container.appendChild(notification);

        // Handle close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification);
        });

        // Auto remove after duration (unless persistent)
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    processing(message) {
        return this.show(message, 'info', 0, true); // Persistent notification
    }

    clearAll() {
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// Global instance
window.notificationManager = new NotificationManager();

// Add backward compatibility methods
window.notificationManager.showSuccess = function(message, duration) {
    return this.success(message, duration);
};

window.notificationManager.showError = function(message, duration) {
    return this.error(message, duration);
};

window.notificationManager.showInfo = function(message, duration) {
    return this.info(message, duration);
};

window.notificationManager.showWarning = function(message, duration) {
    return this.warning(message, duration);
};

// Backward compatibility
if (!window.commonUtils) {
    window.commonUtils = {};
}

window.commonUtils.showNotification = function(message, type, duration) {
    return window.notificationManager.show(message, type, duration);
};

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
    // Ensure notificationManager is initialized if not already
    if (!window.notificationManager) {
        window.notificationManager = new NotificationManager();
    }
    
    // Make utilities globally available
    window.ButtonLoader = ButtonLoader;
    window.FormValidator = FormValidator;
    window.LoadingOverlay = LoadingOverlay;
    
    // Legacy compatibility
    if (!window.commonUtils) {
        window.commonUtils = {};
    }
    window.commonUtils.showToast = function(message, type) { window.notificationManager.showToast(message, type); };
    window.commonUtils.showSuccess = function(message) { window.notificationManager.showSuccess(message); };
    window.commonUtils.showError = function(message) { window.notificationManager.showError(message); };
    window.commonUtils.showWarning = function(message) { window.notificationManager.showWarning(message); };
    window.commonUtils.showInfo = function(message) { window.notificationManager.showInfo(message); };
});