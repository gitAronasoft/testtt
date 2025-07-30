// Enhanced Dashboard functionality with role-based access
let currentUserRole = 'viewer';
let isSubscribed = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUserRole = localStorage.getItem('userRole') || user.role || 'viewer';
    isSubscribed = localStorage.getItem('isSubscribed') === 'true';

    updateRoleBasedUI();
    loadStats();
    loadVideos();
    loadUsers();
    setupEventListeners();

    console.log('Dashboard initialized for role:', currentUserRole);
}

function updateRoleBasedUI() {
    // Hide/show elements based on role
    const adminElements = document.querySelectorAll('.admin-only');
    const editorElements = document.querySelectorAll('.editor-only');
    const viewerElements = document.querySelectorAll('.viewer-only');

    adminElements.forEach(el => {
        el.style.display = currentUserRole === 'admin' ? 'block' : 'none';
    });

    editorElements.forEach(el => {
        el.style.display = (currentUserRole === 'admin' || currentUserRole === 'editor') ? 'block' : 'none';
    });

    viewerElements.forEach(el => {
        el.style.display = currentUserRole === 'viewer' ? 'block' : 'none';
    });

    // Update dashboard based on role
    if (currentUserRole === 'viewer') {
        setupViewerDashboard();
    } else {
        setupAdminEditorDashboard();
    }
}

function setupViewerDashboard() {
    // Hide complex features for viewers
    const complexFeatures = document.querySelectorAll('.quick-actions, .stats-grid .stat-card:nth-child(n+3)');
    complexFeatures.forEach(el => el.style.display = 'none');

    // Update dashboard header
    const dashboardHeader = document.querySelector('.dashboard-header h2');
    if (dashboardHeader) {
        dashboardHeader.textContent = isSubscribed ? '🎥 My Premium Videos' : '🎥 Free Content';
    }

    // Hide/show upgrade prompt based on subscription status
    const upgradePrompt = document.getElementById('upgradePrompt');
    if (upgradePrompt) {
        upgradePrompt.style.display = isSubscribed ? 'none' : 'block';
    }

    // Show upgrade prompt for non-subscribers only
    if (!isSubscribed) {
        // Show subscription prompt after delay
        showSubscriptionPrompt();
    } else {
        // Add payment history section for subscribers
        addPaymentHistorySection();
    }
}

function setupAdminEditorDashboard() {
    // Show all features for admin/editor
    const allFeatures = document.querySelectorAll('.quick-actions, .stats-grid');
    allFeatures.forEach(el => el.style.display = 'block');
}

function setupEventListeners() {
    // Search and filter event listeners
    const searchInput = document.querySelector('.search-input');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }

    // File upload event listener
    const videoFileInput = document.getElementById('videoFile');
    if (videoFileInput) {
        videoFileInput.addEventListener('change', handleFileSelect);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'f':
                    e.preventDefault();
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) searchInput.focus();
                    break;
                case 'r':
                    e.preventDefault();
                    refreshDashboard();
                    break;
            }
        }
    });
}

function loadStats() {
    const stats = {
        admin: { users: 342, videos: 156, revenue: '12,450', engagement: 85 },
        editor: { users: 89, videos: 23, revenue: '1,890', engagement: 78 },
        viewer: { users: 1, videos: isSubscribed ? 15 : 5, revenue: '67.50', engagement: 92 }
    };

    const roleStats = stats[currentUserRole] || stats.viewer;

    // Update stats display
    updateStatElement('totalUsers', currentUserRole === 'viewer' ? 'My Account' : roleStats.users);
    updateStatElement('totalVideos', roleStats.videos);
    updateStatElement('totalRevenue', '$' + roleStats.revenue);
    updateStatElement('engagementRate', roleStats.engagement + '%');
}

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function loadVideos() {
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;

    let videos = [];

    if (currentUserRole === 'viewer') {
        videos = isSubscribed ? generatePremiumVideos() : generateFreeVideos();
    } else {
        videos = generateAllVideos();
    }

    videoGrid.innerHTML = videos.map(video => createVideoCard(video)).join('');
}

function generateFreeVideos() {
    return [
        { id: 1, title: 'Getting Started with YouTube', description: 'Basic YouTube tutorial - Free Content', views: '1.2K', duration: '5:30', thumbnail: '📺', status: 'published', free: true },
        { id: 2, title: 'Video Editing Basics', description: 'Learn the fundamentals - Free Content', views: '890', duration: '8:15', thumbnail: '✂️', status: 'published', free: true },
        { id: 3, title: 'Content Creation Tips', description: 'Free tips for creators', views: '2.1K', duration: '12:45', thumbnail: '💡', status: 'published', free: true }
    ];
}

