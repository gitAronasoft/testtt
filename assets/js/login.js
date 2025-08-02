// Login functionality
document.addEventListener("DOMContentLoaded", function () {
    // Check if user is already logged in
    checkExistingAuth();

    // Handle login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // Handle signup form
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", handleSignup);
    }

    // Handle role selection for signup
    const roleSelect = document.getElementById("role");
    if (roleSelect) {
        roleSelect.addEventListener("change", handleRoleSelection);
    }

    // Quick login buttons
    window.quickLogin = quickLogin;
});

async function checkExistingAuth() {
    try {
        // Check localStorage first
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            // Verify with server
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',           
                body: JSON.stringify({ action: 'get_user' })
            });

            const data = await response.json();
            if (data.success) {
                // User is still valid, redirect to dashboard
                window.location.href = 'dashboard.html';
                return;
            } else {
                // Clear invalid stored user
                localStorage.removeItem('currentUser');
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('currentUser');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store user data in localStorage for quick access
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            showNotification('Login successful! Redirecting...', 'success');

            // Determine redirect based on role
            let redirectPanel = '';
            switch(data.user.role) {
                case 'viewer':
                    redirectPanel = '?panel=videos';
                    break;
                case 'editor':
                case 'creator':
                    redirectPanel = '?panel=myVideos';
                    break;
                case 'admin':
                    redirectPanel = '?panel=overview';
                    break;
                default:
                    redirectPanel = '?panel=overview';
            }

            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html' + redirectPanel;
            }, 1000);

        } else {
            showNotification(data.message || 'Login failed', 'error');
        }

    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
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