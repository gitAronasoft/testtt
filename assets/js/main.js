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
    // Prevent multiple initialization
    if (window.mainInitialized) return;
    window.mainInitialized = true;

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
    
    // Make handleLogout globally available
    window.handleLogout = handleLogout;
    window.clearSession = clearSession;
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
    // Prevent duplicate event listeners
    if (window.globalEventListenersSetup) return;
    window.globalEventListenersSetup = true;

    // Handle logout links and buttons
    document.addEventListener('click', function(e) {
        // Check if clicked element is a logout link or button
        if (e.target.matches('.logout-link, #logoutBtn, [data-action="logout"]') || 
            e.target.closest('.logout-link, #logoutBtn, [data-action="logout"]')) {
            e.preventDefault();
            handleLogout();
        }
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
    // Clear all session-related storage
    localStorage.removeItem(CONFIG.STORAGE.USER);
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.SESSION);
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('videoShareEmail');
    
    // Reset global variables
    currentUser = null;
    isLoggedIn = false;
    
    // Clear any cached user data
    if (typeof window.currentUser !== 'undefined') {
        window.currentUser = null;
    }
}

/**
 * Handle logout functionality
 */
function handleLogout() {
    // Clear all session data
    clearSession();
    
    // Show logout message
    showAlert('You have been logged out successfully.', 'info');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
        // Determine the correct path to login based on current location
        const currentPath = window.location.pathname;
        let loginPath = 'login.html';
        
        // If we're in a subdirectory (creator, viewer, admin), go up one level
        if (currentPath.includes('/creator/') || currentPath.includes('/viewer/') || currentPath.includes('/admin/')) {
            loginPath = '../login.html';
        }
        
        window.location.href = loginPath;
    }, 1000);
}

/**
 * Logout user (legacy function for backward compatibility)
 */
function logout() {
    handleLogout();
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
 * Load static platform statistics for homepage
 */
function loadStaticPlatformStats() {
    // Static stats for homepage display
    const staticStats = {
        total_creators: '1,250+',
        total_videos: '8,500+',
        total_earnings: '2,450,000'
    };

    // Update creators count
    const creatorsElement = document.querySelector('.total-creators');
    if (creatorsElement) {
        creatorsElement.textContent = staticStats.total_creators;
    }

    // Update videos count
    const videosElement = document.querySelector('.total-videos');
    if (videosElement) {
        videosElement.textContent = staticStats.total_videos;
    }

    // Update total earnings
    const earningsElement = document.querySelector('.total-earnings');
    if (earningsElement) {
        earningsElement.textContent = '$' + staticStats.total_earnings;
    }

    console.log('Platform stats loaded successfully');
}

/**
 * Load static featured videos for homepage
 */
function loadStaticFeaturedVideos() {
    // Static featured videos for homepage display
    const staticVideos = [
        {
            title: 'Advanced Photography Techniques',
            description: 'Learn professional photography skills with hands-on examples and expert tips.',
            creator_name: 'Sarah Chen',
            price: '12.99'
        },
        {
            title: 'Web Development Masterclass',
            description: 'Complete guide to modern web development using React and Node.js frameworks.',
            creator_name: 'Mike Rodriguez',
            price: '24.99'
        },
        {
            title: 'Digital Marketing Strategies',
            description: 'Boost your online presence with proven marketing techniques and case studies.',
            creator_name: 'Emma Thompson',
            price: '18.99'
        },
        {
            title: 'Fitness and Nutrition Guide',
            description: 'Transform your health with personalized workout plans and meal prep tips.',
            creator_name: 'David Kim',
            price: '15.99'
        },
        {
            title: 'Creative Writing Workshop',
            description: 'Develop your storytelling skills and learn to craft compelling narratives.',
            creator_name: 'Lisa Garcia',
            price: '22.99'
        },
        {
            title: 'Data Science Fundamentals',
            description: 'Master data analysis and visualization using Python and popular libraries.',
            creator_name: 'Alex Johnson',
            price: '29.99'
        }
    ];

    const videosContainer = document.querySelector('.featured-videos-container');
    if (videosContainer) {
        videosContainer.innerHTML = staticVideos.map(video => `
            <div class="col-md-4 mb-4">
                <div class="card video-card h-100 shadow-sm">
                    <div class="video-thumbnail position-relative" style="height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-play-circle text-white" style="font-size: 3rem; opacity: 0.8;"></i>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title fw-bold">${video.title}</h6>
                        <p class="card-text text-muted small flex-grow-1">${video.description}</p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <small class="text-muted">By ${video.creator_name}</small>
                            <span class="text-primary fw-bold fs-6">$${video.price}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    console.log('Featured videos loaded successfully');
}

/**
 * Initialize homepage with static content
 */
function initializeHomepage() {
    // Load static platform stats
    loadStaticPlatformStats();

    // Load static featured videos
    loadStaticFeaturedVideos();
}

// Initialize homepage if on homepage
if (document.body.classList.contains('homepage') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
    document.addEventListener('DOMContentLoaded', initializeHomepage);
}

// Note: API and CONFIG objects are loaded from separate files (api.js and config.js)

// Placeholder for bootstrap object, assuming it's defined elsewhere
const bootstrap = {
    Tooltip: class { constructor(el) { /* ... */ } },
    Popover: class { constructor(el) { /* ... */ } }
};

// Load page-specific content - only for homepage
function loadPageContent() {
    const currentPage = window.location.pathname;
    
    // Only load homepage content if we're actually on the homepage, not on dashboard pages
    if ((currentPage.includes('index.html') || currentPage === '/') && 
        !currentPage.includes('/creator/') && 
        !currentPage.includes('/viewer/') &&
        !currentPage.includes('/admin/')) {
        initializeHomepage();
    }
}

// Setup global event listeners - optimized to avoid redundant calls
function setupGlobalEventListeners() {
    console.log("Setting up global event listeners...");
    
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
}