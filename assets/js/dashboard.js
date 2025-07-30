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

    console.log('Dashboard initialized');
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
        dashboardHeader.textContent = isSubscribed ? '🎥 My Videos' : '🎥 Available Videos';
    }

    // Show subscription status
    if (!isSubscribed) {
        showSubscriptionPrompt();
    }

    // Add payment history section
    addPaymentHistorySection();
}

function setupAdminEditorDashboard() {
    // Show all features for admin/editor
    const allFeatures = document.querySelectorAll('.quick-actions, .stats-grid');
    allFeatures.forEach(el => el.style.display = '';
}

function showSubscriptionPrompt() {
    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid && videoGrid.parentElement) {
        const promptHTML = `
            <div class="subscription-prompt" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px; font-size: 1.5rem;">🚀 Unlock Premium Content</h3>
                <p style="margin: 0 0 20px; opacity: 0.9;">Subscribe to access exclusive videos and premium features!</p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="showSubscriptionModal()" class="btn" style="background: white; color: var(--primary-color); border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">View Plans</button>
                    <button onclick="hideSubscriptionPrompt()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px;">Maybe Later</button>
                </div>
            </div>
        `;
        videoGrid.parentElement.insertAdjacentHTML('afterbegin', promptHTML);
    }
}

function hideSubscriptionPrompt() {
    const prompt = document.querySelector('.subscription-prompt');
    if (prompt) {
        prompt.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => prompt.remove(), 300);
    }
}

function addPaymentHistorySection() {
    const container = document.querySelector('.container');
    if (container && currentUserRole === 'viewer') {
        const paymentHistoryHTML = `
            <div class="payment-history-section" style="background: white; border: 1px solid #e0e0e0; border-radius: 16px; padding: 24px; margin-top: 20px;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary);">💳 Payment History</h3>
                    <button onclick="showAllPayments()" class="btn btn-secondary" style="font-size: 14px; padding: 8px 16px;">View All</button>
                </div>
                <div id="paymentHistoryList">
                    ${generatePaymentHistory()}
                </div>
            </div>

            <div class="subscription-plans-section" style="background: white; border: 1px solid #e0e0e0; border-radius: 16px; padding: 24px; margin-top: 20px;">
                <h3 style="margin: 0 0 20px; color: var(--text-primary);">📋 Available Plans</h3>
                <div class="plans-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                    ${generateSubscriptionPlans()}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', paymentHistoryHTML);
    }
}

function generatePaymentHistory() {
    const payments = [
        { id: 'PAY001', date: '2024-01-15', amount: '$9.99', plan: 'Basic Plan', status: 'paid' },
        { id: 'PAY002', date: '2024-02-15', amount: '$9.99', plan: 'Basic Plan', status: 'paid' },
        { id: 'PAY003', date: '2024-03-15', amount: '$9.99', plan: 'Basic Plan', status: 'pending' }
    ];

    return payments.map(payment => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
            <div>
                <div style="font-weight: 500; color: var(--text-primary);">${payment.plan}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">${payment.date} • ${payment.id}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; color: var(--text-primary);">${payment.amount}</div>
                <span class="status-badge ${payment.status}" style="font-size: 12px; padding: 2px 8px; border-radius: 4px;">${payment.status.toUpperCase()}</span>
            </div>
        </div>
    `).join('');
}

function generateSubscriptionPlans() {
    const plans = [
        { name: 'Basic', price: '$9.99', period: '/month', features: ['Access to premium videos', 'HD quality', 'Mobile app access'] },
        { name: 'Pro', price: '$19.99', period: '/month', features: ['Everything in Basic', '4K quality', 'Offline downloads', 'Early access'] },
        { name: 'Enterprise', price: '$49.99', period: '/month', features: ['Everything in Pro', 'Team management', 'Analytics', 'Priority support'] }
    ];

    return plans.map(plan => `
        <div class="plan-card" style="border: 2px solid var(--border-color); border-radius: 12px; padding: 20px; text-align: center; transition: all 0.3s ease;">
            <h4 style="margin: 0 0 8px; font-size: 1.25rem; color: var(--text-primary);">${plan.name}</h4>
            <div style="margin: 0 0 16px;">
                <span style="font-size: 2rem; font-weight: 700; color: var(--primary-color);">${plan.price}</span>
                <span style="color: var(--text-secondary);">${plan.period}</span>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0 0 20px; text-align: left;">
                ${plan.features.map(feature => `<li style="padding: 4px 0; font-size: 14px; color: var(--text-secondary);">✓ ${feature}</li>`).join('')}
            </ul>
            <button onclick="subscribeToPlan('${plan.name}')" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 14px;">
                ${isSubscribed ? 'Current Plan' : 'Subscribe'}
            </button>
        </div>
    `).join('');
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
        { id: 1, title: 'Getting Started Guide', description: 'Learn the basics', thumbnail: '📚', isPremium: false },
        { id: 2, title: 'Basic Features Overview', description: 'Explore core features', thumbnail: '🔍', isPremium: false },
        { id: 3, title: 'Premium Content Preview', description: 'Subscribe to unlock', thumbnail: '🔒', isPremium: true }
    ];
}

