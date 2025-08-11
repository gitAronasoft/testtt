// Unified Sidebar Toggle Functionality
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    if (!sidebar) return;

    if (window.innerWidth <= 991) {
        // Mobile behavior
        sidebar.classList.toggle('show');
        if (overlay) {
            overlay.classList.toggle('show');
        }
        body.classList.toggle('sidebar-open');
    }
}

// Handle window resize
function handleWindowResize() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    if (window.innerWidth > 991) {
        // Desktop behavior - ensure sidebar is visible
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        body.classList.remove('sidebar-open');
    }
}

// Initialize sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle window resize
    window.addEventListener('resize', handleWindowResize);

    // Handle sidebar toggle clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.sidebar-toggle')) {
            e.preventDefault();
            toggleSidebar();
        }
    });

    // Handle overlay clicks to close sidebar
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sidebar-overlay')) {
            toggleSidebar();
        }
    });

    // Handle escape key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.querySelector('.sidebar.show')) {
            toggleSidebar();
        }
    });

    // Setup logout functionality using global handler
    const logoutElements = document.querySelectorAll('#logoutBtn, .logout-link, [data-action="logout"]');
    logoutElements.forEach(element => {
        // Remove any existing listeners to prevent duplicates
        element.removeEventListener('click', handleLogoutClick);
        element.addEventListener('click', handleLogoutClick);
    });

    function handleLogoutClick(e) {
        e.preventDefault();

        // Use the global logout handler if available, otherwise use local logic
        if (typeof window.handleLogout === 'function') {
            window.handleLogout();
        } else {
            // Fallback logout logic
            localStorage.removeItem(CONFIG.STORAGE.USER);
            localStorage.removeItem(CONFIG.STORAGE.TOKEN);
            localStorage.removeItem(CONFIG.STORAGE.SESSION);

            // Show message and redirect
            alert('You have been logged out successfully.');
            window.location.href = '../login.html';
        }
    }

    // Initialize proper state
    handleWindowResize();
});

// Export for global access
if (typeof window !== 'undefined') {
    window.toggleSidebar = toggleSidebar;
}