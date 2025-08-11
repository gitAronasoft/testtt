// Dashboard functionality for VideoShare platform
// Dynamic API-integrated version

// Dashboard state
let dashboardState = {
    currentSection: 'overview',
    isLoading: false,
    userData: null,
    videos: [],
    earnings: null,
    transactions: []
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized with API integration');
    initializeDashboard();
    setupEventHandlers();
});

// Initialize dashboard functionality
async function initializeDashboard() {
    try {
        // Load user data from localStorage
        const userData = localStorage.getItem(CONFIG.STORAGE.USER_DATA);
        if (userData) {
            dashboardState.userData = JSON.parse(userData);
            updateUserProfile();
        }
        
        // Setup navigation
        setupNavigation();
        
        // Load dashboard data using API
        await loadDashboardDataFromAPI();
        
        // Setup responsive behavior
        setupResponsiveBehavior();
        
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        showErrorMessage('Failed to load dashboard data');
    }
}

// Load dashboard data from API
async function loadDashboardDataFromAPI() {
    try {
        dashboardState.isLoading = true;
        showLoadingState(true);
        
        const userId = dashboardState.userData?.id || 'creator_001';
        
        // Load dashboard statistics
        const statsResult = await window.VideoShareAPI.getDashboardStats(userId);
        if (statsResult.success) {
            updateStatsCardsFromAPI(statsResult.data);
        }
        
        // Load videos
        const videosResult = await window.VideoShareAPI.getVideos();
        if (videosResult.success) {
            dashboardState.videos = videosResult.data;
            loadVideosFromAPI(videosResult.data);
        }
        
        // Load earnings data (for creators)
        if (dashboardState.userData?.role === 'creator') {
            const earningsResult = await window.VideoShareAPI.getEarningsData(userId);
            if (earningsResult.success) {
                dashboardState.earnings = earningsResult.data;
                updateEarningsDisplay(earningsResult.data);
            }
        }
        
        // Load transactions
        const transactionsResult = await window.VideoShareAPI.getTransactions();
        if (transactionsResult.success) {
            dashboardState.transactions = transactionsResult.data;
            loadRecentActivityFromAPI(transactionsResult.data);
        }
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please refresh the page.');
    } finally {
        dashboardState.isLoading = false;
        showLoadingState(false);
    }
}

// Update statistics cards from API data
function updateStatsCardsFromAPI(stats) {
    // Update total videos
    const totalVideosElements = document.querySelectorAll('[data-stat="total-videos"]');
    totalVideosElements.forEach(el => {
        el.textContent = stats.totalVideos || 0;
    });
    
    // Update total views
    const totalViewsElements = document.querySelectorAll('[data-stat="total-views"]');
    totalViewsElements.forEach(el => {
        el.textContent = formatNumber(stats.totalViews) || '0';
    });
    
    // Update total earnings
    const totalEarningsElements = document.querySelectorAll('[data-stat="total-earnings"]');
    totalEarningsElements.forEach(el => {
        el.textContent = formatCurrency(stats.totalEarnings) || '$0';
    });
    
    // Update videos purchased
    const videosPurchasedElements = document.querySelectorAll('[data-stat="videos-purchased"]');
    videosPurchasedElements.forEach(el => {
        el.textContent = formatNumber(stats.videosPurchased) || '0';
    });
}

