/**
 * VideoHub Profile Settings Module
 * Handles profile updates and password changes
 */

class ProfileManager {
    constructor() {
        this.currentUser = {};
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.bindEvents();
        this.setupPasswordStrengthChecker();
    }

    async loadUserProfile() {
        try {
            // Check for user session first
            let userSession = null;

            // Try to get session from both localStorage and sessionStorage
            const localSession = localStorage.getItem('userSession');
            const sessionSession = sessionStorage.getItem('userSession');

            if (localSession) {
                userSession = JSON.parse(localSession);
            } else if (sessionSession) {
                userSession = JSON.parse(sessionSession);
            }

            if (!userSession || !userSession.email) {
                console.log('No user session found');
                return;
            }

            // Wait for API service to be available
            let retries = 0;
            const maxRetries = 50;

            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            if (window.apiService) {
                try {
                    const result = await window.apiService.getUserProfile();
                    if (result.success) {
                        this.currentUser = result.data;
                        this.populateProfileForm();
                        console.log('Profile loaded:', this.currentUser);

                        // Also load admin metrics and update sidebar badges
                        if (this.currentUser.role === 'admin') {
                            await this.loadAdminMetrics();
                        }
                    } else {
                        throw new Error(result.message || 'Failed to load profile');
                    }
                } catch (apiError) {
                    console.error('API error loading profile:', apiError);
                    
                    // Handle 401 authentication errors by redirecting to login
                    if (apiError.message && (apiError.message.includes('401') || apiError.message.includes('not authenticated'))) {
                        console.log('User not authenticated, redirecting to login');
                        window.location.href = '../auth/login.html';
                        return;
                    }
                    
                    // For other errors, fallback to session data
                    console.log('Using session data as fallback');
                    this.currentUser = {
                        name: userSession.name || '',
                        email: userSession.email || '',
                        role: userSession.userType || 'viewer'
                    };
                    this.populateProfileForm();
                }
            } else {
                // Use session data as fallback
                this.currentUser = {
                    name: userSession.name || '',
                    email: userSession.email || '',
                    role: userSession.userType || 'viewer'
                };
                this.populateProfileForm();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            
            // Handle authentication errors gracefully
            if (error.message && (error.message.includes('401') || error.message.includes('not authenticated'))) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '../auth/login.html';
                return;
            }
            
            // Try to use session data as fallback for other errors
            let userSession = null;
            const localSession = localStorage.getItem('userSession');
            const sessionSession = sessionStorage.getItem('userSession');

            if (localSession) {
                userSession = JSON.parse(localSession);
            } else if (sessionSession) {
                userSession = JSON.parse(sessionSession);
            }

            if (userSession && userSession.email) {
                this.currentUser = {
                    name: userSession.name || '',
                    email: userSession.email || '',
                    role: userSession.userType || 'viewer'
                };
                this.populateProfileForm();
            }
        }
    }

