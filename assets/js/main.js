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
    
    // Initialize performance optimizations
    initializePerformanceOptimizations();
    
    // Setup accessibility features
    initializeAccessibility();
    
    // Initialize micro-interactions
    initializeMicroInteractions();
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
 * Initialize performance optimizations
 */
function initializePerformanceOptimizations() {
    // Lazy load images
    setupLazyLoading();
    
    // Preload critical resources
    preloadCriticalResources();
    
    // Setup debounced functions
    setupDebouncedFunctions();
}

/**
 * Setup lazy loading for images
 */
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

/**
 * Preload critical resources
 */
function preloadCriticalResources() {
    const criticalResources = [
        '/assets/css/styles.css',
        '/assets/js/config.js'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = resource.endsWith('.css') ? 'style' : 'script';
        document.head.appendChild(link);
    });
}

/**
 * Setup debounced functions
 */
function setupDebouncedFunctions() {
    // Debounce search inputs
    const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', debounce(handleSearch, 300));
    });
    
    // Debounce window resize
    window.addEventListener('resize', debounce(handleWindowResize, 250));
}

/**
 * Initialize accessibility features
 */
function initializeAccessibility() {
    // Setup keyboard navigation
    setupKeyboardNavigation();
    
    // Setup ARIA labels
    setupAriaLabels();
    
    // Setup focus management
    setupFocusManagement();
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // ESC key to close modals/dropdowns
        if (e.key === 'Escape') {
            const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
            openDropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });
            
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
            });
        }
        
        // Tab navigation improvements
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    // Remove keyboard navigation class on mouse use
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
}

/**
 * Setup ARIA labels
 */
function setupAriaLabels() {
    // Add ARIA labels to buttons without text
    const iconButtons = document.querySelectorAll('button:not([aria-label])');
    iconButtons.forEach(button => {
        const icon = button.querySelector('i');
        if (icon && !button.getAttribute('aria-label')) {
            const iconClass = icon.className;
            let label = 'Button';
            
            if (iconClass.includes('edit')) label = 'Edit';
            else if (iconClass.includes('delete') || iconClass.includes('trash')) label = 'Delete';
            else if (iconClass.includes('share')) label = 'Share';
            else if (iconClass.includes('heart') || iconClass.includes('bookmark')) label = 'Add to favorites';
            else if (iconClass.includes('play')) label = 'Play video';
            else if (iconClass.includes('eye')) label = 'Toggle visibility';
            
            button.setAttribute('aria-label', label);
        }
    });
}

/**
 * Setup focus management
 */
function setupFocusManagement() {
    // Store previous focus for modal restoration
    let previouslyFocusedElement = null;
    
    document.addEventListener('show.bs.modal', function(e) {
        previouslyFocusedElement = document.activeElement;
    });
    
    document.addEventListener('hidden.bs.modal', function(e) {
        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus();
            previouslyFocusedElement = null;
        }
    });
}

/**
 * Initialize micro-interactions
 */
function initializeMicroInteractions() {
    setupButtonRippleEffect();
    setupCardHoverEffects();
    setupFormFieldAnimations();
    setupScrollAnimations();
}

/**
 * Setup button ripple effect
 */
function setupButtonRippleEffect() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                z-index: 1;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

/**
 * Setup card hover effects
 */
function setupCardHoverEffects() {
    const cards = document.querySelectorAll('.card-interactive, .video-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Setup form field animations
 */
function setupFormFieldAnimations() {
    const formFields = document.querySelectorAll('.form-control');
    formFields.forEach(field => {
        field.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
            this.style.transform = 'translateY(-1px)';
        });
        
        field.addEventListener('blur', function() {
            this.style.transform = 'translateY(0)';
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        
        // Check if field has value on page load
        if (field.value) {
            field.parentElement.classList.add('focused');
        }
    });
}

/**
 * Setup scroll animations
 */
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if ('IntersectionObserver' in window) {
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, { threshold: 0.1 });
        
        animatedElements.forEach(el => scrollObserver.observe(el));
    }
}

/**
 * Utility function: Debounce
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Handle search functionality
 */
function handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
        console.log('Searching for:', query);
        // Add visual feedback
        e.target.classList.add('searching');
        setTimeout(() => {
            e.target.classList.remove('searching');
        }, 1000);
    }
}

/**
 * Handle window resize
 */
function handleWindowResize() {
    // Adjust layouts for different screen sizes
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile-layout', isMobile);
    
    // Adjust sidebar visibility
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && isMobile) {
        sidebar.style.transform = 'translateX(-100%)';
    }
}

/**
 * Set form loading state
 */
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        inputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        inputs.forEach(input => input.disabled = false);
    }
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
