/**
 * VideoHub Configuration
 * Handles base path detection for subfolder deployments
 */

(function() {
    'use strict';

    if (window.VideoHubConfig) {
        return; // Already loaded
    }

    class VideoHubConfig {
        constructor() {
            this.basePath = this.detectBasePath();
        }

        /**
         * Detect the base path where the app is deployed
         * This allows the app to work in subfolders
         */
        detectBasePath() {
            const currentPath = window.location.pathname;
            
            // If we're in a subdirectory (auth/, admin/, creator/, viewer/)
            if (currentPath.includes('/auth/') || currentPath.includes('/admin/') || 
                currentPath.includes('/creator/') || currentPath.includes('/viewer/')) {
                
                // Find the position of the subdirectory and get everything before it
                const match = currentPath.match(/(.*)\/(?:auth|admin|creator|viewer)\//);
                if (match) {
                    return match[1] || '';
                }
            }
            
            // If we're on a specific HTML file in the root or subdirectory
            if (currentPath.endsWith('.html')) {
                const pathParts = currentPath.split('/');
                pathParts.pop(); // Remove the HTML file
                
                // If we're in auth, admin, creator, or viewer subdirectory, go up one more level
                const lastDir = pathParts[pathParts.length - 1];
                if (lastDir === 'auth' || lastDir === 'admin' || lastDir === 'creator' || lastDir === 'viewer') {
                    pathParts.pop(); // Remove the subdirectory to get to app root
                }
                
                return pathParts.join('/') || '';
            }
            
            // If we're on root or a directory
            if (currentPath === '/' || currentPath.endsWith('/')) {
                return currentPath.replace(/\/$/, '');
            }
            
            // Default case - assume app root
            const pathParts = currentPath.split('/');
            if (pathParts.length > 1) {
                pathParts.pop(); // Remove last segment
                return pathParts.join('/') || '';
            }
            
            return '';
        }

        /**
         * Get API base URL
         */
        getApiUrl() {
            return this.basePath + '/api';
        }

        /**
         * Get absolute URL for a relative path
         */
        getUrl(relativePath) {
            if (relativePath.startsWith('/')) {
                return this.basePath + relativePath;
            }
            return this.basePath + '/' + relativePath;
        }

        /**
         * Get relative URL from current page to target
         */
        getRelativeUrl(targetPath) {
            const currentPath = window.location.pathname;
            const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
            
            // If target starts with base path, use as-is
            if (targetPath.startsWith(this.basePath)) {
                return targetPath;
            }
            
            // For auth pages in subdirectories, calculate relative path
            if (currentDir.includes('/auth') || currentDir.includes('/admin') || 
                currentDir.includes('/creator') || currentDir.includes('/viewer')) {
                return '../' + targetPath.replace(/^\//, '');
            }
            
            return targetPath.replace(/^\//, '');
        }
    }

    // Export to global scope
    window.VideoHubConfig = VideoHubConfig;
    window.videoHubConfig = new VideoHubConfig();
    console.log('VideoHub Config initialized with base path:', window.videoHubConfig.basePath);

})();