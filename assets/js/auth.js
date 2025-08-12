/**
 * VideoHub Authentication Module
 * Handles user registration, login, password reset, and email verification
 */

class AuthManager {
    constructor() {
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

        // Email verification actions
        const verifyButton = document.getElementById('verifyButton');
        if (verifyButton) {
            verifyButton.addEventListener('click', this.handleEmailVerification.bind(this));
        }

        const resendEmail = document.getElementById('resendEmail');
        if (resendEmail) {
            resendEmail.addEventListener('click', this.handleResendEmail.bind(this));
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
    }

    loadPageSpecificHandlers() {
        // Handle demo login prefill
        this.setupDemoLogin();
        
        // Handle URL parameters for verification
        this.handleUrlParameters();
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
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            this.showLoading('Signing in...');
            
            // Simulate API call
            await this.delay(1500);
            
            // Demo authentication
            const userType = this.getUserTypeFromEmail(email);
            
            if (userType) {
                // Store user session
                this.setUserSession({
                    email: email,
                    userType: userType,
                    rememberMe: rememberMe
                });

                this.showSuccess('Login successful! Redirecting...');
                
                // Redirect based on user type
                setTimeout(() => {
                    this.redirectToUserDashboard(userType);
                }, 1000);
            } else {
                throw new Error('Invalid credentials');
            }
            
        } catch (error) {
            this.showError('Invalid email or password. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
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
            
            this.showLoading('Creating your account...');
            
            // Simulate API call
            await this.delay(2000);
            
            this.showSuccess('Account created successfully! Please check your email for verification.');
            
            // Redirect to email verification
            setTimeout(() => {
                window.location.href = `email-verification.html?email=${encodeURIComponent(formData.email)}`;
            }, 1500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;

        try {
            this.showLoading('Sending reset link...');
            
            // Simulate API call
            await this.delay(1500);
            
            // Hide form and show success message
            document.getElementById('emailForm').style.display = 'none';
            document.getElementById('successMessage').classList.remove('d-none');
            
        } catch (error) {
            this.showError('Failed to send reset email. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleEmailVerification() {
        try {
            this.showLoading('Verifying email...');
            
            // Simulate API call
            await this.delay(1500);
            
            // Hide pending verification and show success
            document.getElementById('pendingVerification').style.display = 'none';
            document.getElementById('verificationSuccess').classList.remove('d-none');
            
        } catch (error) {
            this.showError('Verification failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleResendEmail() {
        try {
            this.showLoading('Resending verification email...');
            
            // Simulate API call
            await this.delay(1000);
            
            this.showSuccess('Verification email sent successfully!');
            
        } catch (error) {
            this.showError('Failed to resend email. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSetPassword(e) {
        e.preventDefault();
        
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
            
            this.showLoading('Setting password...');
            
            // Simulate API call
            await this.delay(1500);
            
            this.showSuccess('Password set successfully! You can now log in.');
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
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
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast align-items-center text-bg-${type} border-0`;
        toastElement.setAttribute('role', 'alert');
        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toastElement);

        // Initialize and show toast
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize authentication manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for other modules
window.AuthManager = AuthManager;
