/**
 * Creator Dashboard JavaScript for VideoShare platform
 * Handles creator-specific functionality, video management, and analytics
 */

// Creator state management
let creatorState = {
    currentUser: null,
    videos: [],
    earnings: {},
    isLoading: false
};

// Initialize creator dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCreatorDashboard();
    checkAuthentication();
    loadCreatorData();
    setupCreatorEventListeners();
});

/**
 * Initialize creator dashboard
 */
function initializeCreatorDashboard() {
    console.log('Creator dashboard initialized');
    
    // Setup navigation
    setupNavigation();
    
    // Setup page-specific functionality
    const currentPage = getCurrentPage();
    initializePageSpecific(currentPage);
}

/**
 * Get safe config values with fallbacks
 */
function getSafeConfig() {
    return {
        STORAGE: {
            USER: (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE) ? CONFIG.STORAGE.USER : 'videoShareUser',
            TOKEN: (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE) ? CONFIG.STORAGE.TOKEN : 'videoShareToken',
            SESSION: (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE) ? CONFIG.STORAGE.SESSION : 'videoShareSession'
        },
        UI: {
            MAX_FILE_SIZE: (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.UI) ? CONFIG.UI.MAX_FILE_SIZE : 104857600
        }
    };
}

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    try {
        const config = getSafeConfig();
        const user = localStorage.getItem(config.STORAGE.USER);
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Check authentication and user role
 */
function checkAuthentication() {
    const config = getSafeConfig();
    
    const user = localStorage.getItem(config.STORAGE.USER);
    const token = localStorage.getItem(config.STORAGE.TOKEN);
    
    if (!user || !token) {
        console.log('No authentication found, redirecting to login');
        window.location.href = '../login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        if (userData.role !== 'creator') {
            console.log('User is not a creator, redirecting');
            window.location.href = '../login.html';
            return;
        }
        
        creatorState.currentUser = userData;
        updateUserDisplay(userData);
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '../login.html';
    }
}

/**
 * Load creator data
 */
async function loadCreatorData() {
    if (!creatorState.currentUser) return;
    
    try {
        // Load videos
        await loadCreatorVideos();
        
        // Load earnings data
        await loadEarningsData();
        
        // Update dashboard metrics
        updateDashboardMetrics();
        
    } catch (error) {
        console.error('Error loading creator data:', error);
        showAlert('Error loading dashboard data', 'danger');
    }
}

/**
 * Load creator videos
 */
