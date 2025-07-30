
// Global Sidebar Components

function createAdminSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    return `
        <aside class="admin-sidebar">
            <div class="admin-logo">
                <h2>🛡️ Admin Panel</h2>
            </div>
            <nav class="admin-nav">
                <a href="index.html" class="nav-item ${currentPage === 'index.html' ? 'active' : ''}">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="users.html" class="nav-item ${currentPage === 'users.html' ? 'active' : ''}">
                    <span class="nav-icon">👥</span>
                    <span class="nav-text">Users</span>
                </a>
                <a href="content.html" class="nav-item ${currentPage === 'content.html' ? 'active' : ''}">
                    <span class="nav-icon">📹</span>
                    <span class="nav-text">Content</span>
                </a>
                <a href="payments.html" class="nav-item ${currentPage === 'payments.html' ? 'active' : ''}">
                    <span class="nav-icon">💳</span>
                    <span class="nav-text">Payments</span>
                </a>
                <a href="analytics.html" class="nav-item ${currentPage === 'analytics.html' ? 'active' : ''}">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Analytics</span>
                </a>
                <a href="roles.html" class="nav-item ${currentPage === 'roles.html' ? 'active' : ''}">
                    <span class="nav-icon">🔐</span>
                    <span class="nav-text">Roles</span>
                </a>
                <a href="settings.html" class="nav-item ${currentPage === 'settings.html' ? 'active' : ''}">
                    <span class="nav-icon">⚙️</span>
                    <span class="nav-text">Settings</span>
                </a>
                <a href="logs.html" class="nav-item ${currentPage === 'logs.html' ? 'active' : ''}">
                    <span class="nav-icon">📝</span>
                    <span class="nav-text">Logs</span>
                </a>
                <a href="backup.html" class="nav-item ${currentPage === 'backup.html' ? 'active' : ''}">
                    <span class="nav-icon">💾</span>
                    <span class="nav-text">Backup</span>
                </a>
            </nav>
        </aside>
    `;
}

function createMemberSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const userRole = localStorage.getItem('userRole') || 'viewer';
    
    return `
        <aside class="member-sidebar">
            <div class="member-logo">
                <h2>🎬 Member Portal</h2>
            </div>
            <nav class="member-nav">
                <a href="index.html" class="nav-item ${currentPage === 'index.html' ? 'active' : ''}">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="profile.html" class="nav-item ${currentPage === 'profile.html' ? 'active' : ''}">
                    <span class="nav-icon">👤</span>
                    <span class="nav-text">Profile</span>
                </a>
                <a href="videos.html" class="nav-item ${currentPage === 'videos.html' ? 'active' : ''}">
                    <span class="nav-icon">📹</span>
                    <span class="nav-text">My Videos</span>
                </a>
                <a href="purchase.html" class="nav-item ${currentPage === 'purchase.html' ? 'active' : ''}">
                    <span class="nav-icon">🛒</span>
                    <span class="nav-text">Purchase History</span>
                </a>
                ${userRole !== 'viewer' ? `
                <a href="../upload.html" class="nav-item ${currentPage === 'upload.html' ? 'active' : ''}">
                    <span class="nav-icon">⬆️</span>
                    <span class="nav-text">Upload Video</span>
                </a>
                <a href="analytics.html" class="nav-item ${currentPage === 'analytics.html' ? 'active' : ''}">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Analytics</span>
                </a>
                ` : ''}
                <a href="settings.html" class="nav-item ${currentPage === 'settings.html' ? 'active' : ''}">
                    <span class="nav-icon">⚙️</span>
                    <span class="nav-text">Settings</span>
                </a>
                <a href="support.html" class="nav-item ${currentPage === 'support.html' ? 'active' : ''}">
                    <span class="nav-icon">💬</span>
                    <span class="nav-text">Support</span>
                </a>
            </nav>
        </aside>
    `;
}

// Load sidebar on page load
document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.getElementById('sidebar');
    if (sidebarContainer) {
        if (window.location.pathname.includes('/admin/')) {
            sidebarContainer.innerHTML = createAdminSidebar();
        } else if (window.location.pathname.includes('/members/')) {
            sidebarContainer.innerHTML = createMemberSidebar();
        }
    }
});
