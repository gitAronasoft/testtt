// Admin Dashboard JavaScript
let currentUser = null;
let mobileNavOpen = false;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupTheme();
    setupMobileNavigation();
    initializeAdminDashboard();
});

// Check if user is authenticated and has admin role
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

            // Check if user has admin role
            if (currentUser.role !== 'admin') {
                // Redirect to appropriate dashboard based on role
                switch(currentUser.role) {
                    case 'editor':
                    case 'creator':
                        window.location.replace('creator-dashboard.html');
                        break;
                    case 'viewer':
                        window.location.replace('viewer-dashboard.html');
                        break;
                    default:
                        window.location.replace('login.html');
                }
                return;
            }

            setupUserInfo();
            loadAdminData();
        } else {
            window.location.replace('login.html');
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.replace('login.html');
    }
}

function setupUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');

    if (currentUser) {
        if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
        if (userRoleEl) userRoleEl.textContent = (currentUser.role || 'user').charAt(0).toUpperCase() + (currentUser.role || 'user').slice(1);
        if (userAvatarEl) userAvatarEl.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
    }
}

// Initialize admin dashboard
function initializeAdminDashboard() {
    showPanel('overview');
    loadAdminStats();
    loadRecentActivity();
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin.php?action=analytics');
        const data = await response.json();

        if (data.success) {
            updateStatsDisplay(data.analytics);
        }
    } catch (error) {
        console.error('Failed to load admin stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Update stats display
function updateStatsDisplay(analytics) {
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        totalVideos: document.getElementById('totalVideos'),
        pendingReports: document.getElementById('pendingReports'),
        platformRevenue: document.getElementById('platformRevenue')
    };

    if (elements.totalUsers) {
        elements.totalUsers.textContent = analytics.total_users || 0;
    }
    if (elements.totalVideos) {
        elements.totalVideos.textContent = analytics.total_videos || 0;
    }
    if (elements.pendingReports) {
        elements.pendingReports.textContent = analytics.pending_reports || 0;
    }
    if (elements.platformRevenue) {
        elements.platformRevenue.textContent = `$${(analytics.total_revenue || 0).toFixed(2)}`;
    }
}

// Load recent admin activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/admin.php?action=recent_activity');
        const data = await response.json();

        if (data.success) {
            displayRecentActivity(data.activity);
        }
    } catch (error) {
        console.error('Failed to load recent activity:', error);
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const activityList = document.getElementById('adminActivityList');
    if (!activityList) return;

    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="text-center text-muted-foreground py-4">
                <i class="fas fa-info-circle mb-2 fa-2x opacity-50"></i>
                <p class="mb-0">No recent activity</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = activities.map(activity => `
        <div class="d-flex align-items-center gap-3 p-3 border-bottom">
            <div class="rounded-circle bg-primary/10 p-2">
                <i class="fas fa-${getActivityIcon(activity.type)} text-primary"></i>
            </div>
            <div class="flex-grow-1">
                <p class="mb-1">${activity.description}</p>
                <small class="text-muted-foreground">${formatTimeAgo(activity.timestamp)}</small>
            </div>
        </div>
    `).join('');
}

// Get icon for activity type
function getActivityIcon(type) {
    const icons = {
        user_register: 'user-plus',
        video_upload: 'video',
        purchase: 'shopping-cart',
        report: 'flag',
        default: 'info-circle'
    };
    return icons[type] || icons.default;
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
        overview: 'Admin Dashboard',
        analytics: 'Analytics',
        users: 'User Management',
        roles: 'Roles & Permissions',
        videos: 'Content Management',
        moderation: 'Content Moderation',
        youtube: 'YouTube Integration',
        settings: 'System Settings'
    };

    const titleElement = document.getElementById('pageTitle');
    if (titleElement && titles[panelName]) {
        titleElement.textContent = titles[panelName];
    }
}

// Load panel-specific data
function loadPanelData(panelName) {
    switch(panelName) {
        case 'users':
            loadUsers();
            break;
        case 'analytics':
            loadDetailedAnalytics();
            break;
        case 'videos':
            loadAllVideos();
            break;
        // Add more cases as needed
    }
}

// Load users for user management panel
async function loadUsers() {
    try {
        const response = await fetch('/api/admin.php?action=users');
        const data = await response.json();

        if (data.success) {
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted-foreground py-4">No users found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>
                <span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role}</span>
            </td>
            <td>${user.joined}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-outline-primary btn-sm" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Get badge color for role
function getRoleBadgeColor(role) {
    const colors = {
        admin: 'danger',
        creator: 'success',
        editor: 'success',
        viewer: 'info'
    };
    return colors[role] || 'secondary';
}

function setupTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
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

function setupMobileNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            mobileNavOpen = !mobileNavOpen;
        });
    } else {
        console.log('Mobile navigation elements not found');
    }
}

function toggleMobileNav() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileNavOverlay');

    if (!sidebar) return;

    mobileNavOpen = !mobileNavOpen;

    if (mobileNavOpen) {
        sidebar.classList.remove('d-none');
        sidebar.classList.add('position-fixed', 'top-0', 'start-0', 'h-100');
        sidebar.style.width = '280px';
        sidebar.style.zIndex = '1050';
        if (overlay) overlay.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('d-none');
        sidebar.classList.remove('position-fixed', 'top-0', 'start-0', 'h-100');
        sidebar.style.width = '';
        sidebar.style.zIndex = '';
        if (overlay) overlay.classList.add('d-none');
        document.body.style.overflow = '';
    }
}

async function loadAdminData() {
    try {
        showLoading(true);

        // Load dashboard statistics
        const response = await fetch('/api/admin.php?action=analytics');
        const data = await response.json();

        if (data.success) {
            updateDashboardStats(data.analytics);
        }

        // Load recent activity
        const activityResponse = await fetch('/api/admin.php?action=recent_activity');
        const activityData = await activityResponse.json();

        if (activityData.success) {
            updateRecentActivity(activityData.activities);
        }

    } catch (error) {
        console.error('Failed to load admin data:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

function updateDashboardStats(analytics) {
    const elements = {
        totalVideos: document.getElementById('totalVideos'),
        totalUsers: document.getElementById('totalUsers'),
        totalViews: document.getElementById('totalViews'),
        totalRevenue: document.getElementById('totalRevenue')
    };

    if (analytics) {
        if (elements.totalVideos) elements.totalVideos.textContent = analytics.total_videos || 0;
        if (elements.totalUsers) elements.totalUsers.textContent = analytics.total_users || 0;
        if (elements.totalViews) elements.totalViews.textContent = (analytics.total_views || 0).toLocaleString();
        if (elements.totalRevenue) elements.totalRevenue.textContent = '$' + (analytics.total_revenue || 0).toFixed(2);
    }
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-muted-foreground text-center py-4">No recent activity</div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="flex items-center gap-3 py-2">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <div class="flex-1">
                <div class="text-sm font-medium">${activity.title || 'Activity'}</div>
                <div class="text-xs text-muted-foreground">${activity.time || 'Recently'}</div>
            </div>
        </div>
    `).join('');
}

function showLoading(show, message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Utility functions
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function showNotification(message, type = 'info') {
    // Use the existing notification system
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
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