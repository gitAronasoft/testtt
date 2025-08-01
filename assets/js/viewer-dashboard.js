
// Viewer Dashboard JavaScript
let currentUser = null;
let mobileNavOpen = false;

// Initialize viewer dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupTheme();
    setupMobileNavigation();
    initializeViewerDashboard();
    setupSearch();
});

// Check if user is authenticated and has viewer role
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
            
            // Allow access for all roles, but redirect admins and creators to their dashboards
            if (currentUser.role === 'admin') {
                // Show option to switch to admin dashboard but allow viewing
            } else if (['editor', 'creator'].includes(currentUser.role)) {
                // Show option to switch to creator dashboard but allow viewing
            }
            
            setupUserInfo();
            loadViewerData();
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

// Initialize viewer dashboard
function initializeViewerDashboard() {
    showPanel('discover');
    loadFeaturedVideos();
    loadAllVideos();
}

// Load featured videos
async function loadFeaturedVideos() {
    try {
        const response = await fetch('/api/videos.php?action=featured');
        const data = await response.json();

        if (data.success) {
            displayFeaturedVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load featured videos:', error);
    }
}

// Display featured videos
function displayFeaturedVideos(videos) {
    const container = document.getElementById('featuredVideos');
    if (!container) return;

    if (!videos || videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted-foreground py-4">
                    <i class="fas fa-video mb-2 fa-2x opacity-50"></i>
                    <p class="mb-0">No featured videos available</p>
                </div>
            </div>
        `;
        return;
    }

    // Show only first 3 featured videos
    const featuredVideos = videos.slice(0, 3);
    
    container.innerHTML = featuredVideos.map(video => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card border-0 shadow-lg hover-lift position-relative overflow-hidden">
                <div class="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br from-primary/20 to-transparent" style="z-index: 1;"></div>
                <div class="position-absolute top-0 end-0 m-3" style="z-index: 2;">
                    <span class="badge bg-warning text-dark">
                        <i class="fas fa-star me-1"></i>Featured
                    </span>
                </div>
                <div class="position-relative">
                    <img src="${video.thumbnail || '/api/placeholder/400/250'}" 
                         alt="${video.title}" 
                         class="card-img-top" 
                         style="height: 200px; object-fit: cover;">
                    <div class="position-absolute bottom-0 end-0 m-2">
                        <span class="badge bg-dark">${formatDuration(video.duration)}</span>
                    </div>
                </div>
                <div class="card-body" style="z-index: 2; position: relative;">
                    <h5 class="card-title">${video.title}</h5>
                    <p class="card-text text-muted-foreground">${truncateText(video.description, 100)}</p>
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-3 text-sm">
                            <span class="text-muted-foreground">
                                <i class="fas fa-user me-1"></i>${video.uploader_name}
                            </span>
                            <span class="text-muted-foreground">
                                <i class="fas fa-eye me-1"></i>${(video.views || 0).toLocaleString()}
                            </span>
                        </div>
                        ${video.price > 0 ? 
                            `<span class="badge bg-success fs-6">$${video.price}</span>` : 
                            '<span class="badge bg-info fs-6">Free</span>'
                        }
                    </div>
                    <div class="d-flex gap-2">
                        ${video.price > 0 ? `
                            <button class="btn btn-primary flex-grow-1" onclick="purchaseVideo('${video.id}', ${video.price})">
                                <i class="fas fa-shopping-cart me-2"></i>Buy Now
                            </button>
                        ` : `
                            <button class="btn btn-success flex-grow-1" onclick="watchVideo('${video.id}')">
                                <i class="fas fa-play me-2"></i>Watch Now
                            </button>
                        `}
                        <button class="btn btn-outline-secondary" onclick="addToWatchlist('${video.id}')" title="Add to Watchlist">
                            <i class="fas fa-bookmark"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="likeVideo('${video.id}')" title="Like">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Load all videos
async function loadAllVideos() {
    try {
        const response = await fetch('/api/videos.php?action=all');
        const data = await response.json();

        if (data.success) {
            displayAllVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load videos:', error);
        showNotification('Failed to load videos', 'error');
    }
}

// Display all videos
function displayAllVideos(videos) {
    const container = document.getElementById('allVideos');
    if (!container) return;

    if (!videos || videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center text-muted-foreground py-5">
                    <i class="fas fa-video mb-3 fa-3x opacity-50"></i>
                    <h5>No videos available</h5>
                    <p>Check back later for new content!</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = videos.map(video => `
        <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <div class="card border-0 shadow-sm hover-lift h-100">
                <div class="position-relative">
                    <img src="${video.thumbnail || '/api/placeholder/300/180'}" 
                         alt="${video.title}" 
                         class="card-img-top" 
                         style="height: 160px; object-fit: cover;">
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
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text text-muted-foreground small flex-grow-1">${truncateText(video.description, 80)}</p>
                    <div class="mt-auto">
                        <div class="d-flex align-items-center justify-content-between mb-2 text-sm text-muted-foreground">
                            <span><i class="fas fa-user me-1"></i>${video.uploader_name}</span>
                            <span><i class="fas fa-eye me-1"></i>${video.views || 0}</span>
                        </div>
                        <div class="d-flex gap-1">
                            ${video.price > 0 ? `
                                <button class="btn btn-primary btn-sm flex-grow-1" onclick="purchaseVideo('${video.id}', ${video.price})">
                                    <i class="fas fa-shopping-cart me-1"></i>Buy
                                </button>
                            ` : `
                                <button class="btn btn-success btn-sm flex-grow-1" onclick="watchVideo('${video.id}')">
                                    <i class="fas fa-play me-1"></i>Watch
                                </button>
                            `}
                            <button class="btn btn-outline-secondary btn-sm" onclick="addToWatchlist('${video.id}')" title="Watchlist">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
}

// Handle search
async function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) {
        loadAllVideos();
        return;
    }

    try {
        const response = await fetch(`/api/videos.php?action=search&query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            displayAllVideos(data.videos);
        }
    } catch (error) {
        console.error('Search failed:', error);
        showNotification('Search failed', 'error');
    }
}

// Filter functions
function filterVideos(type) {
    // Update button states
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Apply filter
    loadFilteredVideos(type);
}

async function loadFilteredVideos(type) {
    try {
        const response = await fetch(`/api/videos.php?action=filter&type=${type}`);
        const data = await response.json();

        if (data.success) {
            displayAllVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to filter videos:', error);
    }
}

function filterByCategory(category) {
    loadFilteredVideos(`category:${category}`);
}

function sortVideos(sortType) {
    loadFilteredVideos(`sort:${sortType}`);
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
        discover: 'Discover Videos',
        trending: 'Trending',
        categories: 'Categories',
        purchases: 'My Purchases',
        watchlist: 'My Watchlist',
        history: 'Watch History',
        favorites: 'Favorites',
        subscriptions: 'Subscriptions',
        notifications: 'Notifications',
        profile: 'Profile Settings',
        billing: 'Billing'
    };

    const titleElement = document.getElementById('pageTitle');
    if (titleElement && titles[panelName]) {
        titleElement.textContent = titles[panelName];
    }
}

// Load panel-specific data
function loadPanelData(panelName) {
    switch(panelName) {
        case 'purchases':
            loadPurchases();
            break;
        case 'watchlist':
            loadWatchlist();
            break;
        case 'history':
            loadWatchHistory();
            break;
        case 'trending':
            loadTrendingVideos();
            break;
        // Add more cases as needed
    }
}

// Video actions
async function watchVideo(videoId) {
    try {
        // Check if user has access to video
        const response = await fetch(`/api/videos.php?action=check_access&video_id=${videoId}`);
        const data = await response.json();

        if (data.success && data.has_access) {
            // Open video player
            openVideoPlayer(videoId);
        } else {
            showNotification('You need to purchase this video to watch it', 'warning');
        }
    } catch (error) {
        console.error('Failed to check video access:', error);
        showNotification('Failed to load video', 'error');
    }
}

async function purchaseVideo(videoId, price) {
    if (confirm(`Purchase this video for $${price}?`)) {
        try {
            const response = await fetch('/api/purchase.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'purchase',
                    video_id: videoId
                })
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Video purchased successfully!', 'success');
                // Refresh the video display or redirect to watch
                watchVideo(videoId);
            } else {
                showNotification(data.message || 'Purchase failed', 'error');
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            showNotification('Purchase failed', 'error');
        }
    }
}

async function addToWatchlist(videoId) {
    try {
        const response = await fetch('/api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_to_watchlist',
                video_id: videoId
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Added to watchlist', 'success');
        } else {
            showNotification(data.message || 'Failed to add to watchlist', 'error');
        }
    } catch (error) {
        console.error('Failed to add to watchlist:', error);
        showNotification('Failed to add to watchlist', 'error');
    }
}

function openVideoPlayer(videoId) {
    // Implement video player modal or redirect
    console.log('Opening video player for:', videoId);
    // You can implement a modal video player here
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // Enhanced notification implementation can be added here
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
window.watchVideo = watchVideo;
window.purchaseVideo = purchaseVideo;
window.addToWatchlist = addToWatchlist;
window.filterVideos = filterVideos;
window.filterByCategory = filterByCategory;
window.sortVideos = sortVideos;
