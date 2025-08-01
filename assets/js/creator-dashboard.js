
// Creator Dashboard JavaScript
let currentUser = null;
let mobileNavOpen = false;

// Initialize creator dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupTheme();
    setupMobileNavigation();
    initializeCreatorDashboard();
});

// Check if user is authenticated and has creator role
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'get_user' })
        });

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;
            
            // Check if user has creator/editor role
            if (!['editor', 'creator', 'admin'].includes(currentUser.role)) {
                // Redirect to appropriate dashboard based on role
                switch(currentUser.role) {
                    case 'viewer':
                        window.location.href = 'viewer-dashboard.html';
                        break;
                    default:
                        window.location.href = 'login.html';
                }
                return;
            }
            
            setupUserInfo();
            loadCreatorData();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'login.html';
    }
}

// Setup user information in the UI
function setupUserInfo() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');

    if (userNameElement) {
        userNameElement.textContent = currentUser.name;
    }
    if (userAvatarElement) {
        userAvatarElement.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

// Initialize creator dashboard
function initializeCreatorDashboard() {
    showPanel('overview');
    loadCreatorStats();
    loadRecentVideos();
}

// Load creator statistics
async function loadCreatorStats() {
    try {
        const response = await fetch('/api/earnings.php?action=stats');
        const data = await response.json();

        if (data.success) {
            updateCreatorStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Failed to load creator stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Update creator stats display
function updateCreatorStatsDisplay(stats) {
    const elements = {
        creatorVideos: document.getElementById('creatorVideos'),
        creatorViews: document.getElementById('creatorViews'),
        creatorSubscribers: document.getElementById('creatorSubscribers'),
        creatorEarnings: document.getElementById('creatorEarnings')
    };

    if (elements.creatorVideos) {
        elements.creatorVideos.textContent = stats.total_videos || 0;
    }
    if (elements.creatorViews) {
        elements.creatorViews.textContent = (stats.total_views || 0).toLocaleString();
    }
    if (elements.creatorSubscribers) {
        elements.creatorSubscribers.textContent = (stats.total_subscribers || 0).toLocaleString();
    }
    if (elements.creatorEarnings) {
        elements.creatorEarnings.textContent = `$${(stats.monthly_earnings || 0).toFixed(2)}`;
    }
}

// Load recent videos
async function loadRecentVideos() {
    try {
        const response = await fetch('/api/videos.php?action=my_videos&limit=5');
        const data = await response.json();

        if (data.success) {
            displayRecentVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load recent videos:', error);
    }
}

// Display recent videos
function displayRecentVideos(videos) {
    const videosList = document.getElementById('recentVideosList');
    if (!videosList) return;

    if (!videos || videos.length === 0) {
        videosList.innerHTML = `
            <div class="text-center text-muted-foreground py-4">
                <i class="fas fa-video mb-2 fa-2x opacity-50"></i>
                <p class="mb-0">No videos uploaded yet</p>
                <button class="btn btn-primary mt-3" onclick="showPanel('upload')">
                    <i class="fas fa-plus me-2"></i>Upload Your First Video
                </button>
            </div>
        `;
        return;
    }

    videosList.innerHTML = videos.map(video => `
        <div class="d-flex align-items-center gap-3 p-3 border-bottom">
            <div class="position-relative">
                <img src="${video.thumbnail || '/api/placeholder/60/40'}" 
                     alt="${video.title}" 
                     class="rounded" 
                     style="width: 60px; height: 40px; object-fit: cover;">
                <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                    <i class="fas fa-play text-white"></i>
                </div>
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-1">${video.title}</h6>
                <div class="d-flex align-items-center gap-3 text-sm text-muted-foreground">
                    <span><i class="fas fa-eye me-1"></i>${video.views || 0} views</span>
                    <span><i class="fas fa-calendar me-1"></i>${formatDate(video.created_at)}</span>
                    ${video.price > 0 ? `<span class="badge bg-success">$${video.price}</span>` : '<span class="badge bg-info">Free</span>'}
                </div>
            </div>
            <div class="btn-group">
                <button class="btn btn-outline-primary btn-sm" onclick="editVideo('${video.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="viewVideo('${video.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Panel management
function showPanel(panelName) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // Show selected panel
    const targetPanel = document.getElementById(panelName + 'Panel');
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }

    // Update navigation
    updateNavigation(panelName);
    updatePageTitle(panelName);

    // Load panel-specific data
    loadPanelData(panelName);
}

// Update navigation active state
function updateNavigation(activePanelName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-primary', 'text-white');
    });

    const activeItem = document.querySelector(`[onclick="showPanel('${activePanelName}')"]`);
    if (activeItem) {
        activeItem.classList.add('active', 'bg-primary', 'text-white');
    }
}

// Update page title
function updatePageTitle(panelName) {
    const titles = {
        overview: 'Creator Dashboard',
        analytics: 'Analytics',
        myVideos: 'My Videos',
        upload: 'Upload Video',
        drafts: 'Drafts',
        earnings: 'Earnings',
        subscribers: 'Subscribers',
        pricing: 'Pricing',
        youtube: 'YouTube Sync',
        promotion: 'Promotion'
    };

    const titleElement = document.getElementById('pageTitle');
    if (titleElement && titles[panelName]) {
        titleElement.textContent = titles[panelName];
    }
}

// Load panel-specific data
function loadPanelData(panelName) {
    switch(panelName) {
        case 'myVideos':
            loadMyVideos();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'earnings':
            loadEarnings();
            break;
        case 'upload':
            setupUploadForm();
            break;
        // Add more cases as needed
    }
}

// Load my videos
async function loadMyVideos() {
    try {
        const response = await fetch('/api/videos.php?action=my_videos');
        const data = await response.json();

        if (data.success) {
            displayMyVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load videos:', error);
        showNotification('Failed to load videos', 'error');
    }
}

// Display my videos
function displayMyVideos(videos) {
    const container = document.getElementById('myVideosContainer');
    if (!container) return;

    if (!videos || videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted-foreground py-5">
                    <i class="fas fa-video mb-3 fa-3x opacity-50"></i>
                    <h5>No videos uploaded yet</h5>
                    <p>Start sharing your content with the world!</p>
                    <button class="btn btn-primary" onclick="showPanel('upload')">
                        <i class="fas fa-plus me-2"></i>Upload Your First Video
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = videos.map(video => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm hover-lift">
                <div class="position-relative">
                    <img src="${video.thumbnail || '/api/placeholder/300/200'}" 
                         alt="${video.title}" 
                         class="card-img-top" 
                         style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-2">
                        ${video.price > 0 ? 
                            `<span class="badge bg-success">$${video.price}</span>` : 
                            '<span class="badge bg-info">Free</span>'
                        }
                    </div>
                    <div class="position-absolute bottom-0 end-0 m-2">
                        <span class="badge bg-dark">${formatDuration(video.duration)}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text text-muted-foreground small">${truncateText(video.description, 100)}</p>
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-3 text-sm text-muted-foreground">
                            <span><i class="fas fa-eye me-1"></i>${video.views || 0}</span>
                            <span><i class="fas fa-heart me-1"></i>${video.likes || 0}</span>
                        </div>
                        <small class="text-muted-foreground">${formatDate(video.created_at)}</small>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-grow-1" onclick="editVideo('${video.id}')">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="viewVideo('${video.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteVideo('${video.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup upload form
function setupUploadForm() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm && !uploadForm.hasEventListener) {
        uploadForm.addEventListener('submit', handleVideoUpload);
        uploadForm.hasEventListener = true;
    }
}

// Handle video upload
async function handleVideoUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    formData.append('action', 'upload');

    try {
        showNotification('Uploading video...', 'info');
        
        const response = await fetch('/api/videos.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Video uploaded successfully!', 'success');
            event.target.reset();
            showPanel('myVideos');
        } else {
            showNotification(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showNotification('Upload failed. Please try again.', 'error');
    }
}

// Theme management
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        body.classList.add('dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    const currentTheme = body.getAttribute('data-theme');
    
    if (currentTheme === 'light') {
        body.setAttribute('data-theme', 'dark');
        body.classList.add('dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        body.classList.remove('dark');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        localStorage.setItem('theme', 'light');
    }
}

// Mobile navigation
function setupMobileNavigation() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 992) {
        sidebar.classList.add('d-none');
    }
}

function toggleMobileNav() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    mobileNavOpen = !mobileNavOpen;

    if (mobileNavOpen) {
        sidebar.classList.remove('d-none');
        sidebar.classList.add('position-fixed', 'top-0', 'start-0', 'h-100');
        sidebar.style.width = '280px';
        sidebar.style.zIndex = '1050';
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('d-none');
        sidebar.classList.remove('position-fixed', 'top-0', 'start-0', 'h-100');
        sidebar.style.width = '';
        sidebar.style.zIndex = '';
        document.body.style.overflow = '';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // Enhanced notification implementation can be added here
}

// Video actions
function editVideo(videoId) {
    // Implement video editing functionality
    console.log('Edit video:', videoId);
}

function viewVideo(videoId) {
    // Implement video viewing functionality
    console.log('View video:', videoId);
}

function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        // Implement video deletion
        console.log('Delete video:', videoId);
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'logout' })
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = 'login.html';
    }
}

// Make functions globally available
window.showPanel = showPanel;
window.toggleTheme = toggleTheme;
window.toggleMobileNav = toggleMobileNav;
window.logout = logout;
window.editVideo = editVideo;
window.viewVideo = viewVideo;
window.deleteVideo = deleteVideo;
