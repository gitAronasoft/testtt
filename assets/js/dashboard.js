// Enhanced Dashboard functionality with proper role-based access
let currentUserRole = 'viewer';
let isSubscribed = false;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    // Check local authentication first
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const storedUser = localStorage.getItem('currentUser');

    if (!isLoggedIn || !storedUser) {
        window.location.replace('/login.html');
        return;
    }

    // Use stored user data
    try {
        currentUser = JSON.parse(storedUser);
        currentUserRole = currentUser.role || localStorage.getItem('userRole') || 'viewer';

        // Try to verify with server, but don't redirect if it fails
        try {
            const response = await fetch('/api.php?action=get_user');
            const data = await response.json();

            if (data.success && data.user) {
                // Update with server data if available
                currentUser = data.user;
                currentUserRole = currentUser.role;

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('userRole', currentUserRole);
                localStorage.setItem('userName', currentUser.name);
                localStorage.setItem('userEmail', currentUser.email);
            }
        } catch (serverError) {
            console.log('Server authentication check failed, using local data:', serverError);
        }

        // Set subscription based on role (viewers need to subscribe, others have access)
        isSubscribed = currentUserRole !== 'viewer' || localStorage.getItem('isSubscribed') === 'true';

    } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        localStorage.clear();
        window.location.replace('/login.html');
        return;
    }

    updateRoleBasedUI();
    await loadStats();
    loadVideos();

    // Only load users for admins
    if (currentUserRole === 'admin') {
        await loadUsers();
    }

    // Add role-specific navigation
    addRoleSpecificNavigation();

    setupEventListeners();
    console.log('Dashboard initialized for role:', currentUserRole);
}

function updateRoleBasedUI() {
    // Hide/show elements based on actual user role
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

    // Update page title and header based on role
    const dashboardHeader = document.querySelector('.dashboard-header h2');
    if (dashboardHeader) {
        const roleIcons = {
            'admin': '🛡️',
            'editor': '✏️',
            'viewer': '👁️'
        };
        dashboardHeader.innerHTML = `${roleIcons[currentUserRole]} ${currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)} Dashboard`;
    }
}

function setupViewerDashboard() {
    // Hide complex features for viewers
    const complexFeatures = document.querySelectorAll('.quick-actions, .stats-grid');
    complexFeatures.forEach(el => el.style.display = 'none');

    // Update dashboard content for viewers
    const container = document.querySelector('.container');
    if (container) {
        // Remove admin/editor sections
        const adminSections = container.querySelectorAll('.admin-only, .editor-only');
        adminSections.forEach(section => section.remove());
    }

    // Show upgrade prompt for non-subscribers only
    if (!isSubscribed) {
        showSubscriptionPrompt();
    } else {
        addPaymentHistorySection();
    }
}

function setupAdminEditorDashboard() {
    // Show appropriate features for admin/editor
    const statsGrid = document.querySelector('.stats-grid');
    const quickActions = document.querySelector('.quick-actions');

    if (statsGrid) statsGrid.style.display = 'grid';
    if (quickActions) quickActions.style.display = 'block';

    // Hide viewer-specific elements
    const upgradePrompt = document.getElementById('upgradePrompt');
    if (upgradePrompt) upgradePrompt.style.display = 'none';
}

