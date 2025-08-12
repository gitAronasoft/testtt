/**
 * VideoHub Data Service
 * Handles loading and managing data from JSON files
 * Provides API-like interface for easy backend migration
 */

class DataService {
    constructor() {
        this.cache = {
            users: null,
            videos: null,
            earnings: null,
            purchases: null
        };
        this.init();
    }

    async init() {
        // Pre-load all data
        await this.loadAllData();
    }

    async loadAllData() {
        try {
            const [users, videos, earnings, purchases] = await Promise.all([
                this.loadJSON('/data/users.json'),
                this.loadJSON('/data/videos.json'),
                this.loadJSON('/data/earnings.json'),
                this.loadJSON('/data/purchases.json')
            ]);

            this.cache.users = users.users || [];
            this.cache.videos = videos.videos || [];
            this.cache.earnings = earnings.earnings || [];
            this.cache.purchases = purchases.purchases || [];

            console.log('Data loaded successfully:', {
                users: this.cache.users.length,
                videos: this.cache.videos.length,
                earnings: this.cache.earnings.length,
                purchases: this.cache.purchases.length
            });
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            return {};
        }
    }

    // User Management
    async getUsers(filters = {}) {
        const users = [...this.cache.users];
        let filtered = users;

        if (filters.role) {
            filtered = filtered.filter(user => user.role === filters.role);
        }
        if (filters.status) {
            filtered = filtered.filter(user => user.status === filters.status);
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(user => 
                user.name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            );
        }

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;
        const paginatedUsers = filtered.slice(offset, offset + limit);

        return {
            success: true,
            data: {
                users: paginatedUsers,
                total: filtered.length,
                page,
                limit,
                totalPages: Math.ceil(filtered.length / limit)
            }
        };
    }

    async getUserById(id) {
        const user = this.cache.users.find(u => u.id === parseInt(id));
        return {
            success: !!user,
            data: user || null
        };
    }

    async getCurrentUser() {
        // Simulate getting current user from session
        const currentUserId = localStorage.getItem('currentUserId') || '1';
        return this.getUserById(currentUserId);
    }

    async updateUser(id, userData) {
        const userIndex = this.cache.users.findIndex(u => u.id === parseInt(id));
        if (userIndex !== -1) {
            this.cache.users[userIndex] = { ...this.cache.users[userIndex], ...userData };
            return {
                success: true,
                data: this.cache.users[userIndex]
            };
        }
        return {
            success: false,
            error: 'User not found'
        };
    }

