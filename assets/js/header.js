// Simple header functionality
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
});

function loadHeader() {
    const headerContainer = document.getElementById('header');
    if (!headerContainer) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userName = localStorage.getItem('userName') || user.name || 'Demo User';
    const userRole = localStorage.getItem('userRole') || user.role || 'viewer';

    headerContainer.innerHTML = createHeaderHTML(userName, userRole);
    
    // Initialize dropdown functionality
    const userDropdown = document.getElementById('userDropdown');   
   

    initializeDropdown();
}

function createHeaderHTML(userName, userRole) {
    return `
        <header class="main-header">
            <div class="header-container">
                <div class="header-left">
                    <div class="logo">
                        <h1>🎬 YouTube Manager</h1>
                    </div>
                </div>

                <div class="header-right">
                    <div class="user-menu">
                        <div class="user-info" onclick="toggleDropdown()">
                            <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                            <div class="user-details">
                                <div class="user-name">${userName}</div>
                                <div class="user-role">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</div>
                            </div>
                            <div class="dropdown-arrow">▼</div>
                        </div>

                        <div class="user-dropdown" id="userDropdown">
                            <a href="dashboard.html" class="dropdown-item">
                                <span class="dropdown-icon">📊</span>
                                Dashboard
                            </a>
                            <a href="profile.html" class="dropdown-item">
                                <span class="dropdown-icon">👤</span>
                                Profile
                            </a>
                            <a href="settings.html" class="dropdown-item">
                                <span class="dropdown-icon">⚙️</span>
                                Settings
                            </a>
                            ${userRole === 'viewer' ? `
                            <a href="subscription.html" class="dropdown-item">
                                <span class="dropdown-icon">💎</span>
                                Subscription
                            </a>
                            ` : ''}
                            <div class="dropdown-divider"></div>
                            <a href="#" class="dropdown-item" onclick="logout()">
                                <span class="dropdown-icon">🚪</span>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;
}

function toggleDropdown(event) {
    const userDropdown = document.getElementById('userDropdown');
    userDropdown.classList.toggle('show'); // Toggle the 'show' class
    
    // // Stop event propagation to prevent document click from closing the dropdown
    event.stopPropagation(); 
}
