
// Dashboard specific functions
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadUserData();
    loadVideos();
    setupEventListeners();
});

function initializeDashboard() {
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const userName = localStorage.getItem('userName') || 'User';
    
    // Update welcome message
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userName}!`;
    
    // Update role description
    const roleDescriptions = {
        'admin': 'You have full system access. Manage users, content, and system settings.',
        'editor': 'You can upload and manage video content. View analytics and user engagement.',
        'viewer': 'Discover and watch premium video content. Purchase access to exclusive videos.'
    };
    
    document.getElementById('roleDescription').textContent = roleDescriptions[userRole];
    
    // Hide analytics tab for viewers
    if (userRole === 'viewer') {
        document.getElementById('analyticsTab').style.display = 'none';
    }
    
    // Update stats based on role
    updateStatsForRole(userRole);
}

function updateStatsForRole(role) {
    const stats = {
        'admin': {
            totalVideos: '156',
            totalViews: '25,834',
            totalRevenue: '$12,450',
            activeUsers: '342'
        },
        'editor': {
            totalVideos: '23',
            totalViews: '5,678',
            totalRevenue: '$1,890',
            activeUsers: '89'
        },
        'viewer': {
            totalVideos: '8',
            totalViews: '234',
            totalRevenue: '$67.50',
            activeUsers: '1'
        }
    };
    
    const roleStats = stats[role] || stats['viewer'];
    
    // Update stat labels based on role
    if (role === 'viewer') {
        document.querySelector('.stat-card .stat-label').textContent = 'Purchased';
        document.querySelectorAll('.stat-card .stat-label')[1].textContent = 'Your Views';
        document.querySelectorAll('.stat-card .stat-label')[2].textContent = 'Spent';
        document.querySelectorAll('.stat-card .stat-label')[3].textContent = 'Profile Views';
    }
    
    document.getElementById('totalVideos').textContent = roleStats.totalVideos;
    document.getElementById('totalViews').textContent = roleStats.totalViews;
    document.getElementById('totalRevenue').textContent = roleStats.totalRevenue;
    document.getElementById('activeUsers').textContent = roleStats.activeUsers;
}

function loadUserData() {
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userRole = localStorage.getItem('userRole') || 'viewer';
    
    // Update profile tab
    document.getElementById('profileFullName').value = userName;
    document.getElementById('profileEmailAddr').value = userEmail;
    document.getElementById('profileRole').value = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    document.getElementById('profileAvatarLarge').textContent = userName.charAt(0).toUpperCase();
}

function loadVideos() {
    const userRole = localStorage.getItem('userRole') || 'viewer';
    const videoGrid = document.getElementById('videoGrid');
    
    // Sample video data based on role
    const videoData = getVideoDataForRole(userRole);
    
    videoGrid.innerHTML = videoData.map(video => createVideoCard(video, userRole)).join('');
}

function getVideoDataForRole(role) {
    const allVideos = [
        {
            id: 1,
            title: 'Advanced JavaScript Tutorial',
            uploader: 'Admin',
            duration: '10:45',
            price: 19.99,
            isFree: false,
            thumbnail: 'https://via.placeholder.com/320x180/667eea/ffffff?text=JavaScript',
            uploadDate: '2 days ago',
            views: 1234,
            description: 'Master advanced JavaScript concepts and techniques'
        },
        {
            id: 2,
            title: 'React Complete Course',
            uploader: 'John Editor',
            duration: '25:30',
            price: 29.99,
            isFree: false,
            thumbnail: 'https://via.placeholder.com/320x180/51cf66/ffffff?text=React',
            uploadDate: '1 week ago',
            views: 987,
            description: 'Complete React development course from basics to advanced'
        },
        {
            id: 3,
            title: 'CSS Grid Fundamentals',
            uploader: 'Admin',
            duration: '8:15',
            price: 0,
            isFree: true,
            thumbnail: 'https://via.placeholder.com/320x180/ffd93d/000000?text=CSS+Grid',
            uploadDate: '3 days ago',
            views: 756,
            description: 'Learn CSS Grid layout system fundamentals'
        },
        {
            id: 4,
            title: 'Node.js Backend Development',
            uploader: 'John Editor',
            duration: '45:20',
            price: 39.99,
            isFree: false,
            thumbnail: 'https://via.placeholder.com/320x180/ff6b6b/ffffff?text=Node.js',
            uploadDate: '5 days ago',
            views: 543,
            description: 'Build scalable backend applications with Node.js'
        }
    ];
    
    if (role === 'admin') {
        return allVideos; // Admin sees all videos
    } else if (role === 'editor') {
        return allVideos.filter(video => video.uploader === 'John Editor' || video.uploader === 'Admin');
    } else {
        return allVideos; // Viewers see all but need to purchase
    }
}

function createVideoCard(video, userRole) {
    const canEdit = userRole !== 'viewer' && (userRole === 'admin' || video.uploader === 'John Editor');
    const hasAccess = video.isFree || userRole !== 'viewer';
    
    return `
        <div class="video-card">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
                <div class="video-duration">${video.duration}</div>
                ${!video.isFree ? '<div class="video-premium">PREMIUM</div>' : ''}
            </div>
            <div class="video-card-content">
                <h4 class="video-title">${video.title}</h4>
                <div class="video-meta">
                    <span>By: ${video.uploader}</span> • 
                    <span>${video.uploadDate}</span> • 
                    <span>${video.views} views</span>
                </div>
                <p class="video-description">${video.description}</p>
                <div class="video-price">${video.isFree ? 'FREE' : '$' + video.price}</div>
                <div class="video-actions">
                    ${hasAccess ? 
                        `<button class="btn btn-success" onclick="watchVideo(${video.id})">Watch Now</button>` :
                        `<button class="btn" onclick="purchaseVideo(${video.id})">Buy Access</button>`
                    }
                    ${canEdit ? 
                        `<button class="btn btn-secondary" onclick="editVideo(${video.id})">Edit</button>` : 
                        `<button class="btn btn-secondary" onclick="shareVideo(${video.id})">Share</button>`
                    }
                    ${userRole === 'admin' ? 
                        `<button class="btn btn-warning" onclick="manageVideo(${video.id})">Manage</button>` : ''
                    }
                </div>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const videoCards = document.querySelectorAll('.video-card');
            
            videoCards.forEach(card => {
                const title = card.querySelector('.video-title');
                if (title && title.textContent.toLowerCase().includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Profile form submission
    const profileForm = document.getElementById('profileUpdateForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProfile();
        });
    }

    // Security form submission
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updatePassword();
        });
    }

    // Payment form submission
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment();
        });
    }
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

// Video functions
function watchVideo(videoId) {
    showAlert(`Opening video player for video ID: ${videoId}`, 'info');
    // Here you would typically open a video player modal or navigate to a video page
}

function editVideo(videoId) {
    showAlert(`Opening video editor for video ID: ${videoId}`, 'info');
    // Here you would typically open a video edit modal or navigate to an edit page
}

function shareVideo(videoId) {
    const shareUrl = `${window.location.origin}/watch?v=${videoId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showAlert('Share link copied to clipboard!', 'success');
    }).catch(() => {
        showAlert('Failed to copy share link', 'error');
    });
}

function manageVideo(videoId) {
    showAlert(`Opening video management for video ID: ${videoId}`, 'info');
    // Admin-specific video management functionality
}

function purchaseVideo(videoId) {
    // Set up payment modal with video info
    const video = getVideoDataForRole('viewer').find(v => v.id === videoId);
    if (video) {
        document.getElementById('paymentVideoInfo').innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
            </div>
            <div class="video-card-content">
                <h4>${video.title}</h4>
                <p>${video.description}</p>
                <div class="video-price">$${video.price}</div>
            </div>
        `;
        showModal('paymentModal');
    }
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

// Modal functions
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

console.log('Dashboard functions loaded successfully');
