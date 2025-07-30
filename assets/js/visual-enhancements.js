// Enhanced Visual System for YouTube Video Manager
class VisualEnhancements {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        this.setupThemeSystem();
        this.setupMobileOptimizations();
        this.setupAnimations();
        this.setupPullToRefresh();
        this.setupNotificationSystem();
        this.isInitialized = true;

        console.log('Enhanced visual system loaded with mobile optimizations');
    }

    setupThemeSystem() {
        // Detect and apply system theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        const currentTheme = localStorage.getItem('theme') || (prefersDark.matches ? 'dark' : 'light');

        this.applyTheme(currentTheme);

        // Listen for system theme changes
        prefersDark.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    setupMobileOptimizations() {
        // Enhanced touch interactions
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');

            // Add touch ripple effects
            this.addTouchRipples();

            // Optimize scroll performance
            this.optimizeScrolling();
        }
    }

    addTouchRipples() {
        const rippleElements = document.querySelectorAll('.btn, .card, .video-card');

        rippleElements.forEach(element => {
            element.addEventListener('touchstart', this.createRipple.bind(this));
        });
    }

    createRipple(e) {
        const element = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.touches[0].clientX - rect.left - size / 2;
        const y = e.touches[0].clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    optimizeScrolling() {
        // Add momentum scrolling for iOS
        document.body.style.webkitOverflowScrolling = 'touch';

        // Optimize scroll performance
        let ticking = false;

        function updateScrollPosition() {
            // Update scroll-dependent UI elements
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        }, { passive: true });
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('animate-fade-in');
                        }
                    });
                },
                { threshold: 0.1 }
            );

            // Observe elements that should animate in
            const animateElements = document.querySelectorAll('.card, .video-card, .stat-card');
            animateElements.forEach(el => observer.observe(el));
        }
    }

    setupPullToRefresh() {
        if ('ontouchstart' in window) {
            let startY = 0;
            let currentY = 0;
            let pulling = false;

            document.addEventListener('touchstart', (e) => {
                if (window.scrollY === 0) {
                    startY = e.touches[0].pageY;
                    pulling = true;
                }
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (pulling) {
                    currentY = e.touches[0].pageY;
                    const pullDistance = currentY - startY;

                    if (pullDistance > 100) {
                        this.showNotification('Release to refresh', 'info');
                    }
                }
            }, { passive: true });

            document.addEventListener('touchend', () => {
                if (pulling && (currentY - startY) > 100) {
                    this.triggerRefresh();
                }
                pulling = false;
            });
        }
    }

    triggerRefresh() {
        this.showNotification('Refreshing...', 'info');

        // Simulate refresh
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    setupNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `toast ${type}`;
        notification.style.cssText = `
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 16px 20px;
            margin-bottom: 10px;
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease;
            pointer-events: auto;
            min-width: 200px;
            max-width: 300px;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${this.getNotificationIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.visualEnhancements = new VisualEnhancements();
});

// Global notification function
window.showNotification = function(message, type = 'info', duration = 3000) {
    if (window.visualEnhancements) {
        window.visualEnhancements.showNotification(message, type, duration);
    }
};

// Add required CSS animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes ripple {
        to { transform: scale(4); opacity: 0; }
    }

    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(animationStyles);

console.log('Enhanced UI initialized');