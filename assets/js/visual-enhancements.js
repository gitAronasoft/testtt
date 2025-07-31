// Enhanced Visual System
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced visual system loaded with modern effects');

    // Initialize all components
    initializeScrollAnimations();
    initializeSearchFilters();
    initializeTooltips();
    initializeModals();
    initializeCardAnimations();
    initializeFormEnhancements();
    setupFormValidation();
    handleResponsiveDesign();
    initializePageLoader();
    initializeInteractiveElements();
});

// Page loader and entrance animations
function initializePageLoader() {
    // Add entrance animations to elements
    const animatedElements = document.querySelectorAll('.card, .btn, .form-control');
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Scroll-triggered animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and major elements
    const elementsToAnimate = document.querySelectorAll('.card, .video-card, .alert, .btn-group');
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
}

// Enhanced card interactions
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.card, .video-card');
    
    cards.forEach(card => {
        // Add hover sound effect placeholder
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-6px) scale(1.02)';
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // Add click ripple effect
        card.addEventListener('click', function(e) {
            createRippleEffect(e, this);
        });
    });
}

// Ripple effect for interactive elements
function createRippleEffect(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
        z-index: 1000;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Enhanced form interactions
function initializeFormEnhancements() {
    const formControls = document.querySelectorAll('.form-control, .form-select');
    
    formControls.forEach(control => {
        // Floating label effect
        control.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
        });
        
        control.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '';
        });
        
        // Add loading state for async operations
        if (control.closest('form')) {
            control.closest('form').addEventListener('submit', function() {
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.style.opacity = '0.7';
                }
            });
        }
    });
}

// Interactive elements enhancement
function initializeInteractiveElements() {
    // Enhanced button interactions
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(1px) scale(0.98)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Enhanced navigation interactions
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

function initializeSearchFilters() {
    const searchInputs = document.querySelectorAll('.search-input');
    const filterSelects = document.querySelectorAll('.filter-select');

    searchInputs.forEach(input => {
        input.addEventListener('input', handleSearch);
    });

    filterSelects.forEach(select => {
        select.addEventListener('change', handleFilter);
    });
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    console.log('Searching for:', searchTerm);
    // Implement search functionality
}

function handleFilter(event) {
    const filterValue = event.target.value;
    console.log('Filtering by:', filterValue);
    // Implement filter functionality
}

function initializeTooltips() {
    const elements = document.querySelectorAll('[title]');
    elements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    // Basic tooltip implementation
}

function hideTooltip(event) {
    // Hide tooltip
}

function initializeModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', openModal);
    });

    const modalCloses = document.querySelectorAll('.modal .close, .modal-close');
    modalCloses.forEach(close => {
        close.addEventListener('click', closeModal);
    });
}

function openModal(event) {
    const modalId = event.target.getAttribute('data-modal');
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(event) {
    const modal = event.target.closest('.modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', validateForm);

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
        });
    });
}

function validateForm(event) {
    const form = event.target;
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc2626';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    if (!isValid) {
        event.preventDefault();
    }
}

function validateField(event) {
    const field = event.target;
    if (field.hasAttribute('required') && !field.value.trim()) {
        field.style.borderColor = '#dc2626';
    } else {
        field.style.borderColor = '';
    }
}

function handleResponsiveDesign() {
    window.addEventListener('resize', debounce(handleResize, 250));
}

function handleResize() {
    // Handle responsive layout changes
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile-view', isMobile);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility functions
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const container = document.getElementById('alertContainer') || document.body;
    container.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function clearSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
    });
}

function clearFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.value = '';
        select.dispatchEvent(new Event('change'));
    });
}

// Add dynamic CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .loading-pulse {
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    .hover-scale {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .hover-scale:hover {
        transform: scale(1.05);
    }
    
    .smooth-entrance {
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    .page-transition {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.4s ease-out;
    }
    
    .page-transition.loaded {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);

// Enhanced alert function with animations
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} scale-in`;
    alert.textContent = message;
    alert.style.marginBottom = '1rem';

    const container = document.getElementById('alertContainer') || document.body;
    container.appendChild(alert);

    // Auto-remove with fade out animation
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-20px)';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Export for global use
window.showAlert = showAlert;
window.clearSearch = clearSearch;
window.clearFilters = clearFilters;
window.createRippleEffect = createRippleEffect;