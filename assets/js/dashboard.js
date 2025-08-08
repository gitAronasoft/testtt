/**
 * Dashboard JavaScript for VideoShare platform
 * Handles both creator and viewer dashboard functionality
 */

// Dashboard state
let dashboardState = {
    currentSection: 'dashboard',
    currentUser: null,
    isCreator: false,
    charts: {},
    videos: [],
    transactions: []
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupNavigation();
    setupEventListeners();
    loadDashboardData();
});

/**
 * Initialize dashboard functionality
 */
function initializeDashboard() {
    console.log('Dashboard initialized');
    
    // Get current user
    getCurrentUser();
    
    // Determine dashboard type
    const isCreatorDashboard = window.location.pathname.includes('creator-dashboard');
    dashboardState.isCreator = isCreatorDashboard;
    
    // Initialize charts if on creator dashboard
    if (isCreatorDashboard && typeof Chart !== 'undefined') {
        initializeCharts();
    }
    
    // Setup file upload if present
    setupFileUpload();
    
    // Setup video interactions
    setupVideoInteractions();
    
    // Setup wallet functionality
    setupWalletFunctionality();
}

/**
 * Get current user from session
 */
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (userData) {
            dashboardState.currentUser = JSON.parse(userData);
        } else {
            // Redirect to login if no user found
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Error getting user data:', error);
        window.location.href = '../login.html';
    }
}

/**
 * Setup navigation between dashboard sections
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSection = this.getAttribute('data-section');
            switchSection(targetSection);
            
            // Update active states
            updateActiveNavigation(this);
        });
    });
    
    // Handle hash navigation
    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash
    if (window.location.hash) {
        handleHashChange();
    }
}

/**
 * Switch dashboard sections
 */
function switchSection(sectionName) {
    // Check if we're on the main dashboard page or individual page
    const isMainDashboard = window.location.pathname.includes('creator-dashboard.html') || 
                           window.location.pathname.includes('viewer-dashboard.html');
    
    if (isMainDashboard) {
        // Hide all sections on main dashboard
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.add('d-none');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('d-none');
            dashboardState.currentSection = sectionName;
            
            // Update URL hash
            window.location.hash = sectionName;
            
            // Load section-specific data
            loadSectionData(sectionName);
        } else {
            // Redirect to individual page
            redirectToIndividualPage(sectionName);
        }
    } else {
        // We're on an individual page, redirect to the appropriate page
        redirectToIndividualPage(sectionName);
    }
}

/**
 * Update active navigation
 */
function updateActiveNavigation(activeLink) {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link, .navbar-nav .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link and corresponding sidebar link
    activeLink.classList.add('active');
    
    const sectionName = activeLink.getAttribute('data-section');
    const sidebarLink = document.querySelector(`.sidebar [data-section="${sectionName}"]`);
    if (sidebarLink) {
        sidebarLink.classList.add('active');
    }
}

/**
 * Redirect to individual page based on section
 */
function redirectToIndividualPage(sectionName) {
    const userRole = dashboardState.currentUser?.role || 'viewer';
    let targetPage = '';
    
    if (userRole === 'creator') {
        switch (sectionName) {
            case 'dashboard':
            case 'overview':
                targetPage = 'creator-overview.html';
                break;
            case 'videos':
                targetPage = 'creator-videos.html';
                break;
            case 'upload':
                targetPage = 'creator-upload.html';
                break;
            case 'analytics':
                targetPage = 'creator-analytics.html';
                break;
            case 'earnings':
                targetPage = 'creator-earnings.html';
                break;
            case 'settings':
                targetPage = 'creator-settings.html';
                break;
        }
    } else {
        switch (sectionName) {
            case 'discover':
                targetPage = 'viewer-discover.html';
                break;
            case 'library':
                targetPage = 'viewer-library.html';
                break;
            case 'history':
                targetPage = 'viewer-history.html';
                break;
            case 'trending':
                targetPage = 'viewer-trending.html';
                break;
            case 'categories':
                targetPage = 'viewer-categories.html';
                break;
            case 'subscriptions':
                targetPage = 'viewer-subscriptions.html';
                break;
            case 'wallet':
                targetPage = 'viewer-wallet.html';
                break;
            case 'settings':
                targetPage = 'viewer-settings.html';
                break;
        }
    }
    
    if (targetPage) {
        window.location.href = targetPage;
    }
}

/**
 * Handle hash change navigation
 */
