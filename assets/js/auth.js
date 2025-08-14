/**
 * VideoHub Authentication Module
 * Handles user registration, login, password reset, and email verification
 */

class AuthManager {
    constructor() {
        this.verificationProcessed = false;
        this.googleClientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPageSpecificHandlers();
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', this.handleSignup.bind(this));
        }

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', this.handleForgotPassword.bind(this));
        }

        // Set password form
        const setPasswordForm = document.getElementById('setPasswordForm');
        if (setPasswordForm) {
            setPasswordForm.addEventListener('submit', this.handleSetPassword.bind(this));
        }

        // Auto-verify if token is present in URL (only once)
        if (window.location.pathname.includes('email-verification.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            if (token && !this.verificationProcessed) {
                this.verificationProcessed = true;
                // Auto-verify email when token is present
                setTimeout(() => {
                    this.handleEmailVerification();
                }, 1000);
            }
        }

        const resendEmail = document.getElementById('resendEmail');
        if (resendEmail) {
            resendEmail.addEventListener('click', this.handleResendEmail.bind(this));
        }

        // Resend link in forgot password page
        const resendLink = document.getElementById('resendLink');
        if (resendLink) {
            resendLink.addEventListener('click', this.handleResendForgotPassword.bind(this));
        }

        // Password strength checker
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', this.checkPasswordStrength.bind(this));
        }

        // Password toggle
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', this.togglePasswordVisibility.bind(this));
        }

        // Google Sign-In buttons
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', this.handleGoogleSignIn.bind(this));
        }

        const googleSignUpBtn = document.getElementById('googleSignUpBtn');
        if (googleSignUpBtn) {
            googleSignUpBtn.addEventListener('click', this.handleGoogleSignUp.bind(this));
        }
    }

    loadPageSpecificHandlers() {
        // Handle demo login prefill
        this.setupDemoLogin();

        // Handle URL parameters for verification
        this.handleUrlParameters();

        // Initialize Google Sign-In
        this.initializeGoogleSignIn();
    }

    setupDemoLogin() {
        const demoButtons = document.querySelectorAll('.demo-login-btn');
        demoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userType = e.target.dataset.userType;
                this.prefillDemoCredentials(userType);
            });
        });
    }

    prefillDemoCredentials(userType) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

        const credentials = {
            admin: { email: 'admin@videohub.com', password: 'admin123' },
            creator: { email: 'creator@videohub.com', password: 'creator123' },
            viewer: { email: 'viewer@videohub.com', password: 'viewer123' }
        };

        if (credentials[userType]) {
            emailInput.value = credentials[userType].email;
            passwordInput.value = credentials[userType].password;
        }
    }

    handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        const token = urlParams.get('token');

        if (email) {
            const userEmailSpan = document.getElementById('userEmail');
            if (userEmailSpan) {
                userEmailSpan.textContent = email;
            }
        }

        if (token) {
            // Auto-verify if token is present
            setTimeout(() => {
                this.handleEmailVerification();
            }, 1000);
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            // Set button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, true, 'Signing in...');
            }

            // Wait for API service to be available
            await this.waitForAPIService();

            // Make API call to login endpoint
            const response = await window.apiService.post('/auth/login', {
                email: email,
                password: password
            });

            if (response.success && response.data) {
                // Store user session and token
                const userData = response.data.user;
                const token = response.data.token;

                this.setUserSession({
                    email: userData.email,
                    userType: userData.role,
                    name: userData.name,
                    id: userData.id,
                    rememberMe: rememberMe
                });

                // Store auth token with remember me preference
                if (window.apiService) {
                    window.apiService.setAuthToken(token, rememberMe);
                }

                if (window.commonUtils) {
                    window.commonUtils.showToast('Login successful! Redirecting...', 'success');
                }

                // Redirect based on user type
                setTimeout(() => {
                    this.redirectToUserDashboard(userData.role);
                }, 1000);
            } else {
                throw new Error(response.error || 'Login failed');
            }

        } catch (error) {
            console.error('Login error:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Login');
            } else {
                this.showError(error.message || 'Invalid email or password. Please try again.');
            }
        } finally {
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, false);
            }
        }
    }

    async handleSignup(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            userType: document.getElementById('userType').value,
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            agreeTerms: document.getElementById('agreeTerms').checked
        };

        try {
            // Validate form
            this.validateSignupForm(formData);

            // Set button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, true, 'Creating account...');
            }

            // Wait for API service to be available
            await this.waitForAPIService();

            // Make API call to register endpoint
            const response = await window.apiService.post('/auth/register', formData);

            if (response.success && response.data) {
                if (response.data.verification_required) {
                    // Show email verification message
                    if (window.commonUtils) {
                        window.commonUtils.showToast(response.message || 'Account created! Please check your email to verify.', 'success');
                    }

                    // Store email for verification page
                    sessionStorage.setItem('pendingVerificationEmail', formData.email);

                    // Redirect to email verification page
                    setTimeout(() => {
                        window.location.href = `email-verification.html?email=${encodeURIComponent(formData.email)}`;
                    }, 2000);
                } else {
                    // Traditional registration flow (if email verification is disabled)
                    if (window.commonUtils) {
                        window.commonUtils.showToast('Account created successfully! You can now log in.', 'success');
                    }

                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            } else {
                throw new Error(response.error || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Registration');
            } else {
                this.showError(error.message || 'Registration failed. Please try again.');
            }
        } finally {
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, false);
            }
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        const email = document.getElementById('email').value;

        if (!email) {
            this.showError('Please enter your email address.');
            return;
        }

        try {
            // Set button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, true, 'Sending reset link...');
            } else {
                this.showLoading('Sending reset link...');
            }

            // Make direct API call for forgot password endpoint using configured base URL
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (result.success) {
                // Hide form and show success message
                document.getElementById('emailForm').style.display = 'none';
                document.getElementById('successMessage').classList.remove('d-none');

                if (window.commonUtils) {
                    window.commonUtils.showToast(result.message || 'Password reset link sent successfully!', 'success');
                }
            } else {
                throw new Error(result.error || result.message || 'Failed to send reset email');
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Password Reset');
            } else {
                this.showError(error.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, false);
            } else {
                this.hideLoading();
            }
        }
    }

    async handleResendForgotPassword(e) {
        e.preventDefault();

        // Hide success message and show form again
        document.getElementById('successMessage').classList.add('d-none');
        document.getElementById('emailForm').style.display = 'block';

        if (window.commonUtils) {
            window.commonUtils.showToast('Please enter your email again to resend the reset link.', 'info');
        }
    }

    async handleEmailVerification() {
        try {
            this.showLoading('Verifying email...');

            // Get token from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                throw new Error('No verification token provided');
            }

            // Make direct API call without waiting for API service using configured base URL
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/endpoints/auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'verify-email',
                    token: token 
                })
            });

            const result = await response.json();

            if (result.success) {
                // Hide pending verification and show success
                const pendingVerification = document.getElementById('pendingVerification');
                const verificationSuccess = document.getElementById('verificationSuccess');

                if (pendingVerification) pendingVerification.style.display = 'none';
                if (verificationSuccess) verificationSuccess.classList.remove('d-none');

                this.showSuccess('Email verified successfully! You can now log in.');

                // Redirect to login page after success
                setTimeout(() => {
                    window.location.href = window.videoHubConfig ? 
                        window.videoHubConfig.getRelativeUrl('auth/login.html') : 
                        'login.html';
                }, 3000);
            } else {
                throw new Error(result.message || 'Verification failed');
            }

        } catch (error) {
            console.error('Email verification error:', error);
            this.showError(error.message || 'Verification failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleResendEmail() {
        try {
            this.showLoading('Resending verification email...');

            // Get email from URL parameters or session storage
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email') || sessionStorage.getItem('pendingVerificationEmail');

            if (!email) {
                throw new Error('No email address available for resending');
            }

            // Make direct API call without waiting for API service using configured base URL
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/endpoints/auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'resend-verification',
                    email: email 
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Verification email sent successfully!');
            } else {
                throw new Error(result.message || 'Failed to resend email');
            }

        } catch (error) {
            console.error('Resend email error:', error);
            this.showError(error.message || 'Failed to resend email. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSetPassword(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            // Validate passwords
            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (!this.isPasswordStrong(newPassword)) {
                throw new Error('Password does not meet strength requirements');
            }

            // Get token from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                throw new Error('Invalid or missing reset token');
            }

            // Set button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, true, 'Setting password...');
            } else {
                this.showLoading('Setting password...');
            }

            // Make direct API call for reset password endpoint using configured base URL
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: token,
                    password: newPassword 
                })
            });

            const result = await response.json();

            if (result.success) {
                if (window.commonUtils) {
                    window.commonUtils.showToast('Password reset successfully! You can now log in.', 'success');
                } else {
                    this.showSuccess('Password set successfully! You can now log in.');
                }

                // Redirect to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                throw new Error(result.error || result.message || 'Failed to reset password');
            }

        } catch (error) {
            console.error('Set password error:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Password Reset');
            } else {
                this.showError(error.message || 'Failed to set password. Please try again.');
            }
        } finally {
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(submitButton, false);
            } else {
                this.hideLoading();
            }
        }
    }

    validateSignupForm(formData) {
        if (!formData.firstName.trim()) {
            throw new Error('First name is required');
        }

        if (!formData.lastName.trim()) {
            throw new Error('Last name is required');
        }

        if (!this.isValidEmail(formData.email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!formData.userType) {
            throw new Error('Please select an account type');
        }

        if (formData.password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (formData.password !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (!formData.agreeTerms) {
            throw new Error('You must agree to the Terms of Service');
        }
    }

    checkPasswordStrength(e) {
        const password = e.target.value;
        const strengthBars = document.querySelectorAll('.strength-bar');
        const strengthText = document.getElementById('strengthText');

        if (!strengthBars.length || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);

        // Reset all bars
        strengthBars.forEach(bar => {
            bar.className = 'strength-bar';
        });

        // Fill bars based on strength
        for (let i = 0; i < strength.score; i++) {
            strengthBars[i].classList.add(strength.class);
        }

        strengthText.textContent = strength.text;
        strengthText.className = `text-${strength.class}`;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const strengthLevels = {
            0: { class: 'muted', text: 'Enter a password' },
            1: { class: 'danger', text: 'Very weak' },
            2: { class: 'warning', text: 'Weak' },
            3: { class: 'info', text: 'Fair' },
            4: { class: 'success', text: 'Good' },
            5: { class: 'success', text: 'Strong' }
        };

        return { score, ...strengthLevels[score] };
    }

    isPasswordStrong(password) {
        return password.length >= 8 && 
               /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password);
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('newPassword');
        const toggleButton = document.getElementById('togglePassword');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    getUserTypeFromEmail(email) {
        if (email.includes('admin@')) return 'admin';
        if (email.includes('creator@')) return 'creator';
        if (email.includes('viewer@')) return 'viewer';
        return null;
    }

    redirectToUserDashboard(userType) {
        const dashboardUrls = {
            admin: '../admin/dashboard.html',
            creator: '../creator/dashboard.html',
            viewer: '../viewer/dashboard.html'
        };

        window.location.href = dashboardUrls[userType];
    }

    setUserSession(userData) {
        const sessionData = {
            ...userData,
            timestamp: new Date().toISOString()
        };

        if (userData.rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        }
    }

    getUserSession() {
        const localSession = localStorage.getItem('userSession');
        const sessionSession = sessionStorage.getItem('userSession');

        const session = localSession || sessionSession;
        return session ? JSON.parse(session) : null;
    }

    clearUserSession() {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

    showLoading(message = 'Loading...') {
        // Create or update loading indicator
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'position-fixed top-50 start-50 translate-middle';
            loader.style.zIndex = '9999';
            document.body.appendChild(loader);
        }

        loader.innerHTML = `
            <div class="bg-white p-4 rounded shadow text-center">
                <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>${message}</div>
            </div>
        `;
        loader.style.display = 'block';
    }

    hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'danger');
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isValidReturnUrl(url) {
        try {
            const decodedUrl = decodeURIComponent(url);
            // Only allow internal URLs to dashboard pages
            return decodedUrl.startsWith('/admin/') || 
                   decodedUrl.startsWith('/creator/') || 
                   decodedUrl.startsWith('/viewer/');
        } catch {
            return false;
        }
    }

    initializeGoogleSignIn() {
        // Wait for Google Sign-In API to load with retry limit
        let retries = 0;
        const maxRetries = 50;

        const checkAndInit = () => {
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                try {
                    google.accounts.id.initialize({
                        client_id: this.googleClientId,
                        callback: this.handleGoogleCredentialResponse.bind(this),
                        auto_select: false,
                        cancel_on_tap_outside: true
                    });
                    console.log('Google Sign-In initialized successfully');
                } catch (error) {
                    console.error('Error initializing Google Sign-In:', error);
                }
            } else if (retries < maxRetries) {
                retries++;
                setTimeout(checkAndInit, 100);
            } else {
                console.error('Google Sign-In API failed to load after maximum retries');
            }
        };

        checkAndInit();
    }

    handleGoogleSignIn() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            try {
                // Use renderButton for more reliable sign-in
                const buttonContainer = document.createElement('div');
                buttonContainer.style.display = 'none';
                document.body.appendChild(buttonContainer);

                google.accounts.id.renderButton(buttonContainer, {
                    theme: 'outline',
                    size: 'large',
                    width: 250
                });

                // Trigger click programmatically
                setTimeout(() => {
                    const googleButton = buttonContainer.querySelector('div[role="button"]');
                    if (googleButton) {
                        googleButton.click();
                    } else {
                        // Fallback to prompt
                        google.accounts.id.prompt();
                    }
                    document.body.removeChild(buttonContainer);
                }, 100);

            } catch (error) {
                console.error('Google Sign-In error:', error);
                this.showError('Google Sign-In encountered an error. Please try again.');
            }
        } else {
            this.showError('Google Sign-In is not available. Please refresh the page and try again.');
        }
    }

    handleGoogleSignUp() {
        // Same logic as sign-in, the backend will handle the difference
        this.handleGoogleSignIn();
    }

    async handleGoogleCredentialResponse(response) {
        try {
            console.log('Google credential response received');
            this.showLoading('Authenticating with Google...');

            if (!response || !response.credential) {
                throw new Error('No credential received from Google');
            }

            // Wait for API service to be available
            await this.waitForAPIService();

            const isSignupPage = window.location.pathname.includes('signup.html');
            const action = isSignupPage ? 'google-signup' : 'google-login';

            // Send Google credential to backend using action-based endpoint
            const apiResponse = await window.apiService.post('/auth', {
                action: action,
                credential: response.credential
            });

            if (apiResponse.success && apiResponse.data) {
                const userData = apiResponse.data.user;
                const token = apiResponse.data.token;

                this.setUserSession({
                    email: userData.email,
                    userType: userData.role,
                    name: userData.name,
                    id: userData.id,
                    rememberMe: true
                });

                // Store auth token (Google auth defaults to remember me)
                if (window.apiService) {
                    window.apiService.setAuthToken(token, true);
                }

                const successMessage = isSignupPage ? 
                    'Account created successfully with Google!' : 
                    'Google Sign-In successful! Redirecting...';

                this.showSuccess(successMessage);

                // Redirect based on user type
                setTimeout(() => {
                    this.redirectToUserDashboard(userData.role);
                }, 1500);
            } else {
                throw new Error(apiResponse.message || 'Google authentication failed');
            }

        } catch (error) {
            console.error('Google authentication error:', error);
            this.showError(error.message || 'Google authentication failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
}

// Initialize authentication manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for other modules
window.AuthManager = AuthManager;