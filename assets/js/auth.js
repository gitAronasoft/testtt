/**
 * Authentication JavaScript for VideoShare platform
 * Handles login, signup, forgot password, and form validation
 */

// Authentication state
let authState = {
    isLoading: false,
    rememberMe: false,
    currentForm: null
};

// Demo accounts for testing
const demoAccounts = {
    'creator@demo.com': {
        password: 'password123',
        role: 'creator',
        name: 'Demo Creator',
        id: 'creator_001'
    },
    'viewer@demo.com': {
        password: 'password123',
        role: 'viewer',
        name: 'Demo Viewer',
        id: 'viewer_001'
    }
};

// Initialize authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupFormValidation();
    setupEventListeners();
});

/**
 * Initialize authentication system
 */
function initializeAuth() {
    console.log('Auth system initialized');
    
    // Check if user is already logged in
    checkExistingSession();
    
    // Setup password visibility toggles
    setupPasswordToggles();
    
    // Setup form submissions
    setupFormSubmissions();
    
    // Load saved email if remember me was checked
    loadSavedCredentials();
}

/**
 * Setup form validation
 */
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Add real-time validation
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Handle social login buttons
    const socialButtons = document.querySelectorAll('.btn[onclick], .btn[data-provider]');
    socialButtons.forEach(button => {
        button.addEventListener('click', handleSocialLogin);
    });
    
    // Handle role selection
    const roleInputs = document.querySelectorAll('input[name="userRole"]');
    roleInputs.forEach(input => {
        input.addEventListener('change', handleRoleSelection);
    });
    
    // Handle terms and conditions
    const termsCheckbox = document.getElementById('agreeTerms');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', handleTermsChange);
    }
    
    // Handle remember me
    const rememberCheckbox = document.getElementById('rememberMe');
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', (e) => {
            authState.rememberMe = e.target.checked;
        });
    }
}

/**
 * Setup password visibility toggles
 */
function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('#togglePassword, #toggleLoginPassword');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.id === 'togglePassword' ? 'password' : 'loginPassword';
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

/**
 * Setup form submissions
 */
function setupFormSubmissions() {
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Forgot password form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
}

/**
 * Handle signup form submission
 */
