// Simple utility functions for demo app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    updateUI();
});

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Prevent access to protected pages without login
    const protectedPages = ['dashboard.html', 'profile.html', 'settings.html', 'admin-videos.html', 'editor-videos.html', 'editor-upload.html', 'viewer-videos.html', 'viewer-history.html', 'user-management.html'];
    
    if (protectedPages.includes(currentPage) && !isLoggedIn) {
        window.location.replace('login.html');
        return;
    }

    // Redirect from login page if already logged in
    if (isLoggedIn && currentPage === 'login.html') {
        window.location.replace('dashboard.html');
        return;
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

// Alert function if not defined elsewhere
if (typeof showAlert === 'undefined') {
    function showAlert(message, type = 'info') {
        // Create alert container if it doesn't exist
        let alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alertContainer';
            alertContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(alertContainer);
        }

        // Create alert element
        const alert = document.createElement('div');
        alert.style.cssText = `
            padding: 1rem 1.5rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid;
        `;

        // Set colors based on type
        const colors = {
            success: { bg: '#f0fff4', color: '#22543d', border: '#38a169' },
            error: { bg: '#fff5f5', color: '#742a2a', border: '#e53e3e' },
            warning: { bg: '#fffbeb', color: '#744210', border: '#ed8936' },
            info: { bg: '#ebf8ff', color: '#2a4365', border: '#4299e1' }
        };

        const colorScheme = colors[type] || colors.info;
        alert.style.background = colorScheme.bg;
        alert.style.color = colorScheme.color;
        alert.style.borderLeftColor = colorScheme.border;

        alert.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none; 
                border: none; 
                font-size: 1.2rem; 
                cursor: pointer; 
                color: ${colorScheme.color};
                opacity: 0.7;
                margin-left: 1rem;
            ">&times;</button>
        `;

        alertContainer.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all user data
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear any authentication cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        showAlert('Logged out successfully', 'success');
        
        // Small delay to show the message, then redirect
        setTimeout(() => {
            window.location.replace('login.html');
        }, 1000);
    }
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

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function showSubscriptionModal() {
    showModal('subscriptionModal');
    setupPlanSelection();
    setupCardNumberFormatting();
}

function setupPlanSelection() {
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        card.addEventListener('click', function() {
            planCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function setupCardNumberFormatting() {
    const cardNumberInput = document.getElementById('subCardNumber');
    const expiryInput = document.getElementById('subExpiry');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
}

function processSubscription() {
    const cardNumber = document.getElementById('subCardNumber').value;
    const expiry = document.getElementById('subExpiry').value;
    const cvc = document.getElementById('subCvc').value;
    const cardName = document.getElementById('subCardName').value;
    const selectedPlan = document.querySelector('.plan-card.active').dataset.plan;
    
    if (!cardNumber || !expiry || !cvc || !cardName) {
        showAlert('Please fill in all payment details', 'error');
        return;
    }
    
    if (cardNumber.replace(/\s/g, '').length < 16) {
        showAlert('Please enter a valid card number', 'error');
        return;
    }
    
    if (expiry.length < 5) {
        showAlert('Please enter a valid expiry date', 'error');
        return;
    }
    
    if (cvc.length < 3) {
        showAlert('Please enter a valid CVC', 'error');
        return;
    }
    
    showAlert('Processing payment...', 'info');
    
    // Simulate payment processing
    setTimeout(() => {
        localStorage.setItem('isSubscribed', 'true');
        localStorage.setItem('subscriptionPlan', selectedPlan);
        localStorage.setItem('subscriptionDate', new Date().toISOString());
        
        showAlert('Payment successful! Welcome to the premium experience!', 'success');
        closeModal('subscriptionModal');
        
        // Refresh the page to show subscribed content
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }, 3000);
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

// Add CSS animation if not already added
if (!document.querySelector('#slideInAnimation')) {
    const style = document.createElement('style');
    style.id = 'slideInAnimation';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

console.log('YouTube Video Manager loaded successfully');