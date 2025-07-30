
// Member Portal JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeMemberPortal();
    loadMemberData();
    setupEventListeners();
});

function initializeMemberPortal() {
    // Check user role and show/hide appropriate elements
    const userRole = getUserRole();
    adjustUIForRole(userRole);
    
    // Load header if exists
    loadHeader();
    
    // Initialize dashboard widgets if on dashboard page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/members/')) {
        initializeDashboard();
    }
}

function getUserRole() {
    // In real implementation, this would come from session/API
    return localStorage.getItem('userRole') || 'viewer';
}

function adjustUIForRole(role) {
    const editorOnlyElements = document.querySelectorAll('.editor-only');
    
    if (role === 'viewer') {
        editorOnlyElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // Update role badge
        const roleBadge = document.querySelector('.role-badge');
        if (roleBadge) {
            roleBadge.className = 'role-badge role-viewer';
            roleBadge.textContent = 'Viewer';
        }
    } else if (role === 'editor') {
        // Show all elements for editors
        const roleBadge = document.querySelector('.role-badge');
        if (roleBadge) {
            roleBadge.className = 'role-badge role-editor';
            roleBadge.textContent = 'Editor';
        }
    }
}

function loadMemberData() {
    // Load member profile data
    const memberName = document.getElementById('memberName');
    if (memberName) {
        // In real implementation, this would come from API
        memberName.textContent = localStorage.getItem('userName') || 'Member';
    }
    
    // Load stats data
    loadStatsData();
}

function loadStatsData() {
    // In real implementation, this would fetch from API
    const mockData = {
        videos: 12,
        views: 2400,
        earnings: 156.78,
        rating: 4.8
    };
    
    updateStatCards(mockData);
}

function updateStatCards(data) {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = data.videos;
        statNumbers[1].textContent = formatNumber(data.views);
        statNumbers[2].textContent = `$${data.earnings}`;
        statNumbers[3].textContent = data.rating;
    }
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Avatar upload
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    
    // Search functionality
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', handleSearch);
    });
    
    // Filter functionality
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', handleFilter);
    });
}

function initializeDashboard() {
    // Load recent videos
    loadRecentVideos();
    
    // Initialize performance chart
    initializePerformanceChart();
    
    // Load recent activity
    loadRecentActivity();
}

function loadRecentVideos() {
    // In real implementation, this would fetch from API
    const mockVideos = [
        {
            id: 1,
            title: 'Advanced JavaScript Tutorial',
            views: 456,
            publishedDate: '2 days ago',
            status: 'published'
        },
        {
            id: 2,
            title: 'React Hooks Explained',
            views: 789,
            publishedDate: '1 week ago',
            status: 'published'
        }
    ];
    
    displayRecentVideos(mockVideos);
}

function displayRecentVideos(videos) {
    const videoList = document.querySelector('.video-list');
    if (!videoList) return;
    
    videoList.innerHTML = videos.map(video => `
        <div class="video-item">
            <img src="https://via.placeholder.com/80x60" alt="thumbnail" class="video-thumbnail">
            <div class="video-details">
                <h4>${video.title}</h4>
                <p>Published ${video.publishedDate} • ${video.views} views</p>
            </div>
            <div class="video-status">
                <span class="status-badge status-${video.status}">${video.status.charAt(0).toUpperCase() + video.status.slice(1)}</span>
            </div>
        </div>
    `).join('');
}

function initializePerformanceChart() {
    // Placeholder for chart initialization
    // In real implementation, you would use a charting library like Chart.js
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        // Chart would be initialized here
    }
}

function loadRecentActivity() {
    // Load recent activity data
    // This would typically come from an API
}

// Profile Management Functions
function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = Object.fromEntries(formData);
    
    // In real implementation, this would send to API
    console.log('Profile data:', profileData);
    
    showNotification('Profile updated successfully!', 'success');
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatar = document.querySelector('.user-avatar.large');
            if (avatar) {
                avatar.style.backgroundImage = `url(${e.target.result})`;
                avatar.style.backgroundSize = 'cover';
                avatar.textContent = '';
            }
        };
        reader.readAsDataURL(file);
    }
}

function saveProfile() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.dispatchEvent(new Event('submit'));
    }
}

function resetProfile() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.reset();
        showNotification('Profile reset to original values', 'info');
    }
}

// Video Management Functions
function editVideo(videoId) {
    // Redirect to video edit page
    window.location.href = `../upload.html?edit=${videoId}`;
}

function viewAnalytics(videoId) {
    // Redirect to analytics page for specific video
    window.location.href = `analytics.html?video=${videoId}`;
}

function shareVideo(videoId) {
    // Open share modal or copy link
    const shareUrl = `${window.location.origin}/watch?v=${videoId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Video link copied to clipboard!', 'success');
    });
}

function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
        // In real implementation, this would call API
        showNotification('Video deleted successfully', 'success');
        // Remove from UI or reload page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// Purchase History Functions
function watchVideo(videoId) {
    // Redirect to video player
    window.location.href = `../watch.html?v=${videoId}`;
}

function downloadReceipt(purchaseId) {
    // Generate and download receipt
    // In real implementation, this would call API to generate receipt
    showNotification('Receipt download started', 'success');
}

function rateVideo(videoId) {
    // Open rating modal
    openRatingModal(videoId);
}

function openRatingModal(videoId) {
    // Create and show rating modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Rate this Video</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="rating-container">
                <div class="stars">
                    ${[1,2,3,4,5].map(star => `
                        <span class="star" data-rating="${star}">⭐</span>
                    `).join('')}
                </div>
                <textarea placeholder="Write a review (optional)..." rows="4"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn" onclick="submitRating(${videoId})">Submit Rating</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add star rating functionality
    const stars = modal.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            stars.forEach((s, index) => {
                s.style.opacity = index < rating ? '1' : '0.3';
            });
            modal.dataset.rating = rating;
        });
    });
}

function submitRating(videoId) {
    const modal = document.querySelector('.modal');
    const rating = modal.dataset.rating;
    const review = modal.querySelector('textarea').value;
    
    if (!rating) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    // In real implementation, this would send to API
    console.log('Rating submitted:', { videoId, rating, review });
    
    showNotification('Thank you for your rating!', 'success');
    modal.remove();
}

// Search and Filter Functions
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.video-card, .purchase-item');
    
    items.forEach(item => {
        const title = item.querySelector('h3, h4')?.textContent.toLowerCase() || '';
        const description = item.querySelector('p')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function handleFilter(e) {
    const filterValue = e.target.value;
    const filterType = e.target.id;
    
    // In real implementation, this would apply appropriate filters
    console.log('Filter applied:', { filterType, filterValue });
}

// Utility Functions
function refreshDashboard() {
    showNotification('Dashboard refreshed', 'info');
    loadMemberData();
    
    // Add refresh animation
    const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
    if (refreshBtn) {
        refreshBtn.style.animation = 'spin 0.5s ease-in-out';
        setTimeout(() => {
            refreshBtn.style.animation = '';
        }, 500);
    }
}

function bulkEdit() {
    showNotification('Bulk edit feature coming soon!', 'info');
}

function exportHistory() {
    showNotification('Export started. You will receive an email when ready.', 'success');
}

function downloadReceipts() {
    showNotification('Downloading all receipts...', 'info');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to DOM and animate in
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// CSS animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
