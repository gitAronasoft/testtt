/**
 * Dashboard functionality for VideoShare platform
 * Handles dynamic data loading for all dashboard pages
 */

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

/**
 * Initialize dashboard functionality
 */
function initializeDashboard() {
    console.log('Dashboard initialized');
    
    // Load dashboard-specific data based on current page
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('creator-overview.html')) {
        loadCreatorOverview();
    } else if (currentPage.includes('creator-videos.html')) {
        loadCreatorVideos();
    } else if (currentPage.includes('viewer-dashboard.html')) {
        loadViewerDashboard();
    } else if (currentPage.includes('admin-dashboard.html')) {
        loadAdminDashboard();
    }
}

/**
 * Load creator overview data
 */
async function loadCreatorOverview() {
    try {
        const userData = JSON.parse(localStorage.getItem('videoShareUser'));
        if (!userData) return;
        
        // Demo data for creator overview
        const overviewData = {
            total_videos: 15,
            total_views: 12450,
            total_earnings: 1847.50,
            monthly_earnings: 312.80,
            recent_videos: [
                {
                    title: 'Advanced React Patterns',
                    views: 1200,
                    earnings: 180.50,
                    date: '2025-08-09'
                },
                {
                    title: 'Database Design Fundamentals',
                    views: 890,
                    earnings: 156.75,
                    date: '2025-08-08'
                }
            ]
        };
        
        updateCreatorOverview(overviewData);
        
    } catch (error) {
        console.error('Error loading creator overview:', error);
    }
}

/**
 * Load creator videos data
 */
async function loadCreatorVideos() {
    try {
        const userData = JSON.parse(localStorage.getItem('videoShareUser'));
        if (!userData) return;
        
        // Demo data for creator videos
        const videosData = {
            videos: [
                {
                    id: 1,
                    title: 'Introduction to Web Development',
                    description: 'Learn HTML, CSS, and JavaScript basics',
                    price: 29.99,
                    views: 1250,
                    purchases: 42,
                    status: 'published',
                    created_at: '2025-08-07'
                },
                {
                    id: 2,
                    title: 'Advanced React Patterns',
                    description: 'Master advanced React techniques',
                    price: 49.99,
                    views: 890,
                    purchases: 28,
                    status: 'published',
                    created_at: '2025-08-06'
                },
                {
                    id: 3,
                    title: 'Database Design Fundamentals',
                    description: 'Learn database design principles',
                    price: 39.99,
                    views: 670,
                    purchases: 19,
                    status: 'published',
                    created_at: '2025-08-05'
                }
            ]
        };
        
        updateCreatorVideos(videosData.videos);
        
    } catch (error) {
        console.error('Error loading creator videos:', error);
    }
}

/**
 * Load viewer dashboard data
 */
async function loadViewerDashboard() {
    try {
        const userData = JSON.parse(localStorage.getItem('videoShareUser'));
        if (!userData) return;
        
        // Demo data for viewer dashboard
        const viewerData = {
            library_count: 8,
            wallet_balance: 125.50,
            recent_purchases: [
                {
                    title: 'Introduction to Web Development',
                    creator: 'Demo Creator',
                    price: 29.99,
                    date: '2025-08-09'
                }
            ],
            recommended_videos: [
                {
                    title: 'Advanced JavaScript Concepts',
                    creator: 'Demo Creator',
                    price: 39.99,
                    rating: 4.8
                }
            ]
        };
        
        updateViewerDashboard(viewerData);
        
    } catch (error) {
        console.error('Error loading viewer dashboard:', error);
    }
}

/**
 * Load admin dashboard data
 */
async function loadAdminDashboard() {
    try {
        // Demo data for admin dashboard
        const adminData = {
            total_users: 1247,
            total_videos: 3891,
            total_revenue: 45678.90,
            monthly_revenue: 8234.50,
            recent_users: [
                {
                    name: 'John Doe',
                    email: 'john@example.com',
                    role: 'creator',
                    joined: '2025-08-10'
                }
            ]
        };
        
        updateAdminDashboard(adminData);
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

/**
 * Update creator overview UI
 */
function updateCreatorOverview(data) {
    // Update stat cards
    updateStatCard('total-videos', data.total_videos);
    updateStatCard('total-views', data.total_views.toLocaleString());
    updateStatCard('total-earnings', `$${data.total_earnings.toFixed(2)}`);
    updateStatCard('monthly-earnings', `$${data.monthly_earnings.toFixed(2)}`);
}

/**
 * Update creator videos UI
 */
function updateCreatorVideos(videos) {
    const container = document.querySelector('[data-videos-container]');
    if (!container) return;
    
    container.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        container.appendChild(videoCard);
    });
}

/**
 * Update viewer dashboard UI
 */
function updateViewerDashboard(data) {
    // Update dashboard metrics
    const libraryCount = document.querySelector('[data-library-count]');
    if (libraryCount) libraryCount.textContent = data.library_count;
    
    const walletBalance = document.querySelector('[data-wallet-balance]');
    if (walletBalance) walletBalance.textContent = `$${data.wallet_balance.toFixed(2)}`;
}

/**
 * Update admin dashboard UI
 */
function updateAdminDashboard(data) {
    // Update admin metrics
    updateStatCard('total-users', data.total_users.toLocaleString());
    updateStatCard('total-videos', data.total_videos.toLocaleString());
    updateStatCard('total-revenue', `$${data.total_revenue.toFixed(2)}`);
    updateStatCard('monthly-revenue', `$${data.monthly_revenue.toFixed(2)}`);
}

/**
 * Update stat card value
 */
function updateStatCard(cardId, value) {
    const element = document.getElementById(cardId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Create video card element
 */
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    
    card.innerHTML = `
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
                <h6 class="card-title fw-bold">${video.title}</h6>
                <p class="card-text text-muted small">${video.description}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="text-success fw-bold">$${video.price.toFixed(2)}</span>
                    <span class="badge bg-${video.status === 'published' ? 'success' : 'warning'}">${video.status}</span>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        <i class="fas fa-eye me-1"></i>${video.views} views
                        <i class="fas fa-shopping-cart ms-2 me-1"></i>${video.purchases} purchases
                    </small>
                </div>
            </div>
        </div>
    `;
    
    return card;
}