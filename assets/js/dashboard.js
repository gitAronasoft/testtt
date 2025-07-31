// Dashboard JavaScript
let currentUser = null;
let currentUserRole = 'viewer';

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Get user data from localStorage first
        const storedUser = localStorage.getItem('currentUser');
        const storedRole = localStorage.getItem('userRole');

        if (!storedUser || !storedRole) {
            console.log('No user data found, redirecting to login');
            window.location.replace('login.html');
            return;
        }

        currentUser = JSON.parse(storedUser);
        currentUserRole = storedRole;

        // Try to verify with server (optional - fallback to local data if fails)
        try {
            const response = await fetch('api.php?action=get_user');
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    currentUser = data.user;
                    currentUserRole = currentUser.role;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    localStorage.setItem('userRole', currentUserRole);
                    localStorage.setItem('userName', currentUser.name);
                    localStorage.setItem('userEmail', currentUser.email);
                }
            } else {
                console.log('Server authentication check failed with status:', response.status);
            }
        } catch (serverError) {
            console.log('Server authentication check failed, using local data:', serverError);
        }

    } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        localStorage.clear();
        window.location.replace('login.html');
        return;
    }

    updateRoleBasedUI();
    updateNavUserInfo();
    initializeRoleDashboards();
    setupEventListeners();
    console.log('Dashboard initialized for role:', currentUserRole);
}

function updateRoleBasedUI() {
    const userRole = currentUserRole;

    // Show/hide role-specific elements
    const adminElements = document.querySelectorAll('.admin-only');
    const editorElements = document.querySelectorAll('.editor-only');
    const viewerElements = document.querySelectorAll('.viewer-only');

    adminElements.forEach(el => {
        el.style.display = userRole === 'admin' ? 'block' : 'none';
    });

    editorElements.forEach(el => {
        el.style.display = userRole === 'editor' ? 'block' : 'none';
    });

    viewerElements.forEach(el => {
        el.style.display = userRole === 'viewer' ? 'block' : 'none';
    });

    // Show appropriate dashboard
    const dashboards = ['adminDashboard', 'editorDashboard', 'viewerDashboard'];
    dashboards.forEach(dashboardId => {
        const dashboard = document.getElementById(dashboardId);
        if (dashboard) {
            dashboard.style.display = 'none';
        }
    });

    const currentDashboard = document.getElementById(`${userRole}Dashboard`);
    if (currentDashboard) {
        currentDashboard.style.display = 'block';
    }
}

function updateNavUserInfo() {
    const userName = currentUser?.name || localStorage.getItem('userName') || 'User';
    const userRole = currentUserRole;

    // Update dashboard user info
    const dashboardUserName = document.getElementById('dashboardUserName');
    const roleIcon = document.getElementById('roleIcon');
    const roleDescription = document.getElementById('roleDescription');
    const welcomeGreeting = document.getElementById('welcomeGreeting');

    if (dashboardUserName) dashboardUserName.textContent = userName;

    if (roleIcon && roleDescription && welcomeGreeting) {
        const roleConfig = {
            admin: {
                icon: '🛡️',
                greeting: 'Welcome back, Admin',
                description: 'Manage platform content and view all videos without restrictions.'
            },
            editor: {
                icon: '✏️',
                greeting: 'Ready to create',
                description: 'Upload videos, manage your content, and track performance.'
            },
            viewer: {
                icon: '👁️',
                greeting: 'Welcome',
                description: 'Discover and purchase premium video content.'
            }
        };

        const config = roleConfig[userRole] || roleConfig.viewer;
        roleIcon.textContent = config.icon;
        welcomeGreeting.textContent = config.greeting;
        roleDescription.textContent = config.description;
    }
}

function initializeRoleDashboards() {
    const userRole = currentUserRole;

    if (userRole === 'admin') {
        initializeAdminDashboard();
    } else if (userRole === 'editor') {
        initializeEditorDashboard();
    } else if (userRole === 'viewer') {
        initializeViewerDashboard();
    }
}

function initializeAdminDashboard() {
    // Load admin statistics
    loadAdminStats();
}

function initializeEditorDashboard() {
    // Load editor content
    loadEditorVideos();
    loadEditorStats();
    setupEditorEventListeners();
}

