/**
 * Configuration file for VideoShare platform
 * Contains API endpoints, demo data, and application settings
 */

// API Configuration
const CONFIG = {
    // API Base URL (adjust for production)
    API_BASE_URL: window.location.protocol + '//' + window.location.hostname + ':8000',
    
    // Application settings
    APP_NAME: 'VideoShare',
    VERSION: '1.0.0',
    
    // Local storage keys
    STORAGE: {
        USER: 'videoshare_user',
        TOKEN: 'videoshare_token',
        SESSION: 'videoshare_session'
    },
    
    // Demo user accounts for testing
    DEMO_ACCOUNTS: {
        creator: {
            email: 'creator@demo.com',
            password: 'demo123',
            role: 'creator',
            name: 'Demo Creator'
        },
        viewer: {
            email: 'viewer@demo.com', 
            password: 'demo123',
            role: 'viewer',
            name: 'Demo Viewer'
        },
        admin: {
            email: 'admin@demo.com',
            password: 'admin123',
            role: 'admin',
            name: 'Admin User'
        }
    },
    
    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 12,
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        SUPPORTED_VIDEO_FORMATS: ['mp4', 'avi', 'mov', 'wmv'],
        CHART_COLORS: {
            primary: '#0d6efd',
            success: '#198754',
            warning: '#ffc107',
            danger: '#dc3545'
        }
    },
    
    // Feature flags
    FEATURES: {
        ENABLE_PAYMENTS: false,
        ENABLE_VIDEO_UPLOAD: true,
        ENABLE_COMMENTS: true,
        ENABLE_RATINGS: true
    }
};

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}