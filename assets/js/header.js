
// Global Header Component
function createHeader() {
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn) {
        return `
            <header class="main-header">
                <div class="header-content">
                    <div class="logo">
                        <h1><a href="/index.html">YouTube Video Manager</a></h1>
                    </div>
                    <nav class="main-nav">
                        <a href="/login.html" class="nav-link">
                            <span class="nav-icon">🔐</span>
                            Login
                        </a>
                        <a href="/signup.html" class="nav-link">
                            <span class="nav-icon">👤</span>
                            Sign Up
                        </a>
                    </nav>
                </div>
            </header>
        `;
    }

    return `
        <header class="main-header">
            <div class="header-content">
                <div class="logo">
                    <h1><a href="${userRole === 'admin' ? '/admin/index.html' : '/members/index.html'}">YouTube Video Manager</a></h1>
                </div>
                <nav class="main-nav">
                    ${userRole === 'admin' ? `
                    <a href="/admin/index.html" class="nav-link">
                        <span class="nav-icon">🏠</span>
                        Dashboard
                    </a>
                    <a href="/admin/users.html" class="nav-link">
                        <span class="nav-icon">👥</span>
                        Users
                    </a>
                    <a href="/admin/content.html" class="nav-link">
                        <span class="nav-icon">📹</span>
                        Content
                    </a>
                    ` : `
                    <a href="/members/index.html" class="nav-link">
                        <span class="nav-icon">🏠</span>
                        Dashboard
                    </a>
                    ${userRole !== 'viewer' ? `
                    <a href="/upload.html" class="nav-link">
                        <span class="nav-icon">📹</span>
                        Upload
                    </a>
                    ` : ''}
                    `}
                    <div class="user-menu-container">
                        <button class="user-menu-toggle" onclick="toggleUserMenu()">
                            <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                            <span class="user-name">${userName}</span>
                            <span class="user-role role-badge role-${userRole}">${userRole}</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="user-menu" id="userMenu">
                            <div class="user-info">
                                <div class="user-details">
                                    <strong>${userName}</strong>
                                    <small>${userEmail}</small>
                                </div>
                            </div>
                            <hr>
                            <a href="/members/profile.html" class="menu-item">
                                <span class="menu-icon">👤</span>
                                Profile Settings
                            </a>
                            <a href="/members/settings.html" class="menu-item">
                                <span class="menu-icon">⚙️</span>
                                Account Settings
                            </a>
                            ${userRole !== 'viewer' ? `
                            <a href="/members/videos.html" class="menu-item">
                                <span class="menu-icon">📺</span>
                                My Videos
                            </a>
                            ` : ''}
                            ${userRole === 'admin' ? `
                            <a href="/admin/analytics.html" class="menu-item">
                                <span class="menu-icon">📊</span>
                                System Status
                            </a>
                            ` : ''}
                            <hr>
                            <a href="#" onclick="logout()" class="menu-item logout">
                                <span class="menu-icon">🚪</span>
                                Logout
                            </a>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    `;
}

// Load header on page load
document.addEventListener('DOMContentLoaded', function() {
    const headerContainer = document.getElementById('header');
    if (headerContainer) {
        headerContainer.innerHTML = createHeader();
    }
});
