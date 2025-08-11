/**
 * Simplified Dashboard JavaScript for VideoShare platform
 * Handles dashboard functionality for creators and viewers
 */

// Dashboard state
let dashboardData = {
    user: null,
    videos: [],
    stats: {},
    earnings: {},
    loading: false
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

/**
 * Initialize dashboard functionality
 */
async function initializeDashboard() {
    console.log('Initializing simplified dashboard');
    
    // Check authentication
    const user = getCurrentUser();
    if (!user) {
        redirectToLogin();
        return;
    }
    
    dashboardData.user = user;
    
    // Setup event listeners
    setupDashboardEventListeners();
    
    // Load dashboard data
    await loadDashboardData();
    
    // Update UI
    updateDashboardUI();
}

/**
 * Setup dashboard event listeners
 */
function setupDashboardEventListeners() {
    // Handle logout
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            await API.logout();
            window.location.href = '../index.html';
        });
    });
    
    // Handle refresh button
    const refreshButton = document.querySelector('.refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', async function() {
            await loadDashboardData();
            updateDashboardUI();
            showAlert('Data refreshed successfully', 'success');
        });
    }
    
    // Handle video purchase buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('purchase-video')) {
            handleVideoPurchase(e.target.dataset.videoId);
        }
    });
    
    // Handle video rating
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('rate-video')) {
            handleVideoRating(e.target.dataset.videoId, e.target.dataset.rating);
        }
    });
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
    try {
        dashboardData.loading = true;
        updateLoadingState(true);
        
        const user = dashboardData.user;
        
        if (user.role === 'creator') {
            // Load creator data
            const [videosResponse, statsResponse] = await Promise.all([
                API.getUserVideos(user.id),
                API.getUserWallet(user.id)
            ]);
            
            if (videosResponse.success) {
                dashboardData.videos = videosResponse.data.videos || [];
            }
            
            if (statsResponse.success) {
                dashboardData.earnings = statsResponse.data || {};
            }
            
        } else if (user.role === 'viewer') {
            // Load viewer data
            const [videosResponse, purchasesResponse, walletResponse] = await Promise.all([
                API.getVideos({ limit: 12 }),
                API.getUserPurchases(user.id),
                API.getUserWallet(user.id)
            ]);
            
            if (videosResponse.success) {
                dashboardData.videos = videosResponse.data.videos || [];
            }
            
            if (walletResponse.success) {
                dashboardData.wallet = walletResponse.data || {};
            }
            
        } else if (user.role === 'admin') {
            // Load admin data
            const statsResponse = await API.getAdminDashboard();
            
            if (statsResponse.success) {
                dashboardData.stats = statsResponse.data || {};
            }
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data', 'error');
    } finally {
        dashboardData.loading = false;
        updateLoadingState(false);
    }
}

/**
 * Update dashboard UI with loaded data
 */
function updateDashboardUI() {
    const user = dashboardData.user;
    
    // Update user info
    updateUserInfo(user);
    
    if (user.role === 'creator') {
        updateCreatorDashboard();
    } else if (user.role === 'viewer') {
        updateViewerDashboard();
    } else if (user.role === 'admin') {
        updateAdminDashboard();
    }
}

/**
 * Update user info in header
 */
function updateUserInfo(user) {
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    const userEmail = document.querySelector('.user-email');
    
    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (userEmail) userEmail.textContent = user.email;
}

/**
 * Update creator dashboard
 */
function updateCreatorDashboard() {
    const videos = dashboardData.videos;
    const earnings = dashboardData.earnings;
    
    // Update stats cards
    updateStatCard('total-videos', videos.length);
    updateStatCard('total-earnings', `$${(earnings.total_earned || 0).toFixed(2)}`);
    updateStatCard('current-balance', `$${(earnings.balance || 0).toFixed(2)}`);
    
    // Update videos list
    updateVideosList(videos, 'creator');
    
    // Update recent activity
    updateRecentActivity(videos.slice(0, 5));
}

/**
 * Update viewer dashboard
 */
function updateViewerDashboard() {
    const videos = dashboardData.videos;
    const wallet = dashboardData.wallet;
    
    // Update wallet balance
    updateStatCard('wallet-balance', `$${(wallet?.balance || 0).toFixed(2)}`);
    
    // Update available videos
    updateVideosList(videos, 'viewer');
}