// Load videos from API data
function loadVideosFromAPI(videos) {
    const videoContainers = document.querySelectorAll('[data-video-container]');
    
    videoContainers.forEach(container => {
        if (videos.length === 0) {
            container.innerHTML = '<div class="text-center py-5"><p class="text-muted">No videos found</p></div>';
            return;
        }
        
        container.innerHTML = videos.map(video => `
            <div class="col-md-4 mb-4">
                <div class="card video-card border-0 shadow-sm h-100">
                    <div class="position-relative">
                        <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-primary">${video.duration}</span>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-success">${formatCurrency(video.price)}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text small text-muted">${truncateText(video.description, 100)}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="small text-muted">
                                <i class="fas fa-eye me-1"></i>${formatNumber(video.views)} views
                            </div>
                            <div class="small text-muted">
                                <i class="fas fa-star me-1"></i>${video.rating}/5
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="small text-success fw-bold">
                                <i class="fas fa-shopping-cart me-1"></i>${video.purchases} purchases
                            </div>
                            <div class="small text-success fw-bold">
                                ${formatCurrency(video.earnings)} earned
                            </div>
                        </div>
                        <div class="mb-2">
                            <span class="badge bg-secondary me-1">${video.category}</span>
                            <span class="badge bg-${video.status === 'published' ? 'success' : 'warning'}">${video.status}</span>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0">
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill" onclick="editVideo('${video.id}')">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>
                            <button class="btn btn-sm btn-outline-info flex-fill" onclick="viewAnalytics('${video.id}')">
                                <i class="fas fa-chart-line me-1"></i>Analytics
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    });
}

// Load recent activity from API data
function loadRecentActivityFromAPI(transactions) {
    const activityContainers = document.querySelectorAll('[data-activity-container]');
    
    activityContainers.forEach(container => {
        if (transactions.length === 0) {
            container.innerHTML = '<div class="text-center py-3"><p class="text-muted">No recent activity</p></div>';
            return;
        }
        
        const recentTransactions = transactions.slice(-5).reverse();
        
        container.innerHTML = recentTransactions.map(transaction => {
            const icon = getTransactionIcon(transaction.type);
            const color = getTransactionColor(transaction.type);
            
            return `
                <div class="d-flex align-items-center py-2 border-bottom">
                    <div class="flex-shrink-0 me-3">
                        <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; background-color: var(--bs-${color}-rgb, 0.1);">
                            <i class="fas ${icon} text-${color}"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${transaction.videoTitle || getTransactionTitle(transaction.type)}</h6>
                        <small class="text-muted">${formatDate(transaction.date)}</small>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold text-${color}">${formatCurrency(transaction.amount)}</span>
                        <br>
                        <small class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">${transaction.status}</small>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// Update earnings display
function updateEarningsDisplay(earnings) {
    // Update earnings cards
    const totalElements = document.querySelectorAll('[data-earnings-card="total"]');
    totalElements.forEach(el => {
        el.textContent = formatCurrency(earnings.total);
    });
    
    const monthlyElements = document.querySelectorAll('[data-earnings-card="monthly"]');
    monthlyElements.forEach(el => {
        el.textContent = formatCurrency(earnings.thisMonth);
    });
    
    const pendingElements = document.querySelectorAll('[data-earnings-card="pending"]');
    pendingElements.forEach(el => {
        el.textContent = formatCurrency(earnings.pending);
    });
    
    const paidElements = document.querySelectorAll('[data-earnings-card="paid"]');
    paidElements.forEach(el => {
        el.textContent = formatCurrency(earnings.paidOut);
    });
}

// Setup event handlers
function setupEventHandlers() {
    // Video action handlers
    const videoButtons = document.querySelectorAll('.btn-video-action');
    videoButtons.forEach(button => {
        button.addEventListener('click', handleVideoAction);
    });
    
    // Search functionality
    const searchInput = document.getElementById('videoSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Upload form handlers
    const uploadForms = document.querySelectorAll('form[data-upload-form]');
    uploadForms.forEach(form => {
        form.addEventListener('submit', handleVideoUpload);
    });
    
    // Settings form handlers  
    const settingsForms = document.querySelectorAll('form[data-settings-form]');
    settingsForms.forEach(form => {
        form.addEventListener('submit', handleSettingsUpdate);
    });
    
    // Payout request handlers
    const payoutButtons = document.querySelectorAll('[data-payout-btn]');
    payoutButtons.forEach(btn => {
        btn.addEventListener('click', handlePayoutRequest);
    });
}

// Handle video upload
async function handleVideoUpload(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const videoData = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        thumbnail: 'https://via.placeholder.com/320x180?text=' + encodeURIComponent(formData.get('title')),
        duration: '00:00'
    };
    
    try {
        showLoadingState(true);
        const result = await window.VideoShareAPI.uploadVideo(videoData);
        
        if (result.success) {
            showSuccessMessage('Video uploaded successfully!');
            form.reset();
            await loadDashboardDataFromAPI();
        } else {
            showErrorMessage(result.error || 'Failed to upload video');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showErrorMessage('Upload failed. Please try again.');
    } finally {
        showLoadingState(false);
    }
}

// Handle settings update
async function handleSettingsUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const updates = {
        displayName: formData.get('displayName'),
        email: formData.get('email'),
        bio: formData.get('bio'),
        paymentMethod: formData.get('paymentMethod')
    };
    
    try {
        showLoadingState(true);
        const userId = dashboardState.userData?.id;
        const result = await window.VideoShareAPI.updateUserProfile(userId, updates);
        
        if (result.success) {
            showSuccessMessage('Settings updated successfully!');
            dashboardState.userData = result.data;
            localStorage.setItem(CONFIG.STORAGE.USER_DATA, JSON.stringify(result.data));
            updateUserProfile();
        } else {
            showErrorMessage(result.error || 'Failed to update settings');
        }
    } catch (error) {
        console.error('Settings update error:', error);
        showErrorMessage('Update failed. Please try again.');
    } finally {
        showLoadingState(false);
    }
}

// Handle payout request
async function handlePayoutRequest(event) {
    event.preventDefault();
    
    const amount = dashboardState.earnings?.pending || 0;
    const paymentMethod = 'PayPal'; // Default payment method
    
    try {
        showLoadingState(true);
        const result = await window.VideoShareAPI.requestPayout(amount, paymentMethod);
        
        if (result.success) {
            showSuccessMessage('Payout request submitted successfully!');
            await loadDashboardDataFromAPI();
        } else {
            showErrorMessage(result.error || 'Failed to request payout');
        }
    } catch (error) {
        console.error('Payout request error:', error);
        showErrorMessage('Payout request failed. Please try again.');
    } finally {
        showLoadingState(false);
    }
}

// Setup navigation
function setupNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.replace('../', ''))) {
            link.classList.add('active');
        }
    });
}

