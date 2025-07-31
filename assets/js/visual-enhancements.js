// Professional Visual Enhancement System
document.addEventListener('DOMContentLoaded', function() {
    initializeVisualEnhancements();
    console.log('Professional visual system loaded');

// Add missing functions to prevent errors
function createRippleEffect(element, event) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.remove();
        }
    }, 600);
}

function addCardHoverEffects() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.3s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize effects when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addCardHoverEffects();
    initSmoothScrolling();

    // Add ripple effect to buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn, button')) {
            createRippleEffect(e.target, e);
        }
    });
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
});

function initializeVisualEnhancements() {
    addCardHoverEffects();
    createRippleEffect();
    initSmoothScrolling();
    initParallaxEffects();
    initLoadingAnimations();
    initPageTransitions();
    initAdvancedAnimations();
    initInteractiveElements();
}

function addCardHoverEffects() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            this.style.transition = 'all 0.3s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0px)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });
    });
}

function createRippleEffect() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.remove();
                }
            }, 600);
        });
    });
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.parallax');
    if (parallaxElements.length > 0) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            parallaxElements.forEach(element => {
                const rate = scrolled * -0.5;
                element.style.transform = `translateY(${rate}px)`;
            });
        });
    }
}

function initLoadingAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// Add CSS animations if not already present
if (!document.querySelector('#visualEnhancementStyles')) {
    const style = document.createElement('style');
    style.id = 'visualEnhancementStyles';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .animate-on-scroll.animated {
            opacity: 1;
            transform: translateY(0);
        }

        .card {
            transition: all 0.3s ease;
        }

        .btn {
            position: relative;
            overflow: hidden;
        }

        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .slide-up {
            animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize core components
initializeBasicAnimations();
initializeSearchFilters();
initializeTooltips();
initializeModals();
initializeFormEnhancements();
setupFormValidation();
handleResponsiveDesign();


// Subtle entrance animations
function initializeBasicAnimations() {
    const animatedElements = document.querySelectorAll('.card, .btn, .form-control');
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';

        setTimeout(() => {
            element.style.transition = 'all 0.4s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Enhanced card interactions
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.card, .video-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'all 0.2s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Professional form interactions
function initializeFormEnhancements() {
    const formControls = document.querySelectorAll('.form-control, .form-select');

    formControls.forEach(control => {
        control.addEventListener('focus', function() {
            this.style.transform = 'scale(1.01)';
            this.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
        });

        control.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '';
        });
    });
}

// Enhanced button interactions
function initializeInteractiveElements() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.98)';
        });

        button.addEventListener('mouseup', function() {
            this.style.transform = '';
        });

        button.addEventListener('mouseleave', function() {
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

// Add hover effects to cards
function addCardHoverEffects() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });
    });
}

function initPageTransitions() {
    // Add smooth page transitions
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(20px)';
    document.body.style.transition = 'all 0.6s ease-out';
    
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
    });
}

function initAdvancedAnimations() {
    // Staggered card animations
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Enhanced button hover effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

function initInteractiveElements() {
    // Enhanced card interactions
    const videoCards = document.querySelectorAll('.video-card, .card');
    videoCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) rotateX(2deg)';
            this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
            this.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotateX(0)';
            this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Floating action buttons
    const floatingBtns = document.querySelectorAll('.btn-primary, .btn-success');
    floatingBtns.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            this.style.transform = 'translateY(-3px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
            this.style.transform = 'translateY(0)';
        });
    });
}

// Enhanced alert function with animations
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} border-0 shadow-lg`;
    alert.style.cssText = `
        opacity: 0;
        transform: translateX(300px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 1rem;
        border-radius: 12px;
        backdrop-filter: blur(10px);
    `;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="${icons[type] || icons.info} me-3"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Trigger animation
    requestAnimationFrame(() => {
        alert.style.opacity = '1';
        alert.style.transform = 'translateX(0)';
    });
    
    // Auto remove
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(300px)';
        setTimeout(() => {
            if (alert.parentNode) alert.remove();
        }, 400);
    }, duration);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

// Export for global use
window.showAlert = showAlert;
window.clearSearch = clearSearch;
window.clearFilters = clearFilters;
window.createRippleEffect = createRippleEffect;