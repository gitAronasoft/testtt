
/**
 * VideoHub Authentication Guard
 * Handles session validation and route protection
 * CRITICAL SECURITY: Blocks unauthorized access immediately
 */

// IMMEDIATE PROTECTION: Block page content until auth is verified
if (window.location.pathname.includes('/admin/') || 
    window.location.pathname.includes('/creator/') || 
    window.location.pathname.includes('/viewer/')) {
    
    // Check if user session exists before hiding content
    const hasSession = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    const hasToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    // Only hide content if no session exists (likely unauthorized access)
    if (!hasSession || !hasToken) {
        // Hide body content immediately for unauthorized access
        document.documentElement.style.visibility = 'hidden';
        
        // Add CSS to ensure content stays hidden
        const style = document.createElement('style');
        style.textContent = `
            body { visibility: hidden !important; }
            .auth-guard-approved { visibility: visible !important; }
        `;
        document.head.appendChild(style);
    } else {
        // User has session, show content but still validate
        console.log('User session found, allowing initial content display');
    }
}

class AuthGuard {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) {
            console.log('Auth guard already initialized, skipping...');
            return;
        }
        
        this.isInitialized = true;
        this.checkAuthStatus();
        this.setupLogoutHandlers();
        this.validateTokenPeriodically();
    }

    async checkAuthStatus() {
        const currentPath = window.location.pathname;
        const isAuthPage = this.isAuthenticationPage(currentPath);
        const isProtectedPage = this.isProtectedPage(currentPath);

        // Immediately show loading overlay for protected pages to prevent content flash
        if (isProtectedPage) {
            this.showAuthCheckLoader();
        }

        try {
            const isAuthenticated = await this.validateSession();
            
            if (isAuthenticated) {
                const userSession = this.getUserSession();
                if (isAuthPage && userSession) {
                    // Redirect authenticated users away from auth pages
                    this.redirectToUserDashboard(userSession.userType);
                    return;
                }
                
                if (isProtectedPage && userSession) {
                    // Check role-based access - STRICT ENFORCEMENT
                    const requiredRole = this.getRequiredRole(currentPath);
                    if (requiredRole && userSession.userType !== requiredRole) {
                        console.log(`SECURITY: Access denied - required ${requiredRole}, user has ${userSession.userType}`);
                        // IMMEDIATE redirect for unauthorized access - no delay
                        this.showAccessDenied(requiredRole, userSession.userType);
                        // Redirect immediately
                        this.redirectToUserDashboard(userSession.userType);
                        return;
                    }
                    // User is authenticated and has correct role - allow access
                    this.hideAuthCheckLoader();
                    this.allowPageAccess();
                    return;
                }
                
                // Not a protected page, allow access
                this.hideAuthCheckLoader();
                this.allowPageAccess();
            } else {
                if (isProtectedPage) {
                    // Redirect unauthenticated users to login
                    console.log('User not authenticated, redirecting to login');
                    this.clearUserSession();
                    this.redirectToLogin();
                    return;
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            if (isProtectedPage) {
                // Check if it's just an API service timing issue
                if (error.message.includes('API service not available')) {
                    console.warn('API service timing issue, retrying auth check in 1 second...');
                    setTimeout(() => {
                        this.checkAuthStatus();
                    }, 1000);
                    return;
                }
                this.clearUserSession();
                this.redirectToLogin();
                return;
            }
        }
        
        // Always hide loader at the end
        this.hideAuthCheckLoader();
    }

    async validateSession() {
        const userSession = this.getUserSession();
        const token = this.getAuthToken();

        console.log('Auth guard validation - User session:', !!userSession, 'Token:', !!token);

        if (!userSession || !token) {
            console.log('No user session or token found');
            return false;
        }

        try {
            // Wait for API service to be available
            await this.waitForAPIService();
            
            // Ensure API service has the current token
            if (window.apiService && window.apiService.setAuthToken) {
                window.apiService.setAuthToken(token);
            }
            
            const response = await window.apiService.get('/api/auth/verify');
            
            if (response.success && response.data) {
                // Update user session with fresh data from API
                const userData = response.data.user;
                this.updateUserSession({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    userType: userData.role
                });
                console.log('Session validation successful for user:', userData.role);
                return true;
            } else {
                console.log('Session validation failed:', response.message);
                this.clearUserSession();
                return false;
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            // Don't immediately clear session for API errors - could be temporary
            if (error.message.includes('API service not available')) {
                console.warn('Session validation failed due to API timing issue');
                return false;
            }
            this.clearUserSession();
            return false;
        }
    }

    async logout() {
        try {
            // Wait for API service to be available
            await this.waitForAPIService();
            
            // Call logout endpoint
            await window.apiService.post('/api/auth/logout');
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
                    this.clearUserSession();
                    this.redirectToLogin();
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // Also check on browser focus/visibility change
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                const isProtectedPage = this.isProtectedPage(window.location.pathname);
                if (isProtectedPage) {
                    const isValid = await this.validateSession();
                    if (!isValid) {
                        this.clearUserSession();
                        this.redirectToLogin();
                    }
                }
            }
        });
    }
    
    showAuthCheckLoader() {
        // Prevent content flash during auth check
        const loader = document.createElement('div');
        loader.id = 'auth-check-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        loader.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>Checking authentication...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    
    hideAuthCheckLoader() {
        const loader = document.getElementById('auth-check-loader');
        if (loader) {
            loader.remove();
        }
    }
    
    allowPageAccess() {
        // Show page content for authorized users
        document.documentElement.style.visibility = 'visible';
        document.body.classList.add('auth-guard-approved');
        document.body.style.visibility = 'visible';
    }
    
    showAccessDenied(requiredRole, userRole) {
        // Show access denied overlay
        const overlay = document.createElement('div');
        overlay.id = 'access-denied-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(220, 53, 69, 0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        overlay.innerHTML = `
            <div class="text-center text-white">
                <div class="mb-3">
                    <i class="fas fa-shield-alt" style="font-size: 4rem;"></i>
                </div>
                <h2>Access Denied</h2>
                <p class="mb-3">You don't have permission to access this ${requiredRole} panel.</p>
                <p>Your role: <strong>${userRole}</strong> | Required: <strong>${requiredRole}</strong></p>
                <p><small>Redirecting to your dashboard...</small></p>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Auto-remove after redirect
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 1000);
    }
    
    isAuthenticationPage(path) {
        return path.includes('/auth/') || path.endsWith('login.html') || path.endsWith('signup.html');
    }
    
    isProtectedPage(path) {
        return path.includes('/admin/') || path.includes('/creator/') || path.includes('/viewer/');
    }
    
    getRequiredRole(path) {
        if (path.includes('/admin/')) return 'admin';
        if (path.includes('/creator/')) return 'creator';
        if (path.includes('/viewer/')) return 'viewer';
        return null;
    }
    
    redirectToLogin() {
        if (window.videoHubConfig) {
            window.location.href = window.videoHubConfig.getUrl('/auth/login.html');
        } else {
            window.location.href = '/auth/login.html';
        }
    }
    
    redirectToUserDashboard(userType) {
        const dashboards = {
            admin: '/admin/dashboard.html',
            creator: '/creator/dashboard.html',
            viewer: '/viewer/dashboard.html'
        };
        
        const dashboardUrl = dashboards[userType];
        if (dashboardUrl) {
            if (window.videoHubConfig) {
                window.location.href = window.videoHubConfig.getUrl(dashboardUrl);
            } else {
                window.location.href = dashboardUrl;
            }
        }
    }
    
    getUserSession() {
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');
        const session = localSession || sessionSession;
        return session ? JSON.parse(session) : null;
    }
    
    updateUserSession(userData) {
        const existingSession = this.getUserSession();
        if (existingSession) {
            const updatedSession = { ...existingSession, ...userData };
            if (localStorage.getItem('userSession')) {
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
    }
    
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    
    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 100; // Increased from 50 to 10 seconds
        
        while (retries < maxRetries && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.apiService) {
            // Don't throw error - try to initialize API service manually
            console.warn('API service not found, attempting manual initialization');
            if (typeof APIService !== 'undefined') {
                window.apiService = new APIService();
                // Give it a moment to initialize
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (!window.apiService) {
                throw new Error('API service not available');
            }
        }
    }
}

// Enhanced browser security measures
window.addEventListener('load', () => {
    // Prevent back button access to protected pages after logout
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // Page was loaded from cache (back button)
            const isProtectedPage = window.location.pathname.includes('/admin/') || 
                                   window.location.pathname.includes('/creator/') || 
                                   window.location.pathname.includes('/viewer/');
            
            if (isProtectedPage) {
                const authGuard = new AuthGuard();
                authGuard.checkAuthStatus();
            }
        }
    });
});

// Initialize auth guard globally - prevent multiple instances
if (!window.authGuard) {
    window.authGuard = new AuthGuard();
} else {
    console.log('Auth guard already initialized');
}
