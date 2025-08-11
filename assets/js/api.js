/**
 * API utility for VideoShare platform
 * Handles all HTTP requests to the backend API
 */

const API = {
    // Base configuration
    baseURL: CONFIG.API_BASE_URL,
    
    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Add auth token if available
        const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    /**
     * Authentication endpoints
     */
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    async register(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    },
    
    /**
     * User management
     */
    async getProfile() {
        return this.request('/user/profile');
    },
    
    async updateProfile(userData) {
        return this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },
    
    /**
     * Video management
     */
    async getVideos(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/videos${query ? '?' + query : ''}`);
    },
    
    async getVideo(id) {
        return this.request(`/videos/${id}`);
    },
    
    async uploadVideo(videoData) {
        return this.request('/videos', {
            method: 'POST',
            body: JSON.stringify(videoData)
        });
    },
    
    async updateVideo(id, videoData) {
        return this.request(`/videos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(videoData)
        });
    },
    
    async deleteVideo(id) {
        return this.request(`/videos/${id}`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Purchase/Payment endpoints
     */
    async purchaseVideo(videoId) {
        return this.request('/purchases', {
            method: 'POST',
            body: JSON.stringify({ video_id: videoId })
        });
    },
    
    async getPurchases() {
        return this.request('/purchases');
    },
    
    /**
     * Analytics endpoints
     */
    async getEarnings() {
        return this.request('/analytics/earnings');
    },
    
    async getViewStats() {
        return this.request('/analytics/views');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}