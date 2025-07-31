
// Static data for the video platform
let currentUser = {
    id: 'admin_001',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    created_at: '2024-01-01 10:00:00'
};

let allVideos = [
    {
        id: 1,
        title: 'Introduction to Web Development',
        description: 'Learn the basics of HTML, CSS, and JavaScript',
        price: 0,
        uploader: 'John Doe',
        views: 1250,
        purchased: false,
        file_path: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4',
        created_at: '2024-01-15 10:30:00',
        category: 'web-development'
    },
    {
        id: 2,
        title: 'Advanced React Concepts',
        description: 'Deep dive into React hooks, context, and performance optimization',
        price: 29.99,
        uploader: 'Jane Smith',
        views: 850,
        purchased: false,
        file_path: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_2mb.mp4',
        created_at: '2024-01-20 14:45:00',
        category: 'web-development'
    },
    {
        id: 3,
        title: 'PHP Backend Development',
        description: 'Building robust server-side applications with PHP',
        price: 39.99,
        uploader: 'Mike Johnson',
        views: 675,
        purchased: true,
        file_path: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_3mb.mp4',
        created_at: '2024-01-25 09:15:00',
        category: 'web-development'
    },
    {
        id: 4,
        title: 'Mobile App Development with Flutter',
        description: 'Complete guide to building cross-platform mobile applications',
        price: 49.99,
        uploader: 'Sarah Wilson',
        views: 920,
        purchased: false,
        file_path: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_4mb.mp4',
        created_at: '2024-01-28 16:20:00',
        category: 'mobile-development'
    },
    {
        id: 5,
        title: 'Data Science Fundamentals',
        description: 'Introduction to data analysis, visualization, and machine learning',
        price: 0,
        uploader: 'David Chen',
        views: 1580,
        purchased: false,
        file_path: 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_5mb.mp4',
        created_at: '2024-02-01 11:15:00',
        category: 'data-science'
    }
];

let allUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'editor', joined: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'viewer', joined: '2024-01-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'viewer', joined: '2024-01-25' },
    { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'editor', joined: '2024-01-28' },
    { id: 5, name: 'David Chen', email: 'david@example.com', role: 'editor', joined: '2024-02-01' }
];

let purchaseVideoId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (stored in localStorage)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    } else {
        // Redirect to login if no user data
        window.location.href = 'login.html';
        return;
    }
    
    setupUserRole();
    setupDashboard();
    loadVideos();
    loadOverviewStats();
});

function setupUserRole() {
    // Update user info in navigation
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Update welcome section
    document.getElementById('welcomeName').textContent = currentUser.name;
    document.getElementById('welcomeRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Show/hide role-specific sidebar sections
    if (currentUser.role === 'admin') {
        document.getElementById('adminSidebar').style.display = 'block';
        document.getElementById('creatorSidebar').style.display = 'block';
        document.getElementById('viewerSidebar').style.display = 'block';
    } else if (currentUser.role === 'editor') {
        document.getElementById('adminSidebar').style.display = 'none';
        document.getElementById('creatorSidebar').style.display = 'block';
        document.getElementById('viewerSidebar').style.display = 'block';
    } else {
        document.getElementById('adminSidebar').style.display = 'none';
        document.getElementById('creatorSidebar').style.display = 'none';
        document.getElementById('viewerSidebar').style.display = 'block';
    }

    // Set body class for CSS role-based styling
    document.body.className = `bg-light role-${currentUser.role}`;
}

function setupDashboard() {
    // Show overview panel by default
    showPanel('overview');
    
    // Setup upload form handler
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUpload);
    }
}

function showPanel(panelName) {
    // Hide all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        panel.style.display = 'none';
    });

    // Show selected panel
    const selectedPanel = document.getElementById(panelName + 'Panel');
    if (selectedPanel) {
        selectedPanel.style.display = 'block';
    }

    // Update active nav item
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and activate the clicked nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.onclick && link.onclick.toString().includes(panelName)) {
            link.classList.add('active');
        }
    });

    // Load panel-specific data
    switch (panelName) {
        case 'videos':
            loadVideos();
            break;
        case 'users':
            if (currentUser.role === 'admin') {
                loadUsers();
            }
            break;
        case 'myVideos':
            if (currentUser.role === 'editor' || currentUser.role === 'admin') {
                loadMyVideos();
            }
            break;
        case 'purchases':
            loadPurchases();
            break;
        case 'watchlist':
            loadWatchlist();
            break;
        case 'earnings':
            if (currentUser.role === 'editor' || currentUser.role === 'admin') {
                loadEarnings();
            }
            break;
        case 'paidUsers':
            if (currentUser.role === 'editor' || currentUser.role === 'admin') {
                loadPaidUsers();
            }
            break;
        case 'analytics':
            if (currentUser.role === 'admin') {
                loadAnalytics();
            }
            break;
    }
}

