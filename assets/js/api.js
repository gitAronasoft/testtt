/**
 * VideoHub API Service
 * Handles all backend API communications
 */

// Use a more reliable approach to prevent duplicate loading
(function() {
    'use strict';

    if (window.APIService && window.apiService) {
        console.log('APIService already loaded');
        return;
    }

    class APIService {
    constructor() {
        // Use VideoHubConfig for consistent base path handling
        this.baseURL = this.getBaseURL();
        this.timeout = 10000;
        this.useDataService = false; // Now using PHP backend
        this.authToken = this.getStoredToken(); // Initialize stored token on service creation
        this.init();
    }

    init() {
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Wait for dataService to be initialized if using it
        if (this.useDataService && !window.dataService) {
            setTimeout(() => this.init(), 100);
        }
    }

    /**
     * Get the correct base URL for API calls using VideoHubConfig
     * This ensures the app works whether deployed at root or in a subfolder
     */
    getBaseURL() {
        // Use VideoHubConfig if available, otherwise fallback to auto-detection
        if (window.videoHubConfig) {
            return window.videoHubConfig.getApiUrl();
        }
        
        // Fallback to auto-detection if config not loaded yet
        const currentPath = window.location.pathname;
        
        // If we're on index.html or root, use current directory
        if (currentPath === '/' || currentPath.endsWith('/') || currentPath.endsWith('/index.html')) {
            const basePath = currentPath.replace('/index.html', '').replace(/\/$/, '');
            return basePath + '/api';
        }
        
        // For pages in subdirectories (like auth/, admin/, etc.), go up one level
        const pathParts = currentPath.split('/');
        pathParts.pop(); // Remove current file
        
        // If we're in a subdirectory, go up one more level to reach the app root
        if (pathParts.length > 1 && pathParts[pathParts.length - 1] !== '') {
            pathParts.pop();
        }
        
        const basePath = pathParts.join('/') || '';
        return basePath + '/api';
    }

    // Generic HTTP methods
    async request(method, endpoint, data = null, options = {}) {
        // Handle endpoint URL construction
        let url;
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            // Absolute URL
            url = endpoint;
        } else if (endpoint.startsWith('/api/')) {
            // Endpoint already includes /api/, use it directly
            url = endpoint;
        } else {
            // Relative endpoint, prepend baseURL
            url = `${this.baseURL}${endpoint}`;
        }
        const config = {
            method,
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        };

        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add body for POST, PUT, PATCH requests
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                // Try to get more detailed error from response
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // If can't parse JSON, use default error message
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            // Standardize response format
            if (result.hasOwnProperty('success')) {
                return result;
            }
            // Otherwise wrap it in standard format
            return { success: true, data: result };
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);

            let errorMessage = error.message;
            let isNetworkError = false;

            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. Please try again.';
                isNetworkError = true;
            } else if (error.name === 'TypeError') {
                errorMessage = 'Network error. Please check your connection.';
                isNetworkError = true;
            }

            return {
                success: false,
                error: errorMessage,
                isNetworkError,
                endpoint: endpoint,
                method: method
            };
        }
    }

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // Authentication
    getAuthToken() {
        // Prefer session storage, fallback to local storage if not found or if authToken is null
        return this.authToken || this.getStoredToken();
    }

    setAuthToken(token, rememberMe = false) {
        this.authToken = token;

        // Store token based on remember me preference
        if (rememberMe) {
            localStorage.setItem('authToken', token);
            sessionStorage.removeItem('authToken');
        } else {
            sessionStorage.setItem('authToken', token);
            localStorage.removeItem('authToken');
        }
    }

    clearAuthToken() {
        this.authToken = null;
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    }

    getStoredToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Auth API endpoints
    async login(credentials) {
        return this.post('/auth/login', credentials);
    }

    async register(userData) {
        return this.post('/auth/register', userData);
    }

    async logout() {
        const result = await this.post('/auth/logout');
        this.clearAuthToken();
        return result;
    }

    async verifyToken() {
        return this.get('/auth/verify');
    }

    // User API endpoints
    async getUserProfile() {
        // Check user role to determine correct endpoint
        let userSession = null;
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');

        if (localSession) {
            userSession = JSON.parse(localSession);
        } else if (sessionSession) {
            userSession = JSON.parse(sessionSession);
        }

        if (userSession && userSession.userType === 'viewer') {
            // For viewers, use the users/profile endpoint which is more generic
            return this.get('/users/profile');
        } else {
            // For other roles (admin, creator)
            return this.get('/users/profile');
        }
    }

    async updateUserProfile(profileData) {
        return this.put('users/profile', profileData);
    }

    async getUsers(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getUsers(params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/users${queryString ? '?' + queryString : ''}`);
    }

    async updateUserRole(userId, role) {
        return this.put(`/users/${userId}/role`, { role });
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    // Video API endpoints
    async getVideos(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getVideos(params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/videos${queryString ? '?' + queryString : ''}`);
    }

    async getVideo(videoId) {
        return this.get(`/videos/${videoId}`);
    }

    async uploadVideo(videoData) {
        if (this.useDataService && window.dataService) {
            return window.dataService.uploadVideo(videoData);
        }
        // For file uploads, we need to use FormData
        const formData = new FormData();
        Object.keys(videoData).forEach(key => {
            formData.append(key, videoData[key]);
        });

        return this.request('POST', '/videos', formData, {
            headers: {} // Remove Content-Type to let browser set it for FormData
        });
    }

    async updateVideo(videoId, videoData) {
        if (this.useDataService && window.dataService) {
            return window.dataService.updateVideo(videoId, videoData);
        }
        return this.put(`/videos/${videoId}`, videoData);
    }

    async deleteVideo(videoId) {
        if (this.useDataService && window.dataService) {
            return window.dataService.deleteVideo(videoId);
        }
        return this.delete(`/videos/${videoId}`);
    }

    async duplicateVideo(videoId) {
        if (this.useDataService && window.dataService) {
            return window.dataService.duplicateVideo(videoId);
        }
        return this.post(`/videos/${videoId}/duplicate`);
    }

    async approveVideo(videoId) {
        return this.put(`/videos/${videoId}/approve`);
    }

    async rejectVideo(videoId, reason) {
        return this.put(`/videos/${videoId}/reject`, { reason });
    }

    // Creator API endpoints
    async getCreatorStats() {
        if (this.useDataService && window.dataService) {
            return window.dataService.getCreatorStats();
        }
        return this.get('/creator/stats');
    }

    async getCreatorVideos(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getCreatorVideos(null, params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/creator/videos${queryString ? '?' + queryString : ''}`);
    }

    async getCreatorEarnings(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getCreatorEarnings(null, params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/creator/earnings${queryString ? '?' + queryString : ''}`);
    }

    // Viewer API endpoints
    async purchaseVideo(videoId, paymentData) {
        if (this.useDataService && window.dataService) {
            return window.dataService.purchaseVideo(videoId, paymentData);
        }
        return this.post(`/videos/${videoId}/purchase`, paymentData);
    }

    async getViewerPurchases() {
        if (this.useDataService && window.dataService) {
            return window.dataService.getViewerPurchases();
        }
        return this.get('/viewer/purchases');
    }

    async getViewerStats() {
        if (this.useDataService && window.dataService) {
            return window.dataService.getViewerStats();
        }
        return this.get('/viewer/stats');
    }

    // Admin API endpoints
    async getAdminStats() {
        if (this.useDataService && window.dataService) {
            return window.dataService.getAdminStats();
        }
        return this.get('/admin/stats');
    }

    async getAdminUsers(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getUsers(params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/admin/users${queryString ? '?' + queryString : ''}`);
    }

    async getSystemHealth() {
        return this.get('/admin/health');
    }

    async getAnalytics() {
        if (this.useDataService && window.dataService) {
            return window.dataService.getAnalyticsData();
        }
        return this.get('/admin/analytics');
    }

    async getPurchases(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getViewerPurchases(null, params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/purchases${queryString ? '?' + queryString : ''}`);
    }

    // Search API endpoints
    async searchVideos(query, filters = {}) {
        const params = { q: query, ...filters };
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/search/videos?${queryString}`);
    }

    // Utility methods
    handleApiError(error, context = '') {
        let message = 'Something went wrong. Please try again.';

        if (error.isNetworkError) {
            message = 'Network error. Please check your connection.';
        } else if (error.error) {
            message = error.error;
        }

        if (context) {
            message = `${context}: ${message}`;
        }

        // Show toast notification
        if (window.commonUtils) {
            window.commonUtils.showToast(message, 'danger');
        }

        return message;
    }

    showSuccessMessage(message) {
        if (window.commonUtils) {
            window.commonUtils.showToast(message, 'success');
        }
    }
    }

    // Export to global scope
    window.APIService = APIService;
    window.apiService = new APIService();
    console.log('APIService initialized successfully');

})(); // End of IIFE