// Settings page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    updateUI();
    setupSettingsForm();
    loadPurchaseStats();
    loadUserInfo();
});

function loadUserInfo() {
    const userName = localStorage.getItem('userName') || 'Demo User';
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Update user info in sidebar
    const settingsAvatar = document.getElementById('settingsAvatar');
    const settingsUserName = document.getElementById('settingsUserName');
    const settingsUserRole = document.getElementById('settingsUserRole');
    const memberSince = document.getElementById('memberSince');

    if (settingsAvatar) {
        settingsAvatar.textContent = userName.charAt(0).toUpperCase();
    }
    if (settingsUserName) {
        settingsUserName.textContent = userName;
    }
    if (settingsUserRole) {
        settingsUserRole.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        settingsUserRole.className = `badge ${getRoleBadgeClass(userRole)}`;
    }
    if (memberSince) {
        const joinDate = user.joinDate || '2024-01-01';
        memberSince.textContent = formatDate(joinDate);
    }
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
        month: 'long'
    });
}

function loadSettings() {
    // Load general settings
    document.getElementById('language').value = localStorage.getItem('language') || 'en';
    document.getElementById('timezone').value = localStorage.getItem('timezone') || 'UTC';
    document.getElementById('dateFormat').value = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
    document.getElementById('theme').value = localStorage.getItem('theme') || 'light';

    // Load privacy settings
    document.getElementById('profileVisibility').value = localStorage.getItem('profileVisibility') || 'public';
    document.getElementById('dataCollection').checked = localStorage.getItem('dataCollection') !== 'false';
    document.getElementById('analyticsTracking').checked = localStorage.getItem('analyticsTracking') !== 'false';
    document.getElementById('marketingEmails').checked = localStorage.getItem('marketingEmails') === 'true';

    // Load notification settings
    document.getElementById('emailNotifications').checked = localStorage.getItem('emailNotifications') !== 'false';
    document.getElementById('browserNotifications').checked = localStorage.getItem('browserNotifications') === 'true';

    // Load role-specific settings
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'editor') {
        const defaultVideoPrivacy = document.getElementById('defaultVideoPrivacy');
        const videoQuality = document.getElementById('videoQuality');
        const autoThumbnails = document.getElementById('autoThumbnails');
        const autoSync = document.getElementById('autoSync');

        if (defaultVideoPrivacy) defaultVideoPrivacy.value = localStorage.getItem('defaultVideoPrivacy') || 'public';
        if (videoQuality) videoQuality.value = localStorage.getItem('videoQuality') || '1080p';
        if (autoThumbnails) autoThumbnails.checked = localStorage.getItem('autoThumbnails') !== 'false';
        if (autoSync) autoSync.checked = localStorage.getItem('autoSync') === 'true';
    }

    if (userRole === 'viewer') {
        const newVideoAlerts = document.getElementById('newVideoAlerts');
        if (newVideoAlerts) newVideoAlerts.checked = localStorage.getItem('newVideoAlerts') !== 'false';
    }

    if (userRole === 'editor') {
        const uploadNotifications = document.getElementById('uploadNotifications');
        if (uploadNotifications) uploadNotifications.checked = localStorage.getItem('uploadNotifications') !== 'false';
    }
}

function setupSettingsForm() {
    // Add event listeners for auto-save
    const settingsInputs = document.querySelectorAll('#language, #timezone, #dateFormat, #theme, #profileVisibility');
    settingsInputs.forEach(input => {
        input.addEventListener('change', autoSaveSettings);
    });

    const settingsCheckboxes = document.querySelectorAll('#dataCollection, #analyticsTracking, #marketingEmails, #emailNotifications, #browserNotifications, #autoThumbnails, #autoSync, #newVideoAlerts, #uploadNotifications');
    settingsCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', autoSaveSettings);
    });

    // Video quality settings
    const videoQuality = document.getElementById('videoQuality');
    const defaultVideoPrivacy = document.getElementById('defaultVideoPrivacy');
    if (videoQuality) videoQuality.addEventListener('change', autoSaveSettings);
    if (defaultVideoPrivacy) defaultVideoPrivacy.addEventListener('change', autoSaveSettings);
}

