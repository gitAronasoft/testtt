
// Viewer History functionality
let purchasedVideos = [];
let allVideos = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check viewer access
    const userRole = localStorage.getItem('userRole') || 'viewer';
    if (userRole !== 'viewer') {
        showNotification('This page is for viewers only', 'warning');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    initializeViewerHistory();
});

function initializeViewerHistory() {
    updateNavUserInfo();
    loadPurchaseHistory();
    loadAllVideos();
    updateStatistics();
}

function updateNavUserInfo() {
    const userName = localStorage.getItem('userName') || 'User';
    const navUserName = document.getElementById('navUserName');
    const navUserAvatar = document.getElementById('navUserAvatar');

    if (navUserName) navUserName.textContent = userName;
    if (navUserAvatar) navUserAvatar.textContent = userName.charAt(0).toUpperCase();
}

function loadPurchaseHistory() {
    purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
    renderPurchasedVideos();
    renderTransactionHistory();
}

function loadAllVideos() {
    const uploadedVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
    const systemVideos = [
        {
            id: 'SYS_001',
            title: 'Advanced Web Development Course',
            description: 'Complete guide to modern web development',
            price: 29.99,
            thumbnail: '💻',
            duration: '2:30:00',
            uploadedBy: 'Expert Instructor',
            category: 'education',
            rating: 4.8
        },
        {
            id: 'SYS_002',
            title: 'JavaScript Mastery',
            description: 'Master JavaScript from basics to advanced',
            price: 24.99,
            thumbnail: '⚡',
            duration: '1:45:00',
            uploadedBy: 'Code Academy',
            category: 'technology',
            rating: 4.6
        },
        {
            id: 'SYS_003',
            title: 'React Development Bootcamp',
            description: 'Build modern React applications',
            price: 34.99,
            thumbnail: '⚛️',
            duration: '3:00:00',
            uploadedBy: 'React Expert',
            category: 'technology',
            rating: 4.9
        },
        {
            id: 'SYS_004',
            title: 'Digital Marketing Fundamentals',
            description: 'Learn essential digital marketing strategies',
            price: 19.99,
            thumbnail: '📈',
            duration: '1:20:00',
            uploadedBy: 'Marketing Pro',
            category: 'business',
            rating: 4.4
        },
        {
            id: 'SYS_005',
            title: 'Photography Basics',
            description: 'Master the fundamentals of photography',
            price: 22.99,
            thumbnail: '📸',
            duration: '1:50:00',
            uploadedBy: 'Photo Master',
            category: 'entertainment',
            rating: 4.7
        },
        {
            id: 'SYS_006',
            title: 'Free Introduction to Coding',
            description: 'Start your coding journey with this free course',
            price: 0,
            thumbnail: '🆓',
            duration: '45:00',
            uploadedBy: 'Code Mentor',
            category: 'education',
            rating: 4.3
        }
    ];

    allVideos = [...uploadedVideos, ...systemVideos];
}

function updateStatistics() {
    const totalVideos = purchasedVideos.length;
    const totalSpent = purchasedVideos.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
    
    // Calculate this month's spending
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthSpent = purchasedVideos
        .filter(purchase => {
            const purchaseDate = new Date(purchase.purchaseDate);
            return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
        })
        .reduce((sum, purchase) => sum + (purchase.price || 0), 0);

    // Calculate average rating of purchased videos
    const purchasedVideoIds = purchasedVideos.map(p => p.videoId);
    const purchasedVideoData = allVideos.filter(v => purchasedVideoIds.includes(v.id));
    const avgRating = purchasedVideoData.length > 0 
        ? (purchasedVideoData.reduce((sum, video) => sum + (video.rating || 0), 0) / purchasedVideoData.length).toFixed(1)
        : '0.0';

    document.getElementById('totalPurchasedVideos').textContent = totalVideos;
    document.getElementById('totalSpent').textContent = `$${totalSpent.toFixed(2)}`;
    document.getElementById('thisMonth').textContent = `$${thisMonthSpent.toFixed(2)}`;
    document.getElementById('avgRating').textContent = avgRating;
}

