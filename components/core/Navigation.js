class Navigation {
    constructor(role) {
        this.role = role;
        this.isOpen = false;
    }

    render(containerId, user) {
        // This is handled by the HTML templates directly
        // Just update user info if elements exist
        this.updateUserInfo(user);
    }

    updateUserInfo(user) {
        if (!user) return;

        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) userRoleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        if (userAvatarEl) userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
    }

    updateActiveStates(activePanel) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current panel link
        const activeLink = document.querySelector(`[onclick="showPanel('${activePanel}')"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    close() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('show');
        }
        this.isOpen = false;
    }

    toggle() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
            this.isOpen = !this.isOpen;
        }
    }
}

// Export for use in dashboards
window.Navigation = Navigation;