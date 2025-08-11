/**
 * Main JavaScript file for VideoShare platform
 * Handles global functionality and navigation
 */

// Global variables
let currentUser = null;
let isLoggedIn = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('VideoShare platform initialized');
    
    // Set up smooth scrolling for anchor links
    setupSmoothScrolling();
    
    // Initialize Bootstrap components
    initializeBootstrapComponents();
    
    // Setup sidebar toggle
    setupSidebarToggle();
    
    // Check authentication status
    checkExistingSession();
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Handle logout links
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });

    // Handle mobile navbar toggle
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            const navbar = document.querySelector('.navbar-collapse');
            navbar.classList.toggle('show');
        });
    }

    // Handle window resize
    window.addEventListener('resize', handleWindowResize);

    // Handle external links
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    try {
        const userData = localStorage.getItem(CONFIG.STORAGE.USER);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    const user = getCurrentUser();
    if (user) {
        currentUser = user;
        isLoggedIn = true;
        updateNavigation(true);
    } else {
        updateNavigation(false);
    }
}

/**
 * Check existing session
 */
function checkExistingSession() {
    const user = localStorage.getItem(CONFIG.STORAGE.USER);
    const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
    
    if (user && token) {
        try {
            currentUser = JSON.parse(user);
            isLoggedIn = true;
            
            // Redirect to dashboard if on auth page
            const currentPage = window.location.pathname;
            if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
                redirectToDashboard(currentUser.role);
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            clearSession();
        }
    }
}

/**
 * Clear user session
 */
function clearSession() {
    localStorage.removeItem(CONFIG.STORAGE.USER);
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.SESSION);
    currentUser = null;
    isLoggedIn = false;
}

/**
 * Logout user
 */
function logout() {
    clearSession();
    showAlert('You have been logged out successfully.', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

/**
 * Redirect to appropriate dashboard
 */
function redirectToDashboard(role) {
    const dashboardUrls = {
        'creator': 'creator/creator-overview.html',
        'viewer': 'viewer/viewer-dashboard.html',
        'admin': 'admin/admin-dashboard.html'
    };
    
    const dashboardUrl = dashboardUrls[role] || 'viewer/viewer-dashboard.html';
    window.location.href = dashboardUrl;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Update navigation based on auth status
 */
function updateNavigation(isAuthenticated) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (isAuthenticated && currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            const userName = userMenu.querySelector('.user-name');
            if (userName) userName.textContent = currentUser.name;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

/**
 * Setup smooth scrolling
 */
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
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
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('show');
            }
        });
        
        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('show');
                sidebarOverlay.classList.remove('show');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991 && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target) &&
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('show');
                }
            }
        });
    }
}

/**
 * Handle window resize
 */
function handleWindowResize() {
    // Adjust layouts for different screen sizes
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile-layout', isMobile);
    
    // Close sidebar on desktop
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (sidebar && window.innerWidth > 991) {
        sidebar.classList.remove('show');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
        }
    }
}

/**
 * Set form loading state
 */
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    if (isLoading) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }
        inputs.forEach(input => input.disabled = true);
    } else {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
        inputs.forEach(input => input.disabled = false);
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.alert-container') || document.body;
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '9999';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 5000);
}

/**
 * Handle form submission
 */
function handleFormSubmission(e) {
    e.preventDefault();
    const form = e.target;
    
    // Add your form handling logic here
    console.log('Form submitted:', form.id);
}

/**
 * Load platform statistics for homepage
 */
async function loadPlatformStats() {
    try {
        const response = await API.getPlatformStats();
        if (response && response.success && response.data) {
            const stats = response.data;
            
            // Update creators count
            const creatorsElement = document.querySelector('.total-creators');
            if (creatorsElement) {
                creatorsElement.textContent = stats.total_creators || '0';
            }
            
            // Update videos count
            const videosElement = document.querySelector('.total-videos');
            if (videosElement) {
                videosElement.textContent = stats.total_videos || '0';
            }
            
            // Update total earnings
            const earningsElement = document.querySelector('.total-earnings');
            if (earningsElement) {
                earningsElement.textContent = '$' + (stats.total_earnings || '0');
            }
            
            console.log('Platform stats loaded successfully');
        }
    } catch (error) {
        console.error('Failed to load platform stats:', error);
        // Show fallback values without breaking the UI
    }
}

/**
 * Load featured videos for homepage
 */
async function loadFeaturedVideos() {
    try {
        const response = await API.getVideos({ limit: 6 });
        if (response && response.success && response.data) {
            const videos = response.data;
            const videosContainer = document.querySelector('.featured-videos-container');
            
            if (videosContainer && videos.length > 0) {
                videosContainer.innerHTML = videos.map(video => `
                    <div class="col-md-4 mb-4">
                        <div class="card video-card">
                            <div class="video-thumbnail">
                                <i class="fas fa-play-circle play-icon"></i>
                            </div>
                            <div class="card-body">
                                <h6 class="card-title">${video.title}</h6>
                                <p class="card-text text-muted small">${video.description?.substring(0, 80) || ''}${video.description?.length > 80 ? '...' : ''}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">By ${video.creator_name}</small>
                                    <span class="text-primary fw-bold">$${video.price}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            
            console.log('Featured videos loaded successfully');
        }
    } catch (error) {
        console.error('Failed to load featured videos:', error);
    }
}

/**
 * Initialize homepage dynamic content
 */
function initializeHomepage() {
    // Load platform stats
    loadPlatformStats();
    
    // Load featured videos
    loadFeaturedVideos();
    
    // Set up periodic updates
    setInterval(() => {
        loadPlatformStats();
        loadFeaturedVideos();
    }, 30000); // Update every 30 seconds
}

// Initialize homepage if on homepage
if (document.body.classList.contains('homepage') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
    document.addEventListener('DOMContentLoaded', initializeHomepage);
}