function initializeViewerDashboard() {
    // Load viewer content
    loadViewerVideos();
    loadViewerStats();
    loadRecentPurchases();
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

function loadAdminStats() {
    const stats = {
        totalUsers: 156,
        totalVideos: 89,
        totalRevenue: '$12,450',
        activeUsers: 67
    };

    setTimeout(() => {
        const totalUsersEl = document.getElementById('totalUsers');
        const totalVideosEl = document.getElementById('totalVideos');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const activeUsersEl = document.getElementById('activeUsers');

        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers;
        if (totalVideosEl) totalVideosEl.textContent = stats.totalVideos;
        if (totalRevenueEl) totalRevenueEl.textContent = stats.totalRevenue;
        if (activeUsersEl) activeUsersEl.textContent = stats.activeUsers;
    }, 500);
}

function loadEditorVideos() {
    const uploadedVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
    const currentUser = localStorage.getItem('userName') || 'Editor';

    let myVideos = uploadedVideos.filter(video => video.uploadedBy === currentUser);

    if (myVideos.length === 0) {
        myVideos = getEditorDemoVideos();
        const allVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
        allVideos.push(...myVideos);
        localStorage.setItem('uploadedVideos', JSON.stringify(allVideos));
    }

    window.editorVideos = myVideos;
    window.filteredEditorVideos = [...myVideos];
    updateEditorStatistics();
    applyEditorFilters();
}

function getEditorDemoVideos() {
    const currentUser = localStorage.getItem('userName') || 'Editor';
    return [
        {
            id: 'EDITOR_1',
            title: 'JavaScript Fundamentals Course',
            description: 'Complete beginner guide to JavaScript programming',
            uploadedBy: currentUser,
            uploadedAt: new Date().toISOString(),
            status: 'published',
            views: 2540,
            likes: 189,
            duration: '45:30',
            thumbnail: '💻',
            tags: ['javascript', 'programming', 'tutorial'],
            price: 29.99,
            category: 'education',
            earnings: 149.95
        },
        {
            id: 'EDITOR_2',
            title: 'React.js Project Build',
            description: 'Build a complete React application from scratch',
            uploadedBy: currentUser,
            uploadedAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'published',
            views: 1892,
            likes: 167,
            duration: '1:12:15',
            thumbnail: '⚛️',
            tags: ['react', 'javascript', 'project'],
            price: 39.99,
            category: 'tutorial',
            earnings: 199.95
        },
        {
            id: 'EDITOR_3',
            title: 'Free CSS Grid Tutorial',
            description: 'Learn CSS Grid layout system with this free tutorial',
            uploadedBy: currentUser,
            uploadedAt: new Date(Date.now() - 172800000).toISOString(),
            status: 'published',
            views: 3421,
            likes: 298,
            duration: '28:45',
            thumbnail: '🎨',
            tags: ['css', 'grid', 'layout'],
            price: 0,
            category: 'education',
            earnings: 0
        }
    ];
}

function updateEditorStatistics() {
    const myVideos = window.editorVideos || [];
    const totalVideos = myVideos.length;
    const totalViews = myVideos.reduce((sum, video) => sum + (video.views || 0), 0);
    const totalEarnings = myVideos.reduce((sum, video) => sum + (video.earnings || 0), 0);
    const totalLikes = myVideos.reduce((sum, video) => sum + (video.likes || 0), 0);

    const totalVideosEl = document.getElementById('editorTotalVideos');
    const totalViewsEl = document.getElementById('editorTotalViews');
    const totalEarningsEl = document.getElementById('editorTotalEarnings');
    const totalLikesEl = document.getElementById('editorTotalLikes');

    if (totalVideosEl) totalVideosEl.textContent = totalVideos;
    if (totalViewsEl) totalViewsEl.textContent = formatNumber(totalViews);
    if (totalEarningsEl) totalEarningsEl.textContent = '$' + formatNumber(totalEarnings);
    if (totalLikesEl) totalLikesEl.textContent = formatNumber(totalLikes);
}

function setupEditorEventListeners() {
    const searchInput = document.getElementById('editorSearchVideos');
    const statusFilter = document.getElementById('editorStatusFilter');
    const sortFilter = document.getElementById('editorSortFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyEditorFilters, 300));
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyEditorFilters);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', applyEditorFilters);
    }
}