function autoSaveSettings(event) {
    const setting = event.target.id;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    localStorage.setItem(setting, value);
    showAlert('Setting saved automatically', 'success');
}

function saveSettings() {
    // Save all settings manually
    const settings = [
        'language', 'timezone', 'dateFormat', 'theme',
        'profileVisibility', 'dataCollection', 'analyticsTracking', 'marketingEmails',
        'emailNotifications', 'browserNotifications',
        'defaultVideoPrivacy', 'videoQuality', 'autoThumbnails', 'autoSync',
        'newVideoAlerts', 'uploadNotifications'
    ];

    settings.forEach(setting => {
        const element = document.getElementById(setting);
        if (element) {
            const value = element.type === 'checkbox' ? element.checked : element.value;
            localStorage.setItem(setting, value);
        }
    });

    showAlert('All settings saved successfully!', 'success');
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        // Reset to defaults
        document.getElementById('language').value = 'en';
        document.getElementById('timezone').value = 'UTC';
        document.getElementById('dateFormat').value = 'MM/DD/YYYY';
        document.getElementById('theme').value = 'light';
        document.getElementById('profileVisibility').value = 'public';
        document.getElementById('dataCollection').checked = true;
        document.getElementById('analyticsTracking').checked = true;
        document.getElementById('marketingEmails').checked = false;
        document.getElementById('emailNotifications').checked = true;
        document.getElementById('browserNotifications').checked = false;

        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin' || userRole === 'editor') {
            const defaultVideoPrivacy = document.getElementById('defaultVideoPrivacy');
            const videoQuality = document.getElementById('videoQuality');
            const autoThumbnails = document.getElementById('autoThumbnails');
            const autoSync = document.getElementById('autoSync');

            if (defaultVideoPrivacy) defaultVideoPrivacy.value = 'public';
            if (videoQuality) videoQuality.value = '1080p';
            if (autoThumbnails) autoThumbnails.checked = true;
            if (autoSync) autoSync.checked = false;
        }

        if (userRole === 'viewer') {
            const newVideoAlerts = document.getElementById('newVideoAlerts');
            if (newVideoAlerts) newVideoAlerts.checked = true;
        }

        if (userRole === 'editor') {
            const uploadNotifications = document.getElementById('uploadNotifications');
            if (uploadNotifications) uploadNotifications.checked = true;
        }

        showAlert('Settings reset to default values', 'success');
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

function changePassword() {
    const newPassword = prompt('Enter new password (Demo only):');
    if (newPassword && newPassword.length >= 6) {
        showAlert('Password changed successfully! (Demo simulation)', 'success');
    } else if (newPassword) {
        showAlert('Password must be at least 6 characters long', 'error');
    }
}

function setup2FA() {
    if (confirm('Enable two-factor authentication? (Demo simulation)')) {
        showAlert('Two-factor authentication enabled! (Demo simulation)', 'success');
    }
}

function viewSessions() {
    showAlert('Active sessions: 1 (Current session) - Demo simulation', 'info');
}

function exportData() {
    showAlert('Preparing data export...', 'info');

    setTimeout(() => {
        const userData = {
            profile: JSON.parse(localStorage.getItem('currentUser') || '{}'),
            settings: {
                language: localStorage.getItem('language'),
                timezone: localStorage.getItem('timezone'),
                theme: localStorage.getItem('theme'),
                profileVisibility: localStorage.getItem('profileVisibility'),
                emailNotifications: localStorage.getItem('emailNotifications')
            },
            purchases: JSON.parse(localStorage.getItem('purchasedVideos') || '[]')
        };

        console.log('Data export:', userData);
        showAlert('Data export completed! Check console for details.', 'success');
    }, 2000);
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