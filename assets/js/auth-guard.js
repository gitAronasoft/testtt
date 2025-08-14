
/**
 * VideoHub Authentication Guard
 * Handles session validation and route protection
 */

class AuthGuard {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupLogoutHandlers();
        this.validateTokenPeriodically();
    }

    async checkAuthStatus() {
        const currentPath = window.location.pathname;
        const isAuthPage = this.isAuthenticationPage(currentPath);
        const isProtectedPage = this.isProtectedPage(currentPath);

        try {
            const isAuthenticated = await this.validateSession();
            
            if (isAuthenticated) {
                if (isAuthPage) {
                    // Redirect authenticated users away from auth pages
                    const userSession = this.getUserSession();
                    if (userSession) {
                        this.redirectToUserDashboard(userSession.userType);
                    }
                }
            } else {
                if (isProtectedPage) {
                    // Redirect unauthenticated users to login
                    this.clearUserSession();
                    this.redirectToLogin();
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            if (isProtectedPage) {
                this.clearUserSession();
                this.redirectToLogin();
            }
        }
    }

    async validateSession() {
        const userSession = this.getUserSession();
        const token = this.getAuthToken();

        if (!userSession || !token) {
            return false;
        }

        try {
            // Wait for API service to be available
            await this.waitForAPIService();
            
            const response = await window.apiService.get('/auth/verify');
            
            if (response.success && response.data) {
                // Update user session with fresh data
                const userData = response.data.user;
                this.updateUserSession({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    userType: userData.role
                });
                return true;
            } else {
                this.clearUserSession();
                return false;
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.clearUserSession();
            return false;
        }
    }

    async logout() {
        try {
            // Wait for API service to be available
            await this.waitForAPIService();
            
            // Call logout endpoint
            await window.apiService.post('/auth/logout');
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local session regardless of API response
            this.clearUserSession();
            this.redirectToLogin();
        }
    }

    setupLogoutHandlers() {
        // Setup logout button handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-logout]') || e.target.closest('[data-logout]')) {
                e.preventDefault();
                this.confirmLogout();
            }
        });

        // Setup automatic logout on tab/window close
        window.addEventListener('beforeunload', () => {
            // Only clear session storage, keep localStorage for "remember me"
            sessionStorage.removeItem('userSession');
        });
    }

    confirmLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.logout();
        }
    }

    validateTokenPeriodically() {
        // Validate token every 5 minutes
        setInterval(async () => {
            const isProtectedPage = this.isProtectedPage(window.location.pathname);
            if (isProtectedPage) {
                const isValid = await this.validateSession();
                if (!isValid) {
                    this.redirectToLogin();
                }
            }
        }, 5 * 60 * 1000);
    }

    isAuthenticationPage(path) {
        const authPages = ['/auth/login.html', '/auth/signup.html', '/auth/forgot-password.html', '/auth/set-password.html'];
        return authPages.some(page => path.includes(page));
    }

    isProtectedPage(path) {
        const protectedPaths = ['/admin/', '/creator/', '/viewer/'];
        return protectedPaths.some(protectedPath => path.includes(protectedPath));
    }

    getUserSession() {
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');
        
        const session = localSession || sessionSession;
        return session ? JSON.parse(session) : null;
    }

    updateUserSession(userData) {
        const currentSession = this.getUserSession();
        if (currentSession) {
            const updatedSession = {
                ...currentSession,
                ...userData,
                timestamp: new Date().toISOString()
            };
            
            if (currentSession.rememberMe) {
                localStorage.setItem('userSession', JSON.stringify(updatedSession));
            } else {
                sessionStorage.setItem('userSession', JSON.stringify(updatedSession));
            }
        }
    }

    clearUserSession() {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        
        // Clear API service token
        if (window.apiService) {
            window.apiService.clearAuthToken();
        }
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/auth/login.html?returnUrl=${returnUrl}`;
    }

    redirectToUserDashboard(userType) {
        const dashboardUrls = {
            admin: '/admin/dashboard.html',
            creator: '/creator/dashboard.html',
            viewer: '/viewer/dashboard.html'
        };
        
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
        if (returnUrl && this.isProtectedPage(returnUrl)) {
            window.location.href = decodeURIComponent(returnUrl);
        } else {
            window.location.href = dashboardUrls[userType] || '/auth/login.html';
        }
    }

    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 50;
        
        while (retries < maxRetries && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.apiService) {
            throw new Error('API service not available');
        }
    }
}

// Initialize auth guard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authGuard = new AuthGuard();
});

// Export for other modules
window.AuthGuard = AuthGuard;
