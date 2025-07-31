
// Login functionality
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // Quick login buttons
    window.quickLogin = quickLogin;
});

async function handleLogin(event) {
    event.preventDefault();

    const form = event.target;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Clear previous errors
    clearFormErrors(form);

    // Enhanced validation
    let hasErrors = false;

    if (!email) {
        showFieldError(document.getElementById("email"), "Email is required");
        hasErrors = true;
    } else if (!isValidEmail(email)) {
        showFieldError(document.getElementById("email"), "Please enter a valid email address");
        hasErrors = true;
    }

    if (!password) {
        showFieldError(document.getElementById("password"), "Password is required");
        hasErrors = true;
    } else if (password.length < 6) {
        showFieldError(document.getElementById("password"), "Password must be at least 6 characters");
        hasErrors = true;
    }

    if (hasErrors) {
        showNotification("Please fix the errors above", "error");
        return;
    }

    // Update button state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing in...';
    
    showLoading(true);

    try {
        const response = await fetch("api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "login",
                email: email,
                password: password,
            }),
        });

        const data = await response.json();

        if (data.success) {
            // Store user data in localStorage
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            
            showNotification("Login successful!", "success");
            
            // Redirect based on user role
            redirectToRoleDashboard(data.user.role);
        } else {
            showNotification("Login failed: " + data.message, "error");
        }
    } catch (error) {
        console.error("Login failed:", error);
        showNotification("Login failed", "error");
    }

    showLoading(false);
}

function redirectToRoleDashboard(role) {
    // All roles go to the same dashboard.html but with different default panels
    const roleParams = {
        'admin': 'overview',
        'editor': 'myVideos',
        'creator': 'myVideos',
        'viewer': 'videos'
    };
    
    const defaultPanel = roleParams[role] || 'overview';
    window.location.href = `dashboard.html?panel=${defaultPanel}`;
}

async function quickLogin(email) {
    // Predefined passwords for testing
    const testCredentials = {
        'admin@example.com': 'admin123',
        'creator@example.com': 'creator123',
        'viewer@example.com': 'viewer123'
    };

    const password = testCredentials[email];
    if (!password) {
        showNotification("Invalid test account", "error");
        return;
    }

    showLoading(true);

    try {
        const response = await fetch("api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "login",
                email: email,
                password: password,
            }),
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            showNotification("Login successful!", "success");
            redirectToRoleDashboard(data.user.role);
        } else {
            showNotification("Quick login failed: " + data.message, "error");
        }
    } catch (error) {
        console.error("Quick login failed:", error);
        showNotification("Quick login failed", "error");
    }

    showLoading(false);
}

function showLoading(show) {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
        spinner.style.display = show ? "block" : "none";
    }
}

function showNotification(message, type = "info") {
    const toast = document.getElementById("notificationToast");
    const toastMessage = document.getElementById("toastMessage");

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast bg-${type === "error" ? "danger" : type === "success" ? "success" : "info"} text-white`;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        // Fallback to alert if toast elements not found
        alert(message);
    }
}

// Form validation utilities
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback d-block';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${message}`;
    field.parentNode.appendChild(errorDiv);
}

function clearFormErrors(form) {
    form.querySelectorAll('.form-control, .form-select').forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(error => {
        error.remove();
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function resetSubmitButton(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}
