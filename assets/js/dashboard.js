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
                loadingDiv.innerHTML =
                    '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
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
            const tempIndicator = document.getElementById(
                "tempLoadingIndicator",
            );
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

    // Initialize YouTube API client first
    if (window.youtubeAPI && !window.youtubeAPI.isInitialized) {
        window.youtubeAPI.initialize().catch((error) => {
            console.warn("YouTube API initialization failed:", error);
        });
    }

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
            loadOverviewStats();
            return;
        }

        // If no localStorage data, try API as fallback
        const response = await fetch("api/auth.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ action: "get_user" }),
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            // Also store in localStorage for consistency
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            setupUserRole();
            setupDashboard();
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
    } else if (
        currentUser.role === "editor" ||
        currentUser.role === "creator"
    ) {
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
    let defaultPanel = urlParams.get("panel");

    // If no URL parameter, set default panel based on user role
    if (!defaultPanel) {
        if (currentUser.role === "viewer") {
            defaultPanel = "videos";
        } else if (
            currentUser.role === "editor" ||
            currentUser.role === "creator"
        ) {
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

async function showPanel(panelName) {
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

    // Load panel-specific data (only if not already loaded or panel changed)
    const lastPanel = window.currentPanelName;
    window.currentPanelName = panelName;

    // Skip loading if same panel and data already exists
    if (
        lastPanel === panelName &&
        panelName === "videos" &&
        allVideos.length > 0
    ) {
        return;
    }

    switch (panelName) {
        case "overview":
            loadOverviewStats();
            break;
        case "videos":
            // Initialize YouTube API first, then load videos
            if (window.youtubeAPI) {
                if (!window.youtubeAPI.isInitialized) {
                    await window.youtubeAPI.initialize();
                }
                if (window.youtubeAPI.isSignedIn()) {
                    loadVideosFromYouTube();
                } else {
                    renderVideos([]);
                }
            } else {
                renderVideos([]);
            }
            break;
        case "users":
            if (currentUser.role === "admin") {
                loadUsers();
            }
            break;
        case "myVideos":
            if (
                currentUser.role === "editor" ||
                currentUser.role === "admin" ||
                currentUser.role === "creator"
            ) {
                // Initialize YouTube API first, then load videos
                if (window.youtubeAPI) {
                    if (!window.youtubeAPI.isInitialized) {
                        await window.youtubeAPI.initialize();
                    }
                    if (window.youtubeAPI.isSignedIn()) {
                        loadMyVideosFromYouTube();
                    } else {
                        renderMyVideosFromYouTube([]);
                    }
                } else {
                    renderMyVideosFromYouTube([]);
                }
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
            if (
                currentUser.role === "editor" ||
                currentUser.role === "admin" ||
                currentUser.role === "creator"
            ) {
                loadEarnings();
            }
            break;
        case "paidUsers":
            if (
                currentUser.role === "editor" ||
                currentUser.role === "admin" ||
                currentUser.role === "creator"
            ) {
                loadPaidUsers();
            }
            break;
        case "analytics":
            if (currentUser.role === "admin") {
                loadAnalytics();
            }
            break;
        case "youtube":
            if (
                currentUser.role === "editor" ||
                currentUser.role === "admin" ||
                currentUser.role === "creator"
            ) {
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

// Load videos directly from YouTube API
async function loadVideosFromYouTube() {
    // Prevent multiple simultaneous calls
    if (window.loadingYouTubeVideos) {
        return;
    }

    window.loadingYouTubeVideos = true;

    try {
        showLoading(true);

        // Check if YouTube API client is available
        if (!window.youtubeAPI) {
            console.warn("YouTube API client not available");
            renderVideos([]);
            return;
        }

        // Initialize if not already done
        if (!window.youtubeAPI.isInitialized) {
            await window.youtubeAPI.initialize();
        }

        // Check if YouTube is connected
        if (!window.youtubeAPI.isSignedIn()) {
            console.warn("YouTube not connected");
            renderVideos([]);
            return;
        }

        // Get videos from YouTube (single API call)
        const result = await window.youtubeAPI.getMyVideos(50);

        if (result.videos && result.videos.length > 0) {
            // Get detailed video statistics in one call
            const videoIds = result.videos.map((v) => v.youtube_id);
            const detailedVideos =
                await window.youtubeAPI.getVideoDetails(videoIds);

            // Convert YouTube videos to our format with safe property access
            allVideos = detailedVideos.map((video) => ({
                id: video.youtube_id,
                title: video.title || "Untitled",
                description: video.description || "",
                price: 0,
                uploader: video.channel_title || "Unknown",
                uploader_id: video.channel_id || "",
                views: formatNumber(video.views || video.view_count || 0),
                purchased: true,
                file_path: null,
                category: "youtube",
                created_at: video.published_at || new Date().toISOString(),
                youtube_id: video.youtube_id,
                youtube_thumbnail: video.thumbnail,
                youtube_channel_id: video.channel_id || "",
                youtube_channel_title: video.channel_title || "Unknown",
                youtube_views: video.views || video.view_count || 0,
                youtube_likes: video.likes || video.like_count || 0,
                youtube_comments: video.comments || video.comment_count || 0,
                is_youtube_synced: true,
                video_url: window.youtubeAPI.generateVideoURL(video.youtube_id),
                embed_html: window.youtubeAPI.generateEmbedHTML(
                    video.youtube_id,
                ),
            }));

            renderVideos(allVideos);
        } else {
            renderVideos([]);
        }
    } catch (error) {
        console.error("Failed to load YouTube videos:", error);
        showNotification(
            "Failed to load YouTube videos: " + error.message,
            "error",
        );
        renderVideos([]);
    } finally {
        showLoading(false);
        window.loadingYouTubeVideos = false;
    }
}

// New function to load user's videos from YouTube
async function loadMyVideosFromYouTube() {
    // Prevent multiple simultaneous calls
    if (window.loadingMyYouTubeVideos) {
        return;
    }

    window.loadingMyYouTubeVideos = true;
    showLoading(true);

    try {
        // Check if YouTube API client is available
        if (!window.youtubeAPI) {
            console.warn("YouTube API client not available");
            renderMyVideosFromYouTube([]);
            return;
        }

        // Initialize if not already done
        if (!window.youtubeAPI.isInitialized) {
            await window.youtubeAPI.initialize();
        }

        // Check if YouTube is connected
        if (!window.youtubeAPI.isSignedIn()) {
            console.warn("YouTube not connected for My Videos");
            renderMyVideosFromYouTube([]);
            return;
        }

        // Get videos from YouTube (single API call)
        const result = await window.youtubeAPI.getMyVideos(50);

        if (result.videos && result.videos.length > 0) {
            // Get detailed video statistics in one call
            const videoIds = result.videos.map((v) => v.youtube_id);
            const detailedVideos =
                await window.youtubeAPI.getVideoDetails(videoIds);

            // Ensure all required properties exist with default values
            const safeVideos = detailedVideos.map((video) => ({
                ...video,
                title: video.title || "Untitled",
                description: video.description || "",
                thumbnail: video.thumbnail || "",
                view_count: video.view_count || video.views || 0,
                like_count: video.like_count || video.likes || 0,
                comment_count: video.comment_count || video.comments || 0,
                published_at: video.published_at || new Date().toISOString(),
                youtube_id: video.youtube_id || video.id,
            }));

            renderMyVideosFromYouTube(safeVideos);
        } else {
            renderMyVideosFromYouTube([]);
        }
    } catch (error) {
        console.error("Failed to load my videos from YouTube:", error);
        showNotification(
            "Failed to load YouTube videos: " + error.message,
            "error",
        );
        renderMyVideosFromYouTube([]);
    } finally {
        showLoading(false);
        window.loadingMyYouTubeVideos = false;
    }
}

function renderVideos(videos) {
    console.log(videos);
    const container = document.getElementById("videosContainer");

    if (!container) {
        console.error("Videos container not found");
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
            container.innerHTML = "";
            container.appendChild(fragment);
        }
    };

    renderChunks();
}

function createVideoElement(video) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 mb-4";

    const thumbnail = video.youtube_thumbnail || "/api/placeholder/300/200";
    const isYouTubeVideo = video.youtube_id && video.is_youtube_synced;

    const badgeHTML = isYouTubeVideo
        ? '<span class="position-absolute top-0 start-0 badge bg-danger m-2"><i class="fab fa-youtube me-1"></i>YouTube</span>'
        : video.price === 0
          ? '<span class="position-absolute top-0 end-0 badge bg-success m-2">FREE</span>'
          : video.purchased
            ? '<span class="position-absolute top-0 end-0 badge bg-info m-2">PURCHASED</span>'
            : `<span class="position-absolute top-0 end-0 badge bg-warning m-2">$${video.price}</span>`;

    col.innerHTML = `
        <div class="card video-card h-100">
            <div class="video-thumbnail position-relative bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                <img src="${thumbnail}" alt="${escapeHtml(video.title)}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: cover;">
                <div class="position-absolute top-50 start-50 translate-middle">
                    <i class="fas fa-play-circle fa-3x text-white opacity-75"></i>
                </div>
                ${badgeHTML}
            </div>
            <div class="card-body">
                <h5 class="video-title">${escapeHtml(video.title)}</h5>
                <p class="video-description text-muted">${escapeHtml(video.description.substring(0, 100))}${video.description.length > 100 ? "..." : ""}</p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">By ${escapeHtml(video.uploader)}</small>
                    <small class="text-muted">${formatNumber(video.views)} views</small>
                </div>
                ${renderVideoActions(video)}
            </div>
        </div>
    `;

    return col;
}

function renderMyVideosFromYouTube(videos) {
    const container = document.getElementById("myVideosContainer");

    if (videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <h5><i class="fab fa-youtube me-2"></i>No YouTube videos found</h5>
                    <p>Upload videos to your YouTube channel to see them here, or use the upload form to add videos directly to this platform.</p>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = videos
        .map(
            (video) => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card video-card h-100">
                <div class="video-thumbnail position-relative bg-light" style="height: 200px;">
                    <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                    <div class="position-absolute top-0 start-0 m-2">
                        <span class="badge bg-danger"><i class="fab fa-youtube me-1"></i>YouTube</span>
                    </div>
                    <div class="position-absolute top-50 start-50 translate-middle">
                        <i class="fas fa-play-circle fa-3x text-white opacity-75"></i>
                    </div>
                </div>
                <div class="card-body">
                    <h5 class="video-title">${escapeHtml(video.title)}</h5>
                    <p class="video-description text-muted">${escapeHtml(video.description.substring(0, 100))}${video.description.length > 100 ? "..." : ""}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">${formatNumber(video.view_count)} views</small>
                        <small class="text-muted">${formatNumber(video.like_count)} likes</small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">Published: ${formatTimeAgo(video.published_at)}</small>
                        <small class="text-muted">${formatNumber(video.comment_count)} comments</small>
                    </div>
                    <div class="btn-group w-100" role="group">
                        <a href="${window.youtubeAPI.generateVideoURL(video.youtube_id)}" target="_blank" class="btn btn-outline-danger">
                            <i class="fab fa-youtube"></i>
                        </a>
                        <button class="btn btn-outline-success" onclick="watchYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="syncVideoToDatabase('${video.youtube_id}')">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
        )
        .join("");
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
    const isYouTubeVideo = video.youtube_id && video.is_youtube_synced;

    if (isYouTubeVideo) {
        return `
            <div class="btn-group w-100" role="group">
                <button class="btn btn-success" onclick="watchYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')">
                    <i class="fas fa-play me-2"></i>Watch
                </button>
                <a href="${window.youtubeAPI.generateVideoURL(video.youtube_id)}" target="_blank" class="btn btn-outline-danger">
                    <i class="fab fa-youtube"></i>
                </a>
            </div>`;
    }

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

// Function to watch YouTube videos in embed modal
function watchYouTubeVideo(youtubeId, title) {
    document.getElementById("videoModalTitle").textContent = title;

    // Create YouTube embed iframe
    const embedHtml = window.youtubeAPI.generateEmbedHTML(youtubeId, 560, 315);
    document.getElementById("videoPlayer").outerHTML =
        `<div id="videoPlayer">${embedHtml}</div>`;

    const modal = new bootstrap.Modal(document.getElementById("videoModal"));
    modal.show();
}

// Function to sync individual YouTube video to database
async function syncVideoToDatabase(youtubeId) {
    try {
        showLoading(true);

        // Get video details from YouTube
        const videoDetails = await window.youtubeAPI.getVideoDetails([
            youtubeId,
        ]);

        if (videoDetails.length === 0) {
            showNotification("Video not found on YouTube", "error");
            return;
        }

        const video = videoDetails[0];

        // Sync to database
        const success = await window.youtubeAPI.syncVideoToDatabase({
            id: video.youtube_id,
            snippet: {
                title: video.title,
                description: video.description,
                channelId: video.channel_id,
                channelTitle: video.channel_title,
                thumbnails: { medium: { url: video.thumbnail } },
            },
        });

        if (success) {
            showNotification(
                "Video synced to database successfully",
                "success",
            );
        } else {
            showNotification("Failed to sync video to database", "error");
        }
    } catch (error) {
        console.error("Failed to sync video:", error);
        showNotification("Failed to sync video: " + error.message, "error");
    } finally {
        showLoading(false);
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    // Handle undefined, null, or non-numeric values
    if (num === undefined || num === null || isNaN(num)) {
        return "0";
    }

    const numValue = parseInt(num) || 0;

    if (numValue >= 1000000) {
        return (numValue / 1000000).toFixed(1) + "M";
    } else if (numValue >= 1000) {
        return (numValue / 1000).toFixed(1) + "K";
    }
    return numValue.toString();
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Debounced filter function to prevent excessive API calls
const debouncedFilterVideos = debounce(async function (filter) {
    // Prevent duplicate requests
    if (this.currentFilter === filter && this.isFiltering) {
        return;
    }

    this.currentFilter = filter;
    this.isFiltering = true;

    showLoading(true);

    try {
        if (filter === "youtube") {
            // Load YouTube videos directly
            await loadVideosFromYouTube();
        } else {
            // Load from database with filter
            const response = await fetch(`api/videos.php?filter=${filter}`);
            const data = await response.json();

            if (data.success) {
                renderVideos(data.videos);
                updateFilterButtonStates(filter);
            } else {
                showNotification(
                    "Failed to filter videos: " + data.message,
                    "error",
                );
                renderVideos([]);
            }
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
    const filterButtons = document.querySelectorAll(".btn-group .btn");
    filterButtons.forEach((btn) => {
        btn.classList.remove("active");
        if (
            btn.onclick &&
            btn.onclick.toString().includes(`filterVideos('${activeFilter}')`)
        ) {
            btn.classList.add("active");
        }
    });
}

async function loadOverviewStats() {
    if (currentUser.role === "admin") {
        try {
            const response = await fetch("api/admin.php?action=analytics");
            const data = await response.json();

            if (data.success) {
                const analytics = data.analytics;

                // Animate counters for better UX
                animateCounter("totalVideos", analytics.total_videos);
                animateCounter("activeUsers", analytics.total_users);
                animateCounter("totalViews", analytics.total_views);

                // Handle revenue with currency formatting
                const revenueElement = document.getElementById("totalRevenue");
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
            console.error("Failed to load analytics:", error);
            showNotification("Failed to load analytics data", "error");
        }
    } else {
        // For non-admin users, show basic stats
        animateCounter("totalVideos", allVideos.length);

        const activeUsersElement = document.getElementById("activeUsers");
        const totalRevenueElement = document.getElementById("totalRevenue");

        if (activeUsersElement) activeUsersElement.textContent = "-";
        if (totalRevenueElement) totalRevenueElement.textContent = "-";

        const totalViews = allVideos.reduce(
            (sum, video) => sum + video.views,
            0,
        );
        animateCounter("totalViews", totalViews);
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
        const currentValue = Math.floor(
            startValue + (targetValue - startValue) * easeOutQuart,
        );

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
    const container = document.querySelector(".list-group.list-group-flush");
    if (!container || !activities) return;

    container.innerHTML = activities
        .map((activity) => {
            const icon =
                activity.type === "upload"
                    ? "fa-video text-primary"
                    : activity.type === "purchase"
                      ? "fa-shopping-cart text-success"
                      : "fa-user text-info";

            return `
            <div class="list-group-item">
                <i class="fas ${icon} me-2"></i>
                ${activity.title} by ${activity.user}
                <small class="text-muted d-block">${formatTimeAgo(activity.time)}</small>
            </div>
        `;
        })
        .join("");
}

function updatePopularVideos(videos) {
    const container = document.querySelector(
        ".card:last-child .list-group.list-group-flush",
    );
    if (!container || !videos) return;

    container.innerHTML = videos
        .map(
            (video) => `
        <div class="list-group-item d-flex justify-content-between">
            <span>${video.title}</span>
            <span class="badge bg-primary">${video.views.toLocaleString()} views</span>
        </div>
    `,
        )
        .join("");
}

// YouTube Panel Functions
async function connectYouTube() {
    try {
        showLoading(true);
        const success = await window.youtubeAPI.signIn();

        if (success) {
            showNotification("Connected to YouTube successfully!", "success");
            await checkYouTubeStatus();
            await loadYouTubeData();
        } else {
            showNotification("Failed to connect to YouTube", "error");
        }
    } catch (error) {
        console.error("YouTube connection failed:", error);
        showNotification(
            "YouTube connection failed: " + error.message,
            "error",
        );
    } finally {
        showLoading(false);
    }
}

async function disconnectYouTube() {
    try {
        showLoading(true);
        const success = await window.youtubeAPI.signOut();

        if (success) {
            showNotification("Disconnected from YouTube", "success");
            await checkYouTubeStatus();
        } else {
            showNotification("Failed to disconnect from YouTube", "error");
        }
    } catch (error) {
        console.error("YouTube disconnection failed:", error);
        showNotification(
            "YouTube disconnection failed: " + error.message,
            "error",
        );
    } finally {
        showLoading(false);
    }
}

async function checkYouTubeStatus() {
    try {
        if (!window.youtubeAPI.isInitialized) {
            await window.youtubeAPI.initialize();
        }

        if (window.youtubeAPI.isSignedIn()) {
            const channelInfo = await window.youtubeAPI.getMyChannelInfo();
            updateYouTubeStatus(true, channelInfo);
        } else {
            updateYouTubeStatus(false, null);
        }
    } catch (error) {
        console.error("Failed to check YouTube status:", error);
        updateYouTubeStatus(false, null);
    }
}

async function loadYouTubeData() {
    await Promise.all([loadYouTubeVideos(), loadYouTubeStatistics()]);
}

async function loadYouTubeVideos() {
    try {
        if (!window.youtubeAPI.isSignedIn()) {
            console.log("Not signed in to YouTube");
            return;
        }

        const result = await window.youtubeAPI.getMyVideos(50);

        if (result.videos && result.videos.length > 0) {
            // Get detailed statistics for the videos
            const videoIds = result.videos.map((v) => v.youtube_id);
            const detailedVideos =
                await window.youtubeAPI.getVideoDetails(videoIds);

            displayYouTubeVideos(detailedVideos);
        } else {
            displayYouTubeVideos([]);
        }
    } catch (error) {
        console.error("Failed to load YouTube videos:", error);
        showNotification(
            "Failed to load YouTube videos: " + error.message,
            "error",
        );
    }
}

function displayYouTubeVideos(videos) {
    const videosDiv = document.getElementById("youtubeVideos");
    if (!videosDiv) return;

    if (!videos || videos.length === 0) {
        videosDiv.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center">
                        <p class="text-muted">No YouTube videos found</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const videosHTML = videos
        .map(
            (video) => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100">
                <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 200px; object-fit: cover;">
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="card-text small text-muted">${video.description ? video.description.substring(0, 100) + "..." : "No description"}</p>
                    <div class="row text-center">
                        <div class="col-4">
                            <small class="text-muted">Views</small>
                            <div class="fw-bold">${window.youtubeAPI.formatNumber(video.view_count)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Likes</small>
                            <div class="fw-bold">${window.youtubeAPI.formatNumber(video.like_count)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Comments</small>
                            <div class="fw-bold">${window.youtubeAPI.formatNumber(video.comment_count)}</div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <small class="text-muted">Published: ${formatTimeAgo(video.published_at)}</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-success me-2" onclick="watchYouTubeVideo('${video.youtube_id}', '${escapeHtml(video.title)}')">
                            <i class="fas fa-play me-1"></i>Watch
                        </button>
                        <a href="${window.youtubeAPI.generateVideoURL(video.youtube_id)}" target="_blank" class="btn btn-sm btn-outline-danger">
                            <i class="fab fa-youtube me-1"></i>YouTube
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
        )
        .join("");

    videosDiv.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h5><i class="fab fa-youtube me-2"></i>My YouTube Videos (${videos.length})</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        ${videosHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadYouTubeStatistics() {
    try {
        if (!window.youtubeAPI.isSignedIn()) {
            return;
        }

        const channelInfo = await window.youtubeAPI.getMyChannelInfo();

        if (channelInfo) {
            // Update statistics in the UI
            const subscriberCount = document.getElementById("ytSubscribers");
            const videoCount = document.getElementById("ytVideoCount");
            const viewCount = document.getElementById("ytTotalViews");

            if (subscriberCount)
                subscriberCount.textContent = window.youtubeAPI.formatNumber(
                    channelInfo.subscriber_count,
                );
            if (videoCount)
                videoCount.textContent = window.youtubeAPI.formatNumber(
                    channelInfo.video_count,
                );
            if (viewCount)
                viewCount.textContent = window.youtubeAPI.formatNumber(
                    channelInfo.view_count,
                );

            // Update channel info display
            const channelInfoDiv =
                document.getElementById("youtubeChannelInfo");
            if (channelInfoDiv) {
                channelInfoDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body text-center">
                            <img src="${channelInfo.thumbnail}" alt="${channelInfo.title}" class="rounded-circle mb-3" style="width: 80px; height: 80px;">
                            <h5>${channelInfo.title}</h5>
                            <p class="text-muted">${channelInfo.description ? channelInfo.description.substring(0, 150) + "..." : "No description"}</p>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Failed to load YouTube statistics:", error);
    }
}

// Sync YouTube video metadata with database
async function syncYouTubeVideos() {
    try {
        if (!window.youtubeAPI.isSignedIn()) {
            showNotification("Please connect to YouTube first", "error");
            return;
        }

        showLoading(true);
        showNotification("Syncing YouTube videos...", "info");

        const result = await window.youtubeAPI.getMyVideos(50);

        if (result.videos && result.videos.length > 0) {
            // Get detailed statistics
            const videoIds = result.videos.map((v) => v.youtube_id);
            const detailedVideos =
                await window.youtubeAPI.getVideoDetails(videoIds);

            // Sync each video with the database
            let syncedCount = 0;
            for (const video of detailedVideos) {
                try {
                    const success = await window.youtubeAPI.syncVideoToDatabase(
                        {
                            id: video.youtube_id,
                            snippet: {
                                title: video.title,
                                description: video.description,
                                channelId: video.channel_id,
                                channelTitle: video.channel_title,
                                thumbnails: {
                                    medium: { url: video.thumbnail },
                                },
                            },
                        },
                    );

                    if (success) syncedCount++;
                } catch (error) {
                    console.error(
                        `Failed to sync video ${video.youtube_id}:`,
                        error,
                    );
                }
            }

            showNotification(
                `Successfully synced ${syncedCount}/${detailedVideos.length} videos`,
                "success",
            );
        } else {
            showNotification("No YouTube videos found to sync", "info");
        }
    } catch (error) {
        console.error("Failed to sync YouTube videos:", error);
        showNotification(
            "Failed to sync YouTube videos: " + error.message,
            "error",
        );
    } finally {
        showLoading(false);
    }
}

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
            document.getElementById("totalEarnings").textContent =
                `$${earnings.total_earnings.toFixed(2)}`;
            document.getElementById("monthlyEarnings").textContent =
                `$${earnings.monthly_earnings.toFixed(2)}`;
            document.getElementById("pendingEarnings").textContent =
                `$${earnings.pending_earnings.toFixed(2)}`;

            // Load recent transactions
            await loadTransactions();
        } else {
            showNotification(
                "Failed to load earnings: " + data.message,
                "error",
            );
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
        container.innerHTML =
            '<tr><td colspan="4" class="text-center text-muted">No transactions yet</td></tr>';
        return;
    }

    container.innerHTML = transactions
        .map(
            (transaction) => `
        <tr>
            <td>${new Date(transaction.date).toLocaleDateString()}</td>
            <td>${transaction.video_title}</td>
            <td>${transaction.buyer_name}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
        </tr>
    `,
        )
        .join("");
}

async function loadPaidUsers() {
    showLoading(true);

    try {
        const response = await fetch("api/earnings.php?action=paid_users");
        const data = await response.json();

        if (data.success) {
            renderPaidUsers(data.paid_users);
        } else {
            showNotification(
                "Failed to load paid users: " + data.message,
                "error",
            );
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
        container.innerHTML =
            '<div class="col-12"><div class="alert alert-info">No paid users yet</div></div>';
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
                                ${paidUsers
                                    .map(
                                        (user) => `
                                    <tr>
                                        <td>${user.name}</td>
                                        <td>${user.email}</td>
                                        <td>${user.purchases_count}</td>
                                        <td>$${user.total_spent.toFixed(2)}</td>
                                        <td>${new Date(user.last_purchase).toLocaleDateString()}</td>
                                    </tr>
                                `,
                                    )
                                    .join("")}
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
alert('sss')
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
    if (!title || !description || !file) {
        showNotification("❌ Please fill in all required fields", "error");
        return;
    }

    // Validate file size (YouTube supports up to 256GB, but we'll set a reasonable limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB for practical purposes
    if (file.size > maxSize) {
        showNotification("❌ File size must be less than 2GB", "error");
        return;
    }

    // Validate file type
    const allowedTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
        "video/mkv",
        "video/flv",
    ];
    if (!allowedTypes.includes(file.type)) {
        showNotification("❌ Please select a valid video file", "error");
        return;
    }

    // Check if YouTube is connected for creators
    if (
        !window.youtubeAPI ||
        !window.youtubeAPI.isInitialized ||
        !window.youtubeAPI.isSignedIn()
    ) {
        showNotification(
            "❌ Please connect to YouTube first to upload videos",
            "error",
        );
        return;
    }

    // Show loader
    const loader = document.getElementById("loader");
    if (loader) {
        loader.style.display = "block";
    }

    // Disable form inputs during upload
    const formInputs = form.querySelectorAll("input, textarea, select, button");
    formInputs.forEach((input) => (input.disabled = true));

    submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Uploading to YouTube...';

    try {
        // Use the YouTube API client's upload method with progress tracking
        const metadata = {
            title: title,
            description: description,
            tags: [],
            privacy: 'unlisted'
        };

        // Create progress update function
        function updateProgress(progress) {
            const progressBar = document.getElementById('uploadProgress');
            const progressText = document.getElementById('uploadProgressText');

            if (progressBar) {
                progressBar.style.display = 'block';
                const progressBarFill = progressBar.querySelector('.progress-bar');
                if (progressBarFill) {
                    progressBarFill.style.width = progress + '%';
                    progressBarFill.textContent = progress + '%';
                }
            }

            if (progressText) {
                progressText.textContent = `Uploading: ${progress}%`;
            }

            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Uploading: ${progress}%`;
        }

        // Upload video using the YouTube API client
        const uploadResult = await window.youtubeAPI.uploadVideo(
            file,
            metadata,
            updateProgress
        );

        if (uploadResult.success) {
            // Get the price from the form
            const price = parseFloat(document.getElementById("ytPrice")?.value || 0);

            // The video has already been synced to database by the YouTube API client
            // Just update the price if needed
            if (price > 0) {
                await updateVideoPriceInDatabase(uploadResult.video.id, price);
            }

            showNotification(
                "✅ Video uploaded to YouTube and synced to database successfully!",
                "success",
            );
            form.reset();

            // Hide progress bar
            const progressBar = document.getElementById('uploadProgress');
            if (progressBar) {
                progressBar.style.display = 'none';
            }

            loadVideos(); // Refresh the video list
        } else {
            throw new Error(uploadResult.error || "Upload failed");
        }
    } catch (error) {
        console.error("Upload failed:", error);
        showNotification("❌ Upload failed: " + error.message, "error");
    } finally {
        // Re-enable form inputs
        formInputs.forEach((input) => (input.disabled = false));
        submitBtn.innerHTML = originalText;
    }
}

function createUploadLoadingIndicator() {
    const overlay = document.createElement("div");
    overlay.className =
        "upload-loading-overlay mt-4 p-4 border rounded bg-light";
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
    if (!loadingOverlay) return;
    
    const progressBar = loadingOverlay.querySelector(".progress-bar");
    const statusElement = loadingOverlay.querySelector(".upload-status");
    const percentageElement = loadingOverlay.querySelector(".upload-percentage");

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }
    if (statusElement) {
        statusElement.textContent = statusText;
    }
    if (percentageElement) {
        percentageElement.textContent = percentage + "%";
    }

    // Change color based on completion
    if (percentage === 100 && progressBar && percentageElement) {
        progressBar.classList.remove("bg-primary");
        progressBar.classList.add("bg-success");
        percentageElement.classList.remove("text-primary");
        percentageElement.classList.add("text-success");
    }
}

function simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(url, options, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
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

    throw new Error(
        `Upload failed after ${maxRetries} attempts: ${lastError.message}`,
    );
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
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

function addVideoToUI(video) {
    // Add video to allVideos array
    allVideos.unshift(video);

    // If currently viewing myVideos, add it to the display
    const myVideosContainer = document.getElementById("myVideosContainer");
    if (myVideosContainer && myVideosContainer.style.display !== "none") {
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
        myVideosContainer.insertAdjacentHTML("afterbegin", videoHtml);
    }
}

async function purchaseVideo(videoId, price) {
    purchaseVideoId = videoId;
    document.getElementById("purchasePrice").textContent = price.toFixed(2);

    const modal = new bootstrap.Modal(document.getElementById("purchaseModal"));
    modal.show();
}

async function confirmPurchase() {
    if (!purchaseVideoId) return;

    // Show loading state
    const confirmBtn = document.querySelector("#purchaseModal .btn-primary");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch("api/purchase.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                video_id: purchaseVideoId,
            }),
        });

        const data = await response.json();

        if (data.success) {
            showNotification(
                "🎉 Video purchased successfully! You can now watch it.",
                "success",
            );

            // Close modal
            const modal = bootstrap.Modal.getInstance(
                document.getElementById("purchaseModal"),
            );
            modal.hide();

            // Update the video card immediately
            updateVideoCardAfterPurchase(purchaseVideoId);

            // Reload current panel to reflect changes
            const activePanel = document.querySelector(
                '.panel[style*="block"], .panel:not([style*="none"])',
            );
            if (activePanel && activePanel.id === "videosPanel") {
                loadVideosFromYouTube();
            } else if (activePanel && activePanel.id === "purchasesPanel") {
                loadPurchases();
            }

            // Update overview stats if on admindashboard
            if (currentUser.role === "admin") {
                loadOverviewStats();
            }
        } else {
            showNotification("❌ Purchase failed: " + data.message, "error");
        }
    } catch (error) {
        console.error("Purchase failed:", error);
        showNotification(
            "❌ Purchase failed. Please check your connection and try again.",
            "error",
        );
    } finally {
        // Restore button state
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function updateVideoCardAfterPurchase(videoId) {
    // More efficient: use data attributes instead of parsing onclick
    const purchaseButtons = document.querySelectorAll(
        `[data-video-id="${videoId}"][data-action="purchase"]`,
    );

    purchaseButtons.forEach((button) => {
        const card = button.closest(".video-card");
        if (!card) return;

        // Update button
        button.className = "btn btn-success w-100";
        button.innerHTML = '<i class="fas fa-play me-2"></i>Watch Now';
        button.setAttribute("data-action", "watch");
        button.onclick = () => watchVideo(videoId);

        // Update badge efficiently
        const thumbnail = card.querySelector(".video-thumbnail");
        const existingBadge = thumbnail?.querySelector(".badge");

        if (thumbnail && !existingBadge) {
            const badge = document.createElement("span");
            badge.className = "position-absolute top-0 end-0 badge bg-info m-2";
            badge.textContent = "PURCHASED";
            thumbnail.appendChild(badge);
        } else if (existingBadge) {
            existingBadge.className =
                "position-absolute top-0 end-0 badge bg-info m-2";
            existingBadge.textContent = "PURCHASED";
        }
    });

    // Update the video in allVideos array to prevent re-render issues
    const videoIndex = allVideos.findIndex((v) => v.id === videoId);
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
            credentials: "include",
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

async function loadYouTubePanel() {
    try {
        // Check if YouTube API client is available
        if (!window.youtubeAPI) {
            console.warn("YouTube API client not available");
            updateYouTubeStatus(false, null);
            return;
        }

        if (!window.youtubeAPI.isInitialized) {
            await window.youtubeAPI.initialize();
        }

        const isSignedIn = window.youtubeAPI.isSignedIn();

        if (isSignedIn) {
            const channelInfo = await window.youtubeAPI.getMyChannelInfo();
            updateYouTubeStatus(true, channelInfo);
            await loadYouTubeData();
        } else {
            updateYouTubeStatus(false, null);
        }
    } catch (error) {
        console.error("Failed to load YouTube panel:", error);
        updateYouTubeStatus(false, null);
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
            </div>
        `;

        controlsDiv.innerHTML = `
            <button class="btn btn-outline-danger btn-sm" onclick="disconnectYouTube()">
                <i class="fas fa-unlink me-1"></i>Disconnect
            </button>
            <button class="btn btn-primary btn-sm ms-2" onclick="syncYouTubeVideos()">
                <i class="fas fa-sync me-1"></i>Sync Videos
            </button>
        `;

        if (channelInfoDiv) channelInfoDiv.style.display = "block";
        if (uploadForm) uploadForm.style.display = "block";
        if (videosDiv) videosDiv.style.display = "block";
        if (statsDiv) statsDiv.style.display = "block";
    } else {
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                YouTube not connected. Please sign in to access your YouTube channel.
            </div>
        `;

        controlsDiv.innerHTML = `
            <button class="btn btn-danger" onclick="connectYouTube()">
                <i class="fab fa-youtube me-1"></i>Connect YouTube
            </button>
        `;

        if (channelInfoDiv) channelInfoDiv.style.display = "none";
        if (uploadForm) uploadForm.style.display = "none";
        if (videosDiv) videosDiv.style.display = "none";
        if (statsDiv) statsDiv.style.display = "none";
    }
}

// Initialize YouTube integration on page load
document.addEventListener("DOMContentLoaded", function () {
    checkYouTubeIntegration();
});

// Check YouTube integration status
async function checkYouTubeIntegration() {
    try {
        const statusElement = document.getElementById("youtubeStatus");
        const statusText = document.getElementById("youtubeStatusText");
        const connectBtn = document.getElementById("connectYouTubeBtn");
        const syncBtn = document.getElementById("syncYouTubeBtn");
        const uploadCard = document.getElementById("youtubeUploadCard");
        const recentVideosCard = document.getElementById("recentVideosCard");

        if (window.youtubeAPI && window.youtubeAPI.isSignedIn()) {
            statusElement.className = "alert alert-success";
            statusText.innerHTML =
                '<i class="fas fa-check-circle"></i> YouTube integration active';
            connectBtn.innerHTML = '<i class="fas fa-unlink"></i> Disconnect';
            connectBtn.className = "btn btn-outline-danger me-2";
            connectBtn.onclick = disconnectYouTube;
            syncBtn.disabled = false;
            uploadCard.style.display = "block";
            recentVideosCard.style.display = "block";
            loadRecentYouTubeVideos();
        } else {
            statusElement.className = "alert alert-warning";
            statusText.innerHTML =
                '<i class="fas fa-exclamation-triangle"></i> YouTube not connected';
            connectBtn.innerHTML =
                '<i class="fas fa-link"></i> Connect YouTube';
            connectBtn.className = "btn btn-outline-success me-2";
            connectBtn.onclick = connectYouTube;
            syncBtn.disabled = true;
            uploadCard.style.display = "none";
            recentVideosCard.style.display = "none";
        }
    } catch (error) {
        console.error("Error checking YouTube integration:", error);
        document.getElementById("youtubeStatusText").textContent =
            "Error checking integration status";
    }
}

// Connect to YouTube
async function connectYouTube() {
    try {
        showLoading(true);
        const success = await window.youtubeAPI.signIn();

        if (success) {
            showNotification("Successfully connected to YouTube!", "success");
            checkYouTubeIntegration();
        } else {
            showNotification(
                "Failed to connect to YouTube. Please try again.",
                "error",
            );
        }
    } catch (error) {
        console.error("YouTube connection error:", error);
        showNotification(
            "YouTube connection failed: " + error.message,
            "error",
        );
    } finally {
        showLoading(false);
    }
}

// Disconnect from YouTube
async function disconnectYouTube() {
    try {
        showLoading(true);
        const success = await window.youtubeAPI.signOut();

        if (success) {
            showNotification("Disconnected from YouTube", "info");
            checkYouTubeIntegration();
        } else {
            showNotification("Failed to disconnect from YouTube", "error");
        }
    } catch (error) {
        console.error("YouTube disconnect error:", error);
        showNotification("Disconnect failed: " + error.message, "error");
    } finally {
        showLoading(false);
    }
}

// Load recent YouTube videos
async function loadRecentYouTubeVideos() {
    try {
        const recentVideosList = document.getElementById("recentVideosList");
        recentVideosList.innerHTML =
            '<div class="col-12"><div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading videos...</div></div>';

        const videos = await window.youtubeAPI.getChannelVideos(6);

        if (videos.length === 0) {
            recentVideosList.innerHTML =
                '<div class="col-12"><div class="text-center text-muted">No videos found on your YouTube channel</div></div>';
            return;
        }

        const videoDetails = await window.youtubeAPI.getVideoDetails(
            videos.map((v) => v.id.videoId),
        );

        recentVideosList.innerHTML = videoDetails
            .map(
                (video) => `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}" style="height: 180px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title">${video.title.length > 50 ? video.title.substring(0, 50) + "..." : video.title}</h6>
                        <p class="card-text text-muted small flex-grow-1">${video.description.length > 80 ? video.description.substring(0, 80) + "..." : video.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${video.views} views</small>
                            <button class="btn btn-sm btn-outline-primary" onclick="syncVideoToDatabase('${video.youtube_id}')">
                                <i class="fas fa-sync"></i> Sync
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
            )
            .join("");
    } catch (error) {
        console.error("Failed to load recent videos:", error);
        document.getElementById("recentVideosList").innerHTML =
            '<div class="col-12"><div class="text-center text-danger">Failed to load videos</div></div>';
    }
}

// Reset YouTube upload form
function resetYouTubeForm() {
    document.getElementById("youtubeUploadForm").reset();
    hideUploadProgress();
}

// Show upload progress
function showUploadProgress() {
    const progressDiv = document.getElementById("uploadProgress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    progressDiv.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
}

// Hide upload progress
function hideUploadProgress() {
    document.getElementById("uploadProgress").style.display = "none";
}

// Update upload progress
function updateUploadProgress(progress) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    if (progressBar) {
        progressBar.style.width = progress + "%";
    }
    if (progressText) {
        progressText.textContent = progress + "%";
    }
}

// YouTube Upload Form Handler
document
    .getElementById("youtubeUploadForm")
    ?.addEventListener("submit", async function (e) {
        e.preventDefault();

        const title = document.getElementById("ytTitle").value;
        const description = document.getElementById("ytDescription").value;
        const tags = document
            .getElementById("ytTags")
            .value.split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
        const privacy = document.getElementById("ytPrivacy").value;
        const price = parseFloat(document.getElementById("ytPrice").value) || 0;
        const videoFile = document.getElementById("ytVideo").files[0];
        const uploadBtn = document.getElementById("uploadBtn");

        if (!videoFile) {
            showNotification("Please select a video file", "error");
            return;
        }

        if (!title.trim()) {
            showNotification("Please enter a video title", "error");
            return;
        }

        // Validate file size (YouTube limit is 256GB, but we'll set a reasonable limit)
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB for practical purposes
        if (videoFile.size > maxSize) {
            showNotification(
                "Video file is too large. Please choose a file under 2GB.",
                "error",
            );
            return;
        }

        // Validate file type
        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/avi",
            "video/mov",
            "video/mkv",
            "video/flv",
        ];
        if (!allowedTypes.includes(videoFile.type)) {
            showNotification("Please select a valid video file", "error");
            return;
        }

        try {
            // Check YouTube connection
            if (!window.youtubeAPI.isSignedIn()) {
                showNotification("Please connect to YouTube first", "error");
                return;
            }

            // Disable form and show progress
            uploadBtn.disabled = true;
            uploadBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            showUploadProgress();

            // Prepare metadata for direct upload
            const metadata = {
                title: title,
                description: description,
                tags: tags,
                privacy: privacy,
                categoryId: "22", // People & Blog
            };

            // Upload video directly to YouTube using multipart upload
            const result = await window.youtubeAPI.uploadVideo(
                videoFile,
                metadata,
                (progress) => {
                    updateUploadProgress(progress);
                },
            );

            if (result.success) {
                // Get detailed video information from YouTube
                const videoDetails = await window.youtubeAPI.getVideoDetails([
                    result.video.id,
                ]);
                const detailedVideo = videoDetails[0] || {};

                // Store video metadata in database
                const videoData = {
                    title: title,
                    description: description,
                    price: price,
                    category: "youtube",
                    file_path: "", // No local file path since it's on YouTube
                    youtube_id: result.video.id,
                    youtube_thumbnail:
                        result.video.snippet?.thumbnails?.medium?.url ||
                        result.video.snippet?.thumbnails?.default?.url,
                    youtube_channel_id: result.video.snippet?.channelId,
                    youtube_channel_title: result.video.snippet?.channelTitle,
                    youtube_views: detailedVideo.views || 0,
                    youtube_likes: detailedVideo.likes || 0,
                    youtube_comments: detailedVideo.comments || 0,
                    is_youtube_synced: true,
                };

                const dbResponse = await fetch("api/videoss.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(videoData),
                });

                const dbData = await dbResponse.json();

                if (dbData.success) {
                    showNotification(
                        "🎉 Video uploaded to YouTube and saved to database successfully!",
                        "success",
                    );

                    // Reset form and reload videos
                    resetYouTubeForm();
                    loadRecentYouTubeVideos();
                    loadVideos();
                } else {
                    showNotification(
                        "❌ Failed to save video to database: " +
                            dbData.message,
                        "error",
                    );
                }
            } else {
                showNotification(
                    "❌ YouTube upload failed: " + result.error,
                    "error",
                );
            }
        } catch (error) {
            console.error("Upload error:", error);
            showNotification("❌ Upload failed: " + error.message, "error");
            const loader = document.getElementById("loader");
            if (loader) {
                loader.style.display = "none";
            }
        } finally {
            // Reset form state
            uploadBtn.disabled = false;
            uploadBtn.innerHTML =
                '<i class="fab fa-youtube me-2"></i>Upload to YouTube';
            hideUploadProgress();
            const loader = document.getElementById("loader");
            if (loader) {
                loader.style.display = "none";
            }
        }
    });

// Update video price in database after YouTube upload
async function updateVideoPriceInDatabase(youtubeVideoId, price) {
    try {
        const response = await fetch("api/videos.php", {
            method: "PUT",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            credentials: "include",
            body: `youtube_id=${youtubeVideoId}&price=${price}&action=update_price`,
        });

        const result = await response.json();
        if (!result.success) {
            console.error("Failed to update video price:", result.message);
        }
    } catch (error) {
        console.error("Error updating video price:", error);
    }
}

// Enhanced video watching with access control
async function watchVideo(videoId) {
    try {
        const response = await fetch("api/video_access.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ video_id: videoId }),
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById("videoModalTitle").textContent =
                data.video.title;
            document.getElementById("videoPlayer").src =
                data.video.file_path ||
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
        } else {
            if (data.message === "Payment required") {
                purchaseVideo(videoId, data.video.price); // Call purchase function if payment is required
            } else {
                showNotification(data.message, "error");
            }
        }
    } catch (error) {
        console.error("Error accessing video:", error);
        showNotification("Failed to access video", "error");
    }
}

async function purchaseVideo(videoId, price) {
    purchaseVideoId = videoId;
    document.getElementById("purchasePrice").textContent = price.toFixed(2);

    const modal = new bootstrap.Modal(document.getElementById("purchaseModal"));
    modal.show();
}

async function confirmPurchase() {
    if (!purchaseVideoId) return;

    // Show loading state
    const confirmBtn = document.querySelector("#purchaseModal .btn-primary");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch("api/purchase.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                video_id: purchaseVideoId,
            }),
        });

        const data = await response.json();

        if (data.success) {
            showNotification(
                "🎉 Video purchased successfully! You can now watch it.",
                "success",
            );

            // Close modal
            const modal = bootstrap.Modal.getInstance(
                document.getElementById("purchaseModal"),
            );
            modal.hide();

            // Update the video card immediately
            updateVideoCardAfterPurchase(purchaseVideoId);

            // Reload current panel to reflect changes
            const activePanel = document.querySelector(
                '.panel[style*="block"], .panel:not([style*="none"])',
            );
            if (activePanel && activePanel.id === "videosPanel") {
                loadVideosFromYouTube();
            } else if (activePanel && activePanel.id === "purchasesPanel") {
                loadPurchases();
            }

            // Update overview stats if on admin dashboard
            if (currentUser.role === "admin") {
                loadOverviewStats();
            }
        } else {
            showNotification("❌ Purchase failed: " + data.message, "error");
        }
    } catch (error) {
        console.error("Purchase failed:", error);
        showNotification(
            "❌ Purchase failed. Please check your connection and try again.",
            "error",
        );
    } finally {
        // Restore button state
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// Video upload functionality


// New function to initialize YouTube panel
async function initializeYouTubePanel() {
    // Perform any initialization tasks here, like loading data, connecting to the API, etc.
    console.log("Initializing YouTube panel...");
    loadYouTubePanel();
}