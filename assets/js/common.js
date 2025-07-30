// Simple utility functions for demo app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    updateUI();
});

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (!isLoggedIn && currentPage === 'dashboard.html') {
        window.location.href = 'login.html';
        return;
    }

    if (isLoggedIn && (currentPage === 'login.html' || currentPage === 'index.html')) {
        if (currentPage === 'login.html') {
            window.location.href = 'dashboard.html';
        }
    }
}

function updateUI() {
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const userName = localStorage.getItem('userName') || 'Demo User';

    // Update user name displays
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');

    if (userNameElement) userNameElement.textContent = userName;
    if (userRoleElement) userRoleElement.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    // Show/hide elements based on role
    const adminElements = document.querySelectorAll('.admin-only');
    const editorElements = document.querySelectorAll('.editor-only');
    const viewerElements = document.querySelectorAll('.viewer-only');

    adminElements.forEach(el => {
        el.style.display = userRole === 'admin' ? 'block' : 'none';
    });

    editorElements.forEach(el => {
        el.style.display = userRole !== 'viewer' ? 'block' : 'none';
    });

    viewerElements.forEach(el => {
        el.style.display = userRole === 'viewer' ? 'block' : 'none';
    });
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    showAlert('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        z-index: 9999;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    alertDiv.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="background: none; border: none; float: right; cursor: pointer; margin-left: 10px; font-size: 1.2rem;">&times;</button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function refreshDashboard() {
    showAlert('Dashboard refreshed!', 'success');
    window.location.reload();
}

function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function uploadVideo() {
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const fileInput = document.getElementById('videoFile');

    if (!title || !fileInput.files[0]) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    showAlert('Video uploaded successfully!', 'success');
    closeModal('uploadModal');

    // Reset form
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    fileInput.value = '';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log('YouTube Video Manager loaded successfully');