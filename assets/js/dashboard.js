// Global variables
let currentUser = null;
let allVideos = [];
let allUsers = [];
let purchaseVideoId = null;

// Utility functions
function showLoading(show = true) {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
        if (show) {
            spinner.classList.remove("d-none");
            spinner.style.display = "block";
        } else {
            spinner.classList.add("d-none");
            spinner.style.display = "none";
        }
    } else {
        // If no spinner element found, create a simple loading indicator
        if (show) {
            if (!document.getElementById("tempLoadingIndicator")) {
                const loadingDiv = document.createElement("div");
                loadingDiv.id = "tempLoadingIndicator";
                loadingDiv.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
                loadingDiv.style.position = "fixed";
                loadingDiv.style.top = "50%";
                loadingDiv.style.left = "50%";
                loadingDiv.style.transform = "translate(-50%, -50%)";
                loadingDiv.style.zIndex = "9999";
                loadingDiv.style.backgroundColor = "rgba(255,255,255,0.9)";
                loadingDiv.style.padding = "20px";
                loadingDiv.style.borderRadius = "5px";
                document.body.appendChild(loadingDiv);
            }
        } else {
            const tempIndicator = document.getElementById("tempLoadingIndicator");
            if (tempIndicator) {
                tempIndicator.remove();
            }
        }
    }
}

