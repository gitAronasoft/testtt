
class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        this.container = document.getElementById('toastContainer');
    }

    show(message, type = 'info', options = {}) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const duration = options.duration || (type === 'error' ? 8000 : 5000);
        const showProgress = options.showProgress !== false;

        const typeConfig = {
            success: { icon: 'fas fa-check-circle', bgClass: 'bg-success', title: 'Success' },
            error: { icon: 'fas fa-exclamation-circle', bgClass: 'bg-danger', title: 'Error' },
            warning: { icon: 'fas fa-exclamation-triangle', bgClass: 'bg-warning', title: 'Warning' },
            info: { icon: 'fas fa-info-circle', bgClass: 'bg-info', title: 'Info' }
        };

        const config = typeConfig[type] || typeConfig.info;

        const toastHTML = `
            <div class="toast ${config.bgClass} text-white" id="${id}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${config.bgClass} text-white border-0">
                    <i class="${config.icon} me-2"></i>
                    <strong class="me-auto">${options.title || config.title}</strong>
                    <small class="text-white-50">${new Date().toLocaleTimeString()}</small>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                    ${showProgress ? `
                    <div class="progress mt-2" style="height: 3px;">
                        <div class="progress-bar bg-white" role="progressbar" style="width: 100%" id="${id}_progress"></div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.container.insertAdjacentHTML('beforeend', toastHTML);

        const toastElement = document.getElementById(id);
        const progressBar = document.getElementById(`${id}_progress`);

        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(toastElement, {
            autohide: duration > 0,
            delay: duration
        });

        // Store reference
        this.notifications.set(id, { element: toastElement, bsToast, progressBar });

        // Show toast
        bsToast.show();

        // Handle progress animation
        if (showProgress && progressBar && duration > 0) {
            let startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, (duration - elapsed) / duration * 100);
                progressBar.style.width = remaining + '%';

                if (remaining > 0 && this.notifications.has(id)) {
                    requestAnimationFrame(animate);
                }
            };
            requestAnimationFrame(animate);
        }

        // Auto-remove from memory when hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            this.notifications.delete(id);
            toastElement.remove();
        });

        return id;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.bsToast.hide();
        }
    }

    clear() {
        this.notifications.forEach((notification, id) => {
            notification.bsToast.hide();
        });
        this.notifications.clear();
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// Loading overlay system
class LoadingSystem {
    constructor() {
        this.activeLoaders = new Set();
        this.overlay = null;
    }

    show(message = 'Loading...') {
        if (!this.overlay) {
            this.createOverlay();
        }

        const loaderId = 'loader_' + Date.now();
        this.activeLoaders.add(loaderId);

        this.updateMessage(message);
        this.overlay.style.display = 'flex';

        return loaderId;
    }

    hide(loaderId) {
        if (loaderId) {
            this.activeLoaders.delete(loaderId);
        } else {
            this.activeLoaders.clear();
        }

        if (this.activeLoaders.size === 0 && this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'globalLoadingOverlay';
        this.overlay.innerHTML = `
            <div class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                 style="background: rgba(255, 255, 255, 0.9); z-index: 9998; backdrop-filter: blur(4px);">
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="h5 text-muted" id="loadingMessage">Loading...</div>
                </div>
            </div>
        `;
        this.overlay.style.display = 'none';
        document.body.appendChild(this.overlay);
    }

    updateMessage(message) {
        const messageElement = document.getElementById('loadingMessage');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}

// Initialize global instances
const notificationSystem = new NotificationSystem();
const loadingSystem = new LoadingSystem();

// Global helper functions
window.showNotification = (message, type, options) => notificationSystem.show(message, type, options);
window.showLoading = (show = true, message = 'Loading...') => {
    if (show) {
        return loadingSystem.show(message);
    } else {
        loadingSystem.hide();
    }
};

// Export classes
window.NotificationSystem = NotificationSystem;
window.LoadingSystem = LoadingSystem;
