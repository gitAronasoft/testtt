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
        localStorage.setItem('userRole', role);

        showAlert(`Welcome ${user.name}!`, 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1000);
}

console.log('Auth system loaded');