    populateProfileForm() {
        // Safely update form fields if they exist
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        const channelNameEl = document.getElementById('channelName');
        const channelDescriptionEl = document.getElementById('channelDescription');

        if (firstNameEl) firstNameEl.value = this.currentUser.firstName || this.currentUser.name?.split(' ')[0] || '';
        if (lastNameEl) lastNameEl.value = this.currentUser.lastName || this.currentUser.name?.split(' ')[1] || '';
        if (emailEl) emailEl.value = this.currentUser.email || '';
        if (channelNameEl) channelNameEl.value = this.currentUser.channelName || this.currentUser.name || '';
        if (channelDescriptionEl) channelDescriptionEl.value = this.currentUser.channelDescription || '';

        // Update last login time
        const lastLoginElement = document.getElementById('lastLoginTime');
        if (lastLoginElement) {
            const now = new Date();
            lastLoginElement.textContent = `${now.toLocaleDateString()}, ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }

        // Update role field
        const roleEl = document.getElementById('role');
        if (roleEl && this.currentUser.role) {
            const roleMap = {
                'admin': 'Administrator',
                'creator': 'Content Creator',
                'viewer': 'Viewer'
            };
            roleEl.value = roleMap[this.currentUser.role] || this.currentUser.role;
        }
    }

    bindEvents() {
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

        // Real-time validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // First name validation
        const firstNameInput = document.getElementById('firstName');
        if (firstNameInput) {
            firstNameInput.addEventListener('input', (e) => {
                this.validateName(e.target);
            });
        }

        // Last name validation
        const lastNameInput = document.getElementById('lastName');
        if (lastNameInput) {
            lastNameInput.addEventListener('input', (e) => {
                this.validateName(e.target);
            });
        }

        // Password confirmation validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const newPasswordInput = document.getElementById('newPassword');

        if (confirmPasswordInput && newPasswordInput) {
            [confirmPasswordInput, newPasswordInput].forEach(input => {
                input.addEventListener('input', () => {
                    this.validatePasswordMatch();
                });
            });
        }
    }

    validateName(input) {
        const name = input.value.trim();
        const isValid = name.length >= 2 && /^[a-zA-Z\s'-]+$/.test(name);

        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }

        return isValid;
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmPasswordInput.classList.add('is-invalid');
            confirmPasswordInput.classList.remove('is-valid');
            return false;
        } else if (confirmPassword) {
            confirmPasswordInput.classList.remove('is-invalid');
            confirmPasswordInput.classList.add('is-valid');
            return true;
        }
        return false;
    }

    setupPasswordStrengthChecker() {
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    updatePasswordStrength(password) {
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');

        if (!strengthBar || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);

        // Update progress bar
        strengthBar.style.width = `${strength.percentage}%`;
        strengthBar.className = `progress-bar bg-${strength.color}`;

        // Update text
        strengthText.textContent = strength.text;
        strengthText.className = `text-sm text-${strength.color}`;
    }

    calculatePasswordStrength(password) {
        if (!password) return { percentage: 0, color: 'secondary', text: 'Enter password' };

        let score = 0;
        const checks = [
            { test: /.{8,}/, points: 25 }, // Length >= 8
            { test: /[a-z]/, points: 15 }, // Lowercase
            { test: /[A-Z]/, points: 15 }, // Uppercase
            { test: /[0-9]/, points: 20 }, // Numbers
            { test: /[^A-Za-z0-9]/, points: 25 } // Special characters
        ];

        checks.forEach(check => {
            if (check.test.test(password)) {
                score += check.points;
            }
        });

        if (score < 40) return { percentage: score, color: 'danger', text: 'Weak' };
        if (score < 70) return { percentage: score, color: 'warning', text: 'Fair' };
        if (score < 90) return { percentage: score, color: 'info', text: 'Good' };
        return { percentage: score, color: 'success', text: 'Strong' };
    }

    async handleProfileUpdate(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const profileData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim()
        };

        // Validate form
        const isValid = this.validateProfileForm(form);
        if (!isValid) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
        submitBtn.disabled = true;

        try {
            const result = await window.apiService.updateUserProfile(profileData);

            if (result.success) {
                // Update local data
                this.currentUser.firstName = profileData.firstName;
                this.currentUser.lastName = profileData.lastName;

                // Add success class to form
                form.classList.add('was-validated');

                window.apiService.showSuccessMessage('Profile updated successfully');
            } else {
                window.apiService.handleApiError(result, 'Failed to update profile');
            }
        } catch (error) {
            // Demo mode
            this.currentUser.firstName = profileData.firstName;
            this.currentUser.lastName = profileData.lastName;
            window.apiService.showSuccessMessage('Profile updated successfully (demo mode)');
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateProfileForm(form) {
        const firstName = form.querySelector('#firstName');
        const lastName = form.querySelector('#lastName');

        let isValid = true;

        if (!this.validateName(firstName)) {
            isValid = false;
        }

        if (!this.validateName(lastName)) {
            isValid = false;
        }

        form.classList.add('was-validated');
        return isValid;
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validate form
        const isValid = this.validatePasswordForm(form, passwordData);
        if (!isValid) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Updating...';
        submitBtn.disabled = true;

        try {
            const result = await window.apiService.put('/users/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                modal.hide();

                // Reset form
                form.reset();
                form.classList.remove('was-validated');

                // Reset password strength indicator
                this.updatePasswordStrength('');

                window.apiService.showSuccessMessage('Password updated successfully');
            } else {
                window.apiService.handleApiError(result, 'Failed to update password');
            }
        } catch (error) {
            // Demo mode
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            form.reset();
            form.classList.remove('was-validated');
            this.updatePasswordStrength('');
            window.apiService.showSuccessMessage('Password updated successfully (demo mode)');
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validatePasswordForm(form, data) {
        let isValid = true;

        // Current password validation
        const currentPasswordInput = form.querySelector('#currentPassword');
        if (!data.currentPassword || data.currentPassword.length < 6) {
            currentPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else {
            currentPasswordInput.classList.remove('is-invalid');
            currentPasswordInput.classList.add('is-valid');
        }

        // New password validation
        const newPasswordInput = form.querySelector('#newPassword');
        const strength = this.calculatePasswordStrength(data.newPassword);
        if (strength.percentage < 40) {
            newPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else {
            newPasswordInput.classList.remove('is-invalid');
            newPasswordInput.classList.add('is-valid');
        }

        // Confirm password validation
        if (data.newPassword !== data.confirmPassword) {
            form.querySelector('#confirmPassword').classList.add('is-invalid');
            isValid = false;
        }

        form.classList.add('was-validated');
        return isValid;
    }

    async loadAdminMetrics() {
        try {
            // Load admin data for sidebar badges
            const [usersResponse, videosResponse] = await Promise.all([
                window.apiService.get('/admin/users'),
                window.apiService.get('/videos')
            ]);

            const users = usersResponse.data || usersResponse.users || [];
            const videos = videosResponse.data || videosResponse.videos || [];

            // Sidebar badges removed for cleaner interface

        } catch (error) {
            console.error('Failed to load admin metrics:', error);
        }
    }
}

// Global functions
window.resetProfileForm = function() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.reset();
        form.classList.remove('was-validated');

        // Remove validation classes
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });

        // Reload original data
        window.profileManager.populateProfileForm();
    }
};

window.togglePasswordVisibility = function(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Initialize profile manager
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager = new ProfileManager();
});