function showNotification(message, type = "info") {
    const toast = document.getElementById("notificationToast");
    const toastMessage = document.getElementById("toastMessage");

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast bg-${type === "error" ? "danger" : type === "success" ? "success" : "info"} text-white`;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        // Fallback to alert if toast elements not found
        alert(message);
    }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
    // Prevent any unwanted navigation
    preventUnwantedNavigation();

    // Check if user is logged in
    checkAuth();
});

function preventUnwantedNavigation() {
    // Prevent browser back/forward from causing issues
    window.addEventListener("popstate", function (event) {
        event.preventDefault();
        // Keep user in dashboard
        if (currentUser) {
            setupDashboard();
        } else {
            window.location.href = "login.html";
        }
    });

    // Prevent any accidental form submissions that might cause navigation
    document.addEventListener("submit", function (event) {
        const form = event.target;
        if (form.id !== "uploadForm" && form.id !== "youtubeUpload") {
            // Only allow specific forms to submit normally
            event.preventDefault();
        }
    });
}

async function checkAuth() {
    try {
        // First check localStorage for user data
        const storedUser = localStorage.getItem("currentUser");

        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
            return;
        }

        // If no localStorage data, try API as fallback
        const response = await fetch("api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "get_user" }),
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            // Also store in localStorage for consistency
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
        } else {
            // Redirect to login if no user data
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        // Check localStorage one more time before redirecting
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            setupUserRole();
            setupDashboard();
            loadVideos();
            loadOverviewStats();
        } else {
            window.location.href = "login.html";
        }
    }
}

function setupUserRole() {
    // Update user info in navigation
    document.getElementById("userName").textContent = currentUser.name;
    document.getElementById("userRole").textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById("userAvatar").textContent = currentUser.name
        .charAt(0)
        .toUpperCase();

    // Update welcome section
    document.getElementById("welcomeName").textContent = currentUser.name;
    document.getElementById("welcomeRole").textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Hide all role-specific sidebar sections first
    const adminSidebar = document.getElementById("adminSidebar");
    const creatorSidebar = document.getElementById("creatorSidebar");
    const viewerSidebar = document.getElementById("viewerSidebar");

    if (adminSidebar) adminSidebar.style.display = "none";
    if (creatorSidebar) creatorSidebar.style.display = "none";
    if (viewerSidebar) viewerSidebar.style.display = "none";

    // Show role-specific sidebar sections based on user role
    if (currentUser.role === "admin") {
        // Admin sees both creator and admin tools, but NOT viewer tools
        if (creatorSidebar) creatorSidebar.style.display = "block";
        if (adminSidebar) adminSidebar.style.display = "block";
    } else if (currentUser.role === "editor" || currentUser.role === "creator") {
        // Editor/Creator sees only creator tools, NO viewer tools
        if (creatorSidebar) creatorSidebar.style.display = "block";
    } else if (currentUser.role === "viewer") {
        // Viewer can only see viewer section
        if (viewerSidebar) viewerSidebar.style.display = "block";
    }

    // Set body class for CSS role-based styling
    document.body.className = `bg-light role-${currentUser.role}`;
}

function setupDashboard() {
    // Check URL parameters for specific panel
    const urlParams = new URLSearchParams(window.location.search);
    let defaultPanel = urlParams.get('panel');

    // If no URL parameter, set default panel based on user role
    if (!defaultPanel) {
        if (currentUser.role === "viewer") {
            defaultPanel = "videos";
        } else if (currentUser.role === "editor" || currentUser.role === "creator") {
            defaultPanel = "myVideos";
        } else if (currentUser.role === "admin") {
            defaultPanel = "overview";
        } else {
            defaultPanel = "overview";
        }
    }

    showPanel(defaultPanel);

    // Setup upload form handler
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", handleVideoUpload);
    }

    // Clear URL parameters after loading to prevent issues with navigation
    window.history.replaceState({}, document.title, window.location.pathname);
}

function showPanel(panelName) {
    // Check if user has permission to access this panel
    if (!hasPermissionForPanel(panelName)) {
        showNotification(
            "You do not have permission to access this section",
            "error",
        );
        return;
    }

    // Hide all panels
    const panels = document.querySelectorAll(".panel");
    panels.forEach((panel) => {
        panel.style.display = "none";
    });

    // Show selected panel
    const selectedPanel = document.getElementById(panelName + "Panel");
    if (selectedPanel) {
        selectedPanel.style.display = "block";
    }

    // Update active nav item
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
    });

    // Find and activate the correct nav link by checking onclick attribute
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
        const onclickAttr = link.getAttribute("onclick");
        if (onclickAttr && onclickAttr.includes(`showPanel('${panelName}')`)) {
            link.classList.add("active");
        }
    });

    // Load panel-specific data
    switch (panelName) {
        case "overview":
            loadOverviewStats();
            break;
        case "videos":
            loadVideos();
            break;
        case "users":
            if (currentUser.role === "admin") {
                loadUsers();
            }
            break;
        case "myVideos":
            if (currentUser.role === "editor" || currentUser.role === "admin") {
                loadMyVideos();
            }
            break;
        case "upload":
            // Panel is shown, no additional loading needed
            break;
        case "purchases":
            loadPurchases();
            break;
        case "watchlist":
            loadWatchlist();
            break;
        case "earnings":
            if (currentUser.role === "editor" || currentUser.role === "admin") {
                loadEarnings();
            }
            break;
        case "paidUsers":
            if (currentUser.role === "editor" || currentUser.role === "admin") {
                loadPaidUsers();
            }
            break;
        case "analytics":
            if (currentUser.role === "admin") {
                loadAnalytics();
            }
            break;
        case "youtube":
            if (currentUser.role === "editor" || currentUser.role === "admin") {
                loadYouTubePanel();
            }
            break;
    }
}

function hasPermissionForPanel(panelName) {
    if (!currentUser) return false;

    const role = currentUser.role;

    // Define role-based permissions
    const permissions = {
        viewer: ["overview", "videos", "purchases", "watchlist"],
        editor: [
            "overview",
            "videos",
            "myVideos",
            "upload",
            "earnings",
            "paidUsers",
            "youtube",
        ],
        creator: [
            "overview",
            "videos",  
            "myVideos",
            "upload",
            "earnings",
            "paidUsers",
            "youtube",
        ],
        admin: [
            "overview",
            "videos",
            "purchases",
            "watchlist",
            "myVideos",
            "upload",
            "earnings",
            "paidUsers",
            "youtube",
            "users",
            "analytics",
        ],
    };

    return permissions[role] && permissions[role].includes(panelName);
}

async function loadVideos() {
    showLoading(true);

    try {
        const response = await fetch("api/videos.php");
        
        // Check if response is HTML (error page) instead of JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned an error page instead of JSON");
        }

        const data = await response.json();

        if (data.success) {
            allVideos = data.videos;
            renderVideos(allVideos);
        } else {
            showNotification("Failed to load videos: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to load videos:", error);
        showNotification("Failed to load videos", "error");
    }

    showLoading(false);
}

async function loadMyVideos() {
    showLoading(true);

    try {
        const response = await fetch("api/videos.php?filter=my_videos");
        
        // Check if response is HTML (error page) instead of JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned an error page instead of JSON");
        }

        const data = await response.json();

        if (data.success) {
            renderMyVideos(data.videos);
        } else {
            showNotification("Failed to load videos: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to load my videos:", error);
        showNotification("Failed to load videos", "error");
    }

    showLoading(false);
}

async function saveYouTubeTokens() {
    const accessToken = document.getElementById('accessTokenInput').value.trim();
    const refreshToken = document.getElementById('refreshTokenInput').value.trim();

    if (!accessToken) {
        showNotification('Please enter an access token', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('api/youtube_tokens.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'store_tokens',
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    expires_at: new Date(Date.now() + (3600 * 1000)).toISOString()
                }
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Tokens saved successfully!', 'success');
            document.getElementById('accessTokenInput').value = '';
            document.getElementById('refreshTokenInput').value = '';
            
            // Reinitialize YouTube API with new tokens
            await checkYouTubeStatus();
        } else {
            showNotification('Failed to save tokens: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving tokens:', error);
        showNotification('Failed to save tokens', 'error');
    } finally {
        showLoading(false);
    }
}

function renderVideos(videos) {
    const container = document.getElementById("videosContainer");

    if (!container) {
        console.error('Videos container not found');
        return;
    }

    if (videos.length === 0) {
        container.innerHTML =
            '<div class="col-12"><div class="alert alert-info">No videos available</div></div>';
        return;
    }

    // Use DocumentFragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    // Process videos in chunks to prevent blocking
    const chunkSize = 20;
    const renderChunks = (startIndex = 0) => {
        const endIndex = Math.min(startIndex + chunkSize, videos.length);

        for (let i = startIndex; i < endIndex; i++) {
            const video = videos[i];
            const videoElement = createVideoElement(video);
            fragment.appendChild(videoElement);
        }

        if (endIndex < videos.length) {
            // Process next chunk asynchronously
            requestAnimationFrame(() => renderChunks(endIndex));
        } else {
            // All chunks processed, update DOM once
            container.innerHTML = '';
            container.appendChild(fragment);
        }
    };

    renderChunks();
}

function createVideoElement(video) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const badgeHTML = video.price === 0
        ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>'
        : video.purchased
            ? '<span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>'
            : `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`;

    col.innerHTML = `
        <div class="card video-card h-100">
            <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                <i class="fas fa-play-circle fa-3x text-primary"></i>
                ${badgeHTML}
            </div>
            <div class="card-body">
                <h5 class="video-title">${escapeHtml(video.title)}</h5>
                <p class="video-description text-muted">${escapeHtml(video.description)}</p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">By ${escapeHtml(video.uploader)}</small>
                    <small class="text-muted">${video.views.toLocaleString()} views</small>
                </div>
                ${renderVideoActions(video)}
            </div>
        </div>
    `;

    return col;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMyVideos(videos) {
    const container = document.getElementById("myVideosContainer");

    if (videos.length === 0) {
        container.innerHTML =
            '<div class="col-12"><div class="alert alert-info">You haven\'t uploaded any videos yet</div></div>';
        return;
    }

    container.innerHTML = videos
        .map(
            (video) => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                    <i class="fas fa-play-circle fa-3x text-primary"></i>
                    ${
                        video.price === 0
                            ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>'
                            : `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`
                    }
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
    `,
        )
        .join("");
}

function renderVideoActions(video) {
    const canWatch =
        video.price === 0 || video.purchased || currentUser?.role === "admin";

    if (canWatch) {
        return `<button class="btn btn-success w-100" 
                        data-video-id="${video.id}" 
                        data-action="watch"
                        onclick="watchVideo(${video.id})">
                    <i class="fas fa-play me-2"></i>Watch Now
                </button>`;
    } else {
        return `<button class="btn btn-primary w-100" 
                        data-video-id="${video.id}" 
                        data-action="purchase"
                        data-price="${video.price}"
                        onclick="purchaseVideo(${video.id}, ${video.price})">
                    <i class="fas fa-shopping-cart me-2"></i>Purchase for $${video.price.toFixed(2)}
                </button>`;
    }
}

