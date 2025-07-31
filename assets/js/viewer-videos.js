
// Viewer Videos functionality
let allVideos = [];
let filteredVideos = [];
let currentVideoForPurchase = null;

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

    initializeViewerVideos();
});

function initializeViewerVideos() {
    updateNavUserInfo();
    loadVideos();
    setupEventListeners();
}

function updateNavUserInfo() {
    const userName = localStorage.getItem('userName') || 'User';
    const navUserName = document.getElementById('navUserName');
    const navUserAvatar = document.getElementById('navUserAvatar');

    if (navUserName) navUserName.textContent = userName;
    if (navUserAvatar) navUserAvatar.textContent = userName.charAt(0).toUpperCase();
}

function loadVideos() {
    const loading = document.getElementById('loading');
    const videosGrid = document.getElementById('videosGrid');
    const noVideos = document.getElementById('noVideos');

    loading.style.display = 'block';
    videosGrid.innerHTML = '';
    noVideos.style.display = 'none';

    // Simulate loading delay
    setTimeout(() => {
        allVideos = getAllAvailableVideos();
        filteredVideos = [...allVideos];
        renderVideos();
        loading.style.display = 'none';
    }, 1000);
}

function getAllAvailableVideos() {
    const uploadedVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
    const systemVideos = [
        {
            id: 'SYS_001',
            title: 'Advanced Web Development Course',
            description: 'Complete guide to modern web development with HTML, CSS, JavaScript, and React',
            price: 29.99,
            thumbnail: '💻',
            duration: '2:30:00',
            uploadedBy: 'Expert Instructor',
            uploadedAt: '2024-01-10T00:00:00Z',
            category: 'education',
            rating: 4.8,
            views: 15420
        },
        {
            id: 'SYS_002',
            title: 'JavaScript Mastery',
            description: 'Master JavaScript from basics to advanced concepts including ES6+',
            price: 24.99,
            thumbnail: '⚡',
            duration: '1:45:00',
            uploadedBy: 'Code Academy',
            uploadedAt: '2024-01-15T00:00:00Z',
            category: 'technology',
            rating: 4.6,
            views: 12380
        },
        {
            id: 'SYS_003',
            title: 'React Development Bootcamp',
            description: 'Build modern React applications with hooks, context, and best practices',
            price: 34.99,
            thumbnail: '⚛️',
            duration: '3:00:00',
            uploadedBy: 'React Expert',
            uploadedAt: '2024-01-20T00:00:00Z',
            category: 'technology',
            rating: 4.9,
            views: 18750
        },
        {
            id: 'SYS_004',
            title: 'Digital Marketing Fundamentals',
            description: 'Learn essential digital marketing strategies and techniques',
            price: 19.99,
            thumbnail: '📈',
            duration: '1:20:00',
            uploadedBy: 'Marketing Pro',
            uploadedAt: '2024-01-25T00:00:00Z',
            category: 'business',
            rating: 4.4,
            views: 9650
        },
        {
            id: 'SYS_005',
            title: 'Photography Basics',
            description: 'Master the fundamentals of photography and photo editing',
            price: 22.99,
            thumbnail: '📸',
            duration: '1:50:00',
            uploadedBy: 'Photo Master',
            uploadedAt: '2024-02-01T00:00:00Z',
            category: 'entertainment',
            rating: 4.7,
            views: 11200
        },
        {
            id: 'SYS_006',
            title: 'Free Introduction to Coding',
            description: 'Start your coding journey with this free introduction course',
            price: 0,
            thumbnail: '🆓',
            duration: '45:00',
            uploadedBy: 'Code Mentor',
            uploadedAt: '2024-02-05T00:00:00Z',
            category: 'education',
            rating: 4.3,
            views: 25600
        }
    ];

    return [...uploadedVideos.map(v => ({
        ...v,
        price: v.price || 19.99,
        category: v.category || 'education',
        rating: v.rating || 4.0,
        views: v.views || Math.floor(Math.random() * 10000)
    })), ...systemVideos];
}

