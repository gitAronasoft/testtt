/**
 * Simple Profile Management System for VideoHub
 * Streamlined approach without complex logic
 */

class SimpleProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.bindFormEvents();
    }

    async loadUserData() {
        try {
            // Get user session
            const userSession = this.getUserSession();
            if (!userSession) {
                window.location.href = '../auth/login.html';
                return;
            }

            // Try API first, fallback to session data
            let userData = null;
            if (window.apiService) {
                try {
                    const result = await window.apiService.getUserProfile();
                    if (result.success) {
                        userData = result.data;
                    }
                } catch (error) {
                    console.warn('API unavailable, using session data');
                }
            }

            // Use session data as fallback
            if (!userData) {
                userData = {
                    firstName: userSession.name?.split(' ')[0] || '',
                    lastName: userSession.name?.split(' ').slice(1).join(' ') || '',
                    email: userSession.email || '',
                    role: userSession.userType || 'viewer',
                    name: userSession.name || ''
                };
            }

            this.populateForm(userData);
            
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('Error loading profile data', 'danger');
        }
    }

    getUserSession() {
        const sessionData = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
        return sessionData ? JSON.parse(sessionData) : null;
    }

    populateForm(userData) {
        // Safely populate form fields
        this.setFieldValue('firstName', userData.firstName);
        this.setFieldValue('lastName', userData.lastName);
        this.setFieldValue('email', userData.email);
        this.setFieldValue('channelName', userData.channelName || userData.name);
        this.setFieldValue('channelDescription', userData.channelDescription);
        
        // Set role display
        const roleEl = document.getElementById('role');
        if (roleEl) {
            const roleMap = {
                'admin': 'Administrator',
                'creator': 'Content Creator',
                'viewer': 'Viewer'
            };
            roleEl.value = roleMap[userData.role] || userData.role;
        }

        // Update additional profile elements (viewer/admin specific)
        this.setFieldValue('userDisplayName', userData.name);
        this.setFieldValue('userMembershipType', this.getMembershipType(userData.role));
        this.setFieldValue('memberSince', userData.joinDate || 'Recent');
        this.setFieldValue('lastLogin', 'Today');

        // Update user badges based on role
        this.updateUserBadges(userData.role);
    }

    getMembershipType(role) {
        const membershipTypes = {
            'admin': 'Administrator',
            'creator': 'Creator',
            'viewer': 'Premium Member'
        };
        return membershipTypes[role] || 'Member';
    }

    updateUserBadges(role) {
        const badgesEl = document.getElementById('userBadges');
        if (badgesEl) {
            let badges = '';
            if (role === 'admin') {
                badges = '<span class="badge bg-danger">Admin</span>';
            } else if (role === 'creator') {
                badges = '<span class="badge bg-success">Creator</span>';
            } else {
                badges = '<span class="badge bg-success">Verified</span><span class="badge bg-primary">Premium</span>';
            }
            badgesEl.innerHTML = badges;
        }
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    bindFormEvents() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Password form submission
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        try {
            const formData = this.getFormData();
            const userSession = this.getUserSession();
            
            if (!userSession?.id) {
                this.showAlert('Session expired. Please login again.', 'danger');
                return;
            }

            // Simple API call
            const response = await fetch(`/api/users/${userSession.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Update session with new data
                const updatedSession = { ...userSession, ...formData };
                sessionStorage.setItem('userSession', JSON.stringify(updatedSession));
                
                this.showAlert('Profile updated successfully!', 'success');
            } else {
                this.showAlert('Failed to update profile', 'danger');
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showAlert('Error updating profile', 'danger');
        }
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (newPassword !== confirmPassword) {
            this.showAlert('Passwords do not match', 'danger');
            return;
        }

        try {
            const userSession = this.getUserSession();
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userSession.id,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (response.ok) {
                document.getElementById('changePasswordForm').reset();
                this.showAlert('Password updated successfully!', 'success');
            } else {
                this.showAlert('Failed to update password', 'danger');
            }
            
        } catch (error) {
            console.error('Error updating password:', error);
            this.showAlert('Error updating password', 'danger');
        }
    }

    getFormData() {
        const firstName = document.getElementById('firstName')?.value || '';
        const lastName = document.getElementById('lastName')?.value || '';
        
        return {
            name: `${firstName} ${lastName}`.trim(),
            channel_name: document.getElementById('channelName')?.value || '',
            channel_description: document.getElementById('channelDescription')?.value || ''
        };
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('main');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.simpleProfileManager = new SimpleProfileManager();
});