function renderPurchasedVideos() {
    const grid = document.getElementById('purchasedVideosGrid');
    const noVideos = document.getElementById('noPurchasedVideos');

    if (purchasedVideos.length === 0) {
        grid.innerHTML = '';
        noVideos.style.display = 'block';
        return;
    }

    noVideos.style.display = 'none';
    
    const videoCards = purchasedVideos.map(purchase => {
        const video = allVideos.find(v => v.id === purchase.videoId) || {
            title: `Video ${purchase.videoId}`,
            description: 'Video details not available',
            thumbnail: '🎥',
            duration: 'Unknown',
            uploadedBy: 'Unknown',
            category: 'General',
            rating: 0
        };

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card video-card h-100 border-0 shadow-sm">
                    <div class="video-thumbnail">
                        ${video.thumbnail || '🎥'}
                        <div class="video-duration">${video.duration || 'Unknown'}</div>
                        <div class="purchased-badge">✓ OWNED</div>
                    </div>
                    <div class="card-body">
                        <h6 class="video-title">${video.title}</h6>
                        <p class="video-description">${truncateText(video.description || '', 80)}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">By ${video.uploadedBy}</small>
                            <div class="d-flex align-items-center">
                                <span class="text-warning me-1">★</span>
                                <small class="text-muted">${video.rating || '0.0'}</small>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-success">Purchased ${formatDate(purchase.purchaseDate)}</small>
                            <span class="badge bg-light text-dark">${video.category || 'General'}</span>
                        </div>
                        <div class="mt-auto">
                            <button class="btn btn-success w-100" onclick="watchVideo('${purchase.videoId}', '${video.title}')">
                                <i class="fas fa-play"></i> Watch Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = videoCards;
}

function renderTransactionHistory() {
    const tbody = document.getElementById('transactionHistory');
    const noTransactions = document.getElementById('noTransactions');

    if (purchasedVideos.length === 0) {
        tbody.innerHTML = '';
        noTransactions.style.display = 'block';
        return;
    }

    noTransactions.style.display = 'none';

    const rows = purchasedVideos
        .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
        .map(purchase => {
            const video = allVideos.find(v => v.id === purchase.videoId);
            const videoTitle = video ? video.title : `Video ${purchase.videoId}`;

            return `
                <tr>
                    <td>${formatDate(purchase.purchaseDate)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="me-2">${video?.thumbnail || '🎥'}</span>
                            <div>
                                <div class="fw-medium">${truncateText(videoTitle, 30)}</div>
                                <small class="text-muted">By ${video?.uploadedBy || 'Unknown'}</small>
                            </div>
                        </div>
                    </td>
                    <td class="text-success fw-bold">$${(purchase.price || 0).toFixed(2)}</td>
                    <td>
                        <span class="badge ${getStatusBadgeClass(purchase.status || 'completed')}">
                            ${purchase.status || 'Completed'}
                        </span>
                    </td>
                    <td>
                        <code class="small">${purchase.transactionId}</code>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="watchVideo('${purchase.videoId}', '${videoTitle}')" title="Watch">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="downloadReceipt('${purchase.transactionId}')" title="Receipt">
                                <i class="fas fa-receipt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    tbody.innerHTML = rows;
}

function watchVideo(videoId, videoTitle) {
    showNotification(`Starting playback: ${videoTitle}`, 'success');
    
    // Show video player modal
    const modal = new bootstrap.Modal(document.getElementById('videoPlayerModal'));
    const modalTitle = document.querySelector('#videoPlayerModal .modal-title');
    modalTitle.textContent = videoTitle || 'Video Player';
    modal.show();
    
    // Here you would implement actual video playback
    // For demo purposes, we're just showing the modal
}

function downloadReceipt(transactionId) {
    const purchase = purchasedVideos.find(p => p.transactionId === transactionId);
    if (!purchase) return;

    const video = allVideos.find(v => v.id === purchase.videoId);
    const receiptData = {
        transactionId: purchase.transactionId,
        date: purchase.purchaseDate,
        videoTitle: video?.title || `Video ${purchase.videoId}`,
        amount: purchase.price || 0,
        status: purchase.status || 'completed',
        customer: localStorage.getItem('userName') || 'Customer'
    };

    const dataStr = JSON.stringify(receiptData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${transactionId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Receipt downloaded successfully', 'success');
}

function refreshPurchases() {
    showNotification('Refreshing purchase history...', 'info');
    setTimeout(() => {
        loadPurchaseHistory();
        updateStatistics();
        showNotification('Purchase history refreshed', 'success');
    }, 1000);
}

// Utility functions
function getStatusBadgeClass(status) {
    const classes = {
        'completed': 'bg-success',
        'pending': 'bg-warning text-dark',
        'failed': 'bg-danger',
        'refunded': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// Global notification function
function showNotification(message, type = 'info', duration = 3000) {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, duration);
}

console.log('Viewer History system loaded');
