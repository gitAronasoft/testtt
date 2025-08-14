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
            if (!userSession || !userSession.id) {
                console.error('No user session found');
                window.location.href = '../auth/login.html';
                return;
            }

            // console.log('Loading profile for user ID:', userSession.id);

            // Try API first, fallback to session data
            let userData = null;
            if (window.apiService) {
                try {
                    const result = await window.apiService.get(`/users/${userSession.id}`);
                    // console.log('API response:', result);
                    if (result.success && result.data) {
                        userData = result.data;
                        // console.log('Using API data:', userData);
                    }
                } catch (error) {
                    console.warn('API error, using session data:', error);
                }
            }

            // Use session data as fallback
            if (!userData) {
                // console.log('Using session data fallback');
                userData = {
                    firstName: userSession.name?.split(' ')[0] || '',
                    lastName: userSession.name?.split(' ').slice(1).join(' ') || '',
                    email: userSession.email || '',
                    role: userSession.userType || 'viewer',
                    name: userSession.name || '',
                    joinDate: 'Recent'
                };
            } else {
                // Ensure we have split names for API data
                if (userData.name && !userData.firstName) {
                    const nameParts = userData.name.split(' ');
                    userData.firstName = nameParts[0] || '';
                    userData.lastName = nameParts.slice(1).join(' ') || '';
                }
                
                // Format created_at date if available
                if (userData.created_at) {
                    userData.joinDate = new Date(userData.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            }

            // console.log('Final user data to populate:', userData);
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
        // console.log('Populating form with data:', userData);
        
        // Safely populate form fields
        this.setFieldValue('firstName', userData.firstName);
        this.setFieldValue('lastName', userData.lastName);
        this.setFieldValue('email', userData.email);
        // this.setFieldValue('channelName', userData.channelName || userData.name);
        // this.setFieldValue('channelDescription', userData.channelDescription);
        
        // Set role display
        const roleEl = document.getElementById('role');
        if (roleEl) {
            const roleMap = {
                'admin': 'Administrator',
                'creator': 'Content Creator',
                'viewer': 'Viewer'
            };
            roleEl.value = roleMap[userData.role] || userData.role;
            // console.log('Set role to:', roleMap[userData.role] || userData.role);
        }

        // Update additional profile elements (viewer/admin specific)
        this.setFieldValue('DisplayName', userData.name);
        this.setFieldValue('userRole', this.getMembershipType(userData.role));
        this.setFieldValue('memberSince', userData.joinDate || 'Recent');
        this.setFieldValue('lastLogin', 'Today');

        // Update user badges based on role
        this.updateUserBadges(userData.role);
        
        // console.log('Form population completed');
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
        const element = document.getElementById(fieldId);
        if (!element) {
            console.warn(`Field ${fieldId} not found in DOM`);
            return;
        }
        
        // Check if it's an input field
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            element.value = value || '';
            // console.log(`Set ${fieldId} value to:`, value);
        } else {
            // For display elements (h6, strong, span, div, p, etc.)
            element.textContent = value || '';
            // console.log(`Set ${fieldId} textContent to:`, value);
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
            const response = await fetch(`/video-platform/api/users/${userSession.id}`, {
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
            const response = await fetch('/video-platform/api/auth/change-password', {
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