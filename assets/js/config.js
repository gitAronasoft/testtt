/**
 * Configuration file for VideoShare platform
 * Contains constants, routes, and configuration settings
 * 
 * @version 1.0.0
 * @author VideoShare Development Team
 */

// ========================
// APPLICATION CONFIGURATION
// ========================

const CONFIG = {
    // Application settings
    APP: {
        NAME: 'VideoShare',
        VERSION: '1.0.0',
        ENVIRONMENT: 'development'
    },

    // Routes for navigation
    ROUTES: {
        HOME: 'index.html',
        LOGIN: 'login.html',
        SIGNUP: 'signup.html',
        FORGOT_PASSWORD: 'forgot-password.html',
        CREATOR_DASHBOARD: 'creator/creator-dashboard.html',
        VIEWER_DASHBOARD: 'viewer/viewer-dashboard.html'
    },

    // Dashboard sections
    SECTIONS: {
        CREATOR: ['dashboard', 'videos', 'upload', 'analytics', 'earnings', 'settings'],
        VIEWER: ['browse', 'library', 'wallet', 'settings']
    },

    // Demo accounts for testing
    DEMO_ACCOUNTS: {
        'creator@demo.com': {
            password: 'password123',
            role: 'creator',
            name: 'Demo Creator',
            id: 'creator_001'
        },
        'viewer@demo.com': {
            password: 'password123',
            role: 'viewer',
            name: 'Demo Viewer',
            id: 'viewer_001'
        }
    },

    // UI settings
    UI: {
        ALERT_TIMEOUT: 5000,
        REDIRECT_DELAY: 1500,
        LOADING_TIMEOUT: 2000
    },

    // Local storage keys
    STORAGE: {
        USER: 'videoShareUser',
        TOKEN: 'videoShareToken',
        SESSION: 'videoShareSession'
    }
};

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Get dashboard URL based on user role
 * @param {string} role - User role ('creator' or 'viewer')
 * @returns {string} Dashboard URL
 */
function getDashboardUrl(role) {
    return role === 'creator' ? CONFIG.ROUTES.CREATOR_DASHBOARD : CONFIG.ROUTES.VIEWER_DASHBOARD;
}

/**
 * Get sections for user role
 * @param {string} role - User role
 * @returns {Array} Array of available sections
 */
function getSectionsForRole(role) {
    return role === 'creator' ? CONFIG.SECTIONS.CREATOR : CONFIG.SECTIONS.VIEWER;
}

/**
 * Check if current page is a dashboard
 * @returns {boolean} True if on dashboard page
 */
function isDashboardPage() {
    return window.location.pathname.includes('dashboard');
}

/**
 * Get relative path from dashboard to root
 * @returns {string} Relative path
 */
function getRelativePathToRoot() {
    return isDashboardPage() ? '../' : '';
}

// Export configuration (for ES6 modules compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}