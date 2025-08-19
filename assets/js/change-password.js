/**
 * Comprehensive Change Password Manager
 * Handles password changes for all user types with proper modal validation,
 * error handling, and smooth UI interactions
 */
class ChangePasswordManager {
    constructor() {
        this.modalId = '#changePasswordModal';
        this.formId = '#changePasswordForm';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupValidation();
    }

    bindEvents() {
        // Form submission
        document.addEventListener('submit', (e) => {
            if (e.target.matches(this.formId)) {
                this.handlePasswordChange(e);
            }
        });

        // Real-time validation
        document.addEventListener('input', (e) => {
            if (e.target.closest(this.formId)) {
                this.validateField(e.target);
            }
        });

        // Modal reset on close
        document.addEventListener('hidden.bs.modal', (e) => {
            if (e.target.matches(this.modalId)) {
                this.resetForm();
            }
        });

        // Password visibility toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            }
        });
    }

    setupValidation() {
        // Password strength requirements
        this.passwordRequirements = {
            minLength: 8,
            hasUppercase: /[A-Z]/,
            hasLowercase: /[a-z]/,
            hasNumbers: /\d/,
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/
        };
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = this.getFormData(form);
        
        // Clear previous validation states
        this.clearValidation(form);

        // Validate form
        const validation = this.validateForm(formData);
        if (!validation.isValid) {
            this.displayValidationErrors(form, validation.errors);
            return;
        }

        // Show loading state
        this.setLoadingState(form, true);

        try {
            const userSession = this.getUserSession();
            if (!userSession?.id) {
                throw new Error('User session not found');
            }

            const response = await window.apiService.post('/api/auth/change-password', {
                user_id: userSession.id,
                current_password: formData.currentPassword,
                new_password: formData.newPassword
            });

            if (response.success) {
                this.handleSuccess(form);
            } else {
                this.handleError(form, response.message || 'Failed to update password');
            }

        } catch (error) {
            console.error('Password change error:', error);
            this.handleError(form, 'An error occurred while updating your password. Please try again.');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    getFormData(form) {
        return {
            currentPassword: form.querySelector('#currentPassword')?.value || '',
            newPassword: form.querySelector('#newPassword')?.value || '',
            confirmPassword: form.querySelector('#confirmPassword')?.value || ''
        };
    }

    validateForm(data) {
        const errors = {};
        let isValid = true;

        // Current password validation
        if (!data.currentPassword) {
            errors.currentPassword = 'Current password is required';
            isValid = false;
        }

        // New password validation
        if (!data.newPassword) {
            errors.newPassword = 'New password is required';
            isValid = false;
        } else {
            const passwordValidation = this.validatePasswordStrength(data.newPassword);
            if (!passwordValidation.isValid) {
                errors.newPassword = passwordValidation.message;
                isValid = false;
            }
        }

        // Confirm password validation
        if (!data.confirmPassword) {
            errors.confirmPassword = 'Please confirm your new password';
            isValid = false;
        } else if (data.newPassword !== data.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        // Check if new password is different from current
        if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
            errors.newPassword = 'New password must be different from current password';
            isValid = false;
        }

        return { isValid, errors };
    }

    validatePasswordStrength(password) {
        const req = this.passwordRequirements;
        
        if (password.length < req.minLength) {
            return { 
                isValid: false, 
                message: `Password must be at least ${req.minLength} characters long` 
            };
        }

        if (!req.hasUppercase.test(password)) {
            return { 
                isValid: false, 
                message: 'Password must contain at least one uppercase letter' 
            };
        }

        if (!req.hasLowercase.test(password)) {
            return { 
                isValid: false, 
                message: 'Password must contain at least one lowercase letter' 
            };
        }

        if (!req.hasNumbers.test(password)) {
            return { 
                isValid: false, 
                message: 'Password must contain at least one number' 
            };
        }

        if (!req.hasSpecialChars.test(password)) {
            return { 
                isValid: false, 
                message: 'Password must contain at least one special character' 
            };
        }

        return { isValid: true, message: '' };
    }

    validateField(field) {
        const form = field.closest('form');
        const formData = this.getFormData(form);
        
        // Clear previous validation
        this.clearFieldValidation(field);
        
        let isValid = true;
        let message = '';

        switch (field.id) {
            case 'currentPassword':
                if (!formData.currentPassword) {
                    isValid = false;
                    message = 'Current password is required';
                }
                break;
                
            case 'newPassword':
                if (formData.newPassword) {
                    const validation = this.validatePasswordStrength(formData.newPassword);
                    if (!validation.isValid) {
                        isValid = false;
                        message = validation.message;
                    }
                    
                    // Also validate confirm password if it has a value
                    const confirmField = form.querySelector('#confirmPassword');
                    if (formData.confirmPassword) {
                        this.validateField(confirmField);
                    }
                }
                break;
                
            case 'confirmPassword':
                if (formData.confirmPassword) {
                    if (formData.newPassword !== formData.confirmPassword) {
                        isValid = false;
                        message = 'Passwords do not match';
                    }
                }
                break;
        }

        if (!isValid) {
            this.setFieldError(field, message);
        } else {
            this.setFieldValid(field);
        }

        return isValid;
    }

    displayValidationErrors(form, errors) {
        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`#${fieldName}`);
            if (field) {
                this.setFieldError(field, errors[fieldName]);
            }
        });

        // Focus on first error field
        const firstErrorField = form.querySelector('.is-invalid');
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }

    setFieldError(field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        
        const feedback = field.parentNode.querySelector('.invalid-feedback') || 
                        field.nextElementSibling?.classList.contains('invalid-feedback') ? 
                        field.nextElementSibling : null;
        
        if (feedback) {
            feedback.textContent = message;
        }
    }

    setFieldValid(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    }

    clearFieldValidation(field) {
        field.classList.remove('is-invalid', 'is-valid');
    }

    clearValidation(form) {
        form.querySelectorAll('.is-invalid, .is-valid').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });
        
        form.querySelectorAll('.invalid-feedback').forEach(feedback => {
            feedback.textContent = '';
        });
    }

    setLoadingState(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]') || 
                         document.querySelector('button[form="changePasswordForm"]');
        const cancelBtn = form.querySelector('button[data-bs-dismiss="modal"]') || 
                         document.querySelector('#changePasswordModal button[data-bs-dismiss="modal"]');
        
        if (isLoading) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating Password...';
            }
            if (cancelBtn) {
                cancelBtn.disabled = true;
            }
            
            // Disable form fields
            form.querySelectorAll('input').forEach(input => {
                input.disabled = true;
            });
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-key me-2"></i>Update Password';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
            
            // Enable form fields
            form.querySelectorAll('input').forEach(input => {
                input.disabled = false;
            });
        }
    }

    handleSuccess(form) {
        // Reset form
        this.resetForm();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.querySelector(this.modalId));
        if (modal) {
            modal.hide();
        }
        
        // Show success message
        this.showSuccessMessage('Password updated successfully!');
    }

    handleError(form, message) {
        // Show error alert in modal
        this.showModalError(form, message);
    }

    showModalError(form, message) {
        // Remove existing alerts
        const existingAlert = form.parentNode.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mb-3';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert before form
        form.parentNode.insertBefore(alertDiv, form);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showSuccessMessage(message) {
        // Create success alert in main content area
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('main .container-fluid') || document.querySelector('main');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    resetForm() {
        const form = document.querySelector(this.formId);
        if (form) {
            form.reset();
            this.clearValidation(form);
            
            // Reset any error alerts in modal
            const modalAlerts = form.parentNode.querySelectorAll('.alert');
            modalAlerts.forEach(alert => alert.remove());
        }
    }

    togglePasswordVisibility(button) {
        const input = button.parentNode.querySelector('input[type="password"], input[type="text"]');
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    getUserSession() {
        try {
            const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Error parsing user session:', error);
            return null;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.changePasswordManager = new ChangePasswordManager();
});