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