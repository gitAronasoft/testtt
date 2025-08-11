/**
 * Admin panel JavaScript for VideoShare platform
 * Handles admin dashboard functionality, user management, and platform settings
 */

// Admin state
let adminState = {
    currentUser: null,
    dashboardData: {},
    users: [],
    videos: [],
    settings: {}
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

/**
 * Initialize admin panel functionality
 */
function initializeAdminPanel() {
    console.log('Admin panel initialized');
    
    // Check admin authentication
    checkAdminAuthentication();
    
    // Setup logout functionality
    setupLogout();
    
    // Load admin data
    loadAdminData();
    
    // Initialize page-specific functionality
    initializePageSpecificFeatures();
    
    // Setup event listeners
    setupAdminEventListeners();
}

/**
 * Check admin authentication
 */
function checkAdminAuthentication() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (!userData) {
            window.location.href = '../login.html';
            return;
        }
        
        const user = JSON.parse(userData);
        if (user.role !== 'admin') {
            // For demo purposes, allow access to admin panel
            // In production, this should redirect to unauthorized page
            console.warn('Non-admin user accessing admin panel');
        }
        
        adminState.currentUser = user;
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
            handleAdminLogout();
        });
    });
}

/**
 * Handle admin logout
 */
function handleAdminLogout() {
    // Clear user data
    localStorage.removeItem('videoShareUser');
    localStorage.removeItem('videoShareSession');
    
    // Redirect to home page
    window.location.href = '../index.html';
}

/**
 * Load admin data
 */
function loadAdminData() {
    // Load dashboard statistics
    loadDashboardStats();
    
    // Load users data
    loadUsersData();
    
    // Load videos data
    loadVideosData();
    
    // Load platform settings
    loadPlatformSettings();
}

/**
 * Load dashboard statistics
 */
function loadDashboardStats() {
    const stats = {
        totalUsers: 247,
        totalVideos: 1834,
        platformRevenue: 23847,
        totalViews: 89200,
        weeklyUserGrowth: 12,
        weeklyVideoGrowth: 45,
        monthlyRevenueGrowth: 8.3,
        weeklyViewGrowth: 15.7
    };
    
    adminState.dashboardData = stats;
    
    // Update dashboard stats if on dashboard page
    if (window.location.pathname.includes('admin-dashboard.html')) {
        updateDashboardStats(stats);
        initializeAdminCharts();
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(stats) {
    updateStatElement('total-users', stats.totalUsers);
    updateStatElement('total-videos', stats.totalVideos.toLocaleString());
    updateStatElement('platform-revenue', `$${stats.platformRevenue.toLocaleString()}`);
    updateStatElement('total-views', `${(stats.totalViews / 1000).toFixed(1)}K`);
}

/**
 * Update stat element
 */
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Load users data
 */
function loadUsersData() {
    const users = [
        {
            id: 1,
            name: 'John Smith',
            email: 'john.smith@email.com',
            role: 'creator',
            status: 'active',
            joinDate: 'March 15, 2025',
            videos: 23,
            earnings: 1247.50,
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            role: 'viewer',
            status: 'active',
            joinDate: 'April 2, 2025',
            purchases: 47,
            earnings: 0,
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=40&h=40&fit=crop&crop=face'
        },
        {
            id: 3,
            name: 'Mike Chen',
            email: 'mike.chen@email.com',
            role: 'creator',
            status: 'suspended',
            joinDate: 'February 8, 2025',
            videos: 8,
            earnings: 432.80,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
        }
    ];
    
    adminState.users = users;
}

/**
 * Load videos data
 */
function loadVideosData() {
    const videos = [
        {
            id: 1,
            title: 'Advanced Web Development Techniques',
            creator: 'John Smith',
            status: 'published',
            uploadDate: 'Aug 10, 2025',
            views: 2300,
            price: 29.99,
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
            duration: '12:45'
        },
        {
            id: 2,
            title: 'Marketing Strategies for Small Business',
            creator: 'Sarah Johnson',
            status: 'flagged',
            uploadDate: 'Aug 9, 2025',
            views: 1800,
            price: 19.99,
            thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=225&fit=crop',
            duration: '8:20'
        }
    ];
    
    adminState.videos = videos;
}

/**
 * Load platform settings
 */
function loadPlatformSettings() {
    const settings = {
        platformName: 'VideoShare',
        platformDescription: 'A premium video-sharing platform that operates on a pay-per-view model.',
        contactEmail: 'admin@videoshare.com',
        maxVideoSize: 500,
        maintenanceMode: false,
        commissionRate: 10,
        minPayout: 50,
        currency: 'USD',
        processingFee: 2.9,
        autoPayouts: true
    };
    
    adminState.settings = settings;
}

/**
 * Initialize page-specific features
 */
function initializePageSpecificFeatures() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('admin-dashboard.html')) {
        // Dashboard-specific initialization
        console.log('Dashboard page loaded');
    } else if (currentPage.includes('admin-users.html')) {
        // Users page-specific initialization
        setupUserManagement();
    } else if (currentPage.includes('admin-videos.html')) {
        // Videos page-specific initialization
        setupVideoManagement();
    } else if (currentPage.includes('admin-settings.html')) {
        // Settings page-specific initialization
        setupSettingsManagement();
    }
}

/**
 * Setup user management functionality
 */
function setupUserManagement() {
    // Setup search and filters
    const userSearch = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const applyFilters = document.getElementById('applyFilters');
    
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            filterUsers();
        });
    }
    
    // Setup add user modal
    const saveUserButton = document.getElementById('saveUser');
    if (saveUserButton) {
        saveUserButton.addEventListener('click', function() {
            handleAddUser();
        });
    }
}

