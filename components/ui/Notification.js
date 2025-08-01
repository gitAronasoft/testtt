
// Enhanced Toast Notification System
class NotificationManager {
    constructor() {
        this.container = null;
        this.activeToasts = new Set();
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.createContainer();
        }
        this.container = document.getElementById('notification-container');
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    show(message, type = 'info', duration = 5000) {
        if (!this.container) {
            this.init();
        }

        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.activeToasts.add(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.style.cssText = `
            background: var(--background, #ffffff);
            border: 1px solid var(--border, #e5e7eb);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 0.5rem;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 100%;
            word-wrap: break-word;
        `;

        // Type-specific styling
        const typeConfig = {
            success: {
                icon: 'fas fa-check-circle',
                color: '#22c55e',
                bgColor: '#f0fdf4',
                borderColor: '#bbf7d0'
            },
            error: {
                icon: 'fas fa-exclamation-circle',
                color: '#ef4444',
                bgColor: '#fef2f2',
                borderColor: '#fecaca'
            },
            warning: {
                icon: 'fas fa-exclamation-triangle',
                color: '#f59e0b',
                bgColor: '#fffbeb',
                borderColor: '#fed7aa'
            },
            info: {
                icon: 'fas fa-info-circle',
                color: '#3b82f6',
                bgColor: '#eff6ff',
                borderColor: '#bfdbfe'
            }
        };

        const config = typeConfig[type] || typeConfig.info;
        
        toast.style.backgroundColor = config.bgColor;
        toast.style.borderColor = config.borderColor;

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="${config.icon}" style="color: ${config.color}; font-size: 1.125rem; flex-shrink: 0;"></i>
                <span style="flex: 1; color: var(--foreground, #1f2937); font-size: 0.875rem; line-height: 1.25;">${message}</span>
                <button class="toast-close" style="
                    background: none;
                    border: none;
                    color: var(--muted-foreground, #6b7280);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                " onmouseover="this.style.background='var(--muted, #f3f4f6)'" onmouseout="this.style.background='none'">
                    <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                </button>
            </div>
        `;

        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.remove(toast);
            });
        }

        return toast;
    }

    remove(toast) {
        if (!toast || !this.activeToasts.has(toast)) {
            return;
        }

        this.activeToasts.delete(toast);
        
        // Animate out
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';

        // Remove from DOM
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    clear() {
        this.activeToasts.forEach(toast => {
            this.remove(toast);
        });
    }
}

// Create global instance
const notificationManager = new NotificationManager();

// Global function for backward compatibility
function showNotification(message, type = 'info', duration = 5000) {
    return notificationManager.show(message, type, duration);
}

// Additional helper functions
function showToast(message, type = 'info', duration = 5000) {
    return showNotification(message, type, duration);
}

function hideToast() {
    // This function exists for backward compatibility
    // Individual toasts now auto-hide or can be closed manually
    console.log('hideToast called - toasts now auto-hide');
}

function clearAllNotifications() {
    notificationManager.clear();
}

// Make functions globally available
window.showNotification = showNotification;
window.showToast = showToast;
window.hideToast = hideToast;
window.clearAllNotifications = clearAllNotifications;
window.notificationManager = notificationManager;

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        notificationManager.init();
    });
} else {
    notificationManager.init();
}