function generatePremiumVideos() {
    return [
        { id: 1, title: 'Getting Started Guide', description: 'Learn the basics', thumbnail: '📚', isPremium: false },
        { id: 2, title: 'Basic Features Overview', description: 'Explore core features', thumbnail: '🔍', isPremium: false },
        { id: 3, title: 'Advanced Techniques', description: 'Pro tips and tricks', thumbnail: '🚀', isPremium: true },
        { id: 4, title: 'Master Class Series', description: 'Expert-level content', thumbnail: '🎓', isPremium: true },
        { id: 5, title: 'Exclusive Interviews', description: 'Industry insights', thumbnail: '🎤', isPremium: true }
    ];
}

function generateAllVideos() {
    return [
        { id: 1, title: 'Company Overview 2024', description: 'Annual company presentation', thumbnail: '🏢', status: 'published' },
        { id: 2, title: 'Product Demo V2', description: 'Latest product features', thumbnail: '💡', status: 'draft' },
        { id: 3, title: 'Team Meeting Recording', description: 'Weekly team sync', thumbnail: '👥', status: 'private' },
        { id: 4, title: 'Training Session', description: 'Employee onboarding', thumbnail: '📖', status: 'published' },
        { id: 5, title: 'Customer Testimonials', description: 'Happy customer stories', thumbnail: '⭐', status: 'scheduled' }
    ];
}

function createVideoCard(video) {
    const isLocked = video.isPremium && !isSubscribed && currentUserRole === 'viewer';

    return `
        <div class="video-card ${isLocked ? 'locked' : ''}" style="position: relative; ${isLocked ? 'opacity: 0.6;' : ''}">
            ${isLocked ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--warning-color); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">🔒 PREMIUM</div>' : ''}
            <div class="video-thumbnail" style="font-size: 4rem; height: 180px; display: flex; align-items: center; justify-content: center; background: var(--border-light);">
                ${video.thumbnail}
            </div>
            <div class="video-info" style="padding: 16px;">
                <div class="video-title" style="font-weight: 600; margin-bottom: 8px;">${video.title}</div>
                <div class="video-description" style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">${video.description}</div>
                <div class="video-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${createVideoActions(video, isLocked)}
                </div>
            </div>
        </div>
    `;
}

function createVideoActions(video, isLocked) {
    if (currentUserRole === 'viewer') {
        if (isLocked) {
            return `<button onclick="showSubscriptionModal()" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px;">🔓 Unlock</button>`;
        } else {
            return `<button onclick="watchVideo(${video.id})" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px;">▶️ Watch</button>`;
        }
    } else {
        return `
            <button onclick="watchVideo(${video.id})" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px;">▶️ Watch</button>
            <button onclick="editVideo(${video.id})" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;">✏️ Edit</button>
            ${currentUserRole === 'admin' ? `<button onclick="deleteVideo(${video.id})" class="btn btn-danger" style="font-size: 12px; padding: 6px 12px;">🗑️ Delete</button>` : ''}
        `;
    }
}

function loadUsers() {
    if (currentUserRole !== 'admin') return;

    const userList = document.getElementById('userList');
    if (!userList) return;

    const users = [
        { id: 1, name: 'John Smith', email: 'john@company.com', role: 'Editor', status: 'Active' },
        { id: 2, name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Viewer', status: 'Active' },
        { id: 3, name: 'Mike Wilson', email: 'mike@company.com', role: 'Editor', status: 'Inactive' }
    ];

    userList.innerHTML = users.map(user => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
            <div>
                <div style="font-weight: 500;">${user.name}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">${user.email} • ${user.role}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <span class="status-badge ${user.status.toLowerCase()}">${user.status}</span>
                <button onclick="editUser(${user.id})" class="btn btn-secondary" style="font-size: 12px; padding: 4px 8px;">Edit</button>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
    }

    // Filter functionality
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', applyFilters);
    });
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

function performSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const videoCards = document.querySelectorAll('.video-card');

    videoCards.forEach(card => {
        const title = card.querySelector('.video-title').textContent.toLowerCase();
        const description = card.querySelector('.video-description').textContent.toLowerCase();

        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || '';

    showNotification(`Filters applied: ${statusFilter || 'All'} | ${sortFilter || 'Default'}`, 'info');
}

// Action functions
function watchVideo(videoId) {
    showNotification(`Playing video ${videoId}`, 'success');
}

function editVideo(videoId) {
    if (currentUserRole === 'viewer') {
        showNotification('You need editor permissions to edit videos', 'error');
        return;
    }
    showNotification(`Editing video ${videoId}`, 'info');
}

function deleteVideo(videoId) {
    if (currentUserRole !== 'admin') {
        showNotification('You need admin permissions to delete videos', 'error');
        return;
    }
    showNotification(`Deleted video ${videoId}`, 'success');
    setTimeout(() => loadVideos(), 1000);
}

function subscribeToPlan(planName) {
    showNotification(`Subscribing to ${planName} plan...`, 'info');

    setTimeout(() => {
        localStorage.setItem('isSubscribed', 'true');
        isSubscribed = true;
        showNotification(`Successfully subscribed to ${planName}!`, 'success');

        // Refresh the dashboard
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }, 2000);
}

function showSubscriptionModal() {
    showNotification('Opening subscription modal...', 'info');
    // In a real app, this would open a modal with payment options
}

function showAllPayments() {
    showNotification('Opening full payment history...', 'info');
    // In a real app, this would navigate to a detailed payment history page
}

// Utility functions
function clearFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    const searchInput = document.querySelector('.search-input');

    filterSelects.forEach(select => select.value = '');
    if (searchInput) searchInput.value = '';

    loadVideos();
    showNotification('Filters cleared', 'info');
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

// Bulk actions (admin/editor only)
function bulkAction(action) {
    if (currentUserRole === 'viewer') {
        showNotification('You need editor permissions for bulk actions', 'error');
        return;
    }
    showNotification(`Performing bulk ${action}...`, 'info');
}

function exportData() {
    if (currentUserRole === 'viewer') {
        showNotification('You need editor permissions to export data', 'error');
        return;
    }
    showNotification('Exporting data...', 'info');
}

console.log('Dashboard functions loaded successfully');
// Utility functions
function formatDuration(duration) {
    if (!duration) return '0:00';

    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
}

function editVideoOld(videoId) {
    alert('Edit video functionality - Video ID: ' + videoId);
}

// Modal functions
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
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

function uploadVideo() {
    const fileInput = document.getElementById('videoFile');
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;

    if (!fileInput.files[0] || !title) {
        alert('Please select a file and enter a title');
        return;
    }

    const formData = new FormData();
    formData.append('video', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);

    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Video uploaded successfully!');
            closeModal('uploadModal');
            loadVideos();
        } else {
            alert('Upload failed: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        alert('Upload failed');
    });
}

// Dashboard tab functions
function showDashboardTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.dashboard-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.remove('hidden');

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Profile and settings functions
function updateProfile() {
    const name = document.getElementById('profileFullName').value;
    const bio = document.getElementById('profileBioText').value;
    const website = document.getElementById('profileWebsite').value;
    const social = document.getElementById('profileSocial').value;

    // Update localStorage
    localStorage.setItem('userName', name);

    showAlert('Profile updated successfully!', 'success');

    // Refresh header to show updated name
    loadHeader();
}

function updatePassword() {
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;

    if (newPass !== confirm) {
        showAlert('New passwords do not match!', 'error');
        return;
    }

    if (newPass.length < 8) {
        showAlert('Password must be at least 8 characters long!', 'error');
        return;
    }

    showAlert('Password updated successfully!', 'success');
    document.getElementById('securityForm').reset();
}

// Payment functions
function processPayment() {
    const cardNumber = document.getElementById('cardNumber').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const cvcCode = document.getElementById('cvcCode').value;
    const cardholderName = document.getElementById('cardholderName').value;

    if (!cardNumber || !expiryDate || !cvcCode || !cardholderName) {
        showAlert('Please fill in all payment details', 'error');
        return;
    }

    // Simulate payment processing
    showAlert('Processing payment...', 'info');

    setTimeout(() => {
        showAlert('Payment successful! You now have access to this video.', 'success');
        closeModal('paymentModal');
        document.getElementById('paymentForm').reset();

        // Refresh video grid to show access
        loadVideos();
    }, 2000);
}

// Payment functions
function showPaymentModal() {
    showModal('paymentModal');
}

function closePaymentModal() {
    closeModal('paymentModal');
}

// Search function
function searchVideos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    showAlert(`Searching for: "${searchTerm}" in category: "${category || 'All'}"`, 'info');

    // Here you would typically make an API call to search videos
    console.log('Searching videos:', { searchTerm, category });
}

// Load header function
function loadHeader() {
    const headerContainer = document.getElementById('header');
    if (headerContainer) {
        headerContainer.innerHTML = createHeader();
    }
}

function getCurrentUser() {
    return {
        role: localStorage.getItem('userRole') || 'viewer'
    };
}

function applyRoleBasedVisibility(role) {
    const elements = document.querySelectorAll('[data-role]');
    elements.forEach(element => {
        const allowedRoles = element.dataset.role.split(',');
        if (allowedRoles.includes(role)) {
            element.style.display = ''; // Or element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

function updateUI() {
    const elements = document.querySelectorAll('[data-role]');
    elements.forEach(element => {
        const allowedRoles = element.dataset.role.split(',');
        if (allowedRoles.includes(currentUserRole)) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
}

// Enhanced filter and search functionality
function addVideoCheckboxes() {
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach((card, index) => {
        if (!card.querySelector('.video-checkbox')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'video-checkbox';
            checkbox.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10;';

            card.style.position = 'relative';
            card.appendChild(checkbox);
        }
    });
}

// Initialize enhanced dashboard features
document.addEventListener('DOMContentLoaded', function() {
    addVideoCheckboxes();

    // Add filter event listeners
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('sortFilter')?.addEventListener('change', applyFilters);
});

function showAlert(message, type) {
    alert(message);
}