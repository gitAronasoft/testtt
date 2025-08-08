/**
 * Main JavaScript file for VideoShare platform
 * Handles global functionality and navigation
 */

// Global variables
let currentUser = null;
let isLoggedIn = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('VideoShare platform initialized');
    
    // Set up smooth scrolling for anchor links
    setupSmoothScrolling();
    
    // Initialize tooltips and popovers
    initializeBootstrapComponents();
    
    // Setup theme management
    initializeTheme();
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Handle navbar toggle on mobile
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            const navbar = document.querySelector('.navbar-collapse');
            navbar.classList.toggle('show');
        });
    }
    
    // Handle form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmission);
    });
    
    // Handle external links
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

/**
 * Setup smooth scrolling for anchor links
 */
function setupSmoothScrolling() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
        new bootstrap.Tooltip(tooltipTriggerEl)
    );
    
    // Initialize popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => 
        new bootstrap.Popover(popoverTriggerEl)
    );
}

/**
 * Initialize theme management
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('videoShareTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    const token = localStorage.getItem('videoShareToken');
    const userData = localStorage.getItem('videoShareUser');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            isLoggedIn = true;
            updateNavigation();
        } catch (error) {
            console.error('Error parsing user data:', error);
            clearAuthData();
        }
    }
}

/**
 * Update navigation based on auth status
 */
function updateNavigation() {
    const loginLinks = document.querySelectorAll('.nav-login');
    const userLinks = document.querySelectorAll('.nav-user');
    
    if (isLoggedIn) {
        loginLinks.forEach(link => link.style.display = 'none');
        userLinks.forEach(link => link.style.display = 'block');
    } else {
        loginLinks.forEach(link => link.style.display = 'block');
        userLinks.forEach(link => link.style.display = 'none');
    }
}

/**
 * Handle form submission
 */
function handleFormSubmission(e) {
    const form = e.target;
    const formId = form.id;
    
    // Prevent default submission for demo purposes
    e.preventDefault();
    
    // Add form validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Handle specific forms
    switch (formId) {
        case 'contactForm':
            handleContactForm(form);
            break;
        case 'newsletterForm':
            handleNewsletterForm(form);
            break;
        default:
            console.log('Form submitted:', formId);
    }
}

/**
 * Handle contact form submission
 */
function handleContactForm(form) {
    const formData = new FormData(form);
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    
    // Simulate form submission
    setTimeout(() => {
        showAlert('Thank you for your message! We\'ll get back to you soon.', 'success');
        form.reset();
        form.classList.remove('was-validated');
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }, 2000);
}

/**
 * Handle newsletter form submission
 */
function handleNewsletterForm(form) {
    const email = form.querySelector('input[type="email"]').value;
    
    if (isValidEmail(email)) {
        showAlert('Thank you for subscribing to our newsletter!', 'success');
        form.reset();
    } else {
        showAlert('Please enter a valid email address.', 'danger');
    }
}

/**
 * Clear authentication data
 */
function clearAuthData() {
    localStorage.removeItem('videoShareToken');
    localStorage.removeItem('videoShareUser');
    currentUser = null;
    isLoggedIn = false;
    updateNavigation();
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.alert-container') || document.body;
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '9999';
    alertElement.style.minWidth = '300px';
    
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 5000);
}

/**
 * Utility function to validate email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Utility function to format currency
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Utility function to format date
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
        .format(new Date(date));
}

/**
 * Utility function to truncate text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substr(0, maxLength) + '...';
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

/**
 * Add loading state to element
 */
function addLoadingState(element, text = 'Loading...') {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
}

/**
 * Remove loading state from element
 */
function removeLoadingState(element) {
    element.disabled = false;
    element.textContent = element.dataset.originalText || 'Submit';
    delete element.dataset.originalText;
}

/**
 * Handle window resize events
 */
window.addEventListener('resize', debounce(function() {
    // Handle responsive adjustments
    updateLayout();
}, 250));

/**
 * Update layout for responsive design
 */
function updateLayout() {
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile-view', isMobile);
}

/**
 * Handle keyboard navigation
 */
document.addEventListener('keydown', function(e) {
    // Handle escape key to close modals/dropdowns
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            bootstrap.Modal.getInstance(openModal)?.hide();
        }
        
        const openDropdown = document.querySelector('.dropdown-menu.show');
        if (openDropdown) {
            openDropdown.classList.remove('show');
        }
    }
});

// Export functions for use in other files
window.VideoShare = {
    showAlert,
    formatCurrency,
    formatDate,
    truncateText,
    debounce,
    addLoadingState,
    removeLoadingState,
    isValidEmail,
    clearAuthData,
    checkAuthStatus
};
