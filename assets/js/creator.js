/**
 * Creator page JavaScript for VideoShare platform
 * Simple script for creator pages without complex navigation logic
 */

// Initialize creator page
document.addEventListener('DOMContentLoaded', function() {
    initializeCreatorPage();
});

/**
 * Initialize creator page functionality
 */
function initializeCreatorPage() {
    console.log('Creator page initialized');
    
    // Check authentication
    checkAuthentication();
    
    // Setup logout functionality
    setupLogout();
    
    // Load user data
    loadUserData();
    
    // Initialize charts if available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }
}

/**
 * Check user authentication
 */
function checkAuthentication() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (!userData) {
            window.location.href = '../login.html';
            return;
        }
        
        const user = JSON.parse(userData);
        if (user.role !== 'creator') {
            window.location.href = '../login.html';
            return;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '../login.html';
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear user data
    localStorage.removeItem('videoShareUser');
    localStorage.removeItem('videoShareSession');
    
    // Redirect to home page
    window.location.href = '../index.html';
}

/**
 * Load user data and update page
 */
function loadUserData() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (userData) {
            const user = JSON.parse(userData);
            
            // Update user name in dropdown
            const userNameElements = document.querySelectorAll('#navbarDropdown');
            userNameElements.forEach(element => {
                element.innerHTML = `<i class="fas fa-user-circle me-2"></i>${user.name || 'Creator'}`;
            });
            
            // Load dashboard data if on overview page
            if (window.location.pathname.includes('creator-overview.html')) {
                loadDashboardData();
            }
            
            // Load earnings data if on earnings page
            if (window.location.pathname.includes('creator-earnings.html')) {
                loadEarningsData();
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Load dashboard data for overview page
 */
function loadDashboardData() {
    // Update stats with mock data for now
    const stats = {
        totalVideos: 15,
        totalViews: 12450,
        totalEarnings: 1847.50,
        thisMonthEarnings: 312.80
    };
    
    // Update stat cards
    updateStatCard('total-videos', stats.totalVideos);
    updateStatCard('total-views', stats.totalViews.toLocaleString());
    updateStatCard('total-earnings', `$${stats.totalEarnings.toFixed(2)}`);
    updateStatCard('month-earnings', `$${stats.thisMonthEarnings.toFixed(2)}`);
}

/**
 * Load earnings data for earnings page
 */
function loadEarningsData() {
    // This will be populated with actual data in a full implementation
    console.log('Loading earnings data...');
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
 * Initialize charts for creator pages
 */
function initializeCharts() {
    // Only initialize charts if Chart.js is available and we're on a page that needs them
    if (window.location.pathname.includes('creator-overview.html')) {
        // Charts will be initialized here when needed
        console.log('Charts initialized for creator overview');
    }
}