/**
 * Update admin dashboard
 */
function updateAdminDashboard() {
    const stats = dashboardData.stats;
    
    // Update admin stats
    updateStatCard('total-users', stats.total_users || 0);
    updateStatCard('total-videos', stats.total_videos || 0);
    updateStatCard('total-revenue', `$${(stats.total_revenue || 0).toFixed(2)}`);
    updateStatCard('active-users', stats.active_users || 0);
}

/**
 * Update stat card
 */
function updateStatCard(cardId, value) {
    const card = document.getElementById(cardId);
    if (card) {
        const valueElement = card.querySelector('.stat-value') || card;
        valueElement.textContent = value;
    }
}

/**
 * Update videos list
 */
function updateVideosList(videos, userRole) {
    const videosList = document.querySelector('.videos-list');
    if (!videosList) return;
    
    if (videos.length === 0) {
        videosList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-video fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">${userRole === 'creator' ? 'No videos uploaded yet' : 'No videos available'}</h5>
            </div>
        `;
        return;
    }
    
    const videosHTML = videos.map(video => `
        <div class="col-md-4 mb-4">
            <div class="card video-card">
                <img src="${video.thumbnail_url || 'https://via.placeholder.com/320x180?text=' + encodeURIComponent(video.title)}" 
                     class="card-img-top" alt="${video.title}">
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text small text-muted">${video.description.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-primary fw-bold">$${video.price}</span>
                        <small class="text-muted">${video.view_count} views</small>
                    </div>
                    ${userRole === 'viewer' ? `
                        <div class="mt-2">
                            <button class="btn btn-primary btn-sm purchase-video" data-video-id="${video.id}">
                                Purchase
                            </button>
                            <button class="btn btn-outline-secondary btn-sm rate-video" data-video-id="${video.id}" data-rating="5">
                                ⭐ Rate
                            </button>
                        </div>
                    ` : ''}
                    ${userRole === 'creator' ? `
                        <div class="mt-2">
                            <small class="text-success">${video.purchase_count || 0} purchases</small>
                            <span class="float-end">
                                <span class="badge bg-${video.status === 'published' ? 'success' : 'warning'}">${video.status}</span>
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    videosList.innerHTML = videosHTML;
}

/**
 * Update recent activity
 */
function updateRecentActivity(recentVideos) {
    const activityList = document.querySelector('.recent-activity');
    if (!activityList || !recentVideos.length) return;
    
    const activityHTML = recentVideos.map(video => `
        <div class="activity-item d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <small class="text-muted">Video uploaded</small>
                <div class="fw-bold">${video.title}</div>
            </div>
            <small class="text-muted">${new Date(video.created_at).toLocaleDateString()}</small>
        </div>
    `).join('');
    
    activityList.innerHTML = activityHTML;
}

/**
 * Handle video purchase
 */
async function handleVideoPurchase(videoId) {
    try {
        const response = await API.purchaseVideo(videoId);
        if (response.success) {
            showAlert('Video purchased successfully!', 'success');
            await loadDashboardData();
            updateDashboardUI();
        } else {
            showAlert(response.error || 'Purchase failed', 'error');
        }
    } catch (error) {
        console.error('Purchase error:', error);
        showAlert('Purchase failed', 'error');
    }
}

/**
 * Handle video rating
 */
async function handleVideoRating(videoId, rating) {
    try {
        const response = await API.rateVideo(videoId, parseInt(rating));
        if (response.success) {
            showAlert('Rating submitted successfully!', 'success');
        } else {
            showAlert(response.error || 'Rating failed', 'error');
        }
    } catch (error) {
        console.error('Rating error:', error);
        showAlert('Rating failed', 'error');
    }
}

/**
 * Update loading state
 */
function updateLoadingState(isLoading) {
    const loadingIndicator = document.querySelector('.loading-indicator');
    const contentArea = document.querySelector('.dashboard-content');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    if (contentArea) {
        contentArea.style.opacity = isLoading ? '0.6' : '1';
    }
}

/**
 * Redirect to login
 */
function redirectToLogin() {
    window.location.href = '../login.html';
}