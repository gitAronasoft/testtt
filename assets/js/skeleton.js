
/**
 * Skeleton Loading Utility for VideoShare Platform
 * Provides reusable skeleton components for loading states
 */

class SkeletonLoader {
    constructor() {
        this.isLoading = false;
    }

    /**
     * Show skeleton loading for stats cards
     */
    showStatsSkeletons(container) {
        const skeletonHTML = `
            <div class="stats-skeleton">
                ${Array(4).fill().map(() => `
                    <div class="stat-card-skeleton">
                        <div class="skeleton skeleton-avatar mx-auto mb-3"></div>
                        <div class="skeleton skeleton-title mx-auto mb-2"></div>
                        <div class="skeleton skeleton-text mx-auto" style="width: 40%;"></div>
                    </div>
                `).join('')}
            </div>
        `;
        container.innerHTML = skeletonHTML;
    }

    /**
     * Show skeleton loading for video grid
     */
    showVideoGridSkeletons(container, count = 6) {
        const skeletonHTML = `
            <div class="video-grid-skeleton">
                ${Array(count).fill().map(() => `
                    <div class="video-card-skeleton">
                        <div class="video-thumbnail-skeleton"></div>
                        <div class="video-content-skeleton">
                            <div class="skeleton skeleton-title mb-3"></div>
                            <div class="skeleton skeleton-text mb-2"></div>
                            <div class="skeleton skeleton-text mb-3" style="width: 60%;"></div>
                            <div class="d-flex gap-2">
                                <div class="skeleton skeleton-button flex-fill"></div>
                                <div class="skeleton skeleton-button" style="width: 50px;"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.innerHTML = skeletonHTML;
    }

    /**
     * Show skeleton loading for table
     */
    showTableSkeletons(container, rows = 5, cols = 4) {
        const skeletonHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            ${Array(cols).fill().map(() => `
                                <th><div class="skeleton skeleton-text"></div></th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${Array(rows).fill().map(() => `
                            <tr>
                                ${Array(cols).fill().map(() => `
                                    <td><div class="skeleton skeleton-text"></div></td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = skeletonHTML;
    }

    /**
     * Show skeleton for single card
     */
    showCardSkeleton(container) {
        const skeletonHTML = `
            <div class="skeleton-container">
                <div class="skeleton skeleton-title mb-3"></div>
                <div class="skeleton skeleton-text mb-2"></div>
                <div class="skeleton skeleton-text mb-2"></div>
                <div class="skeleton skeleton-text mb-3" style="width: 70%;"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        `;
        container.innerHTML = skeletonHTML;
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message = 'Loading...') {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        setTimeout(() => overlay.classList.add('show'), 10);
        this.isLoading = true;
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
        this.isLoading = false;
    }

    /**
     * Create empty state
     */
    showEmptyState(container, options = {}) {
        const {
            icon = 'fas fa-inbox',
            title = 'No Data Available',
            message = 'There is no data to display at the moment.',
            actionText = null,
            actionCallback = null
        } = options;

        const actionButton = actionText ? `
            <button class="btn btn-primary" onclick="${actionCallback ? 'this.clickHandler()' : ''}">${actionText}</button>
        ` : '';

        const emptyStateHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="${icon}"></i>
                </div>
                <h4>${title}</h4>
                <p>${message}</p>
                ${actionButton}
            </div>
        `;

        container.innerHTML = emptyStateHTML;

        if (actionCallback && actionText) {
            const button = container.querySelector('.btn');
            if (button) {
                button.clickHandler = actionCallback;
            }
        }
    }

    /**
     * Wrap API calls with loading states
     */
    async wrapApiCall(apiCall, container, skeletonType = 'card', options = {}) {
        try {
            // Show skeleton based on type
            switch (skeletonType) {
                case 'stats':
                    this.showStatsSkeletons(container);
                    break;
                case 'videos':
                    this.showVideoGridSkeletons(container, options.count);
                    break;
                case 'table':
                    this.showTableSkeletons(container, options.rows, options.cols);
                    break;
                default:
                    this.showCardSkeleton(container);
            }

            // Execute API call
            const result = await apiCall();
            
            // Small delay to show skeleton (optional)
            if (options.minDelay) {
                await new Promise(resolve => setTimeout(resolve, options.minDelay));
            }

            return result;
        } catch (error) {
            // Show error state
            this.showEmptyState(container, {
                icon: 'fas fa-exclamation-triangle',
                title: 'Error Loading Data',
                message: 'Failed to load data. Please try again.',
                actionText: 'Retry',
                actionCallback: () => this.wrapApiCall(apiCall, container, skeletonType, options)
            });
            throw error;
        }
    }
}

// Create global instance
window.SkeletonLoader = new SkeletonLoader();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkeletonLoader;
}
