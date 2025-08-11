// VideoShare Platform API Service
// Handles all API calls and data management for dynamic functionality

class VideoShareAPI {
    constructor() {
        this.baseURL = '/api'; // Future backend endpoint
        this.token = localStorage.getItem(CONFIG.STORAGE.AUTH_TOKEN);
        this.initialized = false;
        
        // Mock data storage for development
        this.mockData = {
            users: new Map(),
            videos: new Map(),
            transactions: new Map(),
            earnings: new Map()
        };
        
        this.init();
    }

    // Initialize API with mock data
    init() {
        if (!this.initialized) {
            this.setupMockData();
            this.initialized = true;
            console.log('API service initialized with mock data');
        }
    }

    // Setup comprehensive mock data
    setupMockData() {
        // Creator profile data
        const creatorProfile = {
            id: 'creator_001',
            username: 'creator_demo',
            email: 'creator@example.com',
            displayName: 'Demo Creator',
            role: 'creator',
            joinDate: '2024-01-15',
            profileImage: 'https://via.placeholder.com/150',
            totalEarnings: 2847.50,
            totalVideos: 24,
            totalViews: 12500,
            videosPurchased: 3247,
            subscriber_count: 892
        };

        // Sample videos data
        const mockVideos = [
            {
                id: 'video_001',
                title: 'Advanced JavaScript Tutorial',
                description: 'Complete guide to advanced JavaScript concepts',
                thumbnail: 'https://via.placeholder.com/320x180?text=JS+Tutorial',
                price: 12.99,
                duration: '45:30',
                category: 'Tutorial',
                views: 2340,
                purchases: 156,
                earnings: 1245.60,
                uploadDate: '2025-08-01',
                status: 'published',
                rating: 4.8
            },
            {
                id: 'video_002',
                title: 'React Components Deep Dive',
                description: 'Master React component patterns and best practices',
                thumbnail: 'https://via.placeholder.com/320x180?text=React+Guide',
                price: 15.99,
                duration: '38:15',
                category: 'Tutorial',
                views: 1890,
                purchases: 124,
                earnings: 856.20,
                uploadDate: '2025-07-28',
                status: 'published',
                rating: 4.9
            },
            {
                id: 'video_003',
                title: 'Product Review: Latest Tech',
                description: 'Comprehensive review of the latest technology products',
                thumbnail: 'https://via.placeholder.com/320x180?text=Tech+Review',
                price: 8.99,
                duration: '22:45',
                category: 'Review',
                views: 3200,
                purchases: 89,
                earnings: 456.70,
                uploadDate: '2025-07-25',
                status: 'published',
                rating: 4.6
            }
        ];

        // Transaction history
        const mockTransactions = [
            {
                id: 'trans_001',
                videoId: 'video_001',
                videoTitle: 'Advanced JavaScript Tutorial',
                amount: 12.99,
                date: '2025-08-07',
                type: 'video_sale',
                status: 'completed',
                buyerInfo: 'User123'
            },
            {
                id: 'trans_002',
                videoId: 'video_002',
                videoTitle: 'React Components Deep Dive',
                amount: 15.99,
                date: '2025-08-06',
                type: 'video_sale',
                status: 'completed',
                buyerInfo: 'TechUser45'
            },
            {
                id: 'trans_003',
                videoId: null,
                videoTitle: 'Monthly Subscription',
                amount: 45.00,
                date: '2025-08-05',
                type: 'subscription',
                status: 'pending',
                buyerInfo: 'Premium_User'
            },
            {
                id: 'trans_004',
                videoId: 'video_003',
                videoTitle: 'Viewer Tip',
                amount: 5.00,
                date: '2025-08-04',
                type: 'tip',
                status: 'completed',
                buyerInfo: 'GratefulViewer'
            }
        ];

        // Earnings breakdown data
        const mockEarnings = {
            total: 2847.50,
            thisMonth: 387.20,
            pending: 1245.30,
            paidOut: 1602.20,
            breakdown: {
                videoSales: 2456.80,
                tips: 235.70,
                bonuses: 155.00
            },
            categoryPerformance: {
                tutorials: { videos: 12, views: 8200, earnings: 1245.60, percentage: 43.7 },
                reviews: { videos: 7, views: 4800, earnings: 756.20, percentage: 26.5 },
                entertainment: { videos: 5, views: 2100, earnings: 845.50, percentage: 29.7 }
            },
            analytics: {
                averageEarningsPerView: 3.45,
                conversionRate: 87,
                averagePayoutTime: 7
            }
        };

        // Store mock data
        this.mockData.users.set('creator_001', creatorProfile);
        mockVideos.forEach(video => this.mockData.videos.set(video.id, video));
        mockTransactions.forEach(transaction => this.mockData.transactions.set(transaction.id, transaction));
        this.mockData.earnings.set('creator_001', mockEarnings);
    }