// Debounced filter function to prevent excessive API calls
const debouncedFilterVideos = debounce(async function(filter) {
    // Prevent duplicate requests
    if (this.currentFilter === filter && this.isFiltering) {
        return;
    }

    this.currentFilter = filter;
    this.isFiltering = true;

    showLoading(true);

    try {
        const response = await fetch(`api/videos.php?filter=${filter}`);
        const data = await response.json();

        if (data.success) {
            renderVideos(data.videos);
            // Update filter button states
            updateFilterButtonStates(filter);
        } else {
            showNotification(
                "Failed to filter videos: " + data.message,
                "error",
            );
        }
    } catch (error) {
        console.error("Failed to filter videos:", error);
        showNotification("Failed to filter videos", "error");
    } finally {
        showLoading(false);
        this.isFiltering = false;
    }
}, 300);

async function filterVideos(filter) {
    debouncedFilterVideos(filter);
}

function updateFilterButtonStates(activeFilter) {
    const filterButtons = document.querySelectorAll('.btn-group .btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes(`filterVideos('${activeFilter}')`)) {
            btn.classList.add('active');
        }
    });
}

async function loadOverviewStats() {
    if (currentUser.role === 'admin') {
        try {
            const response = await fetch('api/admin.php?action=analytics');
            const data = await response.json();

            if (data.success) {
                const analytics = data.analytics;

                // Animate counters for better UX
                animateCounter('totalVideos', analytics.total_videos);
                animateCounter('activeUsers', analytics.total_users);
                animateCounter('totalViews', analytics.total_views);

                // Handle revenue with currency formatting
                const revenueElement = document.getElementById('totalRevenue');
                if (revenueElement) {
                    revenueElement.textContent = `$${analytics.total_revenue.toFixed(2)}`;
                }

                // Load recent activity
                if (analytics.recent_activity) {
                    updateRecentActivity(analytics.recent_activity);
                }

                // Load popular videos
                if (analytics.popular_videos) {
                    updatePopularVideos(analytics.popular_videos);
                }
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            showNotification('Failed to load analytics data', 'error');
        }
    } else {
        // For non-admin users, show basic stats
        animateCounter('totalVideos', allVideos.length);

        const activeUsersElement = document.getElementById('activeUsers');
        const totalRevenueElement = document.getElementById('totalRevenue');

        if (activeUsersElement) activeUsersElement.textContent = '-';
        if (totalRevenueElement) totalRevenueElement.textContent = '-';

        const totalViews = allVideos.reduce((sum, video) => sum + video.views, 0);
        animateCounter('totalViews', totalViews);
    }
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Skip animation for very small values
    if (targetValue <= 10) {
        element.textContent = targetValue.toLocaleString();
        return;
    }

    const duration = 1500; // Animation duration in ms
    const startTime = performance.now();
    const startValue = 0;

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

        element.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            // Ensure final value is exact
            element.textContent = targetValue.toLocaleString();
        }
    }

    requestAnimationFrame(updateCounter);
}

function updateRecentActivity(activities) {
    const container = document.querySelector('.list-group.list-group-flush');
    if (!container || !activities) return;

    container.innerHTML = activities.map(activity => {
        const icon = activity.type === 'upload' ? 'fa-video text-primary' : 
                     activity.type === 'purchase' ? 'fa-shopping-cart text-success' : 
                     'fa-user text-info';

        return `
            <div class="list-group-item">
                <i class="fas ${icon} me-2"></i>
                ${activity.title} by ${activity.user}
                <small class="text-muted d-block">${formatTimeAgo(activity.time)}</small>
            </div>
        `;
    }).join('');
}

