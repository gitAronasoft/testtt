class Navigation {
    constructor(userRole = null) {
        this.userRole = userRole;
        this.isOpen = false;
    }

    getNavigationItems() {
        const baseItems = [
            { id: 'overview', icon: 'fas fa-chart-line', label: 'Overview', panel: 'overview' }
        ];

        const roleSpecificItems = {
            admin: [
                ...baseItems,
                { id: 'videos', icon: 'fas fa-video', label: 'All Videos', panel: 'videos' },
                { id: 'users', icon: 'fas fa-users', label: 'Users', panel: 'users' },
                { id: 'analytics', icon: 'fas fa-chart-bar', label: 'Analytics', panel: 'analytics' },
                { id: 'upload', icon: 'fas fa-upload', label: 'Upload', href: 'upload-video.html' },
                { id: 'youtube', icon: 'fab fa-youtube', label: 'YouTube', panel: 'youtube' },
                { id: 'earnings', icon: 'fas fa-dollar-sign', label: 'Earnings', panel: 'earnings' }
            ],
            creator: [
                ...baseItems,
                { id: 'myVideos', icon: 'fas fa-video', label: 'My Videos', panel: 'myVideos' },
                { id: 'upload', icon: 'fas fa-upload', label: 'Upload', href: 'upload-video.html' },
                { id: 'earnings', icon: 'fas fa-dollar-sign', label: 'Earnings', panel: 'earnings' },
                { id: 'paidUsers', icon: 'fas fa-users', label: 'Customers', panel: 'paidUsers' }
            ],
            editor: [
                ...baseItems,
                { id: 'myVideos', icon: 'fas fa-video', label: 'My Videos', panel: 'myVideos' },
                { id: 'upload', icon: 'fas fa-upload', label: 'Upload', href: 'upload-video.html' },
                { id: 'earnings', icon: 'fas fa-dollar-sign', label: 'Earnings', panel: 'earnings' }
            ],
            viewer: [
                ...baseItems,
                { id: 'videos', icon: 'fas fa-video', label: 'Browse Videos', panel: 'videos' },
                { id: 'purchases', icon: 'fas fa-shopping-cart', label: 'My Purchases', panel: 'purchases' },
                { id: 'watchlist', icon: 'fas fa-bookmark', label: 'Watchlist', panel: 'watchlist' }
            ]
        };

        return roleSpecificItems[this.userRole] || baseItems;
    }

    render(containerId, currentUser) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const navigationItems = this.getNavigationItems();

        container.innerHTML = `
            <!-- Logo Section -->
            <div class="p-4 border-bottom">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                        <i class="fas fa-video text-white"></i>
                    </div>
                    <span class="fw-bold text-lg">VideoHub ${this.userRole === 'admin' ? 'Admin' : this.userRole === 'creator' || this.userRole === 'editor' ? 'Studio' : 'Viewer'}</span>
                </div>
            </div>

            <!-- User Profile Card -->
            <div class="p-4 border-bottom">
                <div class="card bg-muted/50 border-0 shadow-sm">
                    <div class="card-body p-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle bg-${this.getRoleColor()} d-flex align-items-center justify-content-center text-white fw-bold" style="width: 40px; height: 40px;" id="userAvatar">
                                ${currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-semibold" id="userName">${currentUser?.name || 'User'}</div>
                                <div class="text-muted small" id="userRole">${this.userRole?.charAt(0).toUpperCase() + this.userRole?.slice(1) || 'User'}</div>
                            </div>
                            <button class="btn btn-ghost btn-sm" onclick="logout()" title="Logout">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation Menu -->
            <nav class="p-4">
                <ul class="nav nav-pills flex-column gap-1">
                    ${navigationItems.map(item => `
                        <li class="nav-item">
                            <a href="${item.href ? item.href : '#'}" class="nav-link d-flex align-items-center gap-3 text-muted-foreground hover-bg-accent rounded-md p-3 transition-colors" 
                               ${item.href ? '' : `onclick="window.showPanel('${item.panel}')" data-panel="${item.panel}"`}>
                                <i class="${item.icon}"></i>
                                <span>${item.label}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </nav>

            <!-- Footer -->
            <div class="mt-auto p-4 border-top">
                <div class="d-flex align-items-center justify-content-between">
                    <small class="text-muted">VideoHub v1.0</small>
                    ${this.renderRoleSwitcher()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    getRoleColor() {
        const colors = {
            admin: 'danger',
            creator: 'success',
            editor: 'warning',
            viewer: 'info'
        };
        return colors[this.userRole] || 'secondary';
    }

    renderRoleSwitcher() {
        if (this.userRole !== 'admin') return '';

        return `
            <div class="dropdown">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="fas fa-external-link-alt me-1"></i>
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="admin-dashboard.html"><i class="fas fa-shield-alt me-2"></i>Admin</a></li>
                    <li><a class="dropdown-item" href="creator-dashboard.html"><i class="fas fa-video me-2"></i>Creator</a></li>
                    <li><a class="dropdown-item" href="viewer-dashboard.html"><i class="fas fa-eye me-2"></i>Viewer</a></li>
                </ul>
            </div>
        `;
    }

    attachEventListeners() {
        // Mobile toggle functionality
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        if (mobileToggle) {
            mobileToggle.onclick = () => this.toggleMobile();
        }

        // Update active states
        this.updateActiveStates();
    }

    toggleMobile() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            sidebar.classList.add('show');
            this.createOverlay();
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('show');
            this.removeOverlay();
            document.body.style.overflow = '';
        }
    }

    createOverlay() {
        if (document.getElementById('mobileNavOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobileNavOverlay';
        overlay.className = 'position-fixed w-100 h-100';
        overlay.style.cssText = `
            top: 0;
            left: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            backdrop-filter: blur(4px);
        `;
        overlay.onclick = () => this.toggleMobile();
        document.body.appendChild(overlay);
    }

    removeOverlay() {
        const overlay = document.getElementById('mobileNavOverlay');
        if (overlay) overlay.remove();
    }

    updateActiveStates(activePanel = null) {
        const navLinks = document.querySelectorAll('.nav-link[data-panel]');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (activePanel && link.dataset.panel === activePanel) {
                link.classList.add('active');
            }
        });
    }

    close() {
        if (this.isOpen) {
            this.toggleMobile();
        }
    }
}

// Export for global use
window.Navigation = Navigation;