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
        this.baseURL = '/api';
        this.timeout = 10000;
        this.useDataService = false; // Now using PHP backend
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

    // Generic HTTP methods
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            return { 
                success: false, 
                error: error.message,
                isNetworkError: error.name === 'TypeError' || error.name === 'AbortError'
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
        return localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    clearAuthToken() {
        localStorage.removeItem('authToken');
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
        return this.get('/users/profile');
    }

    async updateUserProfile(profileData) {
        return this.put('/users/profile', profileData);
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

    async getUsers(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getUsers(params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/admin/users${queryString ? '?' + queryString : ''}`);
    }

    async getVideos(params = {}) {
        if (this.useDataService && window.dataService) {
            return window.dataService.getVideos(params);
        }
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/videos${queryString ? '?' + queryString : ''}`);
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