function generatePremiumVideos() {
    return [
        ...generateFreeVideos(),
        { id: 4, title: 'Advanced Analytics', description: 'Premium analytics features', views: '5.3K', duration: '15:20', thumbnail: '📊', status: 'published', premium: true },
        { id: 5, title: 'Monetization Strategies', description: 'Advanced earning methods', views: '3.7K', duration: '20:10', thumbnail: '💰', status: 'published', premium: true },
        { id: 6, title: 'Brand Partnerships', description: 'Working with brands', views: '4.1K', duration: '18:30', thumbnail: '🤝', status: 'published', premium: true }
    ];
}

function generateAllVideos() {
    return [
        ...generatePremiumVideos(),
        { id: 7, title: 'Team Collaboration', description: 'Working with team members', views: '1.8K', duration: '10:45', thumbnail: '👥', status: 'draft' },
        { id: 8, title: 'Live Streaming Guide', description: 'How to stream effectively', views: '2.9K', duration: '25:15', thumbnail: '🎥', status: 'scheduled' },
        { id: 9, title: 'SEO Optimization', description: 'Improve video discoverability', views: '3.2K', duration: '14:20', thumbnail: '🔍', status: 'published' }
    ];
}

function createVideoCard(video) {
    const premiumBadge = video.premium ? '<span class="premium-badge">💎 Premium</span>' : '';
    const freeBadge = video.free ? '<span class="free-badge">🆓 Free</span>' : '';
    const statusBadge = getStatusBadge(video.status);
    
    // Check if viewer can access this video
    const canAccess = currentUserRole !== 'viewer' || video.free || (video.premium && isSubscribed);
    const lockOverlay = !canAccess ? '<div class="video-lock-overlay" onclick="showUpgradePrompt()">🔒</div>' : '';
    
    return `
        <div class="video-card ${!canAccess ? 'locked' : ''}" data-video-id="${video.id}" data-status="${video.status}">
            ${lockOverlay}
            <div class="video-thumbnail">${video.thumbnail}</div>
            <div class="video-info">
                <h4 class="video-title">${video.title}</h4>
                <p class="video-description">${video.description}</p>
                <div class="video-meta">
                    <span>${video.views} views</span>
                    <span>${video.duration}</span>
                </div>
                <div class="video-actions">
                    ${statusBadge}
                    ${freeBadge}
                    ${premiumBadge}
                    ${currentUserRole !== 'viewer' ? `
                        <button class="btn-link" onclick="editVideo(${video.id})">Edit</button>
                        <button class="btn-link" onclick="deleteVideo(${video.id})">Delete</button>
                    ` : canAccess ? `
                        <button class="btn btn-primary" onclick="watchVideo(${video.id})">Watch</button>
                    ` : `
                        <button class="btn btn-secondary" onclick="showUpgradePrompt()">Upgrade to Watch</button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'published': '<span class="status-badge published">Published</span>',
        'draft': '<span class="status-badge draft">Draft</span>',
        'scheduled': '<span class="status-badge scheduled">Scheduled</span>'
    };
    return badges[status] || '';
}

function loadUsers() {
    if (currentUserRole !== 'admin') return;

    const userList = document.getElementById('userList');
    if (!userList) return;

    const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'editor', status: 'active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'viewer', status: 'active' },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'viewer', status: 'inactive' }
    ];

    userList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <strong>${user.name}</strong>
                <span>${user.email}</span>
                <span class="user-role">${user.role}</span>
                <span class="status-badge ${user.status}">${user.status}</span>
            </div>
            <div class="user-actions">
                <button class="btn-link" onclick="editUser(${user.id})">Edit</button>
                <button class="btn-link" onclick="deleteUser(${user.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function applyFilters() {
    const searchTerm = document.querySelector('.search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || 'newest';

    const videoCards = document.querySelectorAll('.video-card');
    let visibleCards = Array.from(videoCards);

    // Filter by search term and status
    visibleCards = visibleCards.filter(card => {
        const title = card.querySelector('.video-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.video-description')?.textContent.toLowerCase() || '';
        const status = card.dataset.status || '';

        const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Hide all cards first
    videoCards.forEach(card => card.style.display = 'none');

    // Apply sorting
    switch(sortFilter) {
        case 'alphabetical':
            visibleCards.sort((a, b) => {
                const titleA = a.querySelector('.video-title')?.textContent || '';
                const titleB = b.querySelector('.video-title')?.textContent || '';
                return titleA.localeCompare(titleB);
            });
            break;
        case 'oldest':
            visibleCards.reverse();
            break;
        case 'most-viewed':
            visibleCards.sort((a, b) => {
                const viewsA = parseInt(a.querySelector('.video-meta span')?.textContent.replace(/[^\d]/g, '') || '0');
                const viewsB = parseInt(b.querySelector('.video-meta span')?.textContent.replace(/[^\d]/g, '') || '0');
                return viewsB - viewsA;
            });
            break;
        default: // newest
            // Keep current order
            break;
    }

    // Show filtered and sorted cards
    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
        visibleCards.forEach(card => {
            card.style.display = 'block';
            videoGrid.appendChild(card);
        });
    }

    // Show message if no results
    if (visibleCards.length === 0) {
        showNotification('No videos found matching your filters', 'info');
    }
}

function clearFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    const searchInput = document.querySelector('.search-input');

    filterSelects.forEach(select => select.value = '');
    if (searchInput) searchInput.value = '';

    // Show all video cards
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => card.style.display = 'block');

    showNotification('All filters cleared', 'info');
}

function clearSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
        applyFilters();
    }
}

function uploadVideo() {
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const fileInput = document.getElementById('videoFile');

    if (!title || !fileInput.files[0]) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    showAlert('Video uploaded successfully!', 'success');
    closeModal('uploadModal');

    // Reset form
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    fileInput.value = '';

    // Refresh videos
    loadVideos();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const uploadArea = document.querySelector('.upload-area p');

    if (file) {
        uploadArea.textContent = `Selected: ${file.name}`;
    }
}

function editVideo(id) {
    showNotification(`Editing video ${id}`, 'info');
}

function deleteVideo(id) {
    if (confirm('Are you sure you want to delete this video?')) {
        showNotification(`Video ${id} deleted`, 'success');
        loadVideos();
    }
}

function editUser(id) {
    showNotification(`Editing user ${id}`, 'info');
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        showNotification(`User ${id} deleted`, 'success');
        loadUsers();
    }
}

function showSubscriptionPrompt() {
    setTimeout(() => {
        if (!localStorage.getItem('subscriptionPromptShown') && !isSubscribed) {
            showModal('subscriptionModal');
            localStorage.setItem('subscriptionPromptShown', 'true');
        }
    }, 3000);
}

function showUpgradePrompt() {
    // Only show upgrade prompt if user is viewer and not subscribed
    if (currentUserRole === 'viewer' && !isSubscribed) {
        const upgradePrompt = document.getElementById('upgradePrompt');
        if (upgradePrompt) {
            upgradePrompt.style.display = 'block';
        }
        showModal('subscriptionModal');
    } else if (isSubscribed) {
        showNotification('You already have a premium subscription!', 'info');
    }
}

function watchVideo(videoId) {
    showNotification(`Playing video ${videoId}`, 'success');
    // Here you would implement actual video playback
}

function addPaymentHistorySection() {
    const container = document.querySelector('.container');
    if (!container || document.getElementById('paymentHistory')) return;

    const paymentSection = document.createElement('div');
    paymentSection.id = 'paymentHistory';
    paymentSection.innerHTML = `
        <div class="card" style="margin-top: 20px;">
            <h3>Payment History</h3>
            <div class="payment-history">
                <div class="payment-item">
                    <span>Premium Subscription</span>
                    <span>$9.99</span>
                    <span>Dec 2024</span>
                    <span class="status-badge paid">Paid</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(paymentSection);
}

// Utility functions
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

function refreshDashboard() {
    showNotification('Refreshing dashboard...', 'info');
    setTimeout(() => {
        loadStats();
        loadVideos();
        loadUsers();
        showNotification('Dashboard refreshed', 'success');
    }, 1000);
}

// Global notification function
if (typeof showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        if (window.visualEnhancements) {
            window.visualEnhancements.showNotification(message, type, duration);
        } else {
            showAlert(message, type);
        }
    };
}

function showAlert(message, type) {
    alert(message);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function processSubscription() {
    const selectedPlan = document.querySelector('.plan-card.active')?.dataset.plan || 'premium';
    const cardNumber = document.getElementById('subCardNumber')?.value;
    const cardName = document.getElementById('subCardName')?.value;
    
    if (!cardNumber || !cardName) {
        showAlert('Please fill in all payment details', 'error');
        return;
    }
    
    showNotification('Processing payment...', 'info');
    
    // Simulate payment processing
    setTimeout(() => {
        localStorage.setItem('isSubscribed', 'true');
        localStorage.setItem('subscriptionPlan', selectedPlan);
        localStorage.setItem('subscriptionDate', new Date().toISOString());
        
        // Add payment to history
        const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
        paymentHistory.unshift({
            id: 'INV-' + Date.now(),
            date: new Date().toISOString(),
            plan: selectedPlan === 'premium' ? 'Premium Plan' : 'Basic Plan',
            amount: selectedPlan === 'premium' ? '9.99' : '4.99',
            status: 'Paid'
        });
        localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory));
        
        showNotification('Payment successful! Welcome to Premium!', 'success');
        closeModal('subscriptionModal');
        
        // Refresh dashboard
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }, 2000);
}