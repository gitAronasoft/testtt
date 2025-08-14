/**
 * VideoHub Deployment Configuration
 * Easy configuration for different deployment scenarios
 * 
 * INSTRUCTIONS:
 * 1. Choose your deployment scenario below
 * 2. Uncomment the line that matches your deployment
 * 3. Save the file
 * 
 * The app will automatically use this configuration for all API calls
 * and navigation throughout the entire application.
 */

window.VIDEOHUB_DEPLOYMENT_CONFIG = {
    // ========================================
    // CHOOSE YOUR DEPLOYMENT SCENARIO
    // ========================================
    
    // Option 1: Root domain deployment (e.g., https://yourdomain.com/)
    BASE_PATH: '',
    
    // Option 2: Subfolder deployment (uncomment and modify as needed)
    // BASE_PATH: '/video-platform',
    
    // Option 3: Auto-detect (works in most cases but manual is more reliable)
    // BASE_PATH: 'auto',
    
    // ========================================
    // DEPLOYMENT EXAMPLES
    // ========================================
    // For https://yourdomain.com/ → BASE_PATH: ''
    // For https://yourdomain.com/video-platform/ → BASE_PATH: '/video-platform'
    // For https://yourdomain.com/apps/videohub/ → BASE_PATH: '/apps/videohub'
};

console.log('VideoHub deployment config loaded:', window.VIDEOHUB_DEPLOYMENT_CONFIG.BASE_PATH || 'root');