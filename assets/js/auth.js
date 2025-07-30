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
    const submitBtn = e.target.querySelector('.auth-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    // Simulate login process
    setTimeout(() => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', email.split('@')[0]);
        localStorage.setItem('userRole', 'admin'); // Default to admin for demo
        
        showAlert('Login successful!', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
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
        admin: { name: 'Admin User', email: 'admin@demo.com' },
        editor: { name: 'Editor User', email: 'editor@demo.com' },
        viewer: { name: 'Viewer User', email: 'viewer@demo.com' }
    };
    
    const user = users[role];
    
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userRole', role);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showAlert(`Logged in as ${role}`, 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}
