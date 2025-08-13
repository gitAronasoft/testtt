/**
 * VideoHub Common Utilities Module
 * Shared functionality and utilities used across all modules
 */

class CommonUtils {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalErrorHandler();
        this.setupToastContainer();
        this.bindCommonEvents();
        this.checkUserSession();
    }

    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showToast('An unexpected error occurred. Please try again.', 'danger');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showToast('An unexpected error occurred. Please try again.', 'danger');
        });
    }

    setupToastContainer() {
        if (!document.getElementById('toastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
    }

    bindCommonEvents() {
        // Handle logout links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href*="login.html"]') && e.target.textContent.includes('Logout')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Handle demo mode notifications
        this.showDemoModeNotification();
    }

    showDemoModeNotification() {
        if (window.location.pathname.includes('admin/') || 
            window.location.pathname.includes('creator/') || 
            window.location.pathname.includes('viewer/')) {
            
            setTimeout(() => {
                this.showToast('You are in demo mode. All data and actions are simulated.', 'info', 8000);
            }, 2000);
        }
    }

    checkUserSession() {
        const session = this.getUserSession();
        if (session && this.isSessionExpired(session)) {
            this.clearUserSession();
            if (!window.location.pathname.includes('auth/')) {
                this.showToast('Your session has expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = '/auth/login.html';
                }, 2000);
            }
        }
    }

    // Session Management
    getUserSession() {
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');
        
        const session = localSession || sessionSession;
        return session ? JSON.parse(session) : null;
    }

    setUserSession(userData) {
        const sessionData = {
            ...userData,
            timestamp: new Date().toISOString(),
            expires: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
        };
        
        if (userData.rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        }
    }

    clearUserSession() {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
    }

    isSessionExpired(session) {
        if (!session.expires) return false;
        return new Date() > new Date(session.expires);
    }

    handleLogout() {
        this.clearUserSession();
        this.showToast('Logged out successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/auth/login.html';
        }, 1000);
    }

    // Toast Notifications
    showToast(message, type = 'info', delay = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast align-items-center text-bg-${type} border-0`;
        toastElement.setAttribute('role', 'alert');
        
        const iconMap = {
            success: 'fas fa-check-circle',
            danger: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${iconMap[type] || iconMap.info} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: delay
        });
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // Loading States
    showLoading(message = 'Loading...', target = null) {
        const loaderId = 'loader-' + Date.now();
        const loader = document.createElement('div');
        loader.id = loaderId;
        loader.className = 'position-absolute top-50 start-50 translate-middle';
        loader.style.zIndex = '9999';
        loader.innerHTML = `
            <div class="bg-white p-4 rounded shadow text-center">
                <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>${message}</div>
            </div>
        `;

        if (target) {
            target.style.position = 'relative';
            target.appendChild(loader);
        } else {
            loader.className = 'position-fixed top-50 start-50 translate-middle';
            document.body.appendChild(loader);
        }

        return loaderId;
    }

    hideLoading(loaderId = null) {
        if (loaderId) {
            const loader = document.getElementById(loaderId);
            if (loader) loader.remove();
        } else {
            // Remove all loaders
            document.querySelectorAll('[id^="loader-"]').forEach(loader => {
                loader.remove();
            });
        }
    }

    // Button Loading States
    setButtonLoading(button, isLoading = true, loadingText = 'Loading...') {
        if (!button) return;

        if (isLoading) {
            // Store original content
            button.dataset.originalContent = button.innerHTML;
            button.dataset.originalDisabled = button.disabled;
            
            // Set loading state
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ${loadingText}
            `;
            button.classList.add('btn-loading');
        } else {
            // Restore original state
            if (button.dataset.originalContent) {
                button.innerHTML = button.dataset.originalContent;
                delete button.dataset.originalContent;
            }
            
            button.disabled = button.dataset.originalDisabled === 'true';
            delete button.dataset.originalDisabled;
            button.classList.remove('btn-loading');
        }
    }

    // Section Loading States
    showSectionLoader(sectionElement, message = 'Loading data...') {
        if (!sectionElement) return null;

        const loaderId = 'section-loader-' + Date.now();
        const existingLoader = sectionElement.querySelector('.section-loader');
        
        if (existingLoader) {
            existingLoader.remove();
        }

        const loader = document.createElement('div');
        loader.id = loaderId;
        loader.className = 'section-loader d-flex justify-content-center align-items-center py-5';
        loader.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="text-muted">${message}</div>
            </div>
        `;

        // Hide existing content
        const content = sectionElement.children;
        for (let i = 0; i < content.length; i++) {
            if (!content[i].classList.contains('section-loader')) {
                content[i].style.display = 'none';
            }
        }

        sectionElement.appendChild(loader);
        return loaderId;
    }

    hideSectionLoader(sectionElement) {
        if (!sectionElement) return;

        const loader = sectionElement.querySelector('.section-loader');
        if (loader) {
            loader.remove();
        }

        // Show hidden content
        const content = sectionElement.children;
        for (let i = 0; i < content.length; i++) {
            if (!content[i].classList.contains('section-loader')) {
                content[i].style.display = '';
            }
        }
    }

    // Enhanced Error Handling
    handleAPIError(error, context = '', showToast = true) {
        console.error(`API Error in ${context}:`, error);
        
        let message = 'An unexpected error occurred. Please try again.';
        let type = 'danger';
        
        if (error) {
            if (error.isNetworkError) {
                message = 'Network error. Please check your connection and try again.';
                type = 'warning';
            } else if (error.error) {
                message = error.error;
            } else if (typeof error === 'string') {
                message = error;
            } else if (error.message) {
                message = error.message;
            }
        }

        if (showToast) {
            this.showToast(message, type);
        }

        return { message, type };
    }

    // Retry functionality
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }

    // Form Validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Date and Time Utilities
    formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        return d.toLocaleDateString('en-US', options[format] || options.short);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    timeAgo(date) {
        const now = new Date();
        const past = new Date(date);
        const diff = now - past;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
        if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
        if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // URL and Navigation Utilities
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    }

    removeQueryParam(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.pushState({}, '', url);
    }

    // Local Storage Utilities
    setLocalData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getLocalData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeLocalData(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Network Utilities
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    // File Utilities
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    }

    isValidVideoFile(file) {
        const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
        return validTypes.includes(file.type);
    }

    // Animation Utilities
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.min(progress / duration, 1);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    fadeOut(element, duration = 300) {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.max(1 - (progress / duration), 0);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Utility Functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Currency Formatting
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Number Formatting
    formatNumber(number) {
        return new Intl.NumberFormat('en-US').format(number);
    }

    // Copy to Clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy to clipboard', 'danger');
            return false;
        }
    }

    // Device Detection
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // Event Emitter
    createEventEmitter() {
        const events = {};
        
        return {
            on(event, callback) {
                if (!events[event]) events[event] = [];
                events[event].push(callback);
            },
            
            emit(event, data) {
                if (events[event]) {
                    events[event].forEach(callback => callback(data));
                }
            },
            
            off(event, callback) {
                if (events[event]) {
                    events[event] = events[event].filter(cb => cb !== callback);
                }
            }
        };
    }
}

// Global Toast Function
window.showToast = function(message, type = 'info', delay = 5000) {
    if (window.commonUtils) {
        window.commonUtils.showToast(message, type, delay);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
};

// Initialize common utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.commonUtils = new CommonUtils();
});

// Export for other modules
window.CommonUtils = CommonUtils;
