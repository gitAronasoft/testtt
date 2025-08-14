/**
 * VideoHub Authentication Manager
 * Centralized, bulletproof authentication system
 */

class AuthManager {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authToken = null;
        this.validationPromise = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('AuthManager already initialized');
            return;
        }

        this.isInitialized = true;
        console.log('AuthManager initializing...');

        // Load stored authentication state
        this.loadStoredAuth();
        
        // Start authentication check
        await this.checkAuthentication();
        
        // Setup periodic validation
        this.setupPeriodicValidation();
        
        // Setup logout handlers
        this.setupLogoutHandlers();
        
        // Handle browser back/forward
        this.setupBrowserHandlers();
        
        console.log('AuthManager initialized successfully');
    }

    loadStoredAuth() {
        // Get user session from storage
        const userSession = this.getUserSession();
        const authToken = this.getAuthToken();
        
        if (userSession && authToken) {
            this.currentUser = userSession;
            this.authToken = authToken;
            console.log('Loaded stored auth for user:', userSession.userType);
        }
    }

    async checkAuthentication() {
        const currentPath = window.location.pathname;
        const isAuthPage = this.isAuthenticationPage(currentPath);
        const isProtectedPage = this.isProtectedPage(currentPath);

        console.log('Checking authentication - Path:', currentPath, 'Protected:', isProtectedPage, 'Auth Page:', isAuthPage);

        // Show loader for protected pages
        if (isProtectedPage) {
            this.showAuthLoader();
        }

        try {
            // Validate current session
            const isValid = await this.validateSession();
            
            if (isValid && this.currentUser) {
                console.log('Authentication valid for user:', this.currentUser.userType);
                
                if (isAuthPage) {
                    // Redirect authenticated users away from auth pages
                    this.redirectToUserDashboard(this.currentUser.userType);
                    return;
                }
                
                if (isProtectedPage) {
                    // Check role-based access
                    const requiredRole = this.getRequiredRole(currentPath);
                    if (requiredRole && this.currentUser.userType !== requiredRole) {
                        console.log(`Role mismatch: required ${requiredRole}, user has ${this.currentUser.userType}`);
                        this.redirectToUserDashboard(this.currentUser.userType);
                        return;
                    }
                }
                
                // Authentication successful - allow access
                this.hideAuthLoader();
                return;
            }
            
            // Authentication failed
            if (isProtectedPage) {
                console.log('Authentication failed, redirecting to login');
                this.clearAuth();
                this.redirectToLogin();
                return;
            }
            
            // Not protected page, allow access
            this.hideAuthLoader();
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            
            if (isProtectedPage) {
                // On error, clear auth and redirect to login
                this.clearAuth();
                this.redirectToLogin();
                return;
            }
            
            this.hideAuthLoader();
        }
    }

    async validateSession() {
        // Return cached validation if in progress
        if (this.validationPromise) {
            return this.validationPromise;
        }

        if (!this.currentUser || !this.authToken) {
            console.log('No user session or token available');
            return false;
        }

        this.validationPromise = this.performValidation();
        const result = await this.validationPromise;
        this.validationPromise = null;
        
        return result;
    }

    async performValidation() {
        try {
            // Wait for API service with timeout
            await this.waitForAPIService();
            
            // Make validation request
            const response = await this.makeAuthRequest('/api/auth/verify');
            
            if (response.success && response.data && response.data.user) {
                // Update user data with fresh info
                const userData = response.data.user;
                this.updateUserData({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    userType: userData.role
                });
                
                this.retryCount = 0; // Reset retry count on success
                console.log('Session validation successful');
                return true;
            }
            
            console.log('Session validation failed:', response.message);
            return false;
            
        } catch (error) {
            console.error('Session validation error:', error);
            
            // Retry logic for network errors
            if (this.retryCount < this.maxRetries && this.isNetworkError(error)) {
                this.retryCount++;
                console.log(`Retrying validation (${this.retryCount}/${this.maxRetries})`);
                await this.delay(1000 * this.retryCount); // Exponential backoff
                return this.performValidation();
            }
            
            return false;
        }
    }

    async makeAuthRequest(endpoint) {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    setAuthentication(userData, token, rememberMe = false) {
        console.log('Setting authentication for user:', userData.userType);
        
        this.currentUser = userData;
        this.authToken = token;
        
        // Store in appropriate storage based on remember me
        this.storeUserSession(userData, rememberMe);
        this.storeAuthToken(token, rememberMe);
        
        // Sync with API service if available
        if (window.apiService && window.apiService.setAuthToken) {
            window.apiService.setAuthToken(token, rememberMe);
        }
    }

    clearAuth() {
        console.log('Clearing authentication');
        
        this.currentUser = null;
        this.authToken = null;
        this.retryCount = 0;
        
        // Clear all storage
        localStorage.removeItem('userSession');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userSession');
        sessionStorage.removeItem('authToken');
        
        // Clear API service token
        if (window.apiService && window.apiService.clearAuthToken) {
            window.apiService.clearAuthToken();
        }
    }

    async logout() {
        console.log('Logging out user');
        
        try {
            // Attempt to call logout endpoint
            if (this.authToken) {
                await this.makeAuthRequest('/api/auth/logout');
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local auth regardless of API response
            this.clearAuth();
            this.redirectToLogin();
        }
    }

    // Helper Methods
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
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');
        const session = localSession || sessionSession;
        return session ? JSON.parse(session) : null;
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    storeUserSession(userData, rememberMe) {
        const sessionData = JSON.stringify(userData);
        if (rememberMe) {
            localStorage.setItem('userSession', sessionData);
            sessionStorage.removeItem('userSession');
        } else {
            sessionStorage.setItem('userSession', sessionData);
            localStorage.removeItem('userSession');
        }
    }

    storeAuthToken(token, rememberMe) {
        if (rememberMe) {
            localStorage.setItem('authToken', token);
            sessionStorage.removeItem('authToken');
        } else {
            sessionStorage.setItem('authToken', token);
            localStorage.removeItem('authToken');
        }
    }

    updateUserData(newData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...newData };
            
            // Update stored session
            const existingSession = this.getUserSession();
            if (existingSession) {
                const isRemembered = localStorage.getItem('userSession') !== null;
                this.storeUserSession(this.currentUser, isRemembered);
            }
        }
    }

    redirectToLogin() {
        const loginUrl = window.videoHubConfig ? 
            window.videoHubConfig.getUrl('/auth/login.html') : 
            '/auth/login.html';
        window.location.href = loginUrl;
    }

    redirectToUserDashboard(userType) {
        const dashboards = {
            admin: '/admin/dashboard.html',
            creator: '/creator/dashboard.html',
            viewer: '/viewer/dashboard.html'
        };
        
        const dashboardUrl = dashboards[userType];
        if (dashboardUrl) {
            const url = window.videoHubConfig ? 
                window.videoHubConfig.getUrl(dashboardUrl) : 
                dashboardUrl;
            window.location.href = url;
        }
    }

    showAuthLoader() {
        // Remove existing loader first
        this.hideAuthLoader();
        
        const loader = document.createElement('div');
        loader.id = 'auth-loader';
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
                <div>Verifying authentication...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideAuthLoader() {
        const loader = document.getElementById('auth-loader');
        if (loader) {
            loader.remove();
        }
    }

    setupPeriodicValidation() {
        // Validate every 5 minutes
        setInterval(() => {
            if (this.currentUser && this.authToken && this.isProtectedPage(window.location.pathname)) {
                this.validateSession().catch(error => {
                    console.error('Periodic validation failed:', error);
                });
            }
        }, 5 * 60 * 1000);
    }

    setupLogoutHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-logout]') || e.target.closest('[data-logout]')) {
                e.preventDefault();
                this.confirmLogout();
            }
        });
    }

    setupBrowserHandlers() {
        // Handle page show events (back button)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted && this.isProtectedPage(window.location.pathname)) {
                // Page loaded from cache, re-check auth
                this.checkAuthentication();
            }
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentUser && this.isProtectedPage(window.location.pathname)) {
                // Page became visible, validate session
                this.validateSession().catch(error => {
                    console.error('Visibility validation failed:', error);
                });
            }
        });
    }

    confirmLogout() {
        if (confirm('Are you sure you want to log out?')) {
            this.logout();
        }
    }

    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 50;
        
        while (retries < maxRetries && !window.apiService) {
            await this.delay(100);
            retries++;
        }
        
        if (!window.apiService) {
            throw new Error('API service not available');
        }
    }

    isNetworkError(error) {
        return error.name === 'TypeError' || 
               error.name === 'AbortError' || 
               error.message.includes('Failed to fetch') ||
               error.message.includes('Network error');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API for other components
    getCurrentUser() {
        return this.currentUser;
    }

    getToken() {
        return this.authToken;
    }

    isAuthenticated() {
        return !!(this.currentUser && this.authToken);
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.userType === role;
    }
}

// Initialize global auth manager - prevent multiple instances
if (!window.authManager) {
    window.authManager = new AuthManager();
    console.log('Global AuthManager initialized');
} else {
    console.log('AuthManager already exists');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}