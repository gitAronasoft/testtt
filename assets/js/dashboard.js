// Global variables
let currentUser = null;
let allVideos = [];
let allUsers = [];
let purchaseVideoId = null;
let mobileNavOpen = false;

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
    // Update user info in navigation - check if elements exist
    const userNameElement = document.getElementById("userName");
    const userRoleElement = document.getElementById("userRole");
    const userAvatarElement = document.getElementById("userAvatar");
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.name;
    }
    if (userRoleElement) {
        userRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
    if (userAvatarElement) {
        userAvatarElement.textContent = currentUser.name.charAt(0).toUpperCase();
    }

    // Update welcome section if exists
    const welcomeNameElement = document.getElementById("welcomeName");
    const welcomeRoleElement = document.getElementById("welcomeRole");
    
    if (welcomeNameElement) {
        welcomeNameElement.textContent = currentUser.name;
    }
    if (welcomeRoleElement) {
        welcomeRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }

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
    // Close mobile navigation when panel changes
    closeMobileNav();
    
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
            if (currentUser.role === "editor" || currentUser.role === "creator" || currentUser.role === "admin") {
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
            if (currentUser.role === "editor" || currentUser.role === "creator" || currentUser.role === "admin") {
                loadEarnings();
            }
            break;
        case "paidUsers":
            if (currentUser.role === "editor" || currentUser.role === "creator" || currentUser.role === "admin") {
                loadPaidUsers();
            }
            break;
        case "analytics":
            if (currentUser.role === "admin") {
                loadAnalytics();
            }
            break;
        case "youtube":
            if (currentUser.role === "admin") {
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
        ],
        creator: [
            "overview",
            "videos",  
            "myVideos",
            "upload",
            "earnings",
            "paidUsers",
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
    // Prevent multiple simultaneous calls
    if (this.isLoadingVideos) {
        return;
    }
    this.isLoadingVideos = true;

    showLoading(true);

    try {
        // Load from database first for consistent display
        const response = await fetch("api/videos.php", {
            headers: {
                'Accept': 'application/json'
            }
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Invalid response format:", text);
            throw new Error("Server returned invalid response format");
        }

        const data = await response.json();

        if (data.success) {
            allVideos = data.videos || [];
            renderVideos(allVideos);

            if (allVideos.length === 0) {
                showNotification("No videos available. Upload some videos or connect to YouTube to sync your channel.", "info");
            }
        } else {
            throw new Error(data.message || "Failed to load videos from database");
        }

    } catch (error) {
        console.error("Failed to load videos:", error);
        showNotification("Failed to load videos: " + error.message, "error");
        renderVideos([]);
    } finally {
        showLoading(false);
        this.isLoadingVideos = false;
    }
}

const requestCache = new Map();

async function loadMyVideos() {
    const cacheKey = 'loadMyVideos';

    // Check if a request is already in progress
    if (requestCache.has(cacheKey)) {
        console.log('Returning cached loadMyVideos promise');
        return requestCache.get(cacheKey);
    }

    const promise = (async () => {
        showLoading(true);

        try {
            // Load directly from YouTube
            if (window.youtubeAPI) {
                const initialized = await window.youtubeAPI.initialize();
                if (initialized && window.youtubeAPI.isSignedIn()) {
                    try {
                        const result = await window.youtubeAPI.getMyVideos(50);
                        if (result.videos && result.videos.length > 0) {
                            const myVideos = result.videos.map(video => ({
                                id: video.youtube_id,
                                title: video.title,
                                description: video.description,
                                price: 0,
                                uploader: video.channel_title,
                                views: video.view_count || 0,
                                created_at: video.published_at,
                                youtube_id: video.youtube_id,
                                youtube_thumbnail: video.thumbnail,
                                is_youtube_synced: true,
                                video_url: `https://www.youtube.com/watch?v=${video.youtube_id}`
                            }));
                            renderMyVideos(myVideos);
                            showLoading(false);
                            return;
                        }
                    } catch (youtubeError) {
                        console.error("YouTube API error:", youtubeError);
                        showNotification("Failed to load from YouTube: " + youtubeError.message, "warning");
                    }
                }
            }

            // Show message if not connected to YouTube
            const container = document.getElementById("myVideosContainer");
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            <h5><i class="fab fa-youtube text-danger me-2"></i>Connect to YouTube</h5>
                            <p>To view your YouTube videos, please connect your YouTube account in the YouTube section.</p>
                            <a href="#" onclick="showPanel('youtube')" class="btn btn-primary">
                                <i class="fab fa-youtube me-2"></i>Go to YouTube Settings
                            </a>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Failed to load my videos:", error);
            showNotification("Failed to load videos", "error");
        }

        showLoading(false);
        requestCache.delete(cacheKey);
    })();

    requestCache.set(cacheKey, promise);
    return promise;
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
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info d-flex align-items-center">
                    <i class="fas fa-info-circle me-2"></i>
                    <div>
                        <strong>No videos available</strong>
                        <p class="mb-0 mt-1">Upload videos or connect your YouTube account to get started.</p>
                    </div>
                </div>  
            </div>
        `;
        return;
    }

    // Clear container first for better perceived performance
    container.innerHTML = '';

    // Show initial loading placeholder
    const loadingPlaceholder = document.createElement('div');
    loadingPlaceholder.className = 'col-12 text-center py-3';
    loadingPlaceholder.innerHTML = `
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Rendering ${videos.length} videos...
    `;
    container.appendChild(loadingPlaceholder);

    // Use requestIdleCallback for better performance
    const renderChunks = (startIndex = 0) => {
        const chunkSize = 12; // Optimal chunk size for smooth rendering
        const endIndex = Math.min(startIndex + chunkSize, videos.length);

        // Create fragment for this chunk
        const fragment = document.createDocumentFragment();

        for (let i = startIndex; i < endIndex; i++) {
            const video = videos[i];
            const videoElement = createVideoElement(video);
            fragment.appendChild(videoElement);
        }

        // Remove loading placeholder on first chunk
        if (startIndex === 0) {
            container.removeChild(loadingPlaceholder);
        }

        container.appendChild(fragment);

        // Continue with next chunk if there are more videos
        if (endIndex < videos.length) {
            // Use requestIdleCallback if available, otherwise requestAnimationFrame
            if (window.requestIdleCallback) {
                requestIdleCallback(() => renderChunks(endIndex), { timeout: 100 });
            } else {
                setTimeout(() => renderChunks(endIndex), 16); // ~60fps
            }
        }
    };

    // Start rendering
    if (window.requestIdleCallback) {
        requestIdleCallback(() => renderChunks(0), { timeout: 50 });
    } else {
        setTimeout(() => renderChunks(0), 10);
    }
}

function createVideoElement(video) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const badgeHTML = video.youtube_id
        ? '<span class="position-absolute top-0 end-0 badge bg-danger m-2"><i class="fab fa-youtube"></i></span>'
        : video.price === 0
            ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>'
            : video.purchased
                ? '<span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>'
                : `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`;

    const thumbnailHTML = video.youtube_thumbnail
        ? `<img src="${video.youtube_thumbnail}" class="card-img-top" style="width: 100%; height: 200px; object-fit: cover;" alt="${escapeHtml(video.title)}">`
        : '<i class="fas fa-play-circle fa-3x text-primary"></i>';

    col.innerHTML = `
        <div class="card video-card h-100">
            <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px; overflow: hidden;">
                ${thumbnailHTML}
                ${badgeHTML}
            </div>
            <div class="card-body">
                <h5 class="video-title">${escapeHtml(video.title)}</h5>
                <p class="video-description text-muted">${escapeHtml(video.description?.substring(0, 100) + (video.description?.length > 100 ? '...' : '') || 'No description')}</p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">By ${escapeHtml(video.uploader)}</small>
                    <small class="text-muted">${video.views.toLocaleString()} views</small>
                </div>
                ${video.youtube_likes ? `<div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-success"><i class="fas fa-thumbs-up"></i> ${window.youtubeAPI?.formatNumber(video.youtube_likes) || video.youtube_likes}</small>
                    <small class="text-muted">${new Date(video.created_at).toLocaleDateString()}</small>
                </div>` : ''}
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
    // Check if it's a YouTube video
    if (video.youtube_id) {
        return `<div class="btn-group w-100">
                    <button class="btn btn-danger" onclick="playYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')">
                        <i class="fab fa-youtube me-2"></i>Watch on YouTube
                    </button>
                    <a href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" class="btn btn-outline-danger">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>`;
    }

    // Regular platform videos
    const canWatch = video.price === 0 || video.purchased || currentUser?.role === "admin";

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

        if (!window.youtubeAPI.isSignedIn()) {
            // Try to load stored tokens first
            const initialized = await window.youtubeAPI.initialize();
            if (!initialized || !window.youtubeAPI.isSignedIn()) {
                const container = document.getElementById('youtubeVideosList');
                if (container) {
                    container.innerHTML = '<div class="alert alert-warning">Please connect to YouTube first to view your videos.</div>';
                }
                return;
            }
        }

        // Fetch videos directly from YouTube API
        const result = await window.youtubeAPI.getMyVideos(50);

        if (result.videos && result.videos.length > 0) {
            // Get detailed video information
            const videoIds = result.videos.map(v => v.youtube_id).slice(0, 50);
            const detailedVideos = await window.youtubeAPI.getVideoDetails(videoIds);

            // Merge detailed info with basic video data
            const enhancedVideos = result.videos.map(video => {
                const details = detailedVideos.find(d => d.youtube_id === video.youtube_id);
                return details ? { ...video, ...details } : video;
            });

            displayYouTubeVideos(enhancedVideos);
        } else {
            const container = document.getElementById('youtubeVideosList');
            if (container) {
                container.innerHTML = '<div class="alert alert-info">No videos found in your YouTube channel.</div>';
            }
        }

    } catch (error) {
        console.error("Failed to load YouTube videos:", error);
        showNotification('Failed to load YouTube videos: ' + error.message, 'error');

        const container = document.getElementById('youtubeVideosList');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Failed to load videos: ${error.message}</div>`;
        }
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
        container.innerHTML = '<div class="alert alert-info">No videos found on your YouTube channel.</div>';
        return;
    }

    let html = '<div class="row">';

    videos.forEach(video => {
        const thumbnail = video.thumbnail || 'https://via.placeholder.com/320x180?text=No+Thumbnail';
        const duration = video.duration ? window.youtubeAPI.formatDuration(video.duration) : '';

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card video-card h-100">
                    <div class="video-thumbnail position-relative" style="height: 200px; overflow: hidden;">
                        <img src="${thumbnail}" class="card-img-top" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(video.title)}">
                        <div class="position-absolute top-50 start-50 translate-middle">
                            <button class="btn btn-danger btn-lg rounded-circle" onclick="playYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')">
                                <i class="fab fa-youtube"></i>
                            </button>
                        </div>
                        ${duration ? `<span class="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 m-2 rounded">${duration}</span>` : ''}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title)}</h6>
                        <p class="card-text text-muted small">${escapeHtml(video.description ? video.description.substring(0, 100) + (video.description.length > 100 ? "..." : "") : 'No description')}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">${new Date(video.published_at).toLocaleDateString()}</small>
                            ${video.view_count ? `<small class="text-muted">${window.youtubeAPI.formatNumber(video.view_count)} views</small>` : ''}
                        </div>
                        <div class="d-flex justify-content-between">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="playYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')" title="Watch video">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="syncSpecificVideo('${video.youtube_id}')" title="Import to platform">
                                    <i class="fas fa-download"></i>
                                </button>
                                <a href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" class="btn btn-outline-danger" title="View on YouTube">
                                    <i class="fab fa-youtube"></i>
                                </a>
                            </div>
                            ${video.like_count ? `<small class="text-success"><i class="fas fa-thumbs-up"></i> ${window.youtubeAPI.formatNumber(video.like_count)}</small>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
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

    // Clear previous validation errors
    clearFormErrors(form);

    // Get form values
    const title = form.videoTitle.value.trim();
    const description = form.videoDescription.value.trim();
    const price = parseFloat(form.videoPrice.value) || 0;
    const category = form.videoCategory.value;
    const file = form.videoFile.files[0];

    // Enhanced validation with field-specific feedback
    let hasErrors = false;

    if (!title) {
        showFieldError(form.videoTitle, 'Title is required');
        hasErrors = true;
    } else if (title.length < 3) {
        showFieldError(form.videoTitle, 'Title must be at least 3 characters long');
        hasErrors = true;
    }

    if (!description) {
        showFieldError(form.videoDescription, 'Description is required');
        hasErrors = true;
    } else if (description.length < 10) {
        showFieldError(form.videoDescription, 'Description must be at least 10 characters long');
        hasErrors = true;
    }

    if (!category) {
        showFieldError(form.videoCategory, 'Please select a category');
        hasErrors = true;
    }

    if (price < 0) {
        showFieldError(form.videoPrice, 'Price cannot be negative');
        hasErrors = true;
    } else if (price > 999.99) {
        showFieldError(form.videoPrice, 'Price cannot exceed $999.99');
        hasErrors = true;
    }

    if (!file) {
        showFieldError(form.videoFile, 'Please select a video file');
        hasErrors = true;
    } else {
        // Enhanced file validation
        const validationResult = validateVideoFile(file);
        if (!validationResult.valid) {
            showFieldError(form.videoFile, validationResult.message);
            hasErrors = true;
        }
    }

    if (hasErrors) {
        showNotification('❌ Please fix the errors above', 'error');
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

// Form Validation Utilities
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback d-block';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${message}`;
    field.parentNode.appendChild(errorDiv);
    
    // Add animation
    errorDiv.style.animation = 'slideInUp 0.3s ease-out';
}

function clearFormErrors(form) {
    form.querySelectorAll('.form-control, .form-select').forEach(field => {
        field.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(error => {
        error.remove();
    });
}

function validateVideoFile(file) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
        'video/mp4', 'video/webm', 'video/ogg', 
        'video/avi', 'video/mov', 'video/wmv', 
        'video/flv', 'video/mkv'
    ];
    
    if (file.size > maxSize) {
        return {
            valid: false,
            message: 'File size must be less than 100MB'
        };
    }
    
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            message: 'Please select a valid video file (MP4, WebM, OGG, AVI, MOV, etc.)'
        };
    }
    
    return { valid: true };
}

// Enhanced notification system
function showSuccessMessage(title, message) {
    showNotification(`✅ ${title}: ${message}`, 'success');
}

function showErrorMessage(title, message) {
    showNotification(`❌ ${title}: ${message}`, 'error');
}

function showInfoMessage(title, message) {
    showNotification(`ℹ️ ${title}: ${message}`, 'info');
}

function showWarningMessage(title, message) {
    showNotification(`⚠️ ${title}: ${message}`, 'warning');
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

async function handleYouTubeUpload(event) {
    event.preventDefault();

    const form = event.target;
    const title = document.getElementById('ytUploadTitle').value.trim();
    const description = document.getElementById('ytUploadDescription').value.trim();
    const tags = document.getElementById('ytUploadTags').value.trim().split(',').map(tag => tag.trim()).filter(tag => tag);
    const privacy = document.getElementById('ytUploadPrivacy').value;
    const fileInput =
 document.getElementById('ytUploadFile');

    if (!fileInput.files[0]) {
        showNotification('Please select a video file', 'error');
        return;
    }

    if (!title) {
        showNotification('Please enter a video title', 'error');
        return;
    }

    const videoFile = fileInput.files[0];

    // Validate file size (limit to 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (videoFile.size > maxSize) {
        showNotification('File size must be less than 2GB', 'error');
        return;
    }

    showLoading(true);

    try {
        const metadata = {
            title: title,
            description: description,
            tags: tags,
            privacyStatus: privacy,
            categoryId: '22' // People & Blogs category
        };

        const result = await window.youtubeAPI.uploadVideo(videoFile, metadata);

        if (result.success) {
            showNotification(`Video "${title}" uploaded successfully to YouTube!`, 'success');
            form.reset();

            // Refresh videos list
            await loadYouTubeVideos();
            await loadSyncedVideos();
        } else {
            showNotification('Upload failed: ' + (result.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('YouTube upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Mobile Navigation Functions
function toggleMobileNav() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileNavOverlay');
    
    mobileNavOpen = !mobileNavOpen;
    
    if (mobileNavOpen) {
        sidebar.classList.add('show');
        if (!overlay) {
            createMobileNavOverlay();
        }
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('show');
        if (overlay) {
            overlay.remove();
        }
        document.body.style.overflow = '';
    }
}

function createMobileNavOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'mobileNavOverlay';
    overlay.className = 'position-fixed w-100 h-100';
    overlay.style.cssText = `
        top: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1040;
        backdrop-filter: blur(4px);
    `;
    overlay.onclick = toggleMobileNav;
    document.body.appendChild(overlay);
}

function closeMobileNav() {
    if (mobileNavOpen) {
        toggleMobileNav();
    }
}

// Enhanced Error Handling
function handleApiError(error, operation = 'operation') {
    console.error(`${operation} failed:`, error);
    
    let message = `${operation} failed`;
    
    if (error.message) {
        message += `: ${error.message}`;
    } else if (typeof error === 'string') {
        message += `: ${error}`;
    }
    
    showNotification(message, 'error');
}

// Improved Loading State Management
let loadingStates = new Set();

function setLoadingState(operation, isLoading) {
    if (isLoading) {
        loadingStates.add(operation);
    } else {
        loadingStates.delete(operation);
    }
    
    showLoading(loadingStates.size > 0);
}

// Video management functions for creators
async function editVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) {
        showNotification('Video not found', 'error');
        return;
    }

    // Create edit modal
    const editModalHTML = `
        <div class="modal fade" id="editVideoModal" tabindex="-1" aria-labelledby="editVideoModalTitle" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editVideoModalTitle">Edit Video</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editVideoForm">
                            <div class="mb-3">
                                <label for="editTitle" class="form-label">Title</label>
                                <input type="text" class="form-control" id="editTitle" value="${escapeHtml(video.title)}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="editDescription" rows="3" required>${escapeHtml(video.description)}</textarea>
                            </div>
                            <div class="mb-3">
                                <label for="editPrice" class="form-label">Price ($)</label>
                                <input type="number" class="form-control" id="editPrice" min="0" step="0.01" value="${video.price}" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveVideoEdit(${videoId})">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editVideoModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', editModalHTML);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editVideoModal'));
    modal.show();
}

async function saveVideoEdit(videoId) {
    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const price = parseFloat(document.getElementById('editPrice').value) || 0;

    if (!title || !description) {
        showNotification('Title and description are required', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('api/videos.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_video',
                id: videoId,
                title: title,
                description: description,
                price: price
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Video updated successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editVideoModal'));
            modal.hide();
            
            // Refresh videos
            loadMyVideos();
            loadVideos();
        } else {
            showNotification('Failed to update video: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Edit video error:', error);
        showNotification('Failed to update video', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) {
        showNotification('Video not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`)) {
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('api/videos.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete_video',
                id: videoId
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Video deleted successfully!', 'success');
            
            // Remove from allVideos array
            const index = allVideos.findIndex(v => v.id === videoId);
            if (index !== -1) {
                allVideos.splice(index, 1);
            }
            
            // Refresh videos
            loadMyVideos();
            loadVideos();
        } else {
            showNotification('Failed to delete video: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Delete video error:', error);
        showNotification('Failed to delete video', 'error');
    } finally {
        showLoading(false);
    }
}

// Make functions globally accessible
window.logout = logout;
window.showPanel = showPanel;
window.playYouTubeVideo = playYouTubeVideo;
window.handleYouTubeUpload = handleYouTubeUpload;
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;
window.editVideo = editVideo;
window.saveVideoEdit = saveVideoEdit;
window.deleteVideo = deleteVideo;
window.watchVideo = watchVideo;
window.purchaseVideo = purchaseVideo;
window.confirmPurchase = confirmPurchase;

async function checkYouTubeStatus() {
    // Prevent multiple simultaneous calls
    if (this.isCheckingYouTubeStatus) {
        return;
    }
    this.isCheckingYouTubeStatus = true;

    try {
        // Ensure YouTube API is available
        if (!window.youtubeAPI) {
            console.error('YouTube API client not available');
            updateYouTubeStatus(false, null);
            return;
        }

        const initialized = await window.youtubeAPI.initialize();

        if (!initialized) {
            console.log('YouTube API not initialized - no valid tokens found');
            updateYouTubeStatus(false, null);
            return;
        }

        const isSignedIn = window.youtubeAPI.isSignedIn();
        let channelInfo = null;

        if (isSignedIn) {
            try {
                console.log('Fetching YouTube channel info...');
                channelInfo = await window.youtubeAPI.getMyChannelInfo();
                console.log('Channel info received:', channelInfo);
            } catch (channelError) {
                console.error('Error getting channel info:', channelError);
                // Token might be invalid, show as disconnected
                updateYouTubeStatus(false, null);
                return;
            }
        }

        updateYouTubeStatus(isSignedIn, channelInfo);
    } catch (error) {
        console.error('YouTube status error:', error);
        updateYouTubeStatus(false, null);
    } finally {
        this.isCheckingYouTubeStatus = false;
    }
}

async function loadSyncedVideos() {
    // Only load if explicitly requested to avoid automatic calls
    if (!this.syncedVideosRequested) {
        return;
    }

    try {
        const response = await fetch('api/videos.php?action=get_synced_videos&limit=50');
        const data = await response.json();

        if (data.success && data.videos.length > 0) {
            console.log(`Loaded ${data.videos.length} synced videos from database`);
            displaySyncedVideos(data.videos);
        }
    } catch (error) {
        console.error('Failed to load synced videos:', error);
    } finally {
        this.syncedVideosRequested = false;
    }
}

function displaySyncedVideos(videos) {
    const container = document.getElementById('syncedVideosContainer');
    if (!container) return;

    if (videos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No synced videos found in database.</div>';
        return;
    }

    let html = '<div class="card mt-3"><div class="card-header"><h6><i class="fas fa-database me-2"></i>Synced Videos Database</h6></div><div class="card-body"><div class="row">';

    videos.forEach(video => {
        html += `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <img src="${video.thumbnail_url || 'https://via.placeholder.com/320x180'}" class="card-img-top" style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title.substring(0, 50))}</h6>
                        <p class="card-text small text-muted">${escapeHtml((video.description || '').substring(0, 100))}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-success">${video.view_count.toLocaleString()} views</small>
                            <small class="text-muted">${new Date(video.synced_at).toLocaleDateString()}</small>
                        </div>
                        <div class="mt-2">
                            <span class="badge bg-${video.privacy_status === 'public' ? 'success' : 'warning'}">${video.privacy_status}</span>
                            <span class="badge bg-info ms-1">${video.upload_status}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div></div></div>';
    container.innerHTML = html;
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
        // Don't auto-load videos here to prevent redundant calls
        // Videos will be loaded only when user explicitly requests them
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
                Connected to YouTube channel: <strong>${escapeHtml(channelInfo.title)}</strong>
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
                        <h6><i class="fas fa-upload me-2"></i>Upload Video to YouTube</h6>
                    </div>
                    <div class="card-body">
                        <form id="youtubeUploadForm" onsubmit="handleYouTubeUpload(event)">
                            <div class="mb-3">
                                <label for="ytUploadTitle" class="form-label">Video Title</label>
                                <input type="text" class="form-control" id="ytUploadTitle" required>
                            </div>
                            <div class="mb-3">
                                <label for="ytUploadDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="ytUploadDescription" rows="3"></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="ytUploadTags" class="form-label">Tags (comma separated)</label>
                                <input type="text" class="form-control" id="ytUploadTags" placeholder="gaming, tutorial, review">
                            </div>
                            <div class="mb-3">
                                <label for="ytUploadPrivacy" class="form-label">Privacy</label>
                                <select class="form-control" id="ytUploadPrivacy">
                                    <option value="private">Private</option>
                                    <option value="unlisted">Unlisted</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="ytUploadFile" class="form-label">Video File</label>
                                <input type="file" class="form-control" id="ytUploadFile" accept="video/*" required>
                            </div>
                            <button type="submit" class="btn btn-danger">
                                <i class="fab fa-youtube me-2"></i>Upload to YouTube
                            </button>
                        </form>
                    </div>
                </div>

                <div class="card mt-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6><i class="fab fa-youtube me-2"></i>My YouTube Videos</h6>
                        <button class="btn btn-sm btn-primary" onclick="loadYouTubeVideosManually()">
                            <i class="fas fa-sync me-1"></i>Load Videos
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="youtubeVideosList">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Click "Load Videos" to fetch your YouTube videos.
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

                <div id="syncedVideosContainer"></div>
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

async function loadYouTubeVideosManually() {
    await loadYouTubeVideos();
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