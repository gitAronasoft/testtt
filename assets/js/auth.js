// Simple authentication for demo
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    // Simulate login
    showAlert('Logging in...', 'info');

    setTimeout(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', email.split('@')[0] || 'Demo User');
        localStorage.setItem('userRole', 'admin'); // Default role

        showAlert('Login successful!', 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
});

function loginAs(role) {
    const users = {
        admin: { name: 'Admin User', email: 'admin@demo.com' },
        editor: { name: 'Editor User', email: 'editor@demo.com' },
        viewer: { name: 'Viewer User', email: 'viewer@demo.com' }
    };

    const user = users[role];

    showAlert(`Logging in as ${role}...`, 'info');

    setTimeout(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userRole', role);

        // Set subscription status (viewers start unsubscribed)
        if (role === 'viewer') {
            localStorage.setItem('isSubscribed', 'false');
        } else {
            localStorage.setItem('isSubscribed', 'true'); // Admin and editor have access
        }

        showAlert(`Welcome ${user.name}!`, 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1000);
}

console.log('Auth system loaded');

function login(username, password, role) {
    // Simple demo authentication
    if (username && password) {
        // Clear any existing data first
        localStorage.clear();
        sessionStorage.clear();

        // Store user session
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', username);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userEmail', username + '@example.com');

        // Store current user object
        localStorage.setItem('currentUser', JSON.stringify({
            name: username,
            email: username + '@example.com',
            role: role
        }));

        showAlert('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            // Redirect based on role
            if (role === 'admin') {
                window.location.replace('dashboard.html');
            } else if (role === 'editor') {
                window.location.replace('dashboard.html');
            } else {
                window.location.replace('members/index.html');
            }
        }, 1000);

        return true;
    }

    showAlert('Please enter valid credentials', 'error');
    return false;
}
// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    setupAuthForm();
});

function setupAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('.auth-btn') || e.target.querySelector('.btn-primary');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-spinner');
        
        if (btnText && btnLoader) {
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
        }
        submitBtn.disabled = true;
    }
    
    // Attempt API login first
    fetch('api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'login',
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.user) {
            // Store user data properly
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            showAlert('Login successful!', 'success');
            
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    })
    .catch(error => {
        console.log('API login failed, trying demo login:', error);
        
        // Fallback to demo login with predefined credentials
        const demoUsers = {
            'admin@example.com': { name: 'Admin User', role: 'admin', password: 'admin123' },
            'editor@example.com': { name: 'Editor User', role: 'editor', password: 'editor123' },
            'viewer@example.com': { name: 'Viewer User', role: 'viewer', password: 'viewer123' }
        };
        
        const demoUser = demoUsers[email];
        if (demoUser && demoUser.password === password) {
            // Clear any existing data
            localStorage.clear();
            
            // Set demo user data
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', demoUser.name);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', demoUser.role);
            localStorage.setItem('currentUser', JSON.stringify({
                name: demoUser.name,
                email: email,
                role: demoUser.role
            }));
            
            showAlert('Demo login successful!', 'success');
            
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);
        } else {
            showAlert('Invalid email or password', 'error');
        }
    })
    .finally(() => {
        if (submitBtn) {
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-spinner');
            
            if (btnText && btnLoader) {
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
            }
            submitBtn.disabled = false;
        }
    });
}

function handleSignup(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const role = document.querySelector('input[name="role"]:checked')?.value;
    
    if (!email || !password) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('.auth-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    // Simulate signup process
    setTimeout(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', firstName ? `${firstName} ${lastName}` : email.split('@')[0]);
        localStorage.setItem('userRole', role || 'viewer');
        
        showAlert('Account created successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
}

function loginAs(role) {
    const users = {
        admin: { name: 'Admin User', email: 'admin@example.com', password: 'admin123' },
        editor: { name: 'Editor User', email: 'editor@example.com', password: 'editor123' },
        viewer: { name: 'Viewer User', email: 'viewer@example.com', password: 'viewer123' }
    };
    
    const user = users[role];
    
    // Clear any existing data first
    localStorage.clear();
    
    // Set user data
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', role);
    localStorage.setItem('currentUser', JSON.stringify({
        name: user.name,
        email: user.email,
        role: role
    }));
    
    showAlert(`Logged in as ${role}`, 'success');
    
    setTimeout(() => {
        window.location.replace('dashboard.html');
    }, 1000);
}
