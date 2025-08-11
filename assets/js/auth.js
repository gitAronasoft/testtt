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

// Note: Demo accounts are now defined in config.js

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
            
            // Enhanced password strength indicator
            if (input.type === 'password' && input.id !== 'loginPassword') {
                input.addEventListener('input', () => updatePasswordStrength(input));
            }
        });
        
        // Enhanced form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleEnhancedFormSubmission(form);
        });
    });
}

/**
 * Enhanced form submission handler
 */
function handleEnhancedFormSubmission(form) {
    const formId = form.id;
    setFormLoading(form, true);
    
    // Clear previous errors
    clearFormErrors(form);
    
    // Validate all fields
    const isValid = validateForm(form);
    
    if (!isValid) {
        setFormLoading(form, false);
        showFormError(form, 'Please correct the errors below');
        return;
    }
    
    // Handle specific forms with improved UX
    switch (formId) {
        case 'loginForm':
            handleLoginSubmission(form);
            break;
        case 'signupForm':
            handleSignupSubmission(form);
            break;
        case 'forgotPasswordForm':
            handleForgotPasswordSubmission(form);
            break;
        default:
            setFormLoading(form, false);
    }
}

/**
 * Enhanced login submission
 */
function handleLoginSubmission(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe');
    
    // Simulate API call with realistic timing
    setTimeout(() => {
        try {
            const user = authenticateUser(email, password);
            if (user) {
                showSuccessMessage('Login successful! Redirecting...');
                saveUserSession(user, rememberMe);
                
                setTimeout(() => {
                    redirectToDashboard(user.role);
                }, 1500);
            } else {
                setFormLoading(form, false);
                showFormError(form, 'Invalid email or password. Please try again.');
                
                // Add shake animation to form
                form.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    form.style.animation = '';
                }, 500);
            }
        } catch (error) {
            setFormLoading(form, false);
            showFormError(form, 'An error occurred. Please try again.');
        }
    }, 1500);
}

/**
 * Enhanced signup submission
 */
function handleSignupSubmission(form) {
    const formData = new FormData(form);
    
    setTimeout(() => {
        showSuccessMessage('Account created successfully! Redirecting to login...');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }, 2000);
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(passwordInput) {
    const password = passwordInput.value;
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (!strengthIndicator) return;
    
    if (password.length === 0) {
        strengthIndicator.style.display = 'none';
        return;
    }
    
    strengthIndicator.style.display = 'block';
    
    const strength = calculatePasswordStrength(password);
    const strengthClasses = ['weak', 'fair', 'good', 'strong'];
    const strengthTexts = ['Weak', 'Fair', 'Good', 'Strong'];
    
    strengthIndicator.className = `password-strength ${strengthClasses[strength.level]}`;
    strengthIndicator.innerHTML = `
        ${strengthTexts[strength.level]}
        <div class="strength-bar" style="width: ${(strength.level + 1) * 25}%"></div>
    `;
}

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password) {
    let score = 0;
    let level = 0;
    
    if (password.length >= 8) score += 1;
    if (password.match(/[a-z]+/)) score += 1;
    if (password.match(/[A-Z]+/)) score += 1;
    if (password.match(/[0-9]+/)) score += 1;
    if (password.match(/[^a-zA-Z0-9]+/)) score += 1;
    
    if (score >= 4) level = 3; // Strong
    else if (score >= 3) level = 2; // Good
    else if (score >= 2) level = 1; // Fair
    else level = 0; // Weak
    
    return { score, level };
}

/**
 * Show form error with animation
 */
function showFormError(form, message) {
    const alertContainer = form.querySelector('.alert-container') || 
                          form.insertBefore(document.createElement('div'), form.firstChild);
    alertContainer.className = 'alert-container';
    
    alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Scroll to error
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
    successAlert.style.zIndex = '9999';
    successAlert.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(successAlert);
    
    setTimeout(() => {
        successAlert.remove();
    }, 4000);
}

/**
 * Clear form errors
 */
function clearFormErrors(form) {
    const alerts = form.querySelectorAll('.alert');
    alerts.forEach(alert => alert.remove());
}

