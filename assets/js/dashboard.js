// Global variables
let currentUser = null;
let allVideos = [];
let allUsers = [];
let purchaseVideoId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();


});

async function checkAuth() {
    try {
        // First check localStorage for user data
        const storedUser = localStorage.getItem('currentUser');

        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
            return;
        }

        // If no localStorage data, try API as fallback
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'get_user' })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            // Also store in localStorage for consistency
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
        } else {
            // Redirect to login if no user data
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // Check localStorage one more time before redirecting
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
        } else {
            window.location.href = 'login.html';
        }
    }
}

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

async function loadVideos() {
    showLoading(true);

    try {
        const response = await fetch('api/videos.php');
        const data = await response.json();

        if (data.success) {
            allVideos = data.videos;
            renderVideos(allVideos);
        } else {
            showNotification('Failed to load videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to load videos:', error);
        showNotification('Failed to load videos', 'error');
    }

    showLoading(false);
}

async function loadMyVideos() {
    showLoading(true);

    try {
        const response = await fetch('api/videos.php?filter=my_videos');
        const data = await response.json();

        if (data.success) {
            renderMyVideos(data.videos);
        } else {
            showNotification('Failed to load videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to load my videos:', error);
        showNotification('Failed to load videos', 'error');
    }

    showLoading(false);
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

function renderMyVideos(videos) {
    const container = document.getElementById('myVideosContainer');

    if (videos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">You haven\'t uploaded any videos yet</div></div>';
        return;
    }

    container.innerHTML = videos.map(video => `
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

async function filterVideos(filter) {
    showLoading(true);

    try {
        const response = await fetch(`api/videos.php?filter=${filter}`);
        const data = await response.json();

        if (data.success) {
            renderVideos(data.videos);
        } else {
            showNotification('Failed to filter videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to filter videos:', error);
        showNotification('Failed to filter videos', 'error');
    }

    showLoading(false);
}

async function loadOverviewStats() {
    if (currentUser.role === 'admin') {
        try {
            const response = await fetch('api/admin.php?action=analytics');
            const data = await response.json();

            if (data.success) {
                const analytics = data.analytics;
                document.getElementById('totalVideos').textContent = analytics.total_videos;
                document.getElementById('activeUsers').textContent = analytics.total_users;
                document.getElementById('totalRevenue').textContent = `$${analytics.total_revenue.toFixed(2)}`;
                document.getElementById('totalViews').textContent = analytics.total_views.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    } else {
        // For non-admin users, show basic stats
        document.getElementById('totalVideos').textContent = allVideos.length;
        document.getElementById('activeUsers').textContent = '-';
        document.getElementById('totalRevenue').textContent = '-';

        const totalViews = allVideos.reduce((sum, video) => sum + video.views, 0);
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
    }
}


    const channelInfoDiv = document.getElementById('youtubeChannelInfo');
    const uploadForm = document.getElementById('youtubeUploadForm');
    const videosDiv = document.getElementById('youtubeVideos');
    const statsDiv = document.getElementById('youtubeStats');

    if (connected && channelInfo) {
        statusDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fab fa-youtube me-2"></i>
                Connected to YouTube channel: <strong>${channelInfo.channel_title}</strong>
            </div>
        `;

        controlsDiv.innerHTML = `
            <button class="btn btn-outline-danger btn-sm" onclick="disconnectYouTube()">
                <i class="fas fa-unlink me-1"></i>Disconnect
            </button>
        `;

        channelInfoDiv.style.display = 'block';
        uploadForm.style.display = 'block';
        videosDiv.style.display = 'block';
        statsDiv.style.display = 'block';

        channelInfoDiv.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5><i class="fab fa-youtube text-danger me-2"></i>${channelInfo.channel_title}</h5>
                    <p class="text-muted">Channel ID: ${channelInfo.channel_id}</p>
                </div>
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                YouTube channel not connected<br>
                <small>Please add YouTube tokens to the database youtube_tokens table</small>
            </div>
        `;

        controlsDiv.innerHTML = `
            <button class="btn btn-info" onclick="performAutoSync()">
                <i class="fas fa-sync me-1"></i>Check Connection
            </button>
        `;

        channelInfoDiv.style.display = 'none';
        uploadForm.style.display = 'none';
        videosDiv.style.display = 'none';
        statsDiv.style.display = 'none';
    }
}

async function connectYouTube() {
    try {
        const response = await fetch('api/youtube_api.php?action=connect');
        const data = await response.json();

        if (data.success) {
            window.location.href = data.auth_url;
        } else {
            showToast('Failed to initiate YouTube connection', 'error');
        }
    } catch (error) {
        console.error('Failed to connect YouTube:', error);
        showToast('Failed to connect YouTube', 'error');
    }
}

async function loadYouTubeData() {
    await Promise.all([
        loadYouTubeVideos(),
        loadYouTubeStatistics()
    ]);
}

async function loadYouTubeVideos() {
    try {
        const response = await fetch('api/youtube_api.php?action=videos');
        const data = await response.json();

        if (data.success) {
            displayYouTubeVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load YouTube videos:', error);
    }
}

function displayYouTubeVideos(videos) {
    const container = document.getElementById('youtubeVideosList');

    if (videos.length === 0) {
        container.innerHTML = '<p class="text-muted">No videos found on your YouTube channel.</p>';
        return;
    }

    container.innerHTML = videos.map(video => `
        <div class="row mb-3 border-bottom pb-3">
            <div class="col-md-3">
                <img src="${video.thumbnail}" class="img-fluid rounded" alt="${video.title}">
            </div>
            <div class="col-md-9">
                <h6>${video.title}</h6>
                <p class="text-muted small">${video.description.substring(0, 150)}${video.description.length > 150 ? '...' : ''}</p>
                <small class="text-muted">Published: ${new Date(video.published_at).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');
}

async function loadYouTubeStatistics() {
    try {
        const response = await fetch('api/youtube_api.php?action=statistics');
        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;
            document.getElementById('ytSubscribers').textContent = parseInt(stats.subscriber_count).toLocaleString();
            document.getElementById('ytTotalViews').textContent = parseInt(stats.view_count).toLocaleString();
            document.getElementById('ytVideoCount').textContent = parseInt(stats.video_count).toLocaleString();
        }
    } catch (error) {
        console.error('Failed to load YouTube statistics:', error);
    }
}

async function syncYouTubeVideos() {
    showSpinner();

    try {
        const response = await fetch('api/youtube_sync.php?action=force_sync');
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            await loadVideos(); // Refresh local videos list
            await loadYouTubeVideos(); // Refresh YouTube videos
        } else {
            showToast('Failed to sync videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to sync YouTube videos:', error);
        showToast('Failed to sync videos', 'error');
    } finally {
        hideSpinner();
    }
}

// YouTube Upload Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const youtubeUploadForm = document.getElementById('youtubeUpload');
    if (youtubeUploadForm) {
        youtubeUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', document.getElementById('ytTitle').value);
            formData.append('description', document.getElementById('ytDescription').value);
            formData.append('tags', document.getElementById('ytTags').value);
            formData.append('privacy', document.getElementById('ytPrivacy').value);
            formData.append('video', document.getElementById('ytVideo').files[0]);

            showSpinner();

            try {
                const response = await fetch('api/youtube_api.php?action=upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Video uploaded to YouTube successfully!', 'success');
                    youtubeUploadForm.reset();
                    await loadYouTubeData();
                } else {
                    showToast('Upload failed: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showToast('Upload failed', 'error');
            } finally {
                hideSpinner();
            }
        });
    }
});

async function loadUsers() {
    try {
        const response = await fetch('api/admin.php?action=users');
        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        } else {
            showNotification('Failed to load users: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users', 'error');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersTableBody');

    container.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'editor' ? 'warning' : 'success'}">${user.role}</span></td>
            <td>${user.joined}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.role !== 'admin' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

async function loadPurchases() {
    showLoading(true);

    try {
        const response = await fetch('api/purchase.php');
        const data = await response.json();

        if (data.success) {
            renderPurchases(data.purchases);
        } else {
            showNotification('Failed to load purchases: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Failed to load purchases:', error);
        showNotification('Failed to load purchases', 'error');
    }

    showLoading(false);
}

function renderPurchases(purchases) {
    const container = document.getElementById('purchasesContainer');

    if (purchases.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">You haven\'t purchased any videos yet</div></div>';
        return;
    }

    container.innerHTML = purchases.map(purchase => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                    <i class="fas fa-play-circle fa-3x text-primary"></i>
                    <span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>
                </div>
                <div class="card-body">
                    <h5 class="video-title">${purchase.title}</h5>
                    <p class="video-description text-muted">${purchase.description}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">By ${purchase.uploader}</small>
                        <small class="text-muted">$${purchase.price}</small>
                    </div>
                    <button class="btn btn-success w-100" onclick="watchVideo(${purchase.video_id})">
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
    showNotification('Earnings feature coming soon', 'info');
}

function loadPaidUsers() {
    showNotification('Paid users feature coming soon', 'info');
}

function loadAnalytics() {
    showNotification('Analytics charts will be implemented with Chart.js', 'info');
}

async function handleVideoUpload(event) {
    event.preventDefault();

    const formData = {
        title: document.getElementById('videoTitle').value,
        description: document.getElementById('videoDescription').value,
        price: parseFloat(document.getElementById('videoPrice').value),
        category: document.getElementById('videoCategory').value,
        file_path: 'uploads/sample.mp4' // Placeholder for actual file upload
    };

    // Validate form
    if (!formData.title || !formData.description || !formData.category) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Video uploaded successfully!', 'success');
            document.getElementById('uploadForm').reset();
            loadVideos();
            loadOverviewStats();
        } else {
            showNotification('Upload failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showNotification('Upload failed', 'error');
    }

    showLoading(false);
}

function purchaseVideo(videoId, price) {
    purchaseVideoId = videoId;
    document.getElementById('purchasePrice').textContent = price.toFixed(2);
    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}

async function confirmPurchase() {
    try {
        const response = await fetch('api/purchase.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ video_id: purchaseVideoId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Purchase successful!', 'success');
            loadVideos(); // Refresh videos to show purchased status
        } else {
            showNotification('Purchase failed: ' + data.message, 'error');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
        modal.hide();
    } catch (error) {
        console.error('Purchase failed:', error);
        showNotification('Purchase failed', 'error');
    }
}

async function watchVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (video) {
        document.getElementById('videoModalTitle').textContent = video.title;
        document.getElementById('videoPlayer').src = video.file_path || 'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4';
        const modal = new bootstrap.Modal(document.getElementById('videoModal'));
        modal.show();

        // Increment view count
        try {
            await fetch('api/videos.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `id=${videoId}&action=increment_views`
            });
        } catch (error) {
            console.error('Failed to increment view count:', error);
        }
    }
}

function showPanel(panelName) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // Show selected panel
    const selectedPanel = document.getElementById(panelName + 'Panel');
    if (selectedPanel) {
        selectedPanel.style.display = 'block';

        // Load panel-specific data
        switch(panelName) {
            case 'overview':
                loadOverviewStats();
                break;
            case 'videos':
                loadVideos();
                break;
            case 'myVideos':
                loadMyVideos();
                break;
            case 'users':
                if (currentUser.role === 'admin') {
                    loadUsers();
                }
                break;
            case 'purchases':
                loadPurchases();
                break;
            case 'youtube':
                if (currentUser.role === 'editor' || currentUser.role === 'admin') {
                    loadYouTubePanel();
                }
                break;
        }
    }

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

async function logout() {
    try {
        // Clear localStorage first
        localStorage.removeItem('currentUser');

        // Try to logout from server session as well
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'logout' })
        });

        const data = await response.json();

        // Always redirect regardless of API response since we cleared localStorage
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        // Still redirect since we cleared localStorage
        window.location.href = 'login.html';
    }
}

// Make logout globally accessible
window.logout = logout;

async function checkAuth() {
    try {
        // Clear localStorage first
        localStorage.removeItem('currentUser');

        // Try to logout from server session as well
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'logout' })
        });

        const data = await response.json();

        // Always redirect regardless of API response since we cleared localStorage
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        // Still redirect since we cleared localStorage
        window.location.href = 'login.html';
    }
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

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch('api/admin.php?action=delete_user', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `user_id=${userId}`
            });

            const data = await response.json();

            if (data.success) {
                showNotification('User deleted successfully', 'success');
                loadUsers();
            } else {
                showNotification('Delete failed: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showNotification('Delete failed', 'error');
        }
    }
}

function editVideo(videoId) {
    showNotification('Edit video functionality coming soon', 'info');
}

async function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const response = await fetch('api/videos.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `id=${videoId}`
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Video deleted successfully', 'success');
                loadMyVideos();
                loadVideos();
                loadOverviewStats();
            } else {
                showNotification('Delete failed: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showNotification('Delete failed', 'error');
        }
    }
}

function showAddUserModal() {
    showNotification('Add user modal coming soon', 'info');
}