function loadVideos() {
    showLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
        renderVideos(allVideos);
        showLoading(false);
    }, 500);
}

function renderVideos(videos) {
    const container = document.getElementById('videosContainer');
    
    if (videos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">No videos available</div></div>';
        return;
    }

    container.innerHTML = videos.map(video => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                    <i class="fas fa-play-circle fa-3x text-primary"></i>
                    ${video.price === 0 ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>' : 
                      video.purchased ? '<span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>' : 
                      `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`}
                </div>
                <div class="card-body">
                    <h5 class="video-title">${video.title}</h5>
                    <p class="video-description text-muted">${video.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">By ${video.uploader}</small>
                        <small class="text-muted">${video.views} views</small>
                    </div>
                    ${renderVideoActions(video)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderVideoActions(video) {
    const canWatch = video.price === 0 || video.purchased || currentUser.role === 'admin';

    if (canWatch) {
        return `<button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                    <i class="fas fa-play me-2"></i>Watch Now
                </button>`;
    } else {
        return `<button class="btn btn-primary w-100" onclick="purchaseVideo(${video.id}, ${video.price})">
                    <i class="fas fa-shopping-cart me-2"></i>Purchase for $${video.price}
                </button>`;
    }
}

function filterVideos(filter) {
    let filteredVideos = allVideos;

    switch (filter) {
        case 'free':
            filteredVideos = allVideos.filter(video => video.price === 0);
            break;
        case 'paid':
            filteredVideos = allVideos.filter(video => video.price > 0);
            break;
        case 'purchased':
            filteredVideos = allVideos.filter(video => video.purchased);
            break;
    }

    renderVideos(filteredVideos);
}

function loadOverviewStats() {
    document.getElementById('totalVideos').textContent = allVideos.length;
    document.getElementById('activeUsers').textContent = allUsers.length;
    
    // Calculate total revenue from purchased videos
    const totalRevenue = allVideos
        .filter(video => video.purchased)
        .reduce((sum, video) => sum + video.price, 0);
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    
    // Calculate total views
    const totalViews = allVideos.reduce((sum, video) => sum + video.views, 0);
    document.getElementById('totalViews').textContent = totalViews.toLocaleString();
}

function loadUsers() {
    const container = document.getElementById('usersTableBody');
    
    container.innerHTML = allUsers.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'editor' ? 'warning' : 'success'}">${user.role}</span></td>
            <td>${user.joined}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadMyVideos() {
    const container = document.getElementById('myVideosContainer');
    
    // Filter videos uploaded by current user
    const myVideos = allVideos.filter(video => video.uploader === currentUser.name);
    
    if (myVideos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">You haven\'t uploaded any videos yet</div></div>';
        return;
    }

    container.innerHTML = myVideos.map(video => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                    <i class="fas fa-play-circle fa-3x text-primary"></i>
                    ${video.price === 0 ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>' : 
                      `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`}
                </div>
                <div class="card-body">
                    <h5 class="video-title">${video.title}</h5>
                    <p class="video-description text-muted">${video.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">${video.views} views</small>
                        <small class="text-muted">Uploaded ${new Date(video.created_at).toLocaleDateString()}</small>
                    </div>
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary" onclick="editVideo(${video.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="watchVideo(${video.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteVideo(${video.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function loadPurchases() {
    const container = document.getElementById('purchasesContainer');
    
    // Filter purchased videos
    const purchasedVideos = allVideos.filter(video => video.purchased);
    
    if (purchasedVideos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">You haven\'t purchased any videos yet</div></div>';
        return;
    }

    container.innerHTML = purchasedVideos.map(video => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                    <i class="fas fa-play-circle fa-3x text-primary"></i>
                    <span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>
                </div>
                <div class="card-body">
                    <h5 class="video-title">${video.title}</h5>
                    <p class="video-description text-muted">${video.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">By ${video.uploader}</small>
                        <small class="text-muted">${video.views} views</small>
                    </div>
                    <button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                        <i class="fas fa-play me-2"></i>Watch Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadWatchlist() {
    const container = document.getElementById('watchlistContainer');
    container.innerHTML = '<div class="col-12"><div class="alert alert-info">Watchlist feature coming soon...</div></div>';
}

function loadEarnings() {
    // Simulate earnings data
    document.getElementById('totalEarnings').textContent = '$1,250.00';
    document.getElementById('monthlyEarnings').textContent = '$350.00';
    document.getElementById('pendingEarnings').textContent = '$125.00';

    const transactionsContainer = document.getElementById('transactionsTableBody');
    const transactions = [
        { date: '2024-01-30', video: 'Advanced React Concepts', buyer: 'viewer@example.com', amount: '$29.99' },
        { date: '2024-01-29', video: 'PHP Backend Development', buyer: 'user@example.com', amount: '$39.99' },
        { date: '2024-01-28', video: 'Advanced React Concepts', buyer: 'test@example.com', amount: '$29.99' }
    ];

    transactionsContainer.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${transaction.date}</td>
            <td>${transaction.video}</td>
            <td>${transaction.buyer}</td>
            <td>${transaction.amount}</td>
        </tr>
    `).join('');
}

function loadPaidUsers() {
    const container = document.getElementById('paidUsersContainer');
    
    // Simulate paid users data for creator's videos
    const paidUsers = [
        { 
            user: 'viewer@example.com', 
            name: 'John Viewer',
            video: 'Advanced React Concepts', 
            purchaseDate: '2024-01-30',
            amount: '$29.99'
        },
        { 
            user: 'user@example.com', 
            name: 'Sarah User',
            video: 'PHP Backend Development', 
            purchaseDate: '2024-01-29',
            amount: '$39.99'
        },
        { 
            user: 'test@example.com', 
            name: 'Mike Test',
            video: 'Advanced React Concepts', 
            purchaseDate: '2024-01-28',
            amount: '$29.99'
        }
    ];

    if (paidUsers.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">No paid users yet</div></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5>Users Who Purchased Your Videos</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>User Name</th>
                                <th>Email</th>
                                <th>Video Purchased</th>
                                <th>Purchase Date</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paidUsers.map(user => `
                                <tr>
                                    <td>${user.name}</td>
                                    <td>${user.user}</td>
                                    <td>${user.video}</td>
                                    <td>${user.purchaseDate}</td>
                                    <td>${user.amount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function loadAnalytics() {
    showNotification('Analytics charts will be implemented with Chart.js', 'info');
}

function handleVideoUpload(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('videoTitle').value,
        description: document.getElementById('videoDescription').value,
        price: parseFloat(document.getElementById('videoPrice').value),
        category: document.getElementById('videoCategory').value,
        file: document.getElementById('videoFile').files[0]
    };

    // Validate form
    if (!formData.title || !formData.description || !formData.category || !formData.file) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Simulate upload
    showLoading(true);
    setTimeout(() => {
        // Add new video to allVideos array
        const newVideo = {
            id: allVideos.length + 1,
            title: formData.title,
            description: formData.description,
            price: formData.price,
            uploader: currentUser.name,
            views: 0,
            purchased: false,
            file_path: URL.createObjectURL(formData.file),
            created_at: new Date().toISOString(),
            category: formData.category
        };
        
        allVideos.unshift(newVideo);
        
        showNotification('Video uploaded successfully!', 'success');
        document.getElementById('uploadForm').reset();
        showLoading(false);
        
        // Refresh video lists
        loadVideos();
        loadOverviewStats();
    }, 2000);
}

function purchaseVideo(videoId, price) {
    purchaseVideoId = videoId;
    document.getElementById('purchasePrice').textContent = price.toFixed(2);
    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}

function confirmPurchase() {
    // Find and mark video as purchased
    const video = allVideos.find(v => v.id === purchaseVideoId);
    if (video) {
        video.purchased = true;
        showNotification('Purchase successful!', 'success');
        loadVideos(); // Refresh videos to show purchased status
        const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
        modal.hide();
    } else {
        showNotification('Purchase failed', 'error');
    }
}

function watchVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (video) {
        document.getElementById('videoModalTitle').textContent = video.title;
        document.getElementById('videoPlayer').src = video.file_path;
        const modal = new bootstrap.Modal(document.getElementById('videoModal'));
        modal.show();
        
        // Increment view count
        video.views += 1;
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} text-white`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Placeholder functions for admin actions
function editUser(userId) {
    showNotification('Edit user functionality coming soon', 'info');
}

function deleteUser(userId) {
    showNotification('Delete user functionality coming soon', 'info');
}

function editVideo(videoId) {
    showNotification('Edit video functionality coming soon', 'info');
}

function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        // Remove video from array
        const index = allVideos.findIndex(v => v.id === videoId);
        if (index > -1) {
            allVideos.splice(index, 1);
            showNotification('Video deleted successfully', 'success');
            loadMyVideos();
            loadVideos();
            loadOverviewStats();
        }
    }
}

function showAddUserModal() {
    showNotification('Add user modal coming soon', 'info');
}

// Demo user switching functionality
function switchUser(userEmail) {
    const users = {
        'admin@example.com': {
            id: 'admin_001',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            created_at: '2024-01-01 10:00:00'
        },
        'creator@example.com': {
            id: 'creator_001',
            name: 'Content Creator',
            email: 'creator@example.com',
            role: 'editor',
            created_at: '2024-01-02 11:00:00'
        },
        'viewer@example.com': {
            id: 'viewer_001',
            name: 'Video Viewer',
            email: 'viewer@example.com',
            role: 'viewer',
            created_at: '2024-01-03 12:00:00'
        }
    };
    
    if (users[userEmail]) {
        currentUser = users[userEmail];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        location.reload();
    }
}
