// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    updateUI();
    setupProfileForm();
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

    // Update avatar
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        avatar.textContent = userName.charAt(0).toUpperCase();
    }

    // Update subscription status for viewers
    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    if (subscriptionStatus && userRole === 'viewer') {
        subscriptionStatus.textContent = isSubscribed ? 'Premium Plan' : 'Free Plan';
    }
}

function setupProfileForm() {
    // Email notifications toggle
    const emailNotifications = document.getElementById('emailNotifications');
    if (emailNotifications) {
        emailNotifications.checked = localStorage.getItem('emailNotifications') !== 'false';
        emailNotifications.addEventListener('change', function() {
            localStorage.setItem('emailNotifications', this.checked);
            showNotification('Email notification preferences updated', 'success');
        });
    }

    // Marketing emails toggle
    const marketingEmails = document.getElementById('marketingEmails');
    if (marketingEmails) {
        marketingEmails.checked = localStorage.getItem('marketingEmails') === 'true';
        marketingEmails.addEventListener('change', function() {
            localStorage.setItem('marketingEmails', this.checked);
            showNotification('Marketing email preferences updated', 'success');
        });
    }
}

function updateProfile() {
    const fullName = document.getElementById('fullName').value;
    const bio = document.getElementById('bio').value;
    const website = document.getElementById('website').value;

    if (!fullName) {
        showAlert('Please enter your full name', 'error');
        return;
    }

    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.name = fullName;
    currentUser.bio = bio;
    currentUser.website = website;

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('userName', fullName);

    showAlert('Profile updated successfully!', 'success');

    // Update header
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

function changeAvatar() {
    showNotification('Avatar upload feature coming soon!', 'info');
}

function setup2FA() {
    showNotification('Two-factor authentication setup coming soon!', 'info');
}

function loadPurchaseStats() {
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');

    const purchaseCount = document.getElementById('purchaseCount');
    const totalSpent = document.getElementById('totalSpent');

    if (purchaseCount) {
        purchaseCount.textContent = `${purchasedVideos.length} Videos Purchased`;
    }

    if (totalSpent) {
        const total = purchasedVideos.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
        totalSpent.textContent = `Total Spent: $${total.toFixed(2)}`;
    }
}

function exportData() {
    showAlert('Preparing data export...', 'info');
    // In a real app, this would generate and download user data
    setTimeout(() => {
        showAlert('Data export feature coming soon!', 'info');
    }, 2000);
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
            localStorage.clear();
            sessionStorage.clear();
            showAlert('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }
}