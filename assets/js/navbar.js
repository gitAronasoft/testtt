// Global Navbar Component
document.addEventListener('DOMContentLoaded', function() {
    loadGlobalNavbar();
    initializeNavbarInteractions();
});

function loadGlobalNavbar() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userRole = currentUser.role || localStorage.getItem('userRole') || 'viewer';
    const userName = currentUser.name || localStorage.getItem('userName') || 'User';
    const userEmail = currentUser.email || localStorage.getItem('userEmail') || 'user@example.com';

    const navbarHTML = createNavbarHTML(userRole, userName, userEmail);

    // Insert navbar at the beginning of body
    const existingNavbar = document.querySelector('.global-navbar');
    if (existingNavbar) {
        existingNavbar.remove();
    }

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // Update active nav item based on current page
    updateActiveNavItem();
}

function createNavbarHTML(userRole, userName, userEmail) {
    const userInitial = userName.charAt(0).toUpperCase();

    return `
        <nav class="navbar navbar-expand-lg navbar-dark global-navbar fixed-top">
            <div class="container-fluid px-3">
                <a class="navbar-brand fw-bold d-flex align-items-center" href="dashboard.html">
                    <i class="fas fa-video text-warning me-2"></i>
                    <span>Video Manager</span>
                </a>

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#globalNavbar" aria-controls="globalNavbar" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="globalNavbar">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="dashboard.html" data-page="dashboard">
                                <i class="fas fa-tachometer-alt me-1"></i>
                                <span>Dashboard</span>
                            </a>
                        </li>
                        ${getNavItemsForRole(userRole)}
                    </ul>

                    <div class="navbar-nav">
                        <div class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle d-flex align-items-center pe-0" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <div class="user-avatar me-2">${userInitial}</div>
                                <div class="d-flex flex-column align-items-start d-none d-md-block">
                                    <span class="user-name">${userName}</span>
                                    <small class="user-role">${capitalizeRole(userRole)}</small>
                                </div>
                                <div class="d-md-none ms-2">
                                    <span class="user-name">${userName}</span>
                                </div>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <div class="dropdown-header">
                                        <div class="fw-bold">${userName}</div>
                                        <small class="text-muted">${userEmail}</small>
                                    </div>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="profile.html"><i class="fas fa-user me-2"></i>Profile</a></li>
                                <li><a class="dropdown-item" href="settings.html"><i class="fas fa-cog me-2"></i>Settings</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

function getNavItemsForRole(role) {
    const navItems = {
        admin: [
            '<li class="nav-item">',
            '  <a class="nav-link" href="admin-videos.html" data-page="admin-videos">',
            '    <i class="fas fa-video me-1"></i>',
            '    <span>All Videos</span>',
            '  </a>',
            '</li>',
            '<li class="nav-item">',
            '  <a class="nav-link" href="user-management.html" data-page="user-management">',
            '    <i class="fas fa-users me-1"></i>',
            '    <span>User Management</span>',
            '  </a>',
            '</li>',
            '<li class="nav-item">',
            '  <a class="nav-link" href="analytics.html" data-page="analytics">',
            '    <i class="fas fa-chart-bar me-1"></i>',
            '    <span>Analytics</span>',
            '  </a>',
            '</li>'
        ],
        editor: [
            '<li class="nav-item">',
            '  <a class="nav-link" href="editor-upload.html" data-page="editor-upload">',
            '    <i class="fas fa-upload me-1"></i>',
            '    <span>Upload Video</span>',
            '  </a>',
            '</li>'
        ],
        viewer: []
    };

    return (navItems[role] || navItems.viewer).join('');
}

function capitalizeRole(role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function updateActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
    const navLinks = document.querySelectorAll('.global-navbar .nav-link[data-page]');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === currentPage) {
            link.classList.add('active');
        }
    });
}

function initializeNavbarInteractions() {
    // Auto-collapse navbar on mobile when clicking nav links
    document.addEventListener('click', function(e) {
        if (e.target.matches('.navbar-nav .nav-link')) {
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        }
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all user data
        localStorage.clear();
        sessionStorage.clear();

        showAlert('Logged out successfully!', 'success');

        setTimeout(() => {
            window.location.replace('login.html');
        }, 1000);
    }
}

// Refresh navbar when user data changes
function refreshNavbar() {
    loadGlobalNavbar();
}

// Export for use in other files
window.refreshNavbar = refreshNavbar;
window.logout = logout;