    // Authentication APIs
    async login(credentials) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock authentication logic
                if (credentials.email === 'creator@demo.com' && credentials.password === 'demo123') {
                    const token = 'mock_auth_token_creator';
                    const user = this.mockData.users.get('creator_001');
                    localStorage.setItem(CONFIG.STORAGE.AUTH_TOKEN, token);
                    localStorage.setItem(CONFIG.STORAGE.USER_DATA, JSON.stringify(user));
                    this.token = token;
                    resolve({ success: true, user, token });
                } else if (credentials.email === 'viewer@demo.com' && credentials.password === 'demo123') {
                    const token = 'mock_auth_token_viewer';
                    const user = { id: 'viewer_001', role: 'viewer', displayName: 'Demo Viewer' };
                    localStorage.setItem(CONFIG.STORAGE.AUTH_TOKEN, token);
                    localStorage.setItem(CONFIG.STORAGE.USER_DATA, JSON.stringify(user));
                    this.token = token;
                    resolve({ success: true, user, token });
                } else {
                    resolve({ success: false, error: 'Invalid credentials' });
                }
            }, 500);
        });
    }

    async logout() {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem(CONFIG.STORAGE.AUTH_TOKEN);
                localStorage.removeItem(CONFIG.STORAGE.USER_DATA);
                this.token = null;
                resolve({ success: true });
            }, 200);
        });
    }

    // User Profile APIs
    async getUserProfile(userId = 'creator_001') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = this.mockData.users.get(userId);
                if (user) {
                    resolve({ success: true, data: user });
                } else {
                    resolve({ success: false, error: 'User not found' });
                }
            }, 300);
        });
    }

    async updateUserProfile(userId, updates) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = this.mockData.users.get(userId);
                if (user) {
                    Object.assign(user, updates);
                    this.mockData.users.set(userId, user);
                    resolve({ success: true, data: user });
                } else {
                    resolve({ success: false, error: 'User not found' });
                }
            }, 400);
        });
    }

    // Video Management APIs
    async getVideos(filters = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let videos = Array.from(this.mockData.videos.values());
                
                // Apply filters
                if (filters.category) {
                    videos = videos.filter(v => v.category.toLowerCase() === filters.category.toLowerCase());
                }
                if (filters.status) {
                    videos = videos.filter(v => v.status === filters.status);
                }
                if (filters.search) {
                    const search = filters.search.toLowerCase();
                    videos = videos.filter(v => 
                        v.title.toLowerCase().includes(search) || 
                        v.description.toLowerCase().includes(search)
                    );
                }

                resolve({ success: true, data: videos, total: videos.length });
            }, 400);
        });
    }

    async getVideoById(videoId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const video = this.mockData.videos.get(videoId);
                if (video) {
                    resolve({ success: true, data: video });
                } else {
                    resolve({ success: false, error: 'Video not found' });
                }
            }, 200);
        });
    }

    async uploadVideo(videoData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const videoId = `video_${Date.now()}`;
                const newVideo = {
                    id: videoId,
                    ...videoData,
                    uploadDate: new Date().toISOString().split('T')[0],
                    status: 'processing',
                    views: 0,
                    purchases: 0,
                    earnings: 0,
                    rating: 0
                };
                
                this.mockData.videos.set(videoId, newVideo);
                resolve({ success: true, data: newVideo });
            }, 1000);
        });
    }

    async updateVideo(videoId, updates) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const video = this.mockData.videos.get(videoId);
                if (video) {
                    Object.assign(video, updates);
                    this.mockData.videos.set(videoId, video);
                    resolve({ success: true, data: video });
                } else {
                    resolve({ success: false, error: 'Video not found' });
                }
            }, 400);
        });
    }

    async deleteVideo(videoId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.mockData.videos.has(videoId)) {
                    this.mockData.videos.delete(videoId);
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'Video not found' });
                }
            }, 300);
        });
    }

    // Earnings and Analytics APIs
    async getEarningsData(userId = 'creator_001') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const earnings = this.mockData.earnings.get(userId);
                if (earnings) {
                    resolve({ success: true, data: earnings });
                } else {
                    resolve({ success: false, error: 'Earnings data not found' });
                }
            }, 300);
        });
    }

    async getTransactions(filters = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let transactions = Array.from(this.mockData.transactions.values());
                
                if (filters.type) {
                    transactions = transactions.filter(t => t.type === filters.type);
                }
                if (filters.status) {
                    transactions = transactions.filter(t => t.status === filters.status);
                }
                if (filters.dateFrom) {
                    transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
                }
                if (filters.dateTo) {
                    transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.dateTo));
                }

                resolve({ success: true, data: transactions, total: transactions.length });
            }, 400);
        });
    }

    async requestPayout(amount, paymentMethod) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const payoutId = `payout_${Date.now()}`;
                const payout = {
                    id: payoutId,
                    amount,
                    paymentMethod,
                    status: 'pending',
                    requestDate: new Date().toISOString().split('T')[0],
                    processDate: null
                };
                
                resolve({ success: true, data: payout });
            }, 600);
        });
    }

    // Dashboard Statistics
    async getDashboardStats(userId = 'creator_001') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = this.mockData.users.get(userId);
                const earnings = this.mockData.earnings.get(userId);
                const videos = Array.from(this.mockData.videos.values());
                const transactions = Array.from(this.mockData.transactions.values());

                const stats = {
                    totalVideos: videos.length,
                    totalViews: videos.reduce((sum, video) => sum + video.views, 0),
                    totalEarnings: earnings?.total || 0,
                    videosPurchased: videos.reduce((sum, video) => sum + video.purchases, 0),
                    thisMonth: {
                        earnings: earnings?.thisMonth || 0,
                        views: Math.floor(Math.random() * 2000) + 1000, // Mock monthly views
                        newVideos: videos.filter(v => {
                            const uploadDate = new Date(v.uploadDate);
                            const thisMonth = new Date();
                            return uploadDate.getMonth() === thisMonth.getMonth() && 
                                   uploadDate.getFullYear() === thisMonth.getFullYear();
                        }).length
                    },
                    recentActivity: transactions.slice(-5).map(t => ({
                        type: t.type,
                        title: t.videoTitle,
                        amount: t.amount,
                        date: t.date
                    }))
                };

                resolve({ success: true, data: stats });
            }, 400);
        });
    }

    // Purchase and Payment APIs
    async purchaseVideo(videoId, paymentMethod) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const video = this.mockData.videos.get(videoId);
                if (video) {
                    // Update video purchase count
                    video.purchases += 1;
                    video.earnings += video.price;
                    
                    // Create transaction record
                    const transactionId = `trans_${Date.now()}`;
                    const transaction = {
                        id: transactionId,
                        videoId,
                        videoTitle: video.title,
                        amount: video.price,
                        date: new Date().toISOString().split('T')[0],
                        type: 'video_purchase',
                        status: 'completed',
                        paymentMethod
                    };
                    
                    this.mockData.transactions.set(transactionId, transaction);
                    this.mockData.videos.set(videoId, video);
                    
                    resolve({ success: true, data: { transaction, video } });
                } else {
                    resolve({ success: false, error: 'Video not found' });
                }
            }, 800);
        });
    }

    // Error handling helper
    handleError(error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
}

// Global API instance
window.VideoShareAPI = new VideoShareAPI();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoShareAPI;
}