async function loadStats() {
    // Only admin and editor can access stats
    if (currentUserRole === 'viewer') {
        return;
    }

    try {
        const response = await fetch('/api.php?action=get_stats');
        const data = await response.json();

        if (data.success) {
            updateStatElement('totalUsers', data.stats.users);
            updateStatElement('totalVideos', data.stats.videos);
            updateStatElement('totalRevenue', '$' + data.stats.revenue);
            updateStatElement('engagementRate', data.stats.engagement + '%');
        } else {
            console.error('Failed to load stats:', data.message);
            // Fallback to mock data
            loadMockStats();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        loadMockStats();
    }
}

function loadMockStats() {
    const stats = {
        admin: { users: 342, videos: 156, revenue: '12,450', engagement: 85 },
        editor: { users: 89, videos: 23, revenue: '1,890', engagement: 78 }
    };

    const roleStats = stats[currentUserRole];
    if (roleStats) {
        updateStatElement('totalUsers', roleStats.users);
        updateStatElement('totalVideos', roleStats.videos);
        updateStatElement('totalRevenue', '$' + roleStats.revenue);
        updateStatElement('engagementRate', roleStats.engagement + '%');
    }
}

async function loadUsers() {
    // Only admins can load users
    if (currentUserRole !== 'admin') {
        return;
    }

    const userList = document.getElementById('userList');
    if (!userList) return;

    try {
        const response = await fetch('/api.php?action=get_users');
        const data = await response.json();

        if (data.success) {
            renderUsers(data.users);
        } else {
            console.error('Failed to load users:', data.message);
            renderUsers(getMockUsers());
        }
    } catch (error) {
        console.error('Error loading users:', error);
        renderUsers(getMockUsers());
    }
}

function renderUsers(users) {
    const userList = document.getElementById('userList');
    if (!userList) return;

    userList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <strong>${user.name}</strong>
                <span>${user.email}</span>
                <span class="user-role">${user.role}</span>
                <span class="status-badge active">Active</span>
            </div>
            <div class="user-actions">
                <button class="btn-link" onclick="editUser(${user.id})" ${currentUserRole !== 'admin' ? 'disabled' : ''}>Edit</button>
                <button class="btn-link" onclick="deleteUser(${user.id})" ${currentUserRole !== 'admin' ? 'disabled' : ''}>Delete</button>
            </div>
        </div>
    `).join('');
}

function getMockUsers() {
    return [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'editor', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'viewer', created_at: '2024-02-20' },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'viewer', created_at: '2024-03-10' }
    ];
}

function loadVideos() {
    const videoGrid = document.getElementById('videoGrid');
    if (!videoGrid) return;

    let videos = [];

    // Role-based video access
    switch (currentUserRole) {
        case 'viewer':
            videos = isSubscribed ? generatePremiumVideos() : generateFreeVideos();
            break;
        case 'editor':
            videos = generateEditorVideos();
            break;
        case 'admin':
            videos = generateAllVideos();
            break;
        default:
            videos = generateFreeVideos();
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

function generateEditorVideos() {
    return [
        ...generatePremiumVideos(),
        { id: 7, title: 'Content Management', description: 'Managing your content library', views: '1.8K', duration: '10:45', thumbnail: '📚', status: 'draft', editable: true },
        { id: 8, title: 'Collaboration Tools', description: 'Working with team members', views: '2.9K', duration: '25:15', thumbnail: '👥', status: 'scheduled', editable: true }
    ];
}

function generateAllVideos() {
    return [
        ...generateEditorVideos(),
        { id: 9, title: 'User Management', description: 'Managing platform users', views: '3.2K', duration: '14:20', thumbnail: '👨‍💼', status: 'published', adminOnly: true },
        { id: 10, title: 'System Analytics', description: 'Platform-wide analytics', views: '2.1K', duration: '18:45', thumbnail: '📈', status: 'published', adminOnly: true }
    ];
}

function createVideoCard(video) {
    const premiumBadge = video.premium ? '<span class="premium-badge">💎</span>' : '';
    const freeBadge = video.free ? '<span class="free-badge">FREE</span>' : '';
    const adminBadge = video.adminOnly ? '<span class="admin-badge">ADMIN</span>' : '';

    // Check if user can access this video based on role
    let canAccess = false;
    let canEdit = false;

    switch (currentUserRole) {
        case 'viewer':
            canAccess = video.free || (video.premium && isSubscribed);
            canEdit = false;
            break;
        case 'editor':
            canAccess = !video.adminOnly;
            canEdit = video.editable || !video.adminOnly;
            break;
        case 'admin':
            canAccess = true;
            canEdit = true;
            break;
    }

    const lockOverlay = !canAccess ? '<div class="video-lock-overlay" onclick="showAccessDenied()">🔒</div>' : '';

    // Get channel name based on role
    const channelName = currentUserRole === 'admin' ? 'Admin Channel' : 
                       currentUserRole === 'editor' ? 'Editor Channel' : 
                       'Your Channel';

    // Format time ago
    const timeAgo = getTimeAgo(video.id);

    return `
        <div class="video-card ${!canAccess ? 'locked' : ''}" data-video-id="${video.id}" data-status="${video.status}">
            ${lockOverlay}
            <div class="video-thumbnail">
                ${video.thumbnail}
                <div class="video-duration">${video.duration}</div>
                ${premiumBadge}${freeBadge}${adminBadge}
            </div>
            <div class="video-info">
                <div class="video-avatar">${getChannelInitial(channelName)}</div>
                <div class="video-details">
                    <div class="video-title">${video.title}</div>
                    <div class="video-channel">${channelName}</div>
                    <div class="video-meta">
                        <span>${video.views} views</span>
                        <div class="video-meta-separator"></div>
                        <span>${timeAgo}</span>
                    </div>
                    ${canEdit ? `
                        <div class="video-actions" style="margin-top: 8px;">
                            <button class="btn-link" onclick="editVideo(${video.id})">Edit</button>
                            <button class="btn-link" onclick="deleteVideo(${video.id})">Delete</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function getChannelInitial(channelName) {
    return channelName.charAt(0).toUpperCase();
}

function getTimeAgo(videoId) {
    const timeOptions = ['2 hours ago', '1 day ago', '3 days ago', '1 week ago', '2 weeks ago', '1 month ago', '2 months ago'];
    return timeOptions[videoId % timeOptions.length];
}

function showAccessDenied() {
    let message = '';
    switch (currentUserRole) {
        case 'viewer':
            message = 'This content requires a premium subscription or higher access level.';
            showUpgradePrompt();
            break;
        case 'editor':
            message = 'This content is restricted to administrators only.';
            showNotification(message, 'warning');
            break;
        default:
            message = 'Access denied.';
            showNotification(message, 'error');
    }
}

// Restrict functions based on role
function uploadVideo() {
    if (currentUserRole === 'viewer') {
        showNotification('Upload feature requires editor or admin access', 'error');
        return;
    }

    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const fileInput = document.getElementById('videoFile');

    if (!title || !fileInput.files[0]) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    showNotification('Video uploaded successfully!', 'success');
    closeModal('uploadModal');

    // Reset form
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    fileInput.value = '';

    loadVideos();
}

function editVideo(id) {
    if (currentUserRole === 'viewer') {
        showNotification('Edit feature requires editor or admin access', 'error');
        return;
    }
    showNotification(`Editing video ${id}`, 'info');
}

function deleteVideo(id) {
    if (currentUserRole === 'viewer') {
        showNotification('Delete feature requires editor or admin access', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this video?')) {
        showNotification(`Video ${id} deleted`, 'success');
        loadVideos();
    }
}

function editUser(id) {
    if (currentUserRole !== 'admin') {
        showNotification('User management requires admin access', 'error');
        return;
    }
    showNotification(`Editing user ${id}`, 'info');
}

function deleteUser(id) {
    if (currentUserRole !== 'admin') {
        showNotification('User management requires admin access', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this user?')) {
        showNotification(`User ${id} deleted`, 'success');
        loadUsers();
    }
}

// Rest of the functions remain the same...
function setupEventListeners() {
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

    const videoFileInput = document.getElementById('videoFile');
    if (videoFileInput) {
        videoFileInput.addEventListener('change', handleFileSelect);
    }

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

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function getStatusBadge(status) {
    const badges = {
        'published': '<span class="status-badge published">Published</span>',
        'draft': '<span class="status-badge draft">Draft</span>',
        'scheduled': '<span class="status-badge scheduled">Scheduled</span>'
    };
    return badges[status] || '';
}

function applyFilters() {
    const searchTerm = document.querySelector('.search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || 'newest';

    const videoCards = document.querySelectorAll('.video-card');
    let visibleCards = Array.from(videoCards);

    visibleCards = visibleCards.filter(card => {
        const title = card.querySelector('.video-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.video-description')?.textContent.toLowerCase() || '';
        const status = card.dataset.status || '';

        const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    videoCards.forEach(card => card.style.display = 'none');

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
    }

    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
        visibleCards.forEach(card => {
            card.style.display = 'block';
            videoGrid.appendChild(card);
        });
    }

    if (visibleCards.length === 0) {
        showNotification('No videos found matching your filters', 'info');
    }
}

function clearFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    const searchInput = document.querySelector('.search-input');

    filterSelects.forEach(select => select.value = '');
    if (searchInput) searchInput.value = '';

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

function handleFileSelect(event) {
    const file = event.target.files[0];
    const uploadArea = document.querySelector('.upload-area p');

    if (file) {
        uploadArea.textContent = `Selected: ${file.name}`;
    }
}

function showSubscriptionPrompt() {
    setTimeout(() => {
        if (!localStorage.getItem('subscriptionPromptShown') && !isSubscribed && currentUserRole === 'viewer') {
            showModal('subscriptionModal');
            localStorage.setItem('subscriptionPromptShown', 'true');
        }
    }, 3000);
}

function showUpgradePrompt() {
    if (currentUserRole === 'viewer' && !isSubscribed) {
        const upgradePrompt = document.getElementById('upgradePrompt');
        if (upgradePrompt) {
            upgradePrompt.style.display = 'block';
        }
        showModal('subscriptionModal');
    } else if (isSubscribed) {
        showNotification('You already have a premium subscription!', 'info');
    } else {
        showNotification('This feature requires higher access level', 'warning');
    }
}

function watchVideo(videoId) {
    showNotification(`Playing video ${videoId}`, 'success');
}

function addPaymentHistorySection() {
    if (currentUserRole !== 'viewer') return;

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
    setTimeout(async () => {
        await loadStats();
        loadVideos();
        if (currentUserRole === 'admin') {
            await loadUsers();
        }
        showNotification('Dashboard refreshed', 'success');
    }, 1000);
}

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
    if (currentUserRole !== 'viewer') {
        showNotification('Subscription is only available for viewer accounts', 'info');
        return;
    }

    const selectedPlan = document.querySelector('.plan-card.active')?.dataset.plan || 'premium';
    const cardNumber = document.getElementById('subCardNumber')?.value;
    const cardName = document.getElementById('subCardName')?.value;

    if (!cardNumber || !cardName) {
        showAlert('Please fill in all payment details', 'error');
        return;
    }

    showNotification('Processing payment...', 'info');

    setTimeout(() => {
        localStorage.setItem('isSubscribed', 'true');
        localStorage.setItem('subscriptionPlan', selectedPlan);
        localStorage.setItem('subscriptionDate', new Date().toISOString());

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

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }, 2000);
}

function addRoleSpecificNavigation() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    if (currentUserRole === 'editor') {
        const uploadLink = document.createElement('a');
        uploadLink.href = '/upload.html'; // Assuming you have an upload.html page
        uploadLink.textContent = 'Upload Video';
        nav.appendChild(uploadLink);
    }

    if (currentUserRole === 'admin') {
        const manageVideosLink = document.createElement('a');
        manageVideosLink.href = '/manage-videos.html'; // Assuming you have a manage-videos.html page
        manageVideosLink.textContent = 'Manage Videos';
        nav.appendChild(manageVideosLink);
    }
}