function applyEditorFilters() {
    const searchTerm = document.getElementById('editorSearchVideos')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('editorStatusFilter')?.value || '';
    const sortFilter = document.getElementById('editorSortFilter')?.value || '';

    const myVideos = window.editorVideos || [];

    let filteredVideos = myVideos.filter(video => {
        const matchesSearch = !searchTerm || 
            video.title.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilter || video.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Sort videos
    switch(sortFilter) {
        case 'newest':
            filteredVideos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            break;
        case 'oldest':
            filteredVideos.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
            break;
        case 'most_viewed':
            filteredVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'highest_earning':
            filteredVideos.sort((a, b) => (b.earnings || 0) - (a.earnings || 0));
            break;
        case 'title':
            filteredVideos.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    window.filteredEditorVideos = filteredVideos;
    renderEditorVideos();
}

function renderEditorVideos() {
    const container = document.getElementById('editorVideosContainer');
    const noVideos = document.getElementById('editorNoVideos');
    const filteredVideos = window.filteredEditorVideos || [];

    if (!container) return;

    if (filteredVideos.length === 0) {
        container.innerHTML = '';
        if (noVideos) noVideos.style.display = 'block';
        return;
    }

    if (noVideos) noVideos.style.display = 'none';

    container.innerHTML = filteredVideos.map(video => `
        <div class="col-xl-4 col-lg-6 col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100">
                <div class="position-relative">
                    <div class="video-thumbnail bg-gradient-primary d-flex align-items-center justify-content-center text-white rounded-top" style="height: 200px; font-size: 3rem;">
                        ${video.thumbnail || '🎥'}
                    </div>
                    <span class="position-absolute top-0 end-0 m-2 badge ${getEditorStatusBadgeClass(video.status)}">${video.status}</span>
                    <span class="position-absolute bottom-0 end-0 m-2 badge bg-dark">${video.duration}</span>
                    ${(video.price || 0) > 0 ? 
                        `<span class="position-absolute top-0 start-0 m-2 badge bg-success">$${video.price}</span>` : 
                        '<span class="position-absolute top-0 start-0 m-2 badge bg-info">FREE</span>'
                    }
                </div>
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title fw-bold mb-2">${video.title}</h6>
                    <p class="card-text text-muted small mb-3 flex-grow-1">${truncateText(video.description, 80)}</p>

                    <div class="row text-center mb-3 border-top pt-3">
                        <div class="col-4">
                            <small class="text-muted d-block">Views</small>
                            <strong class="text-primary">${formatNumber(video.views || 0)}</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Likes</small>
                            <strong class="text-success">${formatNumber(video.likes || 0)}</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">Earnings</small>
                            <strong class="text-warning">$${formatNumber(video.earnings || 0)}</strong>
                        </div>
                    </div>

                    <small class="text-muted d-block mb-3">
                        <i class="fas fa-calendar me-1"></i>${formatDate(video.uploadedAt)}
                    </small>

                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="editEditorVideo('${video.id}')" title="Edit Video">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteEditorVideo('${video.id}')" title="Delete Video">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getEditorStatusBadgeClass(status) {
    const classes = {
        'published': 'bg-success',
        'private': 'bg-warning',
        'unlisted': 'bg-info',
        'draft': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function editEditorVideo(videoId) {
    const myVideos = window.editorVideos || [];
    const video = myVideos.find(v => v.id === videoId);
    if (!video) return;

    // Check if we're on the standalone editor-videos page
    if (window.location.pathname.includes('editor-videos.html')) {
        // Use the existing editVideo function from editor-videos.html
        if (typeof editVideo === 'function') {
            editVideo(videoId);
        }
        return;
    }

    // For dashboard, create a simple edit modal or redirect
    if (confirm(`Edit "${video.title}"?\n\nThis will take you to the video management page.`)) {
        window.location.href = `editor-videos.html`;
    }
}

function deleteEditorVideo(videoId) {
    const myVideos = window.editorVideos || [];
    const video = myVideos.find(v => v.id === videoId);
    if (!video) return;

    if (confirm(`Are you sure you want to delete "${video.title}"?\n\nThis action cannot be undone.`)) {
        window.editorVideos = myVideos.filter(v => v.id !== videoId);
        window.filteredEditorVideos = window.filteredEditorVideos.filter(v => v.id !== videoId);

        const allVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
        const updatedVideos = allVideos.filter(v => v.id !== videoId);
        localStorage.setItem('uploadedVideos', JSON.stringify(updatedVideos));

        updateEditorStatistics();
        applyEditorFilters();
        showAlert('Video deleted successfully!', 'success');
    }
}



function loadViewerVideos() {
    const container = document.getElementById('videosContainer');
    if (!container) return;

    // Show loading
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2 text-muted">Loading videos...</p></div>';

    // Fetch videos from database
    fetch('/api.php?action=get_videos')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.allVideos = data.videos || [];
                window.filteredVideos = [...window.allVideos];
                renderViewerVideos();

                if (window.allVideos.length > 0) {
                    showNotification(`Loaded ${window.allVideos.length} videos`, 'success', 2000);
                }
            } else {
                throw new Error(data.message || 'Failed to load videos');
            }
        })
        .catch(error => {
            console.error('Error loading videos:', error);

            // Fallback to demo videos
            window.allVideos = getAllAvailableVideos();
            window.filteredVideos = [...window.allVideos];
            renderViewerVideos();
            showNotification('Using demo videos', 'warning', 2000);
        });
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

function renderViewerVideos(videos) {
    const videoGrid = document.getElementById('viewerVideoGrid');
    const noVideos = document.getElementById('noVideos');
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');

    if (videos.length === 0) {
        videoGrid.innerHTML = '';
        noVideos.style.display = 'block';
        return;
    }

    noVideos.style.display = 'none';
    videoGrid.innerHTML = videos.map(video => {
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

function setupViewerEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyViewerFilters, 300));
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyViewerFilters);
    }
    if (priceFilter) {
        priceFilter.addEventListener('change', applyViewerFilters);
    }

    setupPaymentFormFormatting();
}

function applyViewerFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const priceFilter = document.getElementById('priceFilter')?.value || '';

    const allVideos = getAllAvailableVideos();
    const filteredVideos = allVideos.filter(video => {
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

    renderViewerVideos(filteredVideos);
}

let currentVideoForPurchase = null;

function initiatePayment(videoId) {
    const allVideos = getAllAvailableVideos();
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;

    currentVideoForPurchase = video;

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
        showAlert('Please fill in all payment details', 'error');
        return;
    }

    if (cardNumber.replace(/\s/g, '').length < 16) {
        showAlert('Please enter a valid card number', 'error');
        return;
    }

    showAlert('Processing payment...', 'info');

    setTimeout(() => {
        const purchase = {
            videoId: currentVideoForPurchase.id,
            videoTitle: currentVideoForPurchase.title,
            price: currentVideoForPurchase.price,
            purchaseDate: new Date().toISOString(),
            transactionId: 'TXN_' + Date.now(),
            status: 'completed'
        };

        const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
        purchasedVideos.push(purchase);
        localStorage.setItem('purchasedVideos', JSON.stringify(purchasedVideos));

        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();

        document.getElementById('paymentForm').reset();
        currentVideoForPurchase = null;

        showAlert('Purchase successful! You can now watch this video.', 'success');
        loadViewerStats();
        loadRecentPurchases();
        renderViewerVideos(getAllAvailableVideos());

    }, 2000);
}

function watchVideo(videoId) {
    const allVideos = getAllAvailableVideos();
    const video = allVideos.find(v => v.id === videoId);
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
    const isPurchased = purchasedVideos.some(p => p.videoId === videoId);
    const isFree = video && video.price === 0;

    if (!isFree && !isPurchased) {
        showAlert('Please purchase this video first', 'warning');
        return;
    }

    showAlert(`Starting playback: ${video?.title || 'Video'}`, 'success');
}

function loadRecentPurchases() {
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');
    const recentPurchasesTable = document.getElementById('recentPurchasesTable');
    const noPurchases = document.getElementById('noPurchases');

    if (!recentPurchasesTable) return;

    const recent5 = purchasedVideos.slice(-5).reverse();

    if (recent5.length === 0) {
        recentPurchasesTable.innerHTML = '';
        noPurchases.style.display = 'block';
        return;
    }

    noPurchases.style.display = 'none';
    recentPurchasesTable.innerHTML = recent5.map(purchase => `
        <tr>
            <td>${purchase.videoTitle}</td>
            <td class="text-success fw-bold">$${purchase.price}</td>
            <td>${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="watchVideo('${purchase.videoId}')">
                    <i class="fas fa-play"></i> Watch
                </button>
            </td>
        </tr>
    `).join('');
}

function loadViewerStats() {
    const purchasedVideos = JSON.parse(localStorage.getItem('purchasedVideos') || '[]');

    const purchasedCount = document.getElementById('purchasedCount');
    const totalSpent = document.getElementById('totalSpent');
    const watchedVideos = document.getElementById('watchedVideos');
    const thisMonthSpent = document.getElementById('thisMonthSpent');

    if (purchasedCount) {
        purchasedCount.textContent = purchasedVideos.length;
    }

    if (totalSpent) {
        const total = purchasedVideos.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
        totalSpent.textContent = '$' + total.toFixed(2);
    }

    if (watchedVideos) {
        watchedVideos.textContent = purchasedVideos.length;
    }

    if (thisMonthSpent) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthPurchases = purchasedVideos.filter(purchase => {
            const purchaseDate = new Date(purchase.purchaseDate);
            return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
        });
        const monthTotal = thisMonthPurchases.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
        thisMonthSpent.textContent = '$' + monthTotal.toFixed(2);
    }
}

function setupEventListeners() {
    // Add any additional event listeners here
}

function purchaseVideo(title) {
    showAlert(`Redirecting to purchase ${title}...`, 'info');
    setTimeout(() => {
        window.location.href = 'viewer-videos.html';
    }, 1000);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
    `;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
        function showNotification(message, type = 'info', duration = 3000) {
    showAlert(message, type);
}

function refreshEditorVideos() {
    loadEditorVideos();
    showAlert('Videos refreshed!', 'success');
}

function clearEditorFilters() {
    const searchInput = document.getElementById('editorSearchVideos');
    const statusFilter = document.getElementById('editorStatusFilter');
    const sortFilter = document.getElementById('editorSortFilter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';

    applyEditorFilters();
}