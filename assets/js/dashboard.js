// Dashboard JavaScript
let currentUser = null;
let currentUserRole = 'viewer';

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Get user data from localStorage first
        const storedUser = localStorage.getItem('currentUser');
        const storedRole = localStorage.getItem('userRole');

        if (!storedUser || !storedRole) {
            console.log('No user data found, redirecting to login');
            window.location.replace('login.html');
            return;
        }

        currentUser = JSON.parse(storedUser);
        currentUserRole = storedRole;

        // Try to verify with server (optional - fallback to local data if fails)
        try {
            const response = await fetch('api.php?action=get_user');
            const data = await response.json();

            if (data.success && data.user) {
                currentUser = data.user;
                currentUserRole = currentUser.role;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('userRole', currentUserRole);
                localStorage.setItem('userName', currentUser.name);
                localStorage.setItem('userEmail', currentUser.email);
            }
        } catch (serverError) {
            console.log('Server authentication check failed, using local data:', serverError);
        }

    } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        localStorage.clear();
        window.location.replace('login.html');
        return;
    }

    updateRoleBasedUI();
    updateNavUserInfo();
    initializeRoleDashboards();
    setupEventListeners();
    console.log('Dashboard initialized for role:', currentUserRole);
}

function updateRoleBasedUI() {
    const userRole = currentUserRole;

    // Show/hide role-specific elements
    const adminElements = document.querySelectorAll('.admin-only');
    const editorElements = document.querySelectorAll('.editor-only');
    const viewerElements = document.querySelectorAll('.viewer-only');

    adminElements.forEach(el => {
        el.style.display = userRole === 'admin' ? 'block' : 'none';
    });

    editorElements.forEach(el => {
        el.style.display = userRole === 'editor' ? 'block' : 'none';
    });

    viewerElements.forEach(el => {
        el.style.display = userRole === 'viewer' ? 'block' : 'none';
    });

    // Show appropriate dashboard
    const dashboards = ['adminDashboard', 'editorDashboard', 'viewerDashboard'];
    dashboards.forEach(dashboardId => {
        const dashboard = document.getElementById(dashboardId);
        if (dashboard) {
            dashboard.style.display = 'none';
        }
    });

    const currentDashboard = document.getElementById(`${userRole}Dashboard`);
    if (currentDashboard) {
        currentDashboard.style.display = 'block';
    }
}

function updateNavUserInfo() {
    const userName = currentUser?.name || localStorage.getItem('userName') || 'User';
    const userRole = currentUserRole;

    // Update dashboard user info
    const dashboardUserName = document.getElementById('dashboardUserName');
    const roleIcon = document.getElementById('roleIcon');
    const roleDescription = document.getElementById('roleDescription');
    const welcomeGreeting = document.getElementById('welcomeGreeting');

    if (dashboardUserName) dashboardUserName.textContent = userName;

    if (roleIcon && roleDescription && welcomeGreeting) {
        const roleConfig = {
            admin: {
                icon: '🛡️',
                greeting: 'Welcome back, Admin',
                description: 'Manage platform content and view all videos without restrictions.'
            },
            editor: {
                icon: '✏️',
                greeting: 'Ready to create',
                description: 'Upload videos, manage your content, and track performance.'
            },
            viewer: {
                icon: '👁️',
                greeting: 'Welcome',
                description: 'Discover and purchase premium video content.'
            }
        };

        const config = roleConfig[userRole] || roleConfig.viewer;
        roleIcon.textContent = config.icon;
        welcomeGreeting.textContent = config.greeting;
        roleDescription.textContent = config.description;
    }
}

function initializeRoleDashboards() {
    const userRole = currentUserRole;

    if (userRole === 'admin') {
        initializeAdminDashboard();
    } else if (userRole === 'editor') {
        initializeEditorDashboard();
    } else if (userRole === 'viewer') {
        initializeViewerDashboard();
    }
}

function initializeAdminDashboard() {
    // Load admin statistics
    loadAdminStats();
}

function initializeEditorDashboard() {
    // Load editor content
    loadRecentUploads();
}

function initializeViewerDashboard() {
    // Load viewer content
    loadViewerVideos();
    loadPurchaseHistory();
}

function loadAdminStats() {
    // Simulate loading admin statistics
    const stats = {
        totalUsers: 156,
        totalVideos: 89,
        totalRevenue: '$12,450',
        activeUsers: 67
    };

    setTimeout(() => {
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalVideos').textContent = stats.totalVideos;
        document.getElementById('totalRevenue').textContent = stats.totalRevenue;
        document.getElementById('activeUsers').textContent = stats.activeUsers;
    }, 500);
}

function loadRecentUploads() {
    const recentUploadsContainer = document.getElementById('recentUploads');
    if (!recentUploadsContainer) return;

    const uploads = [
        { title: 'Getting Started with React', date: '2 hours ago', status: 'Processed' },
        { title: 'JavaScript Best Practices', date: '1 day ago', status: 'Processing' },
        { title: 'CSS Grid Layout', date: '3 days ago', status: 'Processed' }
    ];

    const uploadsHTML = uploads.map(upload => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
                <h6 class="mb-1">${upload.title}</h6>
                <small class="text-muted">${upload.date}</small>
            </div>
            <span class="badge ${upload.status === 'Processed' ? 'bg-success' : 'bg-warning'}">${upload.status}</span>
        </div>
    `).join('');

    recentUploadsContainer.innerHTML = uploadsHTML || '<p class="text-muted">No recent uploads</p>';
}

function loadViewerVideos() {
    const videoGrid = document.getElementById('viewerVideoGrid');
    if (!videoGrid) return;

    const videos = [
        { title: 'Advanced React Techniques', price: '$19.99', thumbnail: 'https://via.placeholder.com/300x200' },
        { title: 'Node.js Masterclass', price: '$24.99', thumbnail: 'https://via.placeholder.com/300x200' },
        { title: 'CSS Animation Secrets', price: '$14.99', thumbnail: 'https://via.placeholder.com/300x200' }
    ];

    const videosHTML = videos.map(video => `
        <div class="col-md-4 mb-3">
            <div class="card">
                <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}">
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text text-primary fw-bold">${video.price}</p>
                    <button class="btn btn-primary btn-sm" onclick="purchaseVideo('${video.title}')">
                        <i class="fas fa-shopping-cart me-1"></i>Purchase
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    videoGrid.innerHTML = videosHTML;
}

function loadPurchaseHistory() {
    const historyContainer = document.getElementById('purchaseHistory');
    if (!historyContainer) return;

    const purchases = JSON.parse(localStorage.getItem('purchaseHistory') || '[]');

    if (purchases.length === 0) {
        historyContainer.innerHTML = '<p class="text-muted">No purchases yet</p>';
        return;
    }

    const historyHTML = purchases.map(purchase => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
                <h6 class="mb-1">${purchase.title}</h6>
                <small class="text-muted">${purchase.date}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold">${purchase.price}</div>
                <button class="btn btn-sm btn-outline-primary" onclick="watchVideo('${purchase.title}')">
                    <i class="fas fa-play me-1"></i>Watch
                </button>
            </div>
        </div>
    `).join('');

    historyContainer.innerHTML = historyHTML;
}



function setupEventListeners() {
    // Add any additional event listeners here
}

function purchaseVideo(title) {
    showAlert(`Redirecting to purchase ${title}...`, 'info');
    setTimeout(() => {
        window.location.href = 'viewer-videos.html';
    }, 1000);
}

function watchVideo(title) {
    showAlert(`Starting playback for ${title}...`, 'success');
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
    `;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}