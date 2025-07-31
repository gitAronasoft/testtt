let currentUser = null;
let allVideos = [];
let purchaseVideoId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

async function checkAuthentication() {
    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_user' })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            setupUserRole();
            loadVideos();
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'login.html';
    }
}

function setupUserRole() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.body.className = `role-${currentUser.role}`;
}

async function loadVideos() {
    showLoading(true);

    try {
        const response = await fetch('api/videos.php');
        const data = await response.json();

        if (data.success) {
            allVideos = data.videos;
            renderVideos();
        } else {
            showNotification('Failed to load videos', 'error');
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        showNotification('Error loading videos', 'error');
    } finally {
        showLoading(false);
    }
}

function renderVideos() {
    const container = document.getElementById('videosContainer');

    if (allVideos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">No videos available</div></div>';
        return;
    }

    container.innerHTML = allVideos.map(video => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(video.title)}</h5>
                    <p class="card-text text-muted">${escapeHtml(video.description || 'No description')}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>${escapeHtml(video.uploader)}
                            <i class="fas fa-eye ms-2 me-1"></i>${video.views} views
                        </small>
                    </p>
                    ${video.price > 0 ? `<p class="text-success fw-bold">$${video.price}</p>` : '<p class="text-success">Free</p>'}
                </div>
                <div class="card-footer bg-transparent">
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

function purchaseVideo(videoId, price) {
    if (currentUser.role !== 'viewer' && currentUser.role !== 'editor' && currentUser.role !== 'admin') {
        showNotification('Only viewers can purchase videos', 'error');
        return;
    }

    purchaseVideoId = videoId;
    document.getElementById('purchasePrice').textContent = price.toFixed(2);
    new bootstrap.Modal(document.getElementById('purchaseModal')).show();
}

async function confirmPurchase() {
    if (!purchaseVideoId) return;

    try {
        const response = await fetch('api/purchase.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: purchaseVideoId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Purchase successful!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('purchaseModal')).hide();
            loadVideos(); // Reload to update purchased status
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Purchase failed:', error);
        showNotification('Purchase failed', 'error');
    }

    purchaseVideoId = null;
}

function watchVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;

    // In a real application, you would load the actual video file
    document.getElementById('videoModalTitle').textContent = video.title;
    document.getElementById('videoPlayer').src = `#`; // Replace with actual video URL

    new bootstrap.Modal(document.getElementById('videoModal')).show();
}

// Upload functionality
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (currentUser.role !== 'editor' && currentUser.role !== 'admin') {
        showNotification('Only editors can upload videos', 'error');
        return;
    }

    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const price = parseFloat(document.getElementById('videoPrice').value);
    const fileInput = document.getElementById('videoFile');

    if (!fileInput.files[0]) {
        showNotification('Please select a video file', 'error');
        return;
    }

    // In a real application, you would upload the file to a server
    // For this demo, we'll just use a placeholder path
    const filePath = `uploads/${Date.now()}_${fileInput.files[0].name}`;

    try {
        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                description: description,
                price: price,
                file_path: filePath
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Video uploaded successfully!', 'success');
            document.getElementById('uploadForm').reset();
            loadVideos();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showNotification('Upload failed', 'error');
    }
});

function showSection(section) {
    // Hide all sections
    document.getElementById('videosSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';

    // Show selected section
    document.getElementById(section + 'Section').style.display = 'block';

    // Update active nav item
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    if (section === 'users' && currentUser.role === 'admin') {
        loadUsers();
    }
}

async function loadUsers() {
    // Placeholder for user management functionality
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="alert alert-info">User management functionality coming soon...</div>';
}

async function logout() {
    try {
        await fetch('api/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    window.location.href = 'login.html';
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
}

function showNotification(message, type) {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.className = `toast ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white`;

    new bootstrap.Toast(toast).show();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}