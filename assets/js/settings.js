
// Settings page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    updateUI();
    setupSettingsForm();
});

function loadSettings() {
    // Load general settings
    document.getElementById('language').value = localStorage.getItem('language') || 'en';
    document.getElementById('timezone').value = localStorage.getItem('timezone') || 'UTC';
    document.getElementById('dateFormat').value = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
    
    // Load privacy settings
    document.getElementById('profileVisibility').value = localStorage.getItem('profileVisibility') || 'public';
    document.getElementById('dataCollection').checked = localStorage.getItem('dataCollection') !== 'false';
    document.getElementById('analyticsTracking').checked = localStorage.getItem('analyticsTracking') !== 'false';
    
    // Load video settings (admin/editor only)
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'editor') {
        document.getElementById('defaultVideoPrivacy').value = localStorage.getItem('defaultVideoPrivacy') || 'public';
        document.getElementById('autoSync').checked = localStorage.getItem('autoSync') === 'true';
        document.getElementById('videoQuality').value = localStorage.getItem('videoQuality') || '1080p';
    }
    
    // Load subscription info for viewers
    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
    const currentPlan = document.getElementById('currentPlan');
    const planDescription = document.getElementById('planDescription');
    const planStatus = document.getElementById('planStatus');
    
    if (currentPlan && userRole === 'viewer') {
        currentPlan.textContent = isSubscribed ? 'Premium Plan' : 'Free Plan';
        planDescription.textContent = isSubscribed ? 'Full access to all features' : 'Basic access to public content';
        planStatus.textContent = 'Active';
        planStatus.className = `plan-status ${isSubscribed ? 'premium' : 'free'}`;
    }
}

function setupSettingsForm() {
    // Add event listeners for auto-save
    const settingsInputs = document.querySelectorAll('#language, #timezone, #dateFormat, #profileVisibility');
    settingsInputs.forEach(input => {
        input.addEventListener('change', autoSaveSettings);
    });
    
    const settingsCheckboxes = document.querySelectorAll('#dataCollection, #analyticsTracking, #autoSync');
    settingsCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', autoSaveSettings);
    });
}

function autoSaveSettings(event) {
    const setting = event.target.id;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    localStorage.setItem(setting, value);
    showNotification('Setting saved automatically', 'success');
}

function saveSettings() {
    // General settings
    localStorage.setItem('language', document.getElementById('language').value);
    localStorage.setItem('timezone', document.getElementById('timezone').value);
    localStorage.setItem('dateFormat', document.getElementById('dateFormat').value);
    
    // Privacy settings
    localStorage.setItem('profileVisibility', document.getElementById('profileVisibility').value);
    localStorage.setItem('dataCollection', document.getElementById('dataCollection').checked);
    localStorage.setItem('analyticsTracking', document.getElementById('analyticsTracking').checked);
    
    // Video settings (admin/editor only)
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'editor') {
        localStorage.setItem('defaultVideoPrivacy', document.getElementById('defaultVideoPrivacy').value);
        localStorage.setItem('autoSync', document.getElementById('autoSync').checked);
        localStorage.setItem('videoQuality', document.getElementById('videoQuality').value);
    }
    
    showAlert('All settings saved successfully!', 'success');
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        // Reset to defaults
        document.getElementById('language').value = 'en';
        document.getElementById('timezone').value = 'UTC';
        document.getElementById('dateFormat').value = 'MM/DD/YYYY';
        document.getElementById('profileVisibility').value = 'public';
        document.getElementById('dataCollection').checked = true;
        document.getElementById('analyticsTracking').checked = true;
        
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin' || userRole === 'editor') {
            document.getElementById('defaultVideoPrivacy').value = 'public';
            document.getElementById('autoSync').checked = false;
            document.getElementById('videoQuality').value = '1080p';
        }
        
        showAlert('Settings reset to default values', 'success');
    }
}

function upgradePlan() {
    window.location.href = 'subscription.html';
}

function viewBilling() {
    showNotification('Redirecting to billing portal...', 'info');
    // In a real app, this would redirect to a billing management page
}
