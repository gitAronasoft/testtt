
// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    updateUI();
    setupProfileForm();
    loadPurchaseStats();
});

function loadUserProfile() {
    const userName = localStorage.getItem('userName') || 'Demo User';
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Update profile fields
    document.getElementById('fullName').value = user.name || userName;
    document.getElementById('email').value = user.email || 'demo@example.com';
    document.getElementById('role').value = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('website').value = user.website || '';
    document.getElementById('memberSince').value = formatDate(user.joinDate || '2024-01-01');

    // Update profile display
    const profileAvatar = document.getElementById('profileAvatar');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileRole = document.getElementById('profileRole');

    if (profileAvatar) {
        profileAvatar.textContent = userName.charAt(0).toUpperCase();
    }
    if (profileDisplayName) {
        profileDisplayName.textContent = userName;
    }
    if (profileRole) {
        profileRole.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        profileRole.className = `badge ${getRoleBadgeClass(userRole)}`;
    }

    // Load settings
    document.getElementById('emailNotifications').checked = localStorage.getItem('emailNotifications') !== 'false';
    document.getElementById('marketingEmails').checked = localStorage.getItem('marketingEmails') === 'true';
    document.getElementById('profileVisibility').value = localStorage.getItem('profileVisibility') || 'public';
}

function getRoleBadgeClass(role) {
    const classes = {
        admin: 'bg-danger',
        editor: 'bg-warning',
        viewer: 'bg-primary'
    };
    return classes[role] || 'bg-secondary';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function setupProfileForm() {
    // Email notifications toggle
    const emailNotifications = document.getElementById('emailNotifications');
    if (emailNotifications) {
        emailNotifications.addEventListener('change', function() {
            localStorage.setItem('emailNotifications', this.checked);
            showAlert('Email notification preferences updated', 'success');
        });
    }

    // Marketing emails toggle
    const marketingEmails = document.getElementById('marketingEmails');
    if (marketingEmails) {
        marketingEmails.addEventListener('change', function() {
            localStorage.setItem('marketingEmails', this.checked);
            showAlert('Marketing email preferences updated', 'success');
        });
    }

    // Profile visibility
    const profileVisibility = document.getElementById('profileVisibility');
    if (profileVisibility) {
        profileVisibility.addEventListener('change', function() {
            localStorage.setItem('profileVisibility', this.value);
            showAlert('Profile visibility updated', 'success');
        });
    }
}

function updateProfile() {
    const fullName = document.getElementById('fullName').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const website = document.getElementById('website').value.trim();

    if (!fullName) {
        showAlert('Please enter your full name', 'error');
        return;
    }

    // Validate website URL if provided
    if (website && !isValidUrl(website)) {
        showAlert('Please enter a valid website URL', 'error');
        return;
    }

    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.name = fullName;
    currentUser.bio = bio;
    currentUser.website = website;

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('userName', fullName);

    // Update display
    document.getElementById('profileDisplayName').textContent = fullName;
    document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();

    showAlert('Profile updated successfully!', 'success');
}

function resetForm() {
    if (confirm('Are you sure you want to reset all changes?')) {
        loadUserProfile();
        showAlert('Form reset to original values', 'info');
    }
}

function loadPurchaseStats() {
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');

    const purchaseCount = document.getElementById('purchaseCount');
    const totalSpent = document.getElementById('totalSpent');

    if (purchaseCount) {
        purchaseCount.textContent = purchasedVideos.length;
    }

    if (totalSpent) {
        const total = purchasedVideos.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
        totalSpent.textContent = '$' + total.toFixed(2);
    }
}

function exportData() {
    showAlert('Preparing data export...', 'info');
    
    // Simulate data export
    setTimeout(() => {
        const userData = {
            profile: JSON.parse(localStorage.getItem('currentUser') || '{}'),
            purchases: JSON.parse(localStorage.getItem('purchasedVideos') || '[]'),
            settings: {
                emailNotifications: localStorage.getItem('emailNotifications'),
                marketingEmails: localStorage.getItem('marketingEmails'),
                profileVisibility: localStorage.getItem('profileVisibility')
            }
        };
        
        console.log('User data export:', userData);
        showAlert('Data export completed! Check console for details.', 'success');
    }, 2000);
}

function changePassword() {
    const newPassword = prompt('Enter new password (Demo only - not actually changed):');
    if (newPassword) {
        showAlert('Password change completed! (Demo simulation)', 'success');
    }
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
            // Clear all user data
            localStorage.clear();
            sessionStorage.clear();
            showAlert('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
    `;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
