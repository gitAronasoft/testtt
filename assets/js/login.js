// Enhanced Login Form Handler
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const demoButtons = document.querySelectorAll(".demo-login");

    // Auto-focus email input
    emailInput.focus();

    // Enhanced form validation
    function validateField(field, errorElementId, validationFn, errorMessage) {
        const value = field.value.trim();
        const errorElement = document.getElementById(errorElementId);

        if (!validationFn(value)) {
            field.classList.add("is-invalid");
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = "block";
            }
            return false;
        } else {
            field.classList.remove("is-invalid");
            if (errorElement) {
                errorElement.textContent = "";
                errorElement.style.display = "none";
            }
            return true;
        }
    }

    // Real-time validation
    emailInput.addEventListener("blur", function () {
        validateField(
            this,
            "emailError",
            (value) => {
                return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            "Please enter a valid email address",
        );
    });

    passwordInput.addEventListener("blur", function () {
        validateField(
            this,
            "passwordError",
            (value) => {
                return value && value.length >= 6;
            },
            "Password must be at least 6 characters long",
        );
    });

    // Password visibility toggle
    document
        .getElementById("togglePassword")
        .addEventListener("click", function () {
            const passwordField = document.getElementById("password");
            const icon = this.querySelector("i");

            if (passwordField.type === "password") {
                passwordField.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                passwordField.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });

    // Demo account handlers
    demoButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const email = this.dataset.email;
            const password = this.dataset.password;
            const role = this.dataset.role;

            // Animate button
            this.style.transform = "scale(0.95)";
            setTimeout(() => {
                this.style.transform = "scale(1)";
            }, 150);

            // Fill form fields with animation
            typewriterEffect(emailInput, email, () => {
                typewriterEffect(passwordInput, password, () => {
                    showToast(`Demo ${role} account selected`, "success");
                });
            });
        });
    });

    // Typewriter effect for demo accounts
    function typewriterEffect(element, text, callback) {
        element.value = "";
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
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            console.log("Login form submitted");

            // Clear previous errors
            const errorElements = document.querySelectorAll(
                ".invalid-feedback, .error",
            );
            errorElements.forEach((el) => {
                if (el) {
                    el.textContent = "";
                    el.style.display = "none";
                }
            });

            const formControls = document.querySelectorAll(
                ".form-control, .input",
            );
            formControls.forEach((el) => {
                if (el) {
                    el.classList.remove("is-invalid");
                }
            });

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            console.log("Login attempt for email:", email);

            // Client-side validation
            let isValid = true;

            if (!email || !email.includes("@")) {
                showToast("Please enter a valid email address", "error");
                if (emailInput) emailInput.classList.add("is-invalid");
                isValid = false;
            }

            if (!password || password.length < 6) {
                showToast("Password must be at least 6 characters", "error");
                if (passwordInput) passwordInput.classList.add("is-invalid");
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            // Show loading state
            setLoadingState(true);

            try {
                console.log("Sending login request to API");
                
                const requestBody = JSON.stringify({
                    action: "login",
                    email: email,
                    password: password,
                });
                
                console.log("Request body:", requestBody);

                const response = await fetch("api/auth.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: requestBody,
                });

                console.log("Response status:", response.status);
                console.log("Response headers:", response.headers);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseText = await response.text();
                console.log("Raw response:", responseText);

                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    console.error('Response text:', responseText);
                    showToast("Invalid response from server", "error");
                    return;
                }

                console.log('Parsed login response:', data);

                if (data.success && data.user) {
                    console.log("Login successful for user:", data.user);
                    
                    // Store user data
                    localStorage.setItem(
                        "currentUser",
                        JSON.stringify(data.user),
                    );

                    // Success animation
                    showSuccessAnimation();

                    showToast(`Welcome back, ${data.user.name}!`, "success");

                    // Role-based redirect
                    let redirectUrl = "";
                    const userRole = data.user.role.toLowerCase();

                    switch (userRole) {
                        case "admin":
                            redirectUrl = "admin-dashboard.html";
                            break;
                        case "creator":
                        case "editor":
                            redirectUrl = "creator-dashboard.html";
                            break;
                        case "viewer":
                            redirectUrl = "viewer-dashboard.html";
                            break;
                        default:
                            console.warn("Unknown role:", userRole);
                            redirectUrl = "dashboard.html";
                    }

                    console.log(
                        "Redirecting to:",
                        redirectUrl,
                        "for role:",
                        userRole,
                    );

                    // Redirect with delay for UX
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 1500);
                } else {
                    console.error("Login failed:", data);
                    showToast(data.message || "Login failed", "error");
                    shakeForm();
                }
            } catch (error) {
                console.error("Login error:", error);
                showToast(
                    "Login failed. Please check your connection and try again.",
                    "error",
                );
                shakeForm();
            } finally {
                setLoadingState(false);
            }
        });
    } else {
        console.error("Login form not found!");
    }

    function setLoadingState(loading) {
        const btnText = document.getElementById("loginButtonText");
        const btnSpinner = document.getElementById("loginSpinner");

        if (loginButton) {
            loginButton.disabled = loading;
            if (loading) {
                loginButton.classList.add("opacity-50");
            } else {
                loginButton.classList.remove("opacity-50");
            }
        }

        if (btnText) {
            btnText.textContent = loading ? "Signing In..." : "Sign In";
        }

        if (btnSpinner) {
            if (loading) {
                btnSpinner.classList.remove("hidden");
            } else {
                btnSpinner.classList.add("hidden");
            }
        }
    }

    function showSuccessAnimation() {
        const icon = document.querySelector("#loginButtonText i");
        icon.classList.remove("fa-sign-in-alt");
        icon.classList.add("fa-check", "success-checkmark");
        icon.style.color = "#22c55e";
    }

    function shakeForm() {
        const form = loginForm;
        form.style.animation = "shake 0.5s ease-in-out";
        setTimeout(() => {
            form.style.animation = "";
        }, 500);
    }

    function showToast(message, type = "info") {
        // Use the global notification function if available
        if (typeof showNotification === "function") {
            showNotification(message, type);
            return;
        }

        // Fallback to console log
        console.log(`${type.toUpperCase()}: ${message}`);

        // Try to show an alert as fallback
        if (type === "error") {
            alert(`Error: ${message}`);
        }
    }

    function hideToast() {
        const toast = document.getElementById("toast");
        toast.classList.add("hidden");
        toast.classList.remove("success", "error", "warning");
    }

    // Make hideToast globally available
    window.hideToast = hideToast;

    // Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
        // Alt + D for demo admin account
        if (e.altKey && e.key === "d") {
            e.preventDefault();
            document.querySelector('[data-role="Admin"]').click();
        }

        // Alt + C for demo creator account
        if (e.altKey && e.key === "c") {
            e.preventDefault();
            document.querySelector('[data-role="Creator"]').click();
        }

        // Alt + V for demo viewer account
        if (e.altKey && e.key === "v") {
            e.preventDefault();
            document.querySelector('[data-role="Viewer"]').click();
        }
    });

    // Add shake animation to CSS
    const style = document.createElement("style");
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});