async function loadCreatorVideos() {
    try {
        if (!creatorState.currentUser) {
            console.error('No current user found');
            return;
        }

        // Load real videos from API for this creator
        const response = await API.getVideos({
            creator_id: creatorState.currentUser.id
        });
        
        if (response.success) {
            creatorState.videos = response.data || [];
            console.log('Creator videos loaded successfully:', creatorState.videos);
            displayCreatorVideos();
        } else {
            console.error('Failed to load creator videos:', response.message);
            showEmptyVideosState();
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        showEmptyVideosState();
    }
}

/**
 * Load earnings data
 */
async function loadEarningsData() {
    try {
        if (!creatorState.currentUser) {
            console.error('No current user found');
            return;
        }

        // Load real earnings data from API
        const response = await API.getStats('creator');
        
        if (response.success) {
            creatorState.earnings = {
                totalRevenue: response.data.total_earnings || 0,
                monthlyRevenue: response.data.monthly_earnings || 0,
                totalViews: response.data.total_views || 0,
                totalPurchases: response.data.total_purchases || 0,
                monthlyData: response.data.monthly_data || []
            };
            console.log('Creator earnings loaded successfully:', creatorState.earnings);
            displayEarningsData();
        } else {
            console.error('Failed to load creator earnings:', response.message);
        }
    } catch (error) {
        console.error('Error loading earnings:', error);
        // Use fallback data for demo
        creatorState.earnings = {
            totalRevenue: 1560.00,
            monthlyRevenue: 445.00,
            totalViews: 4240,
            totalPurchases: 312,
            averageRevenuePerVideo: 520.00,
            monthlyData: [
                { month: 'Jan', revenue: 320 },
                { month: 'Feb', revenue: 480 },
                { month: 'Mar', revenue: 390 },
                { month: 'Apr', revenue: 590 },
                { month: 'May', revenue: 720 },
                { month: 'Jun', revenue: 650 },
                { month: 'Jul', revenue: 580 },
                { month: 'Aug', revenue: 445 }
            ]
        };
        
        displayEarningsData();
    }
}

/**
 * Display creator videos
 */
function displayCreatorVideos() {
    const videosContainer = document.getElementById('videosContainer');
    if (!videosContainer) return;
    
    if (!creatorState.videos || creatorState.videos.length === 0) {
        showEmptyVideosState();
        return;
    }
    
    const videosHTML = creatorState.videos.map(video => {
        const statusClass = video.status === 'published' ? 'bg-success' : 'bg-warning';
        const statusText = video.status === 'published' ? 'Published' : 'Draft';
        
        return `
        <div class="col">
            <div class="card video-card border-0 shadow-sm h-100">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400'}" 
                         class="card-img-top" alt="${video.title}">
                    <div class="video-duration">${video.duration || '00:00'}</div>
                    <div class="video-status ${video.status}">${statusText}</div>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text">${video.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <small class="text-muted">
                            <i class="fas fa-eye me-1"></i>${video.views || 0} views
                        </small>
                        <small class="text-success fw-bold">
                            <i class="fas fa-dollar-sign me-1"></i>$${video.price || '0.00'}
                        </small>
                    </div>
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-sm btn-outline-primary" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" title="Analytics">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" title="Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    videosContainer.innerHTML = videosHTML;
}

/**
 * Show empty videos state
 */
function showEmptyVideosState() {
    const videosContainer = document.getElementById('videosContainer');
    if (!videosContainer) return;
    
    videosContainer.innerHTML = `
        <div class="col-12">
            <div class="text-center py-5">
                <i class="fas fa-video fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No videos uploaded yet</h5>
                <p class="text-muted">Start by uploading your first video to share with your audience.</p>
                <a href="creator-upload.html" class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Upload Your First Video
                </a>
            </div>
        </div>
    `;
}

/**
 * Display earnings data
 */
function displayEarningsData() {
    // Update earnings metrics
    updateElement('totalRevenue', `$${creatorState.earnings.totalRevenue.toFixed(2)}`);
    updateElement('monthlyRevenue', `$${creatorState.earnings.monthlyRevenue.toFixed(2)}`);
    updateElement('totalEarnings', `$${creatorState.earnings.totalRevenue.toFixed(2)}`);
    updateElement('totalViews', creatorState.earnings.totalViews.toLocaleString());
    updateElement('totalPurchases', creatorState.earnings.totalPurchases.toLocaleString());
    
    // Load purchase history for earnings page
    loadPurchaseHistory();
    
    // Load payout history for earnings page  
    loadPayoutHistory();
    
    // Initialize earnings chart if chart container exists
    const chartContainer = document.getElementById('earningsChart');
    if (chartContainer) {
        initializeEarningsChart();
    }
}

/**
 * Load purchase history for earnings page
 */
function loadPurchaseHistory() {
    const tableBody = document.getElementById('purchaseHistoryTable');
    if (!tableBody) return;
    
    // Demo purchase history data - in real app this would come from API
    const purchaseHistory = [
        { date: 'Aug 10, 2025', video: 'Introduction to Web Development', customer: 'viewer@demo.com', amount: 29.99 },
        { date: 'Aug 9, 2025', video: 'Advanced React Patterns', customer: 'john.doe@email.com', amount: 49.99 },
        { date: 'Aug 8, 2025', video: 'Database Design Fundamentals', customer: 'mary.smith@email.com', amount: 39.99 },
        { date: 'Aug 7, 2025', video: 'Introduction to Web Development', customer: 'alex.wilson@email.com', amount: 29.99 },
        { date: 'Aug 6, 2025', video: 'Advanced React Patterns', customer: 'sarah.jones@email.com', amount: 49.99 }
    ];
    
    const historyHTML = purchaseHistory.map(purchase => `
        <tr>
            <td>${purchase.date}</td>
            <td>${purchase.video}</td>
            <td>${purchase.customer}</td>
            <td><span class="text-success fw-bold">$${purchase.amount}</span></td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = historyHTML;
}

/**
 * Load payout history for earnings page
 */
function loadPayoutHistory() {
    const container = document.getElementById('payoutHistoryContainer');
    if (!container) return;
    
    // Demo payout history data - in real app this would come from API
    const payoutHistory = [
        { date: 'Aug 1, 2025', method: 'PayPal', amount: 1200.00, status: 'Completed' },
        { date: 'Jul 1, 2025', method: 'PayPal', amount: 890.50, status: 'Completed' },
        { date: 'Jun 1, 2025', method: 'PayPal', amount: 650.75, status: 'Completed' }
    ];
    
    const historyHTML = payoutHistory.map(payout => `
        <div class="d-flex justify-content-between align-items-center p-3 border rounded mb-3">
            <div>
                <div class="fw-bold">${payout.date}</div>
                <small class="text-muted">${payout.method}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success">$${payout.amount.toFixed(2)}</div>
                <small class="badge bg-success">${payout.status}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = historyHTML;
}

/**
 * Initialize earnings chart
 */
function initializeEarningsChart() {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: creatorState.earnings.monthlyData.map(item => item.month),
            datasets: [{
                label: 'Monthly Revenue',
                data: creatorState.earnings.monthlyData.map(item => item.revenue),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update dashboard metrics
 */
function updateDashboardMetrics() {
    // Update overview metrics
    updateElement('totalVideos', creatorState.videos.length);
    updateElement('totalEarnings', `$${creatorState.earnings.totalRevenue.toFixed(2)}`);
    updateElement('totalViews', creatorState.earnings.totalViews.toLocaleString());
    updateElement('totalSales', creatorState.earnings.totalPurchases.toLocaleString());
}

/**
 * Update element text content safely
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // In a real app, you might show a toast notification here
}



/**
 * Update user display
 */
function updateUserDisplay(user) {
    updateElement('userName', user.name);
    updateElement('userEmail', user.email);
    updateElement('userRole', user.role.charAt(0).toUpperCase() + user.role.slice(1));
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Sidebar toggle functionality
    setupSidebarToggle();
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Logout links in dropdown
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });
}

/**
 * Setup sidebar toggle functionality
 */
function setupSidebarToggle() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            document.body.classList.toggle('sidebar-open');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            document.body.classList.remove('sidebar-open');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 991 && sidebar && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('show');
                document.body.classList.remove('sidebar-open');
            }
        }
    });
}

/**
 * Setup creator event listeners
 */
function setupCreatorEventListeners() {
    // Video upload form
    const uploadForm = document.getElementById('videoUploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUpload);
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsUpdate);
    }
    
    // File input for video upload
    const videoFileInput = document.getElementById('videoFile');
    if (videoFileInput) {
        videoFileInput.addEventListener('change', handleVideoFileSelect);
    }
}

/**
 * Get current page
 */
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('overview')) return 'overview';
    if (path.includes('videos')) return 'videos';
    if (path.includes('upload')) return 'upload';
    if (path.includes('earnings')) return 'earnings';
    if (path.includes('settings')) return 'settings';
    return 'overview';
}

/**
 * Initialize page-specific functionality
 */
function initializePageSpecific(page) {
    switch (page) {
        case 'overview':
            initializeOverviewPage();
            break;
        case 'videos':
            initializeVideosPage();
            break;
        case 'upload':
            initializeUploadPage();
            break;
        case 'earnings':
            initializeEarningsPage();
            break;
        case 'settings':
            initializeSettingsPage();
            break;
    }
}

/**
 * Initialize overview page
 */
function initializeOverviewPage() {
    console.log('Initializing overview page');
    // Overview-specific initialization
}

/**
 * Initialize videos page
 */
function initializeVideosPage() {
    console.log('Initializing videos page');
    // Videos-specific initialization
}

/**
 * Initialize upload page
 */
function initializeUploadPage() {
    console.log('Initializing upload page');
    // Upload-specific initialization
}

/**
 * Initialize earnings page
 */
function initializeEarningsPage() {
    console.log('Initializing earnings page');
    // Earnings-specific initialization
}

/**
 * Initialize settings page
 */
function initializeSettingsPage() {
    console.log('Initializing settings page');
    // Settings-specific initialization
}

/**
 * Handle video upload
 */
async function handleVideoUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const uploadButton = e.target.querySelector('button[type="submit"]');
    
    try {
        // Show loading state
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
        
        // Simulate upload process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showAlert('Video uploaded successfully!', 'success');
        e.target.reset();
        
    } catch (error) {
        showAlert('Error uploading video: ' + error.message, 'danger');
    } finally {
        uploadButton.disabled = false;
        uploadButton.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Video';
    }
}

/**
 * Handle settings update
 */
async function handleSettingsUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updateButton = e.target.querySelector('button[type="submit"]');
    
    try {
        updateButton.disabled = true;
        updateButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
        
        // Simulate update process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showAlert('Settings updated successfully!', 'success');
        
    } catch (error) {
        showAlert('Error updating settings: ' + error.message, 'danger');
    } finally {
        updateButton.disabled = false;
        updateButton.innerHTML = '<i class="fas fa-save me-2"></i>Update Settings';
    }
}

/**
 * Handle video file selection
 */
function handleVideoFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
    if (!allowedTypes.includes(file.type)) {
        showAlert('Please select a valid video file (MP4, AVI, MOV, WMV)', 'danger');
        e.target.value = '';
        return;
    }
    
    // Validate file size (100MB max)
    const config = getSafeConfig();
    const maxSize = config.UI.MAX_FILE_SIZE;
    if (file.size > maxSize) {
        showAlert('File size must be less than 100MB', 'danger');
        e.target.value = '';
        return;
    }
    
    // Show file info
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-file-video me-2"></i>
                <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
        `;
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    const config = getSafeConfig();
    
    localStorage.removeItem(config.STORAGE.USER);
    localStorage.removeItem(config.STORAGE.TOKEN);
    localStorage.removeItem(config.STORAGE.SESSION);
    window.location.href = '../login.html';
}

/**
 * Video management functions
 */
function editVideo(videoId) {
    showAlert('Edit video functionality coming soon!', 'info');
}

function viewAnalytics(videoId) {
    showAlert('Analytics functionality coming soon!', 'info');
}

function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        showAlert('Delete video functionality coming soon!', 'info');
    }
}

/**
 * Utility functions
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 4000);
}