    // Video Management
    async getVideos(filters = {}) {
        let videos = [...this.cache.videos];

        if (filters.creatorId) {
            videos = videos.filter(video => video.creatorId === parseInt(filters.creatorId));
        }
        if (filters.category) {
            videos = videos.filter(video => video.category === filters.category);
        }
        if (filters.status) {
            videos = videos.filter(video => video.status === filters.status);
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            videos = videos.filter(video => 
                video.title.toLowerCase().includes(search) ||
                video.description.toLowerCase().includes(search) ||
                video.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }

        // Sort options
        if (filters.sort) {
            switch (filters.sort) {
                case 'newest':
                    videos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                    break;
                case 'oldest':
                    videos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                    break;
                case 'views':
                    videos.sort((a, b) => b.views - a.views);
                    break;
                case 'earnings':
                    videos.sort((a, b) => b.earnings - a.earnings);
                    break;
                case 'price':
                    videos.sort((a, b) => b.price - a.price);
                    break;
            }
        }

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const offset = (page - 1) * limit;
        const paginatedVideos = videos.slice(offset, offset + limit);

        return {
            success: true,
            data: {
                videos: paginatedVideos,
                total: videos.length,
                page,
                limit,
                totalPages: Math.ceil(videos.length / limit)
            }
        };
    }

    async getVideoById(id) {
        const video = this.cache.videos.find(v => v.id === parseInt(id));
        return {
            success: !!video,
            data: video || null
        };
    }

    async getCreatorVideos(creatorId = null, filters = {}) {
        // Get current creator if not specified
        if (!creatorId) {
            const currentUser = await this.getCurrentUser();
            if (!currentUser.success || currentUser.data.role !== 'creator') {
                return { success: false, error: 'Not a creator' };
            }
            creatorId = currentUser.data.id;
        }

        return this.getVideos({ ...filters, creatorId });
    }

    async getCreatorStats(creatorId = null) {
        if (!creatorId) {
            const currentUser = await this.getCurrentUser();
            if (!currentUser.success) return { success: false, error: 'User not found' };
            creatorId = currentUser.data.id;
        }

        const user = await this.getUserById(creatorId);
        if (!user.success || user.data.role !== 'creator') {
            return { success: false, error: 'Not a creator' };
        }

        return {
            success: true,
            data: user.data.stats
        };
    }

    // Earnings Management
    async getCreatorEarnings(creatorId = null, filters = {}) {
        if (!creatorId) {
            const currentUser = await this.getCurrentUser();
            if (!currentUser.success) return { success: false, error: 'User not found' };
            creatorId = currentUser.data.id;
        }

        let earnings = this.cache.earnings.filter(e => e.creatorId === parseInt(creatorId));

        if (filters.status) {
            earnings = earnings.filter(e => e.status === filters.status);
        }
        if (filters.dateFrom) {
            earnings = earnings.filter(e => new Date(e.purchaseDate) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            earnings = earnings.filter(e => new Date(e.purchaseDate) <= new Date(filters.dateTo));
        }

        // Sort by most recent
        earnings.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;
        const paginatedEarnings = earnings.slice(offset, offset + limit);

        return {
            success: true,
            data: {
                earnings: paginatedEarnings,
                total: earnings.length,
                page,
                limit,
                totalPages: Math.ceil(earnings.length / limit)
            }
        };
    }

    // Viewer Purchases
    async getViewerPurchases(viewerId = null, filters = {}) {
        if (!viewerId) {
            const currentUser = await this.getCurrentUser();
            if (!currentUser.success) return { success: false, error: 'User not found' };
            viewerId = currentUser.data.id;
        }

        let purchases = this.cache.purchases.filter(p => p.viewerId === parseInt(viewerId));

        if (filters.status) {
            purchases = purchases.filter(p => p.status === filters.status);
        }

        // Sort by most recent
        purchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;
        const paginatedPurchases = purchases.slice(offset, offset + limit);

        return {
            success: true,
            data: {
                purchases: paginatedPurchases,
                total: purchases.length,
                page,
                limit,
                totalPages: Math.ceil(purchases.length / limit)
            }
        };
    }

    async getViewerStats(viewerId = null) {
        if (!viewerId) {
            const currentUser = await this.getCurrentUser();
            if (!currentUser.success) return { success: false, error: 'User not found' };
            viewerId = currentUser.data.id;
        }

        const user = await this.getUserById(viewerId);
        if (!user.success) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            data: user.data.stats || {}
        };
    }

    // Admin Analytics
    async getAdminStats() {
        const totalUsers = this.cache.users.length;
        const totalVideos = this.cache.videos.length;
        const totalEarnings = this.cache.earnings.reduce((sum, e) => sum + e.price, 0);
        const totalCreators = this.cache.users.filter(u => u.role === 'creator').length;
        const totalViewers = this.cache.users.filter(u => u.role === 'viewer').length;
        
        const publishedVideos = this.cache.videos.filter(v => v.status === 'published').length;
        const pendingVideos = this.cache.videos.filter(v => v.status === 'pending').length;

        return {
            success: true,
            data: {
                totalUsers,
                totalVideos,
                totalEarnings,
                totalCreators,
                totalViewers,
                publishedVideos,
                pendingVideos,
                activeUsers: this.cache.users.filter(u => u.status === 'active').length
            }
        };
    }

    // API Simulation Methods (for form submissions, etc.)
    async uploadVideo(videoData) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: { id: Date.now(), ...videoData }
                });
            }, 1000);
        });
    }

    async updateVideo(id, videoData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: { id, ...videoData }
                });
            }, 500);
        });
    }

    async deleteVideo(id) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 500);
        });
    }

    async duplicateVideo(id) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: { id: Date.now(), title: 'Copy of Video' }
                });
            }, 500);
        });
    }

    async purchaseVideo(videoId, paymentData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: { transactionId: 'txn_' + Date.now() }
                });
            }, 1500);
        });
    }
}

// Initialize global data service
window.dataService = new DataService();