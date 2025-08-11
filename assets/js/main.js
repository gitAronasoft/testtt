/**
 * Main JavaScript file for VideoShare platform
 * Handles global functionality and navigation
 */

// Global variables
let currentUser = null;
let isLoggedIn = false;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check existing session
    checkExistingSession();

    // Update navigation
    updateNavigation();

    // Load page-specific content
    loadPageContent();

    // Setup global event listeners
    setupGlobalEventListeners();

    // Initialize dashboard features
    initializeDashboardFeatures();
});

/**
 * Initialize dashboard-specific features
 */
function initializeDashboardFeatures() {
    // Setup sidebar toggle
    setupSidebarToggle();
}

/**
 * Setup sidebar toggle functionality
 */
function setupSidebarToggle() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            closeSidebar();
        });
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('show')) {
            closeSidebar();
        }
    });

    function toggleSidebar() {
        if (sidebar.classList.contains('show')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.add('show');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('show');
        }
        body.classList.add('sidebar-open');
    }

    function closeSidebar() {
        sidebar.classList.remove('show');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
        }
        body.classList.remove('sidebar-open');
    }

    // Close sidebar when clicking on main content on mobile
    const mainContent = document.querySelector('.main-content');
    if (mainContent && window.innerWidth <= 991) {
        mainContent.addEventListener('click', function(e) {
            if (sidebar.classList.contains('show') && !sidebar.contains(e.target)) {
                closeSidebar();
            }
        });
    }
}

console.log('VideoShare platform initialized');

/**
 * Setup global event listeners
 */
function setupGlobalEventListeners() {
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

// Placeholder for API object, assuming it's defined elsewhere
const API = {
    getPlatformStats: async () => ({ success: true, data: { total_creators: 100, total_videos: 500, total_earnings: 15000 } }),
    getVideos: async (params) => {
        const mockVideos = [
            { id: 1, title: "Intro to JavaScript", description: "Learn the basics of JavaScript programming.", creator_name: "John Doe", price: 10 },
            { id: 2, title: "Advanced CSS", description: "Master advanced CSS techniques.", creator_name: "Jane Smith", price: 15 },
            { id: 3, title: "React Fundamentals", description: "Get started with React framework.", creator_name: "Peter Jones", price: 20 },
            { id: 4, title: "Node.js Backend", description: "Build server-side applications with Node.js.", creator_name: "Mary Lee", price: 25 },
            { id: 5, title: "Vue.js Essentials", description: "Core concepts of Vue.js.", creator_name: "David Kim", price: 18 },
            { id: 6, title: "Python for Data Science", description: "Introduction to data science with Python.", creator_name: "Sarah Chen", price: 22 }
        ];
        return { success: true, data: mockVideos.slice(0, params.limit) };
    }
};

// Placeholder for CONFIG object, assuming it's defined elsewhere
const CONFIG = {
    STORAGE: {
        USER: 'videoShareUser',
        TOKEN: 'videoShareToken',
        SESSION: 'videoShareSession'
    }
};

// Placeholder for bootstrap object, assuming it's defined elsewhere
const bootstrap = {
    Tooltip: class { constructor(el) { /* ... */ } },
    Popover: class { constructor(el) { /* ... */ } }
};

// Placeholder for loadPageContent function, assuming it's defined elsewhere
function loadPageContent() {
    console.log("Loading page content...");
    // Actual content loading logic would go here
}

// Placeholder for setupGlobalEventListeners function, assuming it's defined elsewhere
function setupGlobalEventListeners() {
    console.log("Setting up global event listeners...");
    // Actual event listener setup would go here
}