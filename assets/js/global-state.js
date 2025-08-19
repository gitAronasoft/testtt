/**
 * Global State Management for VideoHub
 * Prevents duplicate API calls and manages shared data
 */
window.VideoHubState = {
    // Cache for API responses
    cache: {
        creators: new Map(),
        videos: new Map(),
        earnings: new Map(),
        metrics: new Map(),
        users: new Map()
    },
    
    // Loading states to prevent duplicate calls
    loading: {
        creatorData: false,
        videos: false,
        earnings: false,
        metrics: false
    },
    
    // Cache TTL (5 minutes)
    TTL: 5 * 60 * 1000,
    
    // Get cached data if it's still valid
    getCached: function(key, userId = null) {
        const cacheKey = userId ? `${key}_${userId}` : key;
        const cached = this.cache[key]?.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.TTL) {
            return cached.data;
        }
        return null;
    },
    
    // Set cached data
    setCached: function(key, data, userId = null) {
        const cacheKey = userId ? `${key}_${userId}` : key;
        if (!this.cache[key]) this.cache[key] = new Map();
        
        this.cache[key].set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    },
    
    // Check if currently loading
    isLoading: function(key) {
        return this.loading[key];
    },
    
    // Set loading state
    setLoading: function(key, state) {
        this.loading[key] = state;
    },
    
    // Clear cache
    clearCache: function() {
        Object.keys(this.cache).forEach(key => {
            this.cache[key].clear();
        });
    }
};