async function handleSignup(e) {
    e.preventDefault();
    
    if (authState.isLoading) return;
    
    const form = e.target;
    authState.currentForm = form;
    
    // Validate form
    if (!validateSignupForm(form)) {
        return;
    }
    
    // Get form data
    const formData = getFormData(form);
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Simulate API call
        await simulateSignup(formData);
        
        // Show success message
        showAlert('Account created successfully! Redirecting to dashboard...', 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            const dashboardUrl = formData.userRole === 'creator' ? 
                'creator-dashboard.html' : 'viewer-dashboard.html';
            window.location.href = dashboardUrl;
        }, 2000);
        
    } catch (error) {
        showAlert(error.message, 'danger');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    if (authState.isLoading) return;
    
    const form = e.target;
    authState.currentForm = form;
    
    // Validate form
    if (!validateLoginForm(form)) {
        return;
    }
    
    // Get form data
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Simulate API call
        const user = await simulateLogin(email, password);
        
        // Save session
        saveSession(user);
        
        // Show success message
        showAlert('Login successful! Redirecting...', 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            const dashboardUrl = user.role === 'creator' ? 
                'creator-dashboard.html' : 'viewer-dashboard.html';
            window.location.href = dashboardUrl;
        }, 1500);
        
    } catch (error) {
        showLoginError(error.message);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Handle forgot password form submission
 */
async function handleForgotPassword(e) {
    e.preventDefault();
    
    if (authState.isLoading) return;
    
    const form = e.target;
    const email = document.getElementById('resetEmail').value;
    
    // Validate email
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Simulate API call
        await simulateForgotPassword(email);
        
        // Show success message
        showSuccess('Password reset link has been sent to your email address.');
        
        // Hide form and show success state
        form.style.display = 'none';
        
    } catch (error) {
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Validate signup form
 */
function validateSignupForm(form) {
    let isValid = true;
    
    // Get form elements
    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const userRole = document.querySelector('input[name="userRole"]:checked');
    const agreeTerms = document.getElementById('agreeTerms');
    
    // Validate full name
    if (!fullName.value.trim()) {
        setFieldError(fullName, 'Please enter your full name.');
        isValid = false;
    } else if (fullName.value.trim().length < 2) {
        setFieldError(fullName, 'Name must be at least 2 characters long.');
        isValid = false;
    }
    
    // Validate email
    if (!email.value.trim()) {
        setFieldError(email, 'Please enter your email address.');
        isValid = false;
    } else if (!isValidEmail(email.value)) {
        setFieldError(email, 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Validate password
    if (!password.value) {
        setFieldError(password, 'Please enter a password.');
        isValid = false;
    } else if (!isValidPassword(password.value)) {
        setFieldError(password, 'Password must be at least 8 characters with numbers and special characters.');
        isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword.value) {
        setFieldError(confirmPassword, 'Please confirm your password.');
        isValid = false;
    } else if (password.value !== confirmPassword.value) {
        setFieldError(confirmPassword, 'Passwords do not match.');
        isValid = false;
    }
    
    // Validate user role
    if (!userRole) {
        const roleContainer = document.querySelector('.row.g-2');
        showFieldError(roleContainer, 'Please select your role.');
        isValid = false;
    }
    
    // Validate terms agreement
    if (!agreeTerms.checked) {
        setFieldError(agreeTerms, 'You must agree to the terms and conditions.');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate login form
 */
function validateLoginForm(form) {
    let isValid = true;
    
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    
    // Validate email
    if (!email.value.trim()) {
        setFieldError(email, 'Please enter your email address.');
        isValid = false;
    } else if (!isValidEmail(email.value)) {
        setFieldError(email, 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Validate password
    if (!password.value) {
        setFieldError(password, 'Please enter your password.');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate individual field
 */
function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const id = field.id;
    
    clearFieldError(field);
    
    switch (id) {
        case 'fullName':
            if (!value) {
                setFieldError(field, 'Please enter your full name.');
            } else if (value.length < 2) {
                setFieldError(field, 'Name must be at least 2 characters long.');
            }
            break;
            
        case 'email':
        case 'loginEmail':
        case 'resetEmail':
            if (!value) {
                setFieldError(field, 'Please enter your email address.');
            } else if (!isValidEmail(value)) {
                setFieldError(field, 'Please enter a valid email address.');
            }
            break;
            
        case 'password':
        case 'loginPassword':
            if (!value) {
                setFieldError(field, 'Please enter a password.');
            } else if (id === 'password' && !isValidPassword(value)) {
                setFieldError(field, 'Password must be at least 8 characters with numbers and special characters.');
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (!value) {
                setFieldError(field, 'Please confirm your password.');
            } else if (value !== password) {
                setFieldError(field, 'Passwords do not match.');
            }
            break;
    }
}

/**
 * Set field error
 */
function setFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
    }
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    field.classList.remove('is-invalid');
    
    if (field.value.trim()) {
        field.classList.add('is-valid');
    } else {
        field.classList.remove('is-valid');
    }
}

/**
 * Show field error for custom elements
 */
function showFieldError(element, message) {
    let feedback = element.querySelector('.invalid-feedback') || 
                  element.parentElement.querySelector('.invalid-feedback');
    
    if (feedback) {
        feedback.textContent = message;
        feedback.style.display = 'block';
    }
}

/**
 * Get form data
 */
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

/**
 * Simulate signup API call
 */
async function simulateSignup(userData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Check if email already exists
            if (demoAccounts[userData.email]) {
                reject(new Error('An account with this email already exists.'));
                return;
            }
            
            // Create new user
            const newUser = {
                id: 'user_' + Date.now(),
                name: userData.fullName,
                email: userData.email,
                role: userData.userRole,
                createdAt: new Date().toISOString()
            };
            
            resolve(newUser);
        }, 1500);
    });
}

/**
 * Simulate login API call
 */
async function simulateLogin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const account = demoAccounts[email];
            
            if (!account) {
                reject(new Error('No account found with this email address.'));
                return;
            }
            
            if (account.password !== password) {
                reject(new Error('Incorrect password. Please try again.'));
                return;
            }
            
            // Return user data
            resolve({
                id: account.id,
                name: account.name,
                email: email,
                role: account.role,
                loginTime: new Date().toISOString()
            });
        }, 1000);
    });
}

/**
 * Simulate forgot password API call
 */
