// Enhanced Header Component with Navigation
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    initializeUserMenu();
    makeLogoClickable();
});

async function loadHeader() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userRole = currentUser.role || 'viewer';
    const userName = currentUser.name || 'Demo User';
    const userEmail = currentUser.email || 'demo@example.com';

    const headerHTML = `
        <div class="main-header">
            <div class="header-container">
                <a href="#" class="logo" id="logoLink">
                    <span class="logo-icon">🎬</span>
                    <h1>Video Manager</h1>
                </a>
                <div class="user-menu">
                    <div class="user-info" onclick="toggleUserDropdown()">
                        <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                        <div class="user-details">
                            <div class="user-name">${userName}</div>
                            <div class="user-role">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</div>
                        </div>
                        <span class="dropdown-arrow">▼</span>
                    </div>
                    <div class="user-dropdown" id="userDropdown">
                        <a href="profile.html" class="dropdown-item">
                            <span class="dropdown-icon">👤</span>
                            <span>Profile</span>
                        </a>
                        <a href="settings.html" class="dropdown-item">
                            <span class="dropdown-icon">⚙️</span>
                            <span>Settings</span>
                        </a>
                        <a href="subscription.html" class="dropdown-item">
                            <span class="dropdown-icon">💎</span>
                            <span>Subscription</span>
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item" onclick="logout()">
                            <span class="dropdown-icon">🚪</span>
                            <span>Sign Out</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    const headerElement = document.getElementById('header');
    if (headerElement) {
        headerElement.innerHTML = headerHTML;
    }
}

function makeLogoClickable() {
    const logoLink = document.getElementById('logoLink');
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();

            // Get current page
            const currentPage = window.location.pathname;

            // Determine dashboard URL based on current context
            let dashboardUrl = 'dashboard.html';

            // If we're in a subdirectory or specific page, adjust accordingly
            if (currentPage.includes('/members/') || currentPage.includes('members')) {
                dashboardUrl = '../dashboard.html';
            } else if (currentPage.includes('/admin/')) {
                dashboardUrl = '../dashboard.html';
            }

            // Navigate to dashboard
            window.location.href = dashboardUrl;
        });
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function initializeUserMenu() {
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const userMenu = document.querySelector('.user-menu');
        const dropdown = document.getElementById('userDropdown');

        if (dropdown && !userMenu.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function logout() {
    // Clear all user data
    localStorage.clear();
    sessionStorage.clear();

    // Show logout message
    showAlert('Successfully logged out!', 'success');

    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    alert.textContent = message;

    document.body.appendChild(alert);

    // Remove alert after 3 seconds
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

async function loadUserInfo() {
    try {
        // Get user info from server to ensure accuracy
        const response = await fetch('/api.php?action=get_user');
        const data = await response.json();

        if (data.success) {
            const user = data.user;

            const userNameSpan = document.getElementById('userName');
            const userRoleSpan = document.getElementById('userRole');

            if (userNameSpan) {
                userNameSpan.textContent = user.name;
            }

            if (userRoleSpan) {
                const roleIcons = {
                    'admin': '🛡️',
                    'editor': '✏️',
                    'viewer': '👁️'
                };
                const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
                userRoleSpan.innerHTML = `${roleIcons[user.role]} ${roleText}`;
            }

            // Update localStorage with current data
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userEmail', user.email);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Fallback to localStorage data
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userRole = localStorage.getItem('userRole') || currentUser.role || 'viewer';
        const userName = localStorage.getItem('userName') || currentUser.name || 'Demo User';

        const userNameSpan = document.getElementById('userName');
        const userRoleSpan = document.getElementById('userRole');

        if (userNameSpan) {
            userNameSpan.textContent = userName;
        }

        if (userRoleSpan) {
            userRoleSpan.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        }
    }
}