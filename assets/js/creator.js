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
        // For now, use demo data since video API might not be fully implemented
        creatorState.videos = [
            {
                id: 1,
                title: "Getting Started with Video Creation",
                description: "A comprehensive guide to creating engaging video content",
                duration: "15:30",
                views: 1250,
                purchases: 89,
                revenue: 445.00,
                status: "active",
                uploadDate: "2025-08-05",
                thumbnail: "https://via.placeholder.com/300x200?text=Video+1"
            },
            {
                id: 2,
                title: "Advanced Editing Techniques",
                description: "Learn professional video editing tips and tricks",
                duration: "22:15",
                views: 890,
                purchases: 67,
                revenue: 335.00,
                status: "active",
                uploadDate: "2025-08-03",
                thumbnail: "https://via.placeholder.com/300x200?text=Video+2"
            },
            {
                id: 3,
                title: "Monetization Strategies",
                description: "How to maximize your video revenue",
                duration: "18:45",
                views: 2100,
                purchases: 156,
                revenue: 780.00,
                status: "active",
                uploadDate: "2025-08-01",
                thumbnail: "https://via.placeholder.com/300x200?text=Video+3"
            }
        ];
        
        displayCreatorVideos();
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

/**
 * Load earnings data
 */
async function loadEarningsData() {
    try {
        // Demo earnings data
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
    } catch (error) {
        console.error('Error loading earnings:', error);
    }
}

/**
 * Display creator videos
 */
function displayCreatorVideos() {
    const videosContainer = document.getElementById('creatorVideos');
    if (!videosContainer || !creatorState.videos.length) return;
    
    const videosHTML = creatorState.videos.map(video => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100 shadow-sm">
                <div class="position-relative">
                    <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-success">${video.status}</span>
                    </div>
                    <div class="position-absolute bottom-0 end-0 m-2">
                        <span class="badge bg-dark">${video.duration}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title fw-bold">${video.title}</h6>
                    <p class="card-text text-muted small">${video.description}</p>
                    <div class="row text-center mt-3">
                        <div class="col-4">
                            <div class="text-primary fw-bold">${video.views}</div>
                            <small class="text-muted">Views</small>
                        </div>
                        <div class="col-4">
                            <div class="text-success fw-bold">${video.purchases}</div>
                            <small class="text-muted">Sales</small>
                        </div>
                        <div class="col-4">
                            <div class="text-info fw-bold">$${video.revenue}</div>
                            <small class="text-muted">Revenue</small>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="btn-group w-100" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="editVideo(${video.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm" onclick="viewAnalytics(${video.id})">
                            <i class="fas fa-chart-line"></i> Analytics
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteVideo(${video.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    videosContainer.innerHTML = videosHTML;
}

/**
 * Display earnings data
 */
function displayEarningsData() {
    // Update earnings metrics
    updateElement('totalRevenue', `$${creatorState.earnings.totalRevenue.toFixed(2)}`);
    updateElement('monthlyRevenue', `$${creatorState.earnings.monthlyRevenue.toFixed(2)}`);
    updateElement('totalViews', creatorState.earnings.totalViews.toLocaleString());
    updateElement('totalPurchases', creatorState.earnings.totalPurchases.toLocaleString());
    
    // Initialize earnings chart if chart container exists
    const chartContainer = document.getElementById('earningsChart');
    if (chartContainer) {
        initializeEarningsChart();
    }
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