/**
 * Enhanced form loading state
 */
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        inputs.forEach(input => input.disabled = true);
        form.style.opacity = '0.7';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
        inputs.forEach(input => input.disabled = false);
        form.style.opacity = '1';
    }
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
        showAlert('Account created successfully! Redirecting to login...', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = CONFIG.ROUTES.LOGIN;
        }, CONFIG.UI.LOADING_TIMEOUT);
        
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
        
        // Save session and remember email if checked
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        saveSession(user, rememberMe);
        
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', user.email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // Show success message
        showAlert('Login successful! Redirecting...', 'success');
        
        // Redirect to appropriate dashboard  
        setTimeout(() => {
            window.location.href = getDashboardUrl(user.role);
        }, CONFIG.UI.REDIRECT_DELAY);
        
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
            if (CONFIG.DEMO_ACCOUNTS[userData.email]) {
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
            const account = CONFIG.DEMO_ACCOUNTS[email];
            
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
            const account = CONFIG.DEMO_ACCOUNTS[email];
            
            if (!account) {
                reject(new Error('No account found with this email address.'));
                return;
            }
            
            resolve({ message: 'Password reset email sent successfully.' });
        }, 1000);
    });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} Is valid password
 */
function isValidPassword(password) {
    // At least 8 characters, contains number and special character
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    return passwordRegex.test(password);
}

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, danger, warning, info)
 */
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after timeout
    setTimeout(() => {
        if (alert && alert.parentNode) {
            alert.remove();
        }
    }, CONFIG.UI.ALERT_TIMEOUT);
}

/**
 * Show login error with shake animation
 * @param {string} message - Error message
 */
function showLoginError(message) {
    const form = authState.currentForm;
    showAlert(message, 'danger');
    
    // Add shake animation
    if (form) {
        form.style.animation = 'shake 0.5s';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    }
}

/**
 * Set loading state for forms
 * @param {boolean} isLoading - Loading state
 */
function setLoadingState(isLoading) {
    authState.isLoading = isLoading;
    const form = authState.currentForm;
    
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        inputs.forEach(input => input.disabled = true);
        form.style.opacity = '0.7';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
        inputs.forEach(input => input.disabled = false);
        form.style.opacity = '1';
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
}

/**
 * Setup password toggle functionality
 */
function setupPasswordToggle() {
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
 * Setup form event listeners
 */
function setupFormEventListeners() {
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
 * Load saved credentials if remember me was checked
 */
function loadSavedCredentials() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const emailInput = document.getElementById('loginEmail');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
}

/**
 * Check for existing session
 */
function checkExistingSession() {
    if (isAuthenticated()) {
        const user = getCurrentUser();
        const currentPage = window.location.pathname.split('/').pop();
        
        // If user is on auth pages but already logged in, redirect to dashboard
        if (currentPage === 'login.html' || currentPage === 'signup.html') {
            window.location.href = getDashboardUrl(user.role);
        }
    }
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
    // This can be expanded later to show role-specific information
    console.log(`Role selected: ${role}`);
}

/**
 * Handle terms and conditions change
 */
function handleTermsChange(e) {
    const feedback = e.target.parentElement.querySelector('.invalid-feedback');
    if (feedback && e.target.checked) {
        feedback.style.display = 'none';
    }
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
    
    localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
    localStorage.setItem(CONFIG.STORAGE.TOKEN, sessionData.token);
    localStorage.setItem(CONFIG.STORAGE.SESSION, JSON.stringify(sessionData));
    
    // Save email if remember me is checked
    if (authState.rememberMe) {
        localStorage.setItem('videoShareEmail', user.email);
    }
}

/**
 * Check existing session
 */
function checkExistingSession() {
    const sessionData = localStorage.getItem(CONFIG.STORAGE.SESSION);
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);
            
            if (now < expiresAt) {
                // Session is still valid, redirect to dashboard
                const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER));
                if (user) {
                    const dashboardUrl = getDashboardUrl(user.role);
                    
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
    localStorage.removeItem(CONFIG.STORAGE.USER);
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.SESSION);
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
