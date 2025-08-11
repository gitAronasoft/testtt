/**
 * Fixed Authentication JavaScript for VideoShare platform
 * Handles login, signup, and authentication with backend API
 */

// Authentication state
let authState = {
    isLoading: false,
    rememberMe: false,
    currentForm: null
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
 * Check existing session
 */
function checkExistingSession() {
    const user = localStorage.getItem(CONFIG.STORAGE.USER);
    const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
    
    if (user && token) {
        const userData = JSON.parse(user);
        console.log('Existing session found for:', userData.email);
        
        // If on login page and user is logged in, redirect to dashboard
        if (window.location.pathname.includes('login.html')) {
            window.location.href = getDashboardUrl(userData.role);
        }
    }
}

/**
 * Load saved credentials
 */
function loadSavedCredentials() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const emailInput = document.getElementById('loginEmail');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (rememberedEmail && emailInput) {
        emailInput.value = rememberedEmail;
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
}

/**
 * Setup form submissions
 */
function setupFormSubmissions() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
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
    
    // Clear previous errors
    clearFormErrors(form);
    
    // Validate form
    if (!validateLoginForm(form)) {
        return;
    }
    
    // Get form data
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('Attempting login for:', email);
    
    // Show loading state
    setFormLoading(form, true);
    authState.isLoading = true;
    
    try {
        // Make API call
        const response = await API.login(email, password);
        
        console.log('API response:', response);
        
        if (response.success && response.data) {
            // Save session data properly
            const userData = response.data.user;
            const token = response.data.token;
            
            // Store user data and token
            localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(userData));
            localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
            
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', userData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            console.log('Login successful for user:', userData.name, 'Role:', userData.role);
            
            // Show success message
            showSuccess('Login successful! Redirecting...');
            
            // Redirect to appropriate dashboard  
            setTimeout(() => {
                window.location.href = getDashboardUrl(userData.role);
            }, 1500);
        } else {
            throw new Error(response.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showFormError(form, error.message || 'Login failed. Please check your credentials.');
    } finally {
        setFormLoading(form, false);
        authState.isLoading = false;
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
    
    // Clear previous errors
    clearFormErrors(form);
    
    // Validate form
    if (!validateSignupForm(form)) {
        return;
    }
    
    // Get form data
    const formData = getFormData(form);
    
    console.log('Attempting signup for:', formData.email);
    
    // Show loading state
    setFormLoading(form, true);
    authState.isLoading = true;
    
    try {
        // Make API call
        const response = await API.register(formData);
        
        if (response.success) {
            showSuccess('Account created successfully! Redirecting to login...');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            throw new Error(response.error || 'Signup failed');
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showFormError(form, error.message || 'Signup failed. Please try again.');
    } finally {
        setFormLoading(form, false);
        authState.isLoading = false;
    }
}

/**
 * Validate login form
 */
function validateLoginForm(form) {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email) {
        showFormError(form, 'Email is required');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showFormError(form, 'Please enter a valid email address');
        return false;
    }
    
    if (!password) {
        showFormError(form, 'Password is required');
        return false;
    }
    
    return true;
}

/**
 * Validate signup form
 */
function validateSignupForm(form) {
    const name = document.getElementById('name')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const role = document.querySelector('input[name="userRole"]:checked')?.value;
    
    if (!name) {
        showFormError(form, 'Name is required');
        return false;
    }
    
    if (!email) {
        showFormError(form, 'Email is required');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showFormError(form, 'Please enter a valid email address');
        return false;
    }
    
    if (!password) {
        showFormError(form, 'Password is required');
        return false;
    }
    
    if (password.length < 6) {
        showFormError(form, 'Password must be at least 6 characters long');
        return false;
    }
    
    if (!role) {
        showFormError(form, 'Please select your role');
        return false;
    }
    
    return true;
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
 * Show form error
 */
function showFormError(form, message) {
    clearFormErrors(form);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    errorDiv.id = 'form-error';
    
    form.appendChild(errorDiv);
}

/**
 * Clear form errors
 */
function clearFormErrors(form) {
    const existingError = form.querySelector('#form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Clear individual field errors
    const errorFields = form.querySelectorAll('.is-invalid');
    errorFields.forEach(field => field.classList.remove('is-invalid'));
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success position-fixed';
    successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 4000);
}

/**
 * Set form loading state
 */
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        
        // Disable inputs
        inputs.forEach(input => {
            input.disabled = true;
        });
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
        
        // Re-enable inputs
        inputs.forEach(input => {
            input.disabled = false;
        });
    }
}

/**
 * Get dashboard URL based on role
 */
function getDashboardUrl(role) {
    const dashboardUrls = {
        'creator': 'creator/creator-overview.html',
        'viewer': 'viewer/viewer-dashboard.html',
        'admin': 'admin/admin-dashboard.html'
    };
    
    return dashboardUrls[role] || 'viewer/viewer-dashboard.html';
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
            
            if (passwordInput && icon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

/**
 * Setup form validation
 */
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
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
    // Handle remember me
    const rememberCheckbox = document.getElementById('rememberMe');
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', (e) => {
            authState.rememberMe = e.target.checked;
        });
    }
}

/**
 * Validate field
 */
function validateField(input) {
    const value = input.value.trim();
    let isValid = true;
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
        isValid = false;
    }
    
    // Email validation
    if (input.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
    }
    
    // Update field appearance
    if (isValid) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
    }
    
    return isValid;
}

/**
 * Clear field error
 */
function clearFieldError(input) {
    input.classList.remove('is-invalid');
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}