// Setup responsive behavior
function setupResponsiveBehavior() {
    // Mobile sidebar toggle
    const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
}

// Update user profile display
function updateUserProfile() {
    if (!dashboardState.userData) return;
    
    const userNameElements = document.querySelectorAll('[data-user-name]');
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    const userRoleElements = document.querySelectorAll('[data-user-role]');
    
    userNameElements.forEach(el => {
        el.textContent = dashboardState.userData.displayName || 'User';
    });
    
    userEmailElements.forEach(el => {
        el.textContent = dashboardState.userData.email || '';
    });
    
    userRoleElements.forEach(el => {
        el.textContent = dashboardState.userData.role || '';
    });
}

// Video action handlers
function editVideo(videoId) {
    console.log('Editing video:', videoId);
    showInfoMessage('Edit video functionality will be available soon');
}

function viewAnalytics(videoId) {
    console.log('Viewing analytics for video:', videoId);
    showInfoMessage('Video analytics will be available soon');
}

// Utility functions
function showLoadingState(isLoading) {
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(el => {
        el.style.display = isLoading ? 'block' : 'none';
    });
}

function showSuccessMessage(message) {
    showAlert(message, 'success');
}

function showErrorMessage(message) {
    showAlert(message, 'danger');
}

function showInfoMessage(message) {
    showAlert(message, 'info');
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function formatNumber(num) {
    if (!num) return '0';
    return num.toLocaleString();
}

function formatCurrency(amount) {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function getTransactionIcon(type) {
    const icons = {
        'video_sale': 'fa-video',
        'video_purchase': 'fa-shopping-cart',
        'subscription': 'fa-crown',
        'tip': 'fa-heart',
        'payout': 'fa-money-bill-wave'
    };
    return icons[type] || 'fa-dollar-sign';
}

function getTransactionColor(type) {
    const colors = {
        'video_sale': 'success',
        'video_purchase': 'primary',
        'subscription': 'info',
        'tip': 'warning',
        'payout': 'success'
    };
    return colors[type] || 'secondary';
}

function getTransactionTitle(type) {
    const titles = {
        'video_sale': 'Video Sale',
        'video_purchase': 'Video Purchase',
        'subscription': 'Subscription',
        'tip': 'Viewer Tip',
        'payout': 'Payout'
    };
    return titles[type] || 'Transaction';
}