function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        switchSection(hash);
        
        // Update navigation
        const navLink = document.querySelector(`[data-section="${hash}"]`);
        if (navLink) {
            updateActiveNavigation(navLink);
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Handle logout
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', handleLogout);
    });
    
    // Handle video card clicks
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => {
        card.addEventListener('click', handleVideoCardClick);
    });
    
    // Handle category clicks
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', handleCategoryClick);
    });
    
    // Handle search
    const searchForm = document.querySelector('form.d-flex');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Handle wallet actions
    const walletButtons = document.querySelectorAll('.btn[data-amount]');
    walletButtons.forEach(button => {
        button.addEventListener('click', handleWalletTopup);
    });
    
    // Handle filter dropdowns
    const filterDropdowns = document.querySelectorAll('.dropdown-menu a');
    filterDropdowns.forEach(item => {
        item.addEventListener('click', handleFilterChange);
    });
}

/**
 * Initialize charts for creator dashboard
 */
function initializeCharts() {
    // Views Chart
    const viewsChartCanvas = document.getElementById('viewsChart');
    if (viewsChartCanvas) {
        dashboardState.charts.views = new Chart(viewsChartCanvas, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Views',
                    data: [1200, 1900, 3000, 2500, 4200, 3800],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Categories Chart
    const categoriesChartCanvas = document.getElementById('categoriesChart');
    if (categoriesChartCanvas) {
        dashboardState.charts.categories = new Chart(categoriesChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Education', 'Entertainment', 'Technology', 'Sports'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        '#0d6efd',
                        '#198754',
                        '#ffc107',
                        '#dc3545'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

/**
 * Setup file upload functionality
 */
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('videoFile');
    const uploadForm = document.getElementById('uploadForm');
    
    if (!uploadArea || !fileInput) return;
    
    // Handle drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    });
    
    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    // Handle form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUpload);
    }
}

/**
 * Handle file selection
 */
function handleFileSelection(file) {
    const uploadArea = document.getElementById('uploadArea');
    const progressContainer = document.getElementById('uploadProgress');
    
    // Validate file
    if (!file.type.startsWith('video/')) {
        showAlert('Please select a valid video file.', 'danger');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
        showAlert('File size must be less than 2GB.', 'danger');
        return;
    }
    
    // Update UI
    uploadArea.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-video fa-2x text-primary me-3"></i>
            <div>
                <h6 class="mb-1">${file.name}</h6>
                <small class="text-muted">${formatFileSize(file.size)}</small>
            </div>
        </div>
    `;
    
    // Show progress container
    if (progressContainer) {
        progressContainer.classList.remove('d-none');
        simulateUploadProgress();
    }
}

/**
 * Simulate upload progress
 */
function simulateUploadProgress() {
    const progressBar = document.querySelector('#uploadProgress .progress-bar');
    if (!progressBar) return;
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${Math.round(progress)}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('uploadProgress').classList.add('d-none');
                showAlert('Video uploaded successfully!', 'success');
            }, 500);
        }
    }, 200);
}

/**
 * Handle video upload
 */
function handleVideoUpload(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Validate form
    if (!validateUploadForm(form)) {
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    addLoadingState(submitButton, 'Uploading...');
    
    // Simulate upload process
    setTimeout(() => {
        showAlert('Video uploaded and is being processed!', 'success');
        removeLoadingState(submitButton);
        
        // Reset form
        form.reset();
        resetUploadArea();
        
        // Switch to videos section
        switchSection('videos');
    }, 3000);
}

/**
 * Validate upload form
 */
function validateUploadForm(form) {
    const fileInput = document.getElementById('videoFile');
    const title = document.getElementById('videoTitle');
    const category = document.getElementById('videoCategory');
    const price = document.getElementById('videoPrice');
    
    let isValid = true;
    
    if (!fileInput.files.length) {
        showAlert('Please select a video file to upload.', 'danger');
        isValid = false;
    }
    
    if (!title.value.trim()) {
        setFieldError(title, 'Please enter a video title.');
        isValid = false;
    }
    
    if (!category.value) {
        setFieldError(category, 'Please select a category.');
        isValid = false;
    }
    
    if (!price.value || parseFloat(price.value) <= 0) {
        setFieldError(price, 'Please enter a valid price.');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Reset upload area
 */
function resetUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt text-muted fa-3x mb-3"></i>
            <p class="mb-2">Drag and drop your video file here, or click to browse</p>
            <p class="text-muted small mb-3">Supported formats: MP4, AVI, MOV (Max: 2GB)</p>
            <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('videoFile').click()">
                Choose File
            </button>
        `;
    }
}

/**
 * Setup video interactions
 */
function setupVideoInteractions() {
    // Handle video play buttons
    const playButtons = document.querySelectorAll('.btn[data-bs-target="#videoModal"]');
    playButtons.forEach(button => {
        button.addEventListener('click', function() {
            const videoTitle = this.closest('.card').querySelector('.card-title').textContent;
            openVideoModal(videoTitle);
        });
    });
    
    // Handle bookmark buttons
    const bookmarkButtons = document.querySelectorAll('.btn-bookmark');
    bookmarkButtons.forEach(button => {
        button.addEventListener('click', handleBookmark);
    });
    
    // Handle rating interactions
    const ratingStars = document.querySelectorAll('.rating .fa-star');
    ratingStars.forEach(star => {
        star.addEventListener('click', handleRating);
    });
}

/**
 * Handle video card clicks
 */
function handleVideoCardClick(e) {
    // Don't trigger if clicking on buttons
    if (e.target.closest('button') || e.target.closest('.btn')) {
        return;
    }
    
    const card = e.currentTarget;
    const title = card.querySelector('.card-title').textContent;
    const price = card.querySelector('.video-price')?.textContent || 'Free';
    
    // For viewer dashboard, show purchase modal
    if (!dashboardState.isCreator) {
        showPurchaseModal(title, price);
    } else {
        // For creator dashboard, show video details
        showVideoDetails(title);
    }
}

/**
 * Show purchase modal
 */
function showPurchaseModal(title, price) {
    const modalHTML = `
        <div class="modal fade" id="purchaseModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Purchase Video</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h6>${title}</h6>
                        <p class="text-muted">Price: ${price}</p>
                        <p>Are you sure you want to purchase this video?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="processPurchase('${title}', '${price}')">
                            Purchase Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('purchaseModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}

/**
 * Process video purchase
 */
function processPurchase(title, price) {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
    modal.hide();
    
    // Show loading
    showAlert('Processing purchase...', 'info');
    
    // Simulate purchase process
    setTimeout(() => {
        showAlert(`Successfully purchased "${title}" for ${price}!`, 'success');
        
        // Open video modal
        setTimeout(() => {
            openVideoModal(title);
        }, 1000);
    }, 2000);
}

/**
 * Open video modal
 */
function openVideoModal(title) {
    const videoModal = document.getElementById('videoModal');
    if (videoModal) {
        const modalTitle = videoModal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = title;
        }
        
        const modal = new bootstrap.Modal(videoModal);
        modal.show();
    }
}

/**
 * Handle category clicks
 */
function handleCategoryClick(e) {
    const category = e.currentTarget;
    const categoryName = category.querySelector('h6').textContent;
    
    showAlert(`Browsing ${categoryName} videos...`, 'info');
    
    // Here you would typically filter videos by category
    // For now, just show a message
}

/**
 * Handle search
 */
function handleSearch(e) {
    e.preventDefault();
    
    const searchInput = e.target.querySelector('input[type="search"]');
    const query = searchInput.value.trim();
    
    if (query) {
        showAlert(`Searching for "${query}"...`, 'info');
        // Here you would typically perform the search
    }
}

/**
 * Setup wallet functionality
 */
function setupWalletFunctionality() {
    // Handle add funds buttons
    const addFundsButtons = document.querySelectorAll('.btn[data-amount]');
    addFundsButtons.forEach(button => {
        if (button.textContent.includes('Add $')) {
            button.addEventListener('click', function() {
                const amount = this.textContent.match(/\$(\d+)/)?.[1] || '25';
                handleWalletTopup({ target: { dataset: { amount } } });
            });
        }
    });
}

/**
 * Handle wallet top-up
 */
function handleWalletTopup(e) {
    const amount = e.target.dataset.amount || '25';
    
    showAlert(`Processing $${amount} top-up...`, 'info');
    
    // Simulate payment processing
    setTimeout(() => {
        showAlert(`Successfully added $${amount} to your wallet!`, 'success');
        
        // Update wallet balance (for demo)
        updateWalletBalance(amount);
    }, 2000);
}

/**
 * Update wallet balance
 */
function updateWalletBalance(addedAmount) {
    const balanceElements = document.querySelectorAll('h2, h5, .wallet-balance');
    balanceElements.forEach(element => {
        if (element.textContent.includes('$')) {
            const currentBalance = parseFloat(element.textContent.replace('$', '')) || 0;
            const newBalance = currentBalance + parseFloat(addedAmount);
            element.textContent = `$${newBalance.toFixed(2)}`;
        }
    });
}

/**
 * Handle filter changes
 */
function handleFilterChange(e) {
    e.preventDefault();
    
    const filterValue = e.target.textContent;
    showAlert(`Filtering by: ${filterValue}`, 'info');
    
    // Here you would typically apply the filter
}

/**
 * Handle logout
 */
function handleLogout(e) {
    e.preventDefault();
    
    // Clear session data using CONFIG
    localStorage.removeItem(CONFIG.STORAGE.USER);
    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.SESSION);
    
    // Show message and redirect
    showAlert('Logged out successfully!', 'success');
    
    setTimeout(() => {
        window.location.href = getRelativePathToRoot() + CONFIG.ROUTES.HOME;
    }, 1000);
}

/**
 * Handle rating interactions
 */
function handleRating(e) {
    e.preventDefault();
    
    const starElement = e.currentTarget;
    const rating = parseInt(starElement.dataset.rating) || 1;
    const videoId = starElement.closest('.video-card')?.dataset.videoId || 'demo';
    
    // Update star display
    const allStars = starElement.parentElement.querySelectorAll('.fa-star');
    allStars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('text-warning');
            star.classList.remove('text-muted');
        } else {
            star.classList.add('text-muted');
            star.classList.remove('text-warning');
        }
    });
    
    // Save rating (simulate API call)
    console.log(`Video ${videoId} rated ${rating} stars`);
    showAlert(`Rated ${rating} stars!`, 'success', 2000);
}

/**
 * Handle bookmark functionality
 */
function handleBookmark(e) {
    e.preventDefault();
    
    const button = e.currentTarget;
    const videoId = button.closest('.video-card')?.dataset.videoId || 'demo';
    const icon = button.querySelector('i');
    
    if (icon.classList.contains('far')) {
        // Add to bookmarks
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.classList.add('btn-warning');
        button.classList.remove('btn-outline-secondary');
        showAlert('Added to library!', 'success', 2000);
    } else {
        // Remove from bookmarks
        icon.classList.add('far');
        icon.classList.remove('fas');
        button.classList.remove('btn-warning');
        button.classList.add('btn-outline-secondary');
        showAlert('Removed from library!', 'info', 2000);
    }
    
    console.log(`Video ${videoId} bookmark toggled`);
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
    // Load user-specific data
    loadUserStats();
    
    // Load videos
    loadVideos();
    
    // Load transactions
    loadTransactions();
}

/**
 * Load section-specific data
 */
function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'videos':
            loadVideos();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'earnings':
            loadEarnings();
            break;
        case 'wallet':
            loadWalletData();
            break;
        case 'library':
            loadLibrary();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

/**
 * Load user statistics
 */
function loadUserStats() {
    // This would typically fetch real data from an API
    console.log('Loading user stats...');
}

/**
 * Load videos
 */
function loadVideos() {
    console.log('Loading videos...');
    // This would typically fetch videos from an API
}

/**
 * Load analytics
 */
function loadAnalytics() {
    console.log('Loading analytics...');
    // This would typically fetch analytics data
}

/**
 * Load earnings
 */
function loadEarnings() {
    console.log('Loading earnings...');
    // This would typically fetch earnings data
}

/**
 * Load wallet data
 */
function loadWalletData() {
    console.log('Loading wallet data...');
    // This would typically fetch wallet transactions
}

/**
 * Load library
 */
function loadLibrary() {
    console.log('Loading library...');
    // This would typically fetch purchased videos
}

/**
 * Load history
 */
function loadHistory() {
    console.log('Loading watch history...');
    // This would typically fetch watch history
}

/**
 * Load transactions
 */
function loadTransactions() {
    console.log('Loading transactions...');
    // This would typically fetch transaction history
}

/**
 * Utility functions
 */

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Set field error
 */
function setFieldError(field, message) {
    field.classList.add('is-invalid');
    
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
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
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
    `;
    
    alertElement.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 5000);
}

/**
 * Get alert icon based on type
 */
function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Global functions for inline handlers
window.processPurchase = processPurchase;
window.openVideoModal = openVideoModal;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        switchSection,
        handleVideoUpload,
        formatFileSize
    };
}
