
// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    updateUI();
});

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userName = localStorage.getItem('userName') || user.name || 'Demo User';
    const userEmail = localStorage.getItem('userEmail') || user.email || 'demo@example.com';
    const userRole = localStorage.getItem('userRole') || user.role || 'viewer';
    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';

    // Update form fields
    document.getElementById('fullName').value = userName;
    document.getElementById('email').value = userEmail;
    document.getElementById('role').value = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    
    // Load saved profile data
    const bio = localStorage.getItem('userBio') || '';
    const website = localStorage.getItem('userWebsite') || '';
    
    document.getElementById('bio').value = bio;
    document.getElementById('website').value = website;

    // Update avatar
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        avatar.textContent = userName.charAt(0).toUpperCase();
    }

    // Update subscription status for viewers
    if (userRole === 'viewer') {
        const statusElement = document.getElementById('subscriptionStatus');
        if (statusElement) {
            statusElement.textContent = isSubscribed ? 'Premium Plan - Active' : 'Free Plan';
        }
    }

    // Load notification preferences
    const emailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    const marketingEmails = localStorage.getItem('marketingEmails') === 'true';
    
    document.getElementById('emailNotifications').checked = emailNotifications;
    document.getElementById('marketingEmails').checked = marketingEmails;
}

function updateProfile() {
    const fullName = document.getElementById('fullName').value;
    const bio = document.getElementById('bio').value;
    const website = document.getElementById('website').value;
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const marketingEmails = document.getElementById('marketingEmails').checked;

    if (!fullName.trim()) {
        showAlert('Please enter your full name', 'error');
        return;
    }

    // Save to localStorage
    localStorage.setItem('userName', fullName);
    localStorage.setItem('userBio', bio);
    localStorage.setItem('userWebsite', website);
    localStorage.setItem('emailNotifications', emailNotifications);
    localStorage.setItem('marketingEmails', marketingEmails);

    // Update current user object
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.name = fullName;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showAlert('Profile updated successfully!', 'success');
    
    // Update avatar
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        avatar.textContent = fullName.charAt(0).toUpperCase();
    }
}

function changeAvatar() {
    showAlert('Avatar change feature coming soon!', 'info');
}

function setup2FA() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Setup Two-Factor Authentication</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 20px;">
                    <div style="width: 150px; height: 150px; background: #f0f0f0; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                        <span style="font-size: 60px;">📱</span>
                    </div>
                    <h4>QR Code</h4>
                    <p>Scan this QR code with your authenticator app</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong>Manual Entry Key:</strong><br>
                        <code>JBSWY3DPEHPK3PXP</code>
                    </div>
                    <div class="form-group">
                        <label for="verificationCode">Enter verification code</label>
                        <input type="text" id="verificationCode" placeholder="000000" maxlength="6">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="verify2FA()">Verify & Enable</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function verify2FA() {
    const code = document.getElementById('verificationCode').value;
    if (code.length === 6) {
        localStorage.setItem('twoFactorEnabled', 'true');
        showAlert('Two-factor authentication enabled successfully!', 'success');
        document.querySelector('.modal').remove();
    } else {
        showAlert('Please enter a valid 6-digit code', 'error');
    }
}

function manageSubscription() {
    window.location.href = 'subscription.html';
}

function deleteAccount() {
    const confirmDelete = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (confirmDelete) {
        const finalConfirm = prompt('Type "DELETE" to confirm account deletion:');
        if (finalConfirm === 'DELETE') {
            // Clear all user data
            localStorage.clear();
            sessionStorage.clear();
            showAlert('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }
}

console.log('Profile functionality loaded');