/**
 * Setup video management functionality
 */
function setupVideoManagement() {
    // Setup search and filters
    const videoSearch = document.getElementById('videoSearch');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    const applyFilters = document.getElementById('applyFilters');
    
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            filterVideos();
        });
    }
}

/**
 * Setup settings management functionality
 */
function setupSettingsManagement() {
    // Load current settings into form
    loadSettingsForm();
    
    // Setup save all settings button
    const saveAllButton = document.getElementById('saveAllSettings');
    if (saveAllButton) {
        saveAllButton.addEventListener('click', function() {
            saveAllSettings();
        });
    }
    
    // Setup reset settings button
    const resetButton = document.getElementById('resetSettings');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            resetSettingsToDefaults();
        });
    }
    
    // Setup test email button
    const testEmailButton = document.getElementById('testEmail');
    if (testEmailButton) {
        testEmailButton.addEventListener('click', function() {
            sendTestEmail();
        });
    }
}

/**
 * Load settings into form
 */
function loadSettingsForm() {
    const settings = adminState.settings;
    
    // Load general settings
    setInputValue('platformName', settings.platformName);
    setInputValue('platformDescription', settings.platformDescription);
    setInputValue('contactEmail', settings.contactEmail);
    setInputValue('maxVideoSize', settings.maxVideoSize);
    setCheckboxValue('maintenanceMode', settings.maintenanceMode);
    
    // Load financial settings
    setInputValue('commissionRate', settings.commissionRate);
    setInputValue('minPayout', settings.minPayout);
    setSelectValue('currency', settings.currency);
    setInputValue('processingFee', settings.processingFee);
    setCheckboxValue('autoPayouts', settings.autoPayouts);
}

/**
 * Set input value helper
 */
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.value = value;
    }
}

/**
 * Set checkbox value helper
 */
function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.checked = value;
    }
}

/**
 * Set select value helper
 */
function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.value = value;
    }
}

/**
 * Setup admin event listeners
 */
function setupAdminEventListeners() {
    // Generic button handlers for demo functionality
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn-outline-primary[title="View Details"]')) {
            showItemDetails(e.target);
        } else if (e.target.matches('.btn-outline-warning[title="Edit User"], .btn-outline-warning[title="Edit"]')) {
            editItem(e.target);
        } else if (e.target.matches('.btn-outline-danger[title="Suspend User"], .btn-outline-danger[title="Remove"]')) {
            suspendOrRemoveItem(e.target);
        }
    });
}

/**
 * Filter users based on search and filter criteria
 */
function filterUsers() {
    console.log('Filtering users...');
    // In a real implementation, this would filter the users table
    showNotification('User filters applied', 'success');
}

/**
 * Filter videos based on search and filter criteria
 */
function filterVideos() {
    console.log('Filtering videos...');
    // In a real implementation, this would filter the videos grid
    showNotification('Video filters applied', 'success');
}

/**
 * Handle adding new user
 */
function handleAddUser() {
    const form = document.getElementById('addUserForm');
    if (form) {
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData);
        
        console.log('Adding new user:', userData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();
        
        // Reset form
        form.reset();
        
        showNotification('User created successfully', 'success');
    }
}

/**
 * Save all platform settings
 */
function saveAllSettings() {
    console.log('Saving all platform settings...');
    
    // Collect all form data
    const settings = {
        platformName: document.getElementById('platformName')?.value,
        platformDescription: document.getElementById('platformDescription')?.value,
        contactEmail: document.getElementById('contactEmail')?.value,
        maxVideoSize: document.getElementById('maxVideoSize')?.value,
        maintenanceMode: document.getElementById('maintenanceMode')?.checked,
        commissionRate: document.getElementById('commissionRate')?.value,
        minPayout: document.getElementById('minPayout')?.value,
        currency: document.getElementById('currency')?.value,
        processingFee: document.getElementById('processingFee')?.value,
        autoPayouts: document.getElementById('autoPayouts')?.checked
    };
    
    // Update admin state
    adminState.settings = { ...adminState.settings, ...settings };
    
    showNotification('All settings saved successfully', 'success');
}

/**
 * Reset settings to defaults
 */
function resetSettingsToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        console.log('Resetting settings to defaults...');
        loadPlatformSettings();
        loadSettingsForm();
        showNotification('Settings reset to defaults', 'info');
    }
}

/**
 * Send test email
 */
function sendTestEmail() {
    console.log('Sending test email...');
    showNotification('Test email sent successfully', 'success');
}

/**
 * Show item details (generic handler)
 */
function showItemDetails(button) {
    console.log('Showing item details...');
    showNotification('Details view opened', 'info');
}

/**
 * Edit item (generic handler)
 */
function editItem(button) {
    console.log('Editing item...');
    showNotification('Edit mode activated', 'info');
}

/**
 * Suspend or remove item (generic handler)
 */
function suspendOrRemoveItem(button) {
    if (confirm('Are you sure you want to perform this action?')) {
        console.log('Item action performed...');
        showNotification('Action completed successfully', 'warning');
    }
}

/**
 * Initialize admin charts
 */
function initializeAdminCharts() {
    const activityChart = document.getElementById('activityChart');
    if (activityChart && typeof Chart !== 'undefined') {
        new Chart(activityChart, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Users',
                    data: [12, 19, 8, 15, 22, 18, 25],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Videos',
                    data: [5, 8, 12, 9, 15, 11, 18],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}