
// Settings page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    updateUI();
});

function loadSettings() {
    // Load general settings
    const language = localStorage.getItem('language') || 'en';
    const timezone = localStorage.getItem('timezone') || 'UTC';
    const dateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
    
    document.getElementById('language').value = language;
    document.getElementById('timezone').value = timezone;
    document.getElementById('dateFormat').value = dateFormat;

    // Load privacy settings
    const profileVisibility = localStorage.getItem('profileVisibility') || 'public';
    const dataCollection = localStorage.getItem('dataCollection') !== 'false';
    const analyticsTracking = localStorage.getItem('analyticsTracking') !== 'false';
    
    document.getElementById('profileVisibility').value = profileVisibility;
    document.getElementById('dataCollection').checked = dataCollection;
    document.getElementById('analyticsTracking').checked = analyticsTracking;

    // Load video settings (for admin/editor)
    const userRole = localStorage.getItem('userRole') || 'viewer';
    if (userRole !== 'viewer') {
        const defaultVideoPrivacy = localStorage.getItem('defaultVideoPrivacy') || 'public';
        const autoSync = localStorage.getItem('autoSync') === 'true';
        const videoQuality = localStorage.getItem('videoQuality') || '1080p';
        
        document.getElementById('defaultVideoPrivacy').value = defaultVideoPrivacy;
        document.getElementById('autoSync').checked = autoSync;
        document.getElementById('videoQuality').value = videoQuality;
    }

    // Load subscription info for viewers
    if (userRole === 'viewer') {
        loadSubscriptionInfo();
    }
}

function loadSubscriptionInfo() {
    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
    const subscriptionPlan = localStorage.getItem('subscriptionPlan') || 'free';
    
    const currentPlan = document.getElementById('currentPlan');
    const planDescription = document.getElementById('planDescription');
    const planStatus = document.getElementById('planStatus');
    
    if (currentPlan) {
        if (isSubscribed) {
            currentPlan.textContent = subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1) + ' Plan';
            planDescription.textContent = 'Premium access with exclusive features';
            planStatus.textContent = 'Active';
            planStatus.className = 'plan-status active';
        } else {
            currentPlan.textContent = 'Free Plan';
            planDescription.textContent = 'Basic access to public content';
            planStatus.textContent = 'Active';
            planStatus.className = 'plan-status';
        }
    }
}

function saveSettings() {
    // Save general settings
    localStorage.setItem('language', document.getElementById('language').value);
    localStorage.setItem('timezone', document.getElementById('timezone').value);
    localStorage.setItem('dateFormat', document.getElementById('dateFormat').value);

    // Save privacy settings
    localStorage.setItem('profileVisibility', document.getElementById('profileVisibility').value);
    localStorage.setItem('dataCollection', document.getElementById('dataCollection').checked);
    localStorage.setItem('analyticsTracking', document.getElementById('analyticsTracking').checked);

    // Save video settings (for admin/editor)
    const userRole = localStorage.getItem('userRole') || 'viewer';
    if (userRole !== 'viewer') {
        localStorage.setItem('defaultVideoPrivacy', document.getElementById('defaultVideoPrivacy').value);
        localStorage.setItem('autoSync', document.getElementById('autoSync').checked);
        localStorage.setItem('videoQuality', document.getElementById('videoQuality').value);
    }

    showAlert('Settings saved successfully!', 'success');
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        // Clear settings from localStorage
        const settingsKeys = [
            'language', 'timezone', 'dateFormat', 'profileVisibility',
            'dataCollection', 'analyticsTracking', 'defaultVideoPrivacy',
            'autoSync', 'videoQuality'
        ];
        
        settingsKeys.forEach(key => localStorage.removeItem(key));
        
        showAlert('Settings reset to default', 'success');
        
        // Reload the page to show default values
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

function upgradePlan() {
    window.location.href = 'subscription.html';
}

function viewBilling() {
    window.location.href = 'subscription.html#billing';
}

console.log('Settings functionality loaded');