async function simulateForgotPassword(email) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!isValidEmail(email)) {
                reject(new Error('Please enter a valid email address.'));
                return;
            }
            
            // Simulate successful reset request
            resolve({ message: 'Password reset email sent successfully.' });
        }, 1500);
    });
}

/**
 * Handle social login
 */
function handleSocialLogin(e) {
    e.preventDefault();
    
    const provider = e.target.textContent.includes('Google') ? 'google' : 'unknown';
    
    showAlert(`${provider} login will be implemented when backend is ready.`, 'info');
}

/**
 * Handle role selection
 */
function handleRoleSelection(e) {
    const selectedRole = e.target.value;
    
    // Clear any previous role errors
    const roleContainer = document.querySelector('.row.g-2');
    const feedback = roleContainer.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
    
    // Update UI based on selected role
    updateRoleUI(selectedRole);
}

/**
 * Update UI based on selected role
 */
function updateRoleUI(role) {
    const creatorInfo = document.querySelector('.creator-info');
    const viewerInfo = document.querySelector('.viewer-info');
    
    if (creatorInfo) {
        creatorInfo.style.display = role === 'creator' ? 'block' : 'none';
    }
    
    if (viewerInfo) {
        viewerInfo.style.display = role === 'viewer' ? 'block' : 'none';
    }
}

/**
 * Handle terms change
 */
function handleTermsChange(e) {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = !e.target.checked;
    }
}

/**
 * Save user session
 */
function saveSession(user) {
    const sessionData = {
        user: user,
        token: 'demo_token_' + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    localStorage.setItem('videoShareUser', JSON.stringify(user));
    localStorage.setItem('videoShareToken', sessionData.token);
    localStorage.setItem('videoShareSession', JSON.stringify(sessionData));
    
    // Save email if remember me is checked
    if (authState.rememberMe) {
        localStorage.setItem('videoShareEmail', user.email);
    }
}

/**
 * Check existing session
 */
function checkExistingSession() {
    const sessionData = localStorage.getItem('videoShareSession');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);
            
            if (now < expiresAt) {
                // Session is still valid, redirect to dashboard
                const user = JSON.parse(localStorage.getItem('videoShareUser'));
                if (user) {
                    const dashboardUrl = user.role === 'creator' ? 
                        'creator-dashboard.html' : 'viewer-dashboard.html';
                    
                    // Only redirect if not already on a dashboard page
                    if (!window.location.pathname.includes('dashboard')) {
                        window.location.href = dashboardUrl;
                    }
                }
            } else {
                // Session expired, clear data
                clearSession();
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
            clearSession();
        }
    }
}

/**
 * Load saved credentials
 */
function loadSavedCredentials() {
    const savedEmail = localStorage.getItem('videoShareEmail');
    const emailInput = document.getElementById('loginEmail');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
            authState.rememberMe = true;
        }
    }
}

/**
 * Clear session data
 */
function clearSession() {
    localStorage.removeItem('videoShareUser');
    localStorage.removeItem('videoShareToken');
    localStorage.removeItem('videoShareSession');
}

/**
 * Set loading state
 */
function setLoadingState(isLoading) {
    authState.isLoading = isLoading;
    
    if (!authState.currentForm) return;
    
    const submitButton = authState.currentForm.querySelector('button[type="submit"]');
    if (!submitButton) return;
    
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Please wait...';
    } else {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || 'Submit';
    }
}

/**
 * Show login error
 */
function showLoginError(message) {
    const alertElement = document.getElementById('loginAlert');
    const messageElement = document.getElementById('loginAlertMessage');
    
    if (alertElement && messageElement) {
        messageElement.textContent = message;
        alertElement.classList.remove('d-none');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            alertElement.classList.add('d-none');
        }, 5000);
    } else {
        showAlert(message, 'danger');
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('d-none');
    } else {
        showAlert(message, 'success');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorElement && errorText) {
        errorText.textContent = message;
        errorElement.classList.remove('d-none');
    } else {
        showAlert(message, 'danger');
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
    `;
    
    alertElement.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 5000);
}

/**
 * Get alert icon based on type
 */
function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
    // At least 8 characters, contains numbers and special characters
    const minLength = password.length >= 8;
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasNumbers && hasSpecialChars;
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidEmail,
        isValidPassword,
        validateSignupForm,
        validateLoginForm
    };
}
