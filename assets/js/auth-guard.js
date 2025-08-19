/**
 * VideoHub Authentication Guard
 * Handles session validation and route protection
 * CRITICAL SECURITY: Blocks unauthorized access immediately
 */

// IMMEDIATE PROTECTION: Block ALL protected content until auth is verified
if (window.location.pathname.includes('/admin/') || 
    window.location.pathname.includes('/creator/') || 
    window.location.pathname.includes('/viewer/')) {
    
    // ALWAYS hide content immediately on protected pages
    document.documentElement.style.visibility = 'hidden';
    
    // Add CSS to ensure content stays hidden until approved
    const style = document.createElement('style');
    style.textContent = `
        body { 
            visibility: hidden !important; 
            opacity: 0 !important;
        }
        .auth-guard-approved { 
            visibility: visible !important; 
            opacity: 1 !important;
            transition: opacity 0.3s ease-in-out;
        }
        .auth-loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            visibility: visible !important;
            opacity: 1 !important;
        }
        .auth-loading-content {
            text-align: center;
            color: #495057;
        }
        .auth-spinner {
            width: 3rem;
            height: 3rem;
            border: 0.3em solid rgba(13, 110, 253, 0.2);
            border-radius: 50%;
            border-top: 0.3em solid #0d6efd;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Show professional loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'auth-loading-screen';
    loadingScreen.innerHTML = `
        <div class="auth-loading-content">
            <div class="auth-spinner"></div>
            <h5>Verifying Access...</h5>
            <p class="text-muted">Please wait while we confirm your permissions</p>
        </div>
    `;
    document.body.appendChild(loadingScreen);
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

        try {
            // For protected pages, ALWAYS verify with server first
            if (isProtectedPage) {
                const userSession = this.getUserSession();
                const token = this.getAuthToken();
                
                // No local session = immediate redirect
                if (!userSession || !token) {
                    console.log('SECURITY: No valid session found');
                    this.redirectToLogin();
                    return;
                }
                
                // Verify with server BEFORE allowing access
                const isValid = await this.verifyTokenWithServer(token);
                if (!isValid) {
                    console.log('SECURITY: Server token validation failed');
                    this.clearAuthData();
                    this.redirectToLogin();
                    return;
                }
                
                // Check role permissions
                const requiredRole = this.getRequiredRole(currentPath);
                if (requiredRole && userSession.userType !== requiredRole) {
                    console.log(`SECURITY: Access denied - required ${requiredRole}, user has ${userSession.userType}`);
                    this.showAccessDenied(requiredRole, userSession.userType);
                    setTimeout(() => this.redirectToUserDashboard(userSession.userType), 2000);
                    return;
                }
                
                // All checks passed - allow access
                console.log('AUTH: Access granted for user role:', userSession.userType);
                this.allowPageAccess();
                return;
            }
            
            // If no session or auth page, do full validation
            const isAuthenticated = await this.validateSession();
            
            if (isAuthenticated) {
                const userSession = this.getUserSession();
                if (isAuthPage && userSession) {
                    // Redirect authenticated users away from auth pages
                    this.redirectToUserDashboard(userSession.userType);
                    return;
                }
                
                if (isProtectedPage && userSession) {
                    // Check role-based access
                    const requiredRole = this.getRequiredRole(currentPath);
                    if (requiredRole && userSession.userType !== requiredRole) {
                        console.log(`SECURITY: Access denied - required ${requiredRole}, user has ${userSession.userType}`);
                        this.showAccessDenied(requiredRole, userSession.userType);
                        setTimeout(() => this.redirectToUserDashboard(userSession.userType), 2000);
                        return;
                    }
                    // User is authenticated and has correct role - allow access
                    this.allowPageAccess();
                    return;
                }
                
                // Not a protected page, allow access
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
                // For protected pages, if user has session but validation failed due to network issues
                const userSession = this.getUserSession();
                const token = this.getAuthToken();
                if (userSession && token && error.name === 'TypeError') {
                    console.warn('Network error during auth check - allowing cached session');
                    this.allowPageAccess();
                    return;
                }
                
                this.clearUserSession();
                this.redirectToLogin();
                return;
            }
        }
        
        // Always allow access at the end for non-protected pages
        this.allowPageAccess();
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
            // Try to wait for API service but don't fail if it's not available
            await this.waitForAPIService();
            
            // Ensure API service has the current token if available
            if (window.apiService && window.apiService.setAuthToken) {
                window.apiService.setAuthToken(token);
            }
            
            // Make direct fetch call to avoid conflicts with API service
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '';
            const response = await fetch(`${apiUrl}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Update user session with fresh data from API
                    const userData = data.data.user;
                    this.updateUserSession({
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        userType: userData.role
                    });
                    console.log('Session validation successful for user:', userData.role);
                    return true;
                }
            }
            
            console.log('Session validation failed - server response invalid');
            return false;
            
        } catch (error) {
            console.error('Session validation failed:', error);
            // For network errors or API service issues, be more lenient
            if (error.name === 'TypeError' || 
                error.message.includes('Failed to fetch') ||
                error.message.includes('API service not available')) {
                console.warn('Network/API error during session validation - allowing current session');
                return true; // Don't log out for temporary network/API issues
            }
            return false;
        }
    }

    async logout() {
        try {
            // Try to wait for API service but don't block logout if unavailable
            await this.waitForAPIService();
            
            // Call logout endpoint if API service is available
            if (window.apiService) {
                await window.apiService.post('/api/auth/logout');
            } else {
                console.warn('API service not available for logout - clearing local session only');
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local session regardless of API response
            this.clearUserSession();
            this.redirectToLogin();
        }
    }

    // New method for server token verification
    async verifyTokenWithServer(token) {
        try {
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '';
            const response = await fetch(`${apiUrl}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success && data.data;
            }
            return false;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    // Professional page access method
    allowPageAccess() {
        // Remove loading screen
        const loadingScreen = document.querySelector('.auth-loading-screen');
        if (loadingScreen) {
            loadingScreen.remove();
        }

        // Show page content with smooth transition
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.body.classList.add('auth-guard-approved');

        console.log('AUTH: Page access granted');
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('userSession');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userSession');
        sessionStorage.removeItem('authToken');
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
        // Validate token every 10 minutes (less aggressive)
        setInterval(async () => {
            const isProtectedPage = this.isProtectedPage(window.location.pathname);
            if (isProtectedPage) {
                try {
                    const isValid = await this.validateSession();
                    if (!isValid) {
                        console.log('Periodic validation failed - logging out');
                        this.clearUserSession();
                        this.redirectToLogin();
                    }
                } catch (error) {
                    console.warn('Periodic validation error - ignoring:', error);
                    // Don't log out for periodic validation errors
                }
            }
        }, 10 * 60 * 1000); // 10 minutes
        
        // Check on browser focus/visibility change (but less aggressive)
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                const isProtectedPage = this.isProtectedPage(window.location.pathname);
                if (isProtectedPage) {
                    try {
                        const userSession = this.getUserSession();
                        const token = this.getAuthToken();
                        
                        // Only validate if session exists
                        if (userSession && token) {
                            const isValid = await this.validateSession();
                            if (!isValid) {
                                console.log('Visibility validation failed - logging out');
                                this.clearUserSession();
                                this.redirectToLogin();
                            }
                        }
                    } catch (error) {
                        console.warn('Visibility validation error - ignoring:', error);
                        // Don't log out for visibility validation errors
                    }
                }
            }
        });
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
    
    getUserSession() {
        const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
        return session ? JSON.parse(session) : null;
    }
    
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    
    updateUserSession(userData) {
        const sessionData = JSON.stringify(userData);
        
        // Update both storages to maintain consistency
        if (localStorage.getItem('userSession')) {
            localStorage.setItem('userSession', sessionData);
        }
        if (sessionStorage.getItem('userSession')) {
            sessionStorage.setItem('userSession', sessionData);
        }
    }
    
    clearUserSession() {
        localStorage.removeItem('userSession');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userSession');
        sessionStorage.removeItem('authToken');
        
        // Clear API service token
        if (window.apiService && window.apiService.clearAuthToken) {
            window.apiService.clearAuthToken();
        }
    }
    
    redirectToLogin() {
        const baseUrl = window.videoHubConfig ? window.videoHubConfig.getBaseUrl() : '';
        window.location.href = `${baseUrl}/auth/login.html`;
    }
    
    redirectToUserDashboard(userType) {
        const baseUrl = window.videoHubConfig ? window.videoHubConfig.getBaseUrl() : '';
        const dashboardMap = {
            'admin': '/admin/dashboard.html',
            'creator': '/creator/dashboard.html',
            'viewer': '/viewer/dashboard.html'
        };
        
        const dashboardPath = dashboardMap[userType] || '/auth/login.html';
        window.location.href = `${baseUrl}${dashboardPath}`;
    }

    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 50;
        
        while (retries < maxRetries && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        return !!window.apiService;
    }
}

// Initialize AuthGuard
document.addEventListener('DOMContentLoaded', () => {
    if (!window.authGuard) {
        window.authGuard = new AuthGuard();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthGuard;
}