function renderVideos() {
    const videosGrid = document.getElementById('videosGrid');
    const noVideos = document.getElementById('noVideos');
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');

    if (filteredVideos.length === 0) {
        videosGrid.innerHTML = '';
        noVideos.style.display = 'block';
        return;
    }

    noVideos.style.display = 'none';
    videosGrid.innerHTML = filteredVideos.map(video => {
        const isPurchased = purchasedVideos.some(p => p.videoId === video.id);
        const isFree = video.price === 0;

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card video-card h-100 border-0 shadow-sm">
                    <div class="video-thumbnail">
                        ${video.thumbnail || '🎥'}
                        <div class="video-duration">${video.duration || '10:00'}</div>
                        ${isFree ? 
                            '<div class="price-badge bg-success">FREE</div>' :
                            isPurchased ? 
                                '<div class="purchased-badge">✓ OWNED</div>' :
                                `<div class="price-badge">$${video.price}</div>`
                        }
                    </div>
                    <div class="card-body">
                        <h6 class="video-title">${video.title}</h6>
                        <p class="video-description">${truncateText(video.description || '', 80)}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">By ${video.uploadedBy}</small>
                            <div class="d-flex align-items-center">
                                <span class="text-warning me-1">★</span>
                                <small class="text-muted">${video.rating || '4.0'}</small>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted">${formatNumber(video.views || 0)} views</small>
                            <span class="badge bg-light text-dark">${video.category || 'General'}</span>
                        </div>
                        <div class="mt-auto">
                            ${isPurchased || isFree ? 
                                `<button class="btn btn-success w-100" onclick="watchVideo('${video.id}')">
                                    <i class="fas fa-play"></i> Watch Now
                                </button>` :
                                `<button class="btn btn-primary w-100" onclick="initiatePayment('${video.id}')">
                                    <i class="fas fa-shopping-cart"></i> Buy for $${video.price}
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    if (priceFilter) {
        priceFilter.addEventListener('change', applyFilters);
    }

    // Setup payment form formatting
    setupPaymentFormFormatting();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const priceFilter = document.getElementById('priceFilter')?.value || '';

    filteredVideos = allVideos.filter(video => {
        const matchesSearch = !searchTerm || 
            video.title.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm) ||
            video.uploadedBy.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || video.category === categoryFilter;
        
        let matchesPrice = true;
        if (priceFilter) {
            switch (priceFilter) {
                case 'free':
                    matchesPrice = video.price === 0;
                    break;
                case '0-10':
                    matchesPrice = video.price >= 0 && video.price <= 10;
                    break;
                case '10-25':
                    matchesPrice = video.price > 10 && video.price <= 25;
                    break;
                case '25+':
                    matchesPrice = video.price > 25;
                    break;
            }
        }

        return matchesSearch && matchesCategory && matchesPrice;
    });

    renderVideos();
}

function initiatePayment(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;

    currentVideoForPurchase = video;
    
    // Populate video details in modal
    const videoDetails = document.getElementById('videoDetails');
    videoDetails.innerHTML = `
        <div class="d-flex align-items-center mb-3">
            <div class="video-thumbnail-small me-3">${video.thumbnail}</div>
            <div>
                <h6 class="mb-1">${video.title}</h6>
                <small class="text-muted">By ${video.uploadedBy}</small>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <span>Price:</span>
            <strong class="text-success">$${video.price}</strong>
        </div>
        <div class="d-flex justify-content-between">
            <span>Duration:</span>
            <span>${video.duration}</span>
        </div>
    `;

    // Show payment modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

function setupPaymentFormFormatting() {
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');

    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            if (formattedValue.length > 19) formattedValue = formattedValue.substr(0, 19);
            e.target.value = formattedValue;
        });
    }

    if (expiryDate) {
        expiryDate.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
}

function processPayment() {
    if (!currentVideoForPurchase) return;

    const cardNumber = document.getElementById('cardNumber').value.trim();
    const expiryDate = document.getElementById('expiryDate').value.trim();
    const cvv = document.getElementById('cvv').value.trim();
    const cardholderName = document.getElementById('cardholderName').value.trim();

    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        showNotification('Please fill in all payment details', 'error');
        return;
    }

    if (cardNumber.replace(/\s/g, '').length < 16) {
        showNotification('Please enter a valid card number', 'error');
        return;
    }

    // Show processing
    showNotification('Processing payment...', 'info');

    // Simulate payment processing
    setTimeout(() => {
        const purchase = {
            videoId: currentVideoForPurchase.id,
            videoTitle: currentVideoForPurchase.title,
            price: currentVideoForPurchase.price,
            purchaseDate: new Date().toISOString(),
            transactionId: 'TXN_' + Date.now(),
            status: 'completed'
        };

        // Save purchase
        const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
        purchasedVideos.push(purchase);
        localStorage.setItem('purchasedVideos', JSON.stringify(purchasedVideos));

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();

        // Clear form
        document.getElementById('paymentForm').reset();
        currentVideoForPurchase = null;

        // Show success and refresh
        showNotification('Purchase successful! You can now watch this video.', 'success');
        renderVideos();

    }, 2000);
}

function watchVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
    const isPurchased = purchasedVideos.some(p => p.videoId === videoId);
    const isFree = video && video.price === 0;

    if (!isFree && !isPurchased) {
        showNotification('Please purchase this video first', 'warning');
        return;
    }

    showNotification(`Starting playback: ${video?.title || 'Video'}`, 'success');
    // Here you would implement actual video playback
    // For demo, we'll just show a success message
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

console.log('Viewer Videos system loaded');
