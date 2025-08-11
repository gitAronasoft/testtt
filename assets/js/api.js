/**
 * VideoShare Platform API Service
 * Handles all API calls to the PHP backend
 */

class VideoShareAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000'; // PHP backend URL
        this.token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
    }

    /**
     * Set authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
    }

    /**
     * Get request headers
     * @returns {Object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Make HTTP request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} Response promise
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(email, password) {
        const response = await this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.data.token) {
            this.setToken(response.data.token);
            localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(response.data.user));
        }
        
        return response;
    }

    async register(userData) {
        return await this.makeRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async logout() {
        try {
            await this.makeRequest('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout request failed:', error);
        }
        
        // Clear local storage
        this.token = null;
        localStorage.removeItem(CONFIG.STORAGE.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE.USER);
        localStorage.removeItem(CONFIG.STORAGE.SESSION);
    }

    async getCurrentUser() {
        return await this.makeRequest('/auth/me');
    }

    // Video endpoints
    async getVideos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/videos?${queryString}` : '/videos';
        return await this.makeRequest(endpoint);
    }

    async getVideo(videoId) {
        return await this.makeRequest(`/videos/${videoId}`);
    }

    async createVideo(videoData) {
        return await this.makeRequest('/videos', {
            method: 'POST',
            body: JSON.stringify(videoData)
        });
    }

    async updateVideo(videoId, videoData) {
        return await this.makeRequest(`/videos/${videoId}`, {
            method: 'PUT',
            body: JSON.stringify(videoData)
        });
    }

    async deleteVideo(videoId) {
        return await this.makeRequest(`/videos/${videoId}`, {
            method: 'DELETE'
        });
    }

    async purchaseVideo(videoId) {
        return await this.makeRequest(`/videos/${videoId}/purchase`, {
            method: 'POST'
        });
    }

    async rateVideo(videoId, rating, review = null) {
        return await this.makeRequest(`/videos/${videoId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating, review })
        });
    }

    // User endpoints
    async getUserProfile(userId) {
        return await this.makeRequest(`/users/${userId}`);
    }

    async updateUserProfile(userId, userData) {
        return await this.makeRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async getUserVideos(userId) {
        return await this.makeRequest(`/users/${userId}/videos`);
    }

    async getUserPurchases(userId) {
        return await this.makeRequest(`/users/${userId}/purchases`);
    }

    async getUserWallet(userId) {
        return await this.makeRequest(`/users/${userId}/wallet`);
    }

    // Admin endpoints
    async getAdminDashboard() {
        return await this.makeRequest('/admin/dashboard');
    }

    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/users?${queryString}` : '/users';
        return await this.makeRequest(endpoint);
    }

    async updateUserStatus(userId, status) {
        return await this.makeRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async getPlatformSettings() {
        return await this.makeRequest('/admin/settings');
    }

    async updatePlatformSettings(settings) {
        return await this.makeRequest('/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    async getAdminLogs() {
        return await this.makeRequest('/admin/logs');
    }
}

// Initialize API service
const API = new VideoShareAPI();
/**
 * API client for VideoShare platform
 */
class API {
    static async login(email, password) {
        try {
            // Simulate API call for demo
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const account = CONFIG.DEMO_ACCOUNTS[email];
                    
                    if (!account) {
                        reject(new Error('No account found with this email address.'));
                        return;
                    }
                    
                    if (account.password !== password) {
                        reject(new Error('Incorrect password. Please try again.'));
                        return;
                    }
                    
                    resolve({
                        success: true,
                        data: {
                            user: {
                                id: account.id,
                                name: account.name,
                                email: email,
                                role: account.role
                            },
                            token: 'demo_token_' + Date.now()
                        }
                    });
                }, 1000);
            });
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async register(userData) {
        try {
            // Simulate API call for demo
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Check if email already exists
                    if (CONFIG.DEMO_ACCOUNTS[userData.email]) {
                        reject(new Error('An account with this email already exists.'));
                        return;
                    }
                    
                    resolve({
                        success: true,
                        data: {
                            user: {
                                id: 'user_' + Date.now(),
                                name: userData.name,
                                email: userData.email,
                                role: userData.role
                            }
                        }
                    });
                }, 1500);
            });
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async forgotPassword(email) {
        try {
            // Simulate API call for demo
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        message: 'Password reset instructions sent to your email.'
                    });
                }, 1000);
            });
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