function updatePopularVideos(videos) {
    const container = document.querySelector('.card:last-child .list-group.list-group-flush');
    if (!container || !videos) return;

    container.innerHTML = videos.map(video => `
        <div class="list-group-item d-flex justify-content-between">
            <span>${video.title}</span>
            <span class="badge bg-primary">${video.views.toLocaleString()} views</span>
        </div>
    `).join('');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

const channelInfoDiv = document.getElementById("youtubeChannelInfo");
const uploadForm = document.getElementById("youtubeUploadForm");
const videosDiv = document.getElementById("youtubeVideos");
const statsDiv = document.getElementById("youtubeStats");

// Initialize YouTube status check on page load
document.addEventListener('DOMContentLoaded', function() {
    checkYouTubeStatus();
});

async function connectYouTube() {
    window.location.href = 'api/youtube_oauth.php';
}

function debugYouTubeConnection() {
    fetch('api/debug_youtube_connection.php', {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            console.log('YouTube Debug Info:', data);
            alert('Debug info logged to console. Check browser dev tools.');
        })
        .catch(error => {
            console.error('Debug error:', error);
            alert('Debug failed: ' + error.message);
        });
}

async function loadYouTubeData() {
    await Promise.all([loadYouTubeVideos(), loadYouTubeStatistics()]);
}

async function loadYouTubeVideos() {
    try {
        showLoading(true);
        
        // Use the new enhanced method to fetch and display videos
        await window.youtubeAPI.fetchAndDisplayVideos('youtubeVideosList', 12);
        
    } catch (error) {
        console.error("Failed to load YouTube videos:", error);
        showNotification('Failed to load YouTube videos: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function displayYouTubeVideos(videos) {
    const container = document.getElementById("youtubeVideosList");

    if (!container) {
        console.error('YouTube videos list container not found');
        return;
    }

    if (videos.length === 0) {
        container.innerHTML = '<p class="text-muted">No videos found on your YouTube channel.</p>';
        return;
    }

    // Use the new enhanced rendering method
    window.youtubeAPI.renderVideoGrid(videos.map(video => ({
        id: { videoId: video.youtube_id },
        snippet: {
            title: video.title,
            description: video.description,
            publishedAt: video.published_at,
            thumbnails: {
                high: { url: video.thumbnail },
                medium: { url: video.thumbnail },
                default: { url: video.thumbnail }
            }
        }
    })), container, 12);
}

async function loadYouTubeStatistics() {
    try {
        const channelInfo = await window.youtubeAPI.getMyChannelInfo();

        if (channelInfo) {
            document.getElementById("ytSubscribers").textContent = window.youtubeAPI.formatNumber(channelInfo.subscriber_count);
            document.getElementById("ytTotalViews").textContent = window.youtubeAPI.formatNumber(channelInfo.view_count);
            document.getElementById("ytVideoCount").textContent = channelInfo.video_count.toLocaleString();
        }
    } catch (error) {
        console.error("Failed to load YouTube statistics:", error);
        showNotification('Failed to load YouTube statistics: ' + error.message, 'error');
    }
}

async function syncYouTubeVideos() {
    showSpinner();

    try {
        const response = await fetch("api/youtube_sync.php?action=force_sync");
        const data = await response.json();

        if (data.success) {
            showToast(data.message, "success");
            await loadVideos(); // Refresh local videos list
            await loadYouTubeVideos(); // Refresh YouTube videos
        } else {
            showToast("Failed to sync videos: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to sync YouTube videos:", error);
        showToast("Failed to sync videos", "error");
    } finally {
        hideSpinner();
    }
}

// YouTube Upload Form Handler
document.addEventListener("DOMContentLoaded", function () {
    const youtubeUploadForm = document.getElementById("youtubeUpload");
    if (youtubeUploadForm) {
        youtubeUploadForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const formData = new FormData();
            formData.append("title", document.getElementById("ytTitle").value);
            formData.append(
                "description",
                document.getElementById("ytDescription").value,
            );
            formData.append("tags", document.getElementById("ytTags").value);
            formData.append(
                "privacy",
                document.getElementById("ytPrivacy").value,
            );
            formData.append(
                "video",
                document.getElementById("ytVideo").files[0],
            );

            showSpinner();

            try {
                const response = await fetch(
                    "api/youtube_api.php?action=upload",
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                const data = await response.json();

                if (data.success) {
                    showToast(
                        "Video uploaded to YouTube successfully!",
                        "success",
                    );
                    youtubeUploadForm.reset();
                    await loadYouTubeData();
                } else {
                    showToast("Upload failed: " + data.message, "error");
                }
            } catch (error) {
                console.error("Upload error:", error);
                showToast("Upload failed", "error");
            } finally {
                hideSpinner();
            }
        });
    }
});

async function loadUsers() {
    try {
        const response = await fetch("api/admin.php?action=users");
        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            renderUsers(allUsers);
        } else {
            showNotification("Failed to load users: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to load users:", error);
        showNotification("Failed to load users", "error");
    }
}

function renderUsers(users) {
    const container = document.getElementById("usersTableBody");

    container.innerHTML = users
        .map(
            (user) => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${user.role === "admin" ? "danger" : user.role === "editor" ? "warning" : "success"}">${user.role}</span></td>
            <td>${user.joined}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${user.id}')">
                    <i class="fas fa-editi"></i>
                </button>
                ${
                    user.role !== "admin"
                        ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>`
                        : ""
                }
            </td>
        </tr>
    `,
        )
        .join("");
}

async function loadPurchases() {
    showLoading(true);

    try {
        const response = await fetch("api/purchase.php");
        const data = await response.json();

        if (data.success) {
            renderPurchases(data.purchases);
        } else {
            showNotification(
                "Failed to load purchases: " + data.message,
                "error",
            );        

        }
    } catch (error) {
        console.error("Failed to load purchases:", error);
        showNotification("Failed to load purchases", "error");
    }

    showLoading(false);
}

function renderPurchases(purchases) {
    const container = document.getElementById("purchasesContainer");

    if (purchases.length === 0) {
        container.innerHTML =
            '<div class="col-12"><div class="alert alert-info">You haven\'t purchased any videos yet</div></div>';
        return;
    }

    container.innerHTML = purchases
        .map(
            (purchase) => `
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
    `,
        )
        .join("");
}

function loadWatchlist() {
    const container = document.getElementById("watchlistContainer");
    container.innerHTML =
        '<div class="col-12"><div class="alert alert-info">Watchlist feature coming soon...</div></div>';
}

async function loadEarnings() {
    showLoading(true);

    try {
        const response = await fetch("api/earnings.php?action=earnings");
        const data = await response.json();

        if (data.success) {
            const earnings = data.earnings;
            document.getElementById("totalEarnings").textContent = `$${earnings.total_earnings.toFixed(2)}`;
            document.getElementById("monthlyEarnings").textContent = `$${earnings.monthly_earnings.toFixed(2)}`;
            document.getElementById("pendingEarnings").textContent = `$${earnings.pending_earnings.toFixed(2)}`;

            // Load recent transactions
            await loadTransactions();
        } else {
            showNotification("Failed to load earnings: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to load earnings:", error);
        showNotification("Failed to load earnings", "error");
    }

    showLoading(false);
}

async function loadTransactions() {
    try {
        const response = await fetch("api/earnings.php?action=transactions");
        const data = await response.json();

        if (data.success) {
            renderTransactions(data.transactions);
        }
    } catch (error) {
        console.error("Failed to load transactions:", error);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById("transactionsTableBody");

    if (transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions yet</td></tr>';
        return;
    }

    container.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.video_title}</td>
            <td>${transaction.buyer_name}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
        </tr>
    `).join('');
}

async function loadPaidUsers() {
    showLoading(true);

    try {
        const response = await fetch("api/earnings.php?action=paid_users");
        const data = await response.json();

        if (data.success) {
            renderPaidUsers(data.paid_users);
        } else {
            showNotification("Failed to load paid users: " + data.message, "error");
        }
    } catch (error) {
        console.error("Failed to load paid users:", error);
        showNotification("Failed to load paid users", "error");
    }

    showLoading(false);
}

function renderPaidUsers(paidUsers) {
    const container = document.getElementById("paidUsersContainer");

    if (paidUsers.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">No paid users yet</div></div>';
        return;
    }

    container.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h5>Users Who Purchased Your Videos</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Purchases</th>
                                    <th>Total Spent</th>
                                    <th>Last Purchase</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${paidUsers.map(user => `
                                    <tr>
                                        <td>${user.name}</td>
                                        <td>${user.email}</td>
                                        <td>${user.purchases_count}</td>
                                        <td>$${user.total_spent.toFixed(2)}</td>
                                        <td>${new Date(user.last_purchase).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadAnalytics() {
    showNotification(
        "Analytics charts will be implemented with Chart.js",
        "info",
    );
}

async function handleVideoUpload(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Get form values
    const title = form.videoTitle.value.trim();
    const description = form.videoDescription.value.trim();
    const price = parseFloat(form.videoPrice.value) || 0;
    const category = form.videoCategory.value;
    const file = form.videoFile.files[0];

    // Validate
    if (!title || !description || !category) {
        showNotification('❌ Please fill in all required fields', 'error');
        return;
    }

    if (!file) {
        showNotification('❌ Please select a video file', 'error');
        return;
    }

    // Validate file size (limit to 100MB for demo)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showNotification('❌ File size must be less than 100MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('❌ Please select a valid video file (MP4, WebM, OGG, AVI, MOV)', 'error');
        return;
    }

    // Create comprehensive loading indicator
    const loadingOverlay = createUploadLoadingIndicator();
    form.appendChild(loadingOverlay);

    // Disable form inputs during upload
    const formInputs = form.querySelectorAll('input, textarea, select, button');
    formInputs.forEach(input => input.disabled = true);

    try {
        // Show initial preparation phase
        updateUploadProgress(loadingOverlay, 0, 'Preparing upload...');
        await simulateDelay(300);

        // File validation phase
        updateUploadProgress(loadingOverlay, 10, 'Validating file...');
        await simulateDelay(200);

        // Simulate file upload with realistic progress
        for (let progress = 20; progress <= 80; progress += 5) {
            const fileProgress = Math.round(((progress - 20) / 60) * 100);
            updateUploadProgress(loadingOverlay, progress, `Uploading file... ${fileProgress}%`);
            await simulateDelay(150);
        }

        // Processing phase
        updateUploadProgress(loadingOverlay, 85, 'Processing video metadata...');
        await simulateDelay(500);

        // Server communication
        updateUploadProgress(loadingOverlay, 90, 'Saving to database...');

        // Create video data object
        const videoData = {
            title: title,
            description: description,
            price: price,
            category: category,
            file_path: 'uploads/' + file.name,
            file_size: file.size,
            file_type: file.type
        };

        // Attempt upload with retry mechanism
        const response = await uploadWithRetry('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(videoData)
        }, 3);

        const data = await response.json();

        if (data.success) {
            updateUploadProgress(loadingOverlay, 100, 'Upload complete!');
            await simulateDelay(500);

            showNotification('🎉 Video uploaded successfully!', 'success');
            form.reset();
            loadingOverlay.remove();

            // Add the new video to the UI immediately
            if (data.video) {
                addVideoToUI(data.video);
            }

            // Switch to My Videos panel
            setTimeout(() => {
                showPanel('myVideos');
            }, 1000);
        } else {
            throw new Error(data.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        updateUploadProgress(loadingOverlay, 0, 'Upload failed!');
        showNotification('❌ Upload failed: ' + error.message, 'error');

        // Remove loading overlay after showing error
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.remove();
            }
        }, 2000);
    } finally {
        // Re-enable form inputs
        formInputs.forEach(input => input.disabled = false);
    }
}

function createUploadLoadingIndicator() {
    const overlay = document.createElement('div');
    overlay.className = 'upload-loading-overlay mt-4 p-4 border rounded bg-light';
    overlay.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-3">
            <h6 class="mb-0">
                <i class="fas fa-upload text-primary me-2"></i>
                Uploading Video
            </h6>
            <div class="upload-spinner">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
        <div class="progress mb-2" style="height: 8px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                 role="progressbar" style="width: 0%"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center">
            <small class="upload-status text-muted">Initializing...</small>
            <small class="upload-percentage text-primary fw-bold">0%</small>
        </div>
        <div class="upload-details mt-2">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Please keep this page open while uploading
            </small>
        </div>
    `;
    return overlay;
}

function updateUploadProgress(loadingOverlay, percentage, statusText) {
    const progressBar = loadingOverlay.querySelector('.progress-bar');
    const statusElement = loadingOverlay.querySelector('.upload-status');
    const percentageElement = loadingOverlay.querySelector('.upload-percentage');

    progressBar.style.width = percentage + '%';
    statusElement.textContent = statusText;
    percentageElement.textContent = percentage + '%';

    // Change color based on completion
    if (percentage === 100) {
        progressBar.classList.remove('bg-primary');
        progressBar.classList.add('bg-success');
        percentageElement.classList.remove('text-primary');
        percentageElement.classList.add('text-success');
    }
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadWithRetry(url, options, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Upload attempt ${attempt} failed:`, error.message);

            if (attempt < maxRetries) {
                await simulateDelay(delay * attempt); // Exponential backoff
            }
        }
    }

    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Debounce function to prevent rapid function calls
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

// Throttle function for performance-critical operations
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function addVideoToUI(video) {
    // Add video to allVideos array
    allVideos.unshift(video);

    // If currently viewing myVideos, add it to the display
    const myVideosContainer = document.getElementById('myVideosContainer');
    if (myVideosContainer && myVideosContainer.style.display !== 'none') {
        const videoHtml = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card video-card h-100">
                    <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="fas fa-play-circle fa-3x text-primary"></i>
                        <span class="position-absolute top-0 end-0 badge bg-info m-2">NEW</span>
                    </div>
                    <div class="card-body">
                        <h5 class="video-title">${video.title}</h5>
                        <p class="video-description text-muted">${video.description}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">By ${video.uploader}</small>
                            <small class="text-muted">$${video.price}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-secondary">${video.category}</span>
                            <small class="text-muted">${video.views} views</small>
                        </div>
                        <div class="btn-group w-100">
                            <button class="btn btn-primary" onclick="watchVideo(${video.id})">
                                <i class="fas fa-play me-2"></i>Preview
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteVideo(${video.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        myVideosContainer.insertAdjacentHTML('afterbegin', videoHtml);
    }
}

async function purchaseVideo(videoId, price) {
    purchaseVideoId = videoId;
    document.getElementById('purchasePrice').textContent = price.toFixed(2);

    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}

async function confirmPurchase() {
    if (!purchaseVideoId) return;

    // Show loading state
    const confirmBtn = document.querySelector('#purchaseModal .btn-primary');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch('api/purchase.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_id: purchaseVideoId
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('🎉 Video purchased successfully! You can now watch it.', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
            modal.hide();

            // Update the video card immediately
            updateVideoCardAfterPurchase(purchaseVideoId);

            // Reload current panel to reflect changes
            const activePanel = document.querySelector('.panel[style*="block"], .panel:not([style*="none"])');
            if (activePanel && activePanel.id === 'videosPanel') {
                loadVideos();
            } else if (activePanel && activePanel.id === 'purchasesPanel') {
                loadPurchases();
            }

            // Update overview stats if on admin dashboard
            if (currentUser.role === 'admin') {
                loadOverviewStats();
            }
        } else {
            showNotification('❌ Purchase failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Purchase failed:', error);
        showNotification('❌ Purchase failed. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function updateVideoCardAfterPurchase(videoId) {
    // More efficient: use data attributes instead of parsing onclick
    const purchaseButtons = document.querySelectorAll(`[data-video-id="${videoId}"][data-action="purchase"]`);

    purchaseButtons.forEach(button => {
        const card = button.closest('.video-card');
        if (!card) return;

        // Update button
        button.className = 'btn btn-success w-100';
        button.innerHTML = '<i class="fas fa-play me-2"></i>Watch Now';
        button.setAttribute('data-action', 'watch');
        button.onclick = () => watchVideo(videoId);

        // Update badge efficiently
        const thumbnail = card.querySelector('.video-thumbnail');
        const existingBadge = thumbnail?.querySelector('.badge');

        if (thumbnail && !existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'position-absolute top-0 end-0 badge bg-info m-2';
            badge.textContent = 'PURCHASED';
            thumbnail.appendChild(badge);
        } else if (existingBadge) {
            existingBadge.className = 'position-absolute top-0 end-0 badge bg-info m-2';
            existingBadge.textContent = 'PURCHASED';
        }
    });

    // Update the video in allVideos array to prevent re-render issues
    const videoIndex = allVideos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        allVideos[videoIndex].purchased = true;
    }
}

async function watchVideo(videoId) {
    const video = allVideos.find((v) => v.id === videoId);
    if (video) {
        document.getElementById("videoModalTitle").textContent = video.title;
        document.getElementById("videoPlayer").src =
            video.file_path ||
            "https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4";
        const modal = new bootstrap.Modal(
            document.getElementById("videoModal"),
        );
        modal.show();

        // Increment view count
        try {
            await fetch("api/videos.php", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `id=${videoId}&action=increment_views`,
            });
        } catch (error) {
            console.error("Failed to increment view count:", error);
        }
    }
}

async function logout() {
    try {
        // Clear localStorage first
        localStorage.removeItem("currentUser");

        // Try to logout from server session as well
        const response = await fetch("api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "logout" }),
        });

        const data = await response.json();

        // Always redirect regardless of API response since we cleared localStorage
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout failed:", error);
        // Still redirect since we cleared localStorage
        window.location.href = "login.html";
    }
}

// YouTube Video Player Function
function playYouTubeVideo(videoId, title) {
    const modal = document.getElementById('youtubeVideoModal');
    if (!modal) {
        createYouTubeVideoModal();
    }
    
    const modalTitle = document.getElementById('youtubeVideoModalTitle');
    const modalBody = document.getElementById('youtubeVideoModalBody');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        </div>
    `;
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Clean up iframe when modal is closed
    modal.addEventListener('hidden.bs.modal', function () {
        modalBody.innerHTML = '';
    });
}

function createYouTubeVideoModal() {
    const modalHTML = `
        <div class="modal fade" id="youtubeVideoModal" tabindex="-1" aria-labelledby="youtubeVideoModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="youtubeVideoModalTitle">YouTube Video</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="youtubeVideoModalBody">
                        <!-- Video iframe will be inserted here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.logout = logout;
window.showPanel = showPanel;
window.playYouTubeVideo = playYouTubeVideo;

async function checkYouTubeStatus() {
    try {
        // Ensure YouTube API is available
        if (!window.youtubeAPI) {
            console.error('YouTube API client not available');
            updateYouTubeStatus(false, null);
            return;
        }

        const initialized = await window.youtubeAPI.initialize();

        if (!initialized) {
            updateYouTubeStatus(false, null);
            return;
        }

        const isSignedIn = window.youtubeAPI.isSignedIn();
        let channelInfo = null;

        if (isSignedIn) {
            try {
                channelInfo = await window.youtubeAPI.getMyChannelInfo();
            } catch (channelError) {
                console.error('Error getting channel info:', channelError);
                // Continue with signed-in status but no channel info
            }
        }

        updateYouTubeStatus(isSignedIn, channelInfo);
    } catch (error) {
        console.error('YouTube status error:', error);
        updateYouTubeStatus(false, null);
    }
}

function showSpinner() {
    showLoading(true);
}

function hideSpinner() {
    showLoading(false);
}

function showToast(message, type) {
    showNotification(message, type);
}

async function loadYouTubePanel() {
    try {
        await checkYouTubeStatus();
        if (window.youtubeAPI.isSignedIn()) {
            await loadYouTubeData();
        }
    } catch (error) {
        console.error("Failed to load YouTube panel:", error);
        updateYouTubeStatus(false, null);
    }
}

async function connectYouTube() {
    try {
        showLoading(true);
        const success = await window.youtubeAPI.signIn();

        if (success) {
            showNotification('Successfully connected to YouTube!', 'success');
            const channelInfo = await window.youtubeAPI.getMyChannelInfo();
            updateYouTubeStatus(true, channelInfo);
            await loadYouTubeData();
        } else {
            showNotification('Failed to connect to YouTube', 'error');
        }
    } catch (error) {
        console.error('YouTube connection error:', error);
        showNotification('Failed to connect to YouTube: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function syncChannelById() {
    const channelIdInput = document.getElementById('channelIdInput');
    const channelId = channelIdInput ? channelIdInput.value.trim() : '';

    if (!channelId) {
        showNotification('Please enter a channel ID', 'error');
        return;
    }

    if (!window.youtubeAPI.isSignedIn()) {
        showNotification('Please connect to YouTube first', 'error');
        return;
    }

    showLoading(true);

    try {
        // First get channel info to validate
        const channelInfo = await window.youtubeAPI.getChannelInfo(channelId);
        if (!channelInfo) {
            showNotification('Channel not found', 'error');
            return;
        }

        showNotification(`Found channel: ${channelInfo.title}. Fetching videos...`, 'info');

        const result = await window.youtubeAPI.getVideosByChannelId(channelId, 50);

        if (result.videos.length === 0) {
            showNotification('No videos found for this channel ID', 'info');
            return;
        }

        // Get detailed video information
        const videoIds = result.videos.map(v => v.youtube_id).slice(0, 50);
        const detailedVideos = await window.youtubeAPI.getVideoDetails(videoIds);

        // Merge detailed info
        const enhancedVideos = result.videos.map(video => {
            const details = detailedVideos.find(d => d.youtube_id === video.youtube_id);
            return details ? { ...video, ...details } : video;
        });

        // Sync videos to local database
        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync_youtube_videos',
                videos: enhancedVideos
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Successfully synced ${data.synced_count} videos from ${channelInfo.title}`, 'success');
            loadVideos();
            channelIdInput.value = '';
        } else {
            showNotification('Failed to sync videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Channel sync error:', error);
        showNotification('Failed to sync channel: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function performChannelSearch() {
    const searchInput = document.getElementById('channelSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';

    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }

    if (!window.youtubeAPI.isSignedIn()) {
        showNotification('Please connect to YouTube first', 'error');
        return;
    }

    showLoading(true);

    try {
        const channels = await window.youtubeAPI.searchChannels(query, 10);
        displayChannelSearchResults(channels);
    } catch (error) {
        console.error('Channel search error:', error);
        showNotification('Failed to search channels: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function displayChannelSearchResults(channels) {
    const resultsContainer = document.getElementById('channelSearchResults');

    if (!resultsContainer) return;

    if (channels.length === 0) {
        resultsContainer.innerHTML = '<div class="alert alert-info">No channels found</div>';
        return;
    }

    resultsContainer.innerHTML = `
        <div class="mt-3">
            <h6>Search Results:</h6>
            ${channels.map(channel => `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="d-flex align-items-center">
                            <img src="${channel.thumbnail}" class="rounded-circle me-3" width="40" height="40">
                            <div class="flex-grow-1">
                                <h6 class="mb-0">${channel.title}</h6>
                                <small class="text-muted">${channel.description.substring(0, 100)}...</small>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="syncSpecificChannel('${channel.channel_id}')">
                                <i class="fas fa-sync me-1"></i>Sync
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function syncSpecificChannel(channelId) {
    document.getElementById('channelIdInput').value = channelId;
    await syncChannelById();
}

async function disconnectYouTube() {
    if (!confirm('Are you sure you want to disconnect your YouTube account?')) {
        return;
    }

    try {
        showLoading(true);
        await window.youtubeAPI.signOut();
        updateYouTubeStatus(false, null);
        showNotification('Successfully disconnected from YouTube', 'success');
    } catch (error) {
        console.error('Disconnect error:', error);
        showNotification('Failed to disconnect: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function syncSpecificVideo(videoId) {
    if (!window.youtubeAPI.isSignedIn()) {
        showNotification('Please connect to YouTube first', 'error');
        return;
    }

    try {
        showLoading(true);
        const videoDetails = await window.youtubeAPI.getVideoDetails([videoId]);

        if (videoDetails.length === 0) {
            showNotification('Video not found', 'error');
            return;
        }

        const video = videoDetails[0];

        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync_youtube_videos',
                videos: [video]
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Successfully imported "${video.title}" to platform`, 'success');
            loadVideos();
            loadMyVideos();
        } else {
            showNotification('Failed to import video: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Video import error:', error);
        showNotification('Failed to import video: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function updateYouTubeStatus(connected, channelInfo) {
    const statusDiv = document.getElementById("youtubeStatus");
    const controlsDiv = document.getElementById("youtubeControls");
    const channelInfoDiv = document.getElementById("youtubeChannelInfo");
    const uploadForm = document.getElementById("youtubeUploadForm");
    const videosDiv = document.getElementById("youtubeVideos");
    const statsDiv = document.getElementById("youtubeStats");

    if (!statusDiv || !controlsDiv) return;

    if (connected && channelInfo) {
        statusDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fab fa-youtube me-2"></i>
                Connected to YouTube channel: <strong>${channelInfo.title}</strong>
                <br><small class="text-muted">${window.youtubeAPI.formatNumber(channelInfo.subscriber_count)} subscribers • ${window.youtubeAPI.formatNumber(channelInfo.view_count)} total views</small>
            </div>
        `;

        controlsDiv.innerHTML = `
            <button class="btn btn-success me-2" onclick="syncMyChannel()">
                <i class="fas fa-sync me-1"></i>Sync My Channel
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="disconnectYouTube()">
                <i class="fas fa-unlink me-1"></i>Clear Tokens
            </button>
        `;

        if (channelInfoDiv) channelInfoDiv.style.display = "block";
        if (uploadForm) uploadForm.style.display = "none";
        if (videosDiv) videosDiv.style.display = "block";
        if (statsDiv) statsDiv.style.display = "block";

        if (channelInfoDiv) {
            channelInfoDiv.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <img src="${channelInfo.thumbnail}" class="rounded-circle me-3" width="64" height="64" alt="Channel">
                            <div>
                                <h5><i class="fab fa-youtube text-danger me-2"></i>${channelInfo.title}</h5>
                                <p class="text-muted mb-1">${channelInfo.description ? channelInfo.description.substring(0, 100) + '...' : 'No description'}</p>
                                <small class="text-muted">Channel ID: ${channelInfo.channel_id}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-search me-2"></i>Sync Other Channels</h6>
                    </div>
                    <div class="card-body">
                        <div class="input-group mb-3">
                            <input type="text" class="form-control" id="channelSearchInput" placeholder="Search for YouTube channels...">
                            <button class="btn btn-outline-secondary" type="button" onclick="performChannelSearch()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                        <div class="input-group mb-3">
                            <input type="text" class="form-control" id="channelIdInput" placeholder="Or enter Channel ID directly...">
                            <button class="btn btn-primary" type="button" onclick="syncChannelById()">
                                <i class="fas fa-sync me-1"></i>Sync Channel
                            </button>
                        </div>
                        <div id="channelSearchResults"></div>
                    </div>
                </div>
            `;
        }
    } else {
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                YouTube tokens not found in database
                <br><small>Add your YouTube access tokens to the database touse YouTube features</small>
            </div>
        `;

        controlsDiv.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h6><i class="fas fa-key me-2"></i>Add YouTube Access Token</h6>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="accessTokenInput" class="form-label">Access Token</label>
                        <input type="password" class="form-control" id="accessTokenInput" placeholder="Enter your YouTube access token">
                    </div>
                    <div class="mb-3">
                        <label for="refreshTokenInput" class="form-label">Refresh Token (Optional)</label>
                        <input type="password" class="form-control" id="refreshTokenInput" placeholder="Enter your YouTube refresh token">
                    </div>
                    <button class="btn btn-primary" onclick="saveYouTubeTokens()">
                        <i class="fas fa-save me-1"></i>Save Tokens
                    </button>
                </div>
            </div>
        `;

        if (channelInfoDiv) channelInfoDiv.style.display = "none";
        if (uploadForm) uploadForm.style.display = "none";
        if (videosDiv) videosDiv.style.display = "none";
        if (statsDiv) statsDiv.style.display = "none";
    }
}

async function syncMyChannel() {
    if (!confirm('Are you sure you want to sync your YouTube channel? This will fetch all your videos.')) {
        return;
    }

    if (!window.youtubeAPI.isSignedIn()) {
        showNotification('Please connect to YouTube first', 'error');
        return;
    }

    showLoading(true);

    try {
        let allVideos = [];
        let nextPageToken = '';
        let hasMore = true;

        // Fetch all videos with pagination
        while (hasMore) {
            const result = await window.youtubeAPI.getMyVideos(50, nextPageToken);
            allVideos = allVideos.concat(result.videos);
            nextPageToken = result.nextPageToken;
            hasMore = !!nextPageToken;

            showNotification(`Fetched ${allVideos.length} videos...`, 'info');
        }

        if (allVideos.length === 0) {
            showNotification('No videos found in your YouTube channel', 'info');
            return;
        }

        // Get detailed information for videos
        const videoIds = allVideos.map(v => v.youtube_id).slice(0, 50); // YouTube API limit
        const detailedVideos = await window.youtubeAPI.getVideoDetails(videoIds);

        // Merge detailed info with basic video data
        const enhancedVideos = allVideos.map(video => {
            const details = detailedVideos.find(d => d.youtube_id === video.youtube_id);
            return details ? { ...video, ...details } : video;
        });

        // Sync videos to local database
        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync_youtube_videos',
                videos: enhancedVideos
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Successfully synced ${data.synced_count} new videos from ${allVideos.length} total videos`, 'success');
            loadVideos();
            loadMyVideos();
            loadYouTubeVideos();
        } else {
            showNotification('Failed to sync videos: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('Failed to sync channel: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function syncYouTubeChannel() {
    try {
        showNotification('Initializing YouTube sync...', 'info');

        // Initialize YouTube API client
        const initialized = await youtubeAPI.initialize();
        if (!initialized) {
            showNotification('Failed to initialize YouTube API', 'error');
            return;
        }

        // Check if user is signed in, if not sign in
        if (!youtubeAPI.isSignedIn()) {
            showNotification('Signing in to YouTube...', 'info');
            const signedIn = await youtubeAPI.signIn();
            if (!signedIn) {
                showNotification('YouTube sign-in failed', 'error');
                return;
            }
        }

        showNotification('Fetching videos from YouTube...', 'info');

        // Fetch videos directly using the access token
        const videos = await fetchYouTubeVideos();

        if (videos.length === 0) {
            showNotification('No videos found on your YouTube channel', 'info');
            return;
        }

        // Save to database
        const response = await fetch('api/videos.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'sync_youtube_videos',
                videos: videos
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Successfully synced ${videos.length} videos from YouTube!`, 'success');
            loadVideos(); // Refresh the video list
        } else {
            showNotification('Failed to save videos to database: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('YouTube sync error:', error);
        showNotification('YouTube sync failed: ' + error.message, 'error');
    }
}

async function fetchYouTubeVideos() {
    try {
        // Ensure we have a valid access token
        if (!youtubeAPI.accessToken) {
            await youtubeAPI.loadStoredTokens();
        }

        if (!youtubeAPI.accessToken) {
            throw new Error('No access token available');
        }

        const response = await fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50", {
            headers: {
                Authorization: `Bearer ${youtubeAPI.accessToken}`
            }
        });

        if (response.status === 401) {
            // Token expired, try to refresh
            const refreshed = await youtubeAPI.loadStoredTokens();
            if (refreshed) {
                // Retry with new token
                const retryResponse = await fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50", {
                    headers: {
                        Authorization: `Bearer ${youtubeAPI.accessToken}`
                    }
                });
                const data = await retryResponse.json();
                return data.items || [];
            } else {
                throw new Error('Token refresh failed - please sign in again');
            }
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch videos');
        }

        // Transform the videos to match our database format
        return (data.items || []).map(item => ({
            youtube_id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            youtube_thumbnail: item.snippet.thumbnails.default.url,
            youtube_channel_id: item.snippet.channelId,
            youtube_channel_title: item.snippet.channelTitle,
            created_at: item.snippet.publishedAt
        }));

    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        throw error;
    }
}