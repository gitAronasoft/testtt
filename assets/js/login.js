

// Enhanced Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const demoButtons = document.querySelectorAll('.demo-login');
    
    // Auto-focus email input
    emailInput.focus();
    
    // Enhanced form validation
    function validateField(field, errorElementId, validationFn, errorMessage) {
        const value = field.value.trim();
        const errorElement = document.getElementById(errorElementId);
        
        if (!validationFn(value)) {
            field.classList.add('is-invalid');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            return false;
        } else {
            field.classList.remove('is-invalid');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            return true;
        }
    }
    
    // Real-time validation
    emailInput.addEventListener('blur', function() {
        validateField(this, 'emailError', (value) => {
            return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }, 'Please enter a valid email address');
    });
    
    passwordInput.addEventListener('blur', function() {
        validateField(this, 'passwordError', (value) => {
            return value && value.length >= 6;
        }, 'Password must be at least 6 characters long');
    });
    
    // Password visibility toggle
    document.getElementById('togglePassword').addEventListener('click', function() {
        const passwordField = document.getElementById('password');
        const icon = this.querySelector('i');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    // Demo account handlers
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const email = this.dataset.email;
            const password = this.dataset.password;
            const role = this.dataset.role;
            
            // Animate button
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            // Fill form fields with animation
            typewriterEffect(emailInput, email, () => {
                typewriterEffect(passwordInput, password, () => {
                    showToast(`Demo ${role} account selected`, 'success');
                });
            });
        });
    });
    
    // Typewriter effect for demo accounts
    function typewriterEffect(element, text, callback) {
        element.value = '';
        element.focus();
        let i = 0;
        
        function type() {
            if (i < text.length) {
                element.value += text.charAt(i);
                i++;
                setTimeout(type, 50);
            } else if (callback) {
                setTimeout(callback, 200);
            }
        }
        
        type();
    }
    
    // Enhanced form submission with role-based redirection
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('.form-control').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Client-side validation
        let isValid = true;
        
        if (!validateField(emailInput, 'emailError', (value) => {
            return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }, 'Please enter a valid email address')) {
            isValid = false;
        }
        
        if (!validateField(passwordInput, 'passwordError', (value) => {
            return value && value.length >= 1;
        }, 'Password is required')) {
            isValid = false;
        }
        
        if (!isValid) {
            showToast('Please fix the errors above', 'error');
            return;
        }
        
        // Show loading state
        setLoadingState(true);
        
        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store user data
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                // Success animation
                showSuccessAnimation();
                
                showToast(`Welcome back, ${data.user.name}!`, 'success');
                
                // Role-based redirection
                let redirectUrl = '';
                switch(data.user.role) {
                    case 'admin':
                        redirectUrl = 'admin-dashboard.html';
                        break;
                    case 'editor':
                    case 'creator':
                        redirectUrl = 'creator-dashboard.html';
                        break;
                    case 'viewer':
                        redirectUrl = 'viewer-dashboard.html';
                        break;
                    default:
                        redirectUrl = 'index.html';
                }
                
                // Check for custom redirect parameter
                const urlParams = new URLSearchParams(window.location.search);
                const customRedirect = urlParams.get('redirect');
                if (customRedirect) {
                    redirectUrl = customRedirect;
                }
                
                // Redirect with delay for UX
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
                
            } else {
                showToast(data.message || 'Login failed', 'error');
                
                // Shake animation for failed login
                shakeForm();
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please check your connection and try again.', 'error');
            shakeForm();
        } finally {
            setLoadingState(false);
        }
    });
    
    function setLoadingState(loading) {
        const btnText = document.getElementById('loginButtonText');
        const btnLoading = document.getElementById('loginButtonLoading');
        
        loginButton.disabled = loading;
        
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }
    
    function showSuccessAnimation() {
        const icon = document.querySelector('#loginButtonText i');
        icon.classList.remove('fa-sign-in-alt');
        icon.classList.add('fa-check', 'success-checkmark');
        icon.style.color = '#22c55e';
    }
    
    function shakeForm() {
        const form = loginForm;
        form.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    }
    
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const messageEl = document.getElementById('toastMessage');
        
        // Set icon based on type
        let iconClass = 'fas fa-info-circle';
        let iconColor = 'hsl(var(--primary))';
        
        if (type === 'success') {
            iconClass = 'fas fa-check-circle';
            iconColor = '#22c55e';
            toast.classList.add('success');
        } else if (type === 'error') {
            iconClass = 'fas fa-exclamation-circle';
            iconColor = 'hsl(var(--destructive))';
            toast.classList.add('error');
        } else if (type === 'warning') {
            iconClass = 'fas fa-exclamation-triangle';
            iconColor = '#f59e0b';
            toast.classList.add('warning');
        }
        
        icon.innerHTML = `<i class="${iconClass}" style="color: ${iconColor}"></i>`;
        messageEl.textContent = message;
        
        toast.classList.remove('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideToast();
        }, 5000);
    }
    
    function hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.add('hidden');
        toast.classList.remove('success', 'error', 'warning');
    }
    
    // Make hideToast globally available
    window.hideToast = hideToast;
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + D for demo admin account
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            document.querySelector('[data-role="Admin"]').click();
        }
        
        // Alt + C for demo creator account
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            document.querySelector('[data-role="Creator"]').click();
        }
        
        // Alt + V for demo viewer account
        if (e.altKey && e.key === 'v') {
            e.preventDefault();
            document.querySelector('[data-role="Viewer"]').click();
        }
    });
    
    // Add shake animation to CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});

