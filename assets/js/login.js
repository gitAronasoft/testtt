
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

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showNotification("Please enter both email and password", "error");
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
