// Simplified Visual Enhancements
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced visual system loaded with simplified effects');

    // Initialize basic UI components
    initializeSearchFilters();
    initializeTooltips();
    initializeModals();

    // Basic form validation styling
    setupFormValidation();

    // Initialize responsive handlers
    handleResponsiveDesign();
});

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

// Export for global use
window.showAlert = showAlert;
window.clearSearch = clearSearch;
window.clearFilters = clearFilters;