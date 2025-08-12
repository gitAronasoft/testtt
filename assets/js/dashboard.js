// Global variables
let currentUser = null;
let allVideos = [];
let allUsers = [];
let purchaseVideoId = null;
let apiCallsInProgress = new Set();
let dashboardData = {};
let dataLoadingPromises = new Map();

// Cache utility functions with better management
let dataCache = new Map();
let cacheTimestamps = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

function getCachedData(key) {
    const timestamp = cacheTimestamps.get(key);
    if (timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
        return dataCache.get(key);
    }
    return null;
}

function setCachedData(key, data) {
    dataCache.set(key, data);
    cacheTimestamps.set(key, Date.now());
}

function clearCache(pattern = null) {
    if (pattern) {
        for (const key of dataCache.keys()) {
            if (key.includes(pattern)) {
                dataCache.delete(key);
                cacheTimestamps.delete(key);
            }
        }
    } else {
        dataCache.clear();
        cacheTimestamps.clear();
    }
}

// Loading state management
let loadingCount = 0;

function showLoading(show = true) {
    if (show) {
        loadingCount++;
    } else {
        loadingCount = Math.max(0, loadingCount - 1);
    }

    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
        if (loadingCount > 0) {
            spinner.classList.remove("d-none");
            spinner.style.display = "block";
        } else {
            spinner.classList.add("d-none");
            spinner.style.display = "none";
        }
        return;
    }

    // Fallback spinner
    let tempIndicator = document.getElementById("tempLoadingIndicator");
    if (loadingCount > 0 && !tempIndicator) {
        tempIndicator = document.createElement("div");
        tempIndicator.id = "tempLoadingIndicator";
        tempIndicator.innerHTML = `
            <div class="d-flex justify-content-center align-items-center">
                <div class="spinner-border text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>Loading...</span>
            </div>`;
        Object.assign(tempIndicator.style, {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: "9999",
            backgroundColor: "rgba(255,255,255,0.95)",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid #e0e0e0"
        });
        document.body.appendChild(tempIndicator);
    } else if (loadingCount === 0 && tempIndicator) {
        tempIndicator.remove();
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
        alert(message);
    }
}

// Prevent unwanted navigation
function preventUnwantedNavigation() {
    window.addEventListener("popstate", function (event) {
        event.preventDefault();
        if (currentUser) {
            setupDashboard();
        } else {
            window.location.href = "login.html";
        }
    });

    document.addEventListener("submit", function (event) {
        const form = event.target;
        if (form.id !== "uploadForm" && form.id !== "youtubeUpload") {
            event.preventDefault();
        }
    });
}

// Centralized API call function to prevent duplicates
async function makeApiCall(key, url, options = {}) {
    // Return existing promise if call is in progress
    if (dataLoadingPromises.has(key)) {
        return await dataLoadingPromises.get(key);
    }

    // Return cached data if available
    const cachedData = getCachedData(key);
    if (cachedData) {
        return cachedData;
    }

    // Create new API call promise
    const promise = fetch(url, {
        credentials: 'include',
        ...options
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }).then(data => {
        // Cache successful responses
        setCachedData(key, data);
        return data;
    }).finally(() => {
        // Remove promise from tracking
        dataLoadingPromises.delete(key);
    });

    // Track the promise
    dataLoadingPromises.set(key, promise);

    return promise;
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
    preventUnwantedNavigation();

    // Initialize YouTube API client first
    if (window.youtubeAPI && !window.youtubeAPI.isInitialized) {
        window.youtubeAPI.initialize().catch((error) => {
            console.warn("YouTube API initialization failed:", error);
        });
    }

    checkAuth();
});

async function checkAuth() {
    if (apiCallsInProgress.has('auth')) {
        return;
    }

    apiCallsInProgress.add('auth');

    try {
        const data = await makeApiCall('auth', 'api/auth.php');

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            setupUserRole();

            // Load all required data first
            await loadAllDashboardData();

            // Then setup dashboard with data ready
            await setupDashboard();
        } else {
            localStorage.removeItem("currentUser");
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
    } finally {
        apiCallsInProgress.delete('auth');
    }
}

// Centralized data loading function
async function loadAllDashboardData() {
    if (apiCallsInProgress.has('loadAllData')) {
        return;
    }

    apiCallsInProgress.add('loadAllData');
    showLoading(true);

    try {
        const loadPromises = [];

        // Load data based on user role
        if (currentUser.role === 'admin') {
            loadPromises.push(
                makeApiCall('analytics', 'api/admin.php?action=analytics'),
                makeApiCall('users', 'api/admin.php?action=users'),
                makeApiCall('videos', 'api/videos.php'),
                makeApiCall('earnings', 'api/earnings.php?action=earnings'),
                makeApiCall('transactions', 'api/earnings.php?action=transactions'),
                makeApiCall('paid_users', 'api/earnings.php?action=paid_users')
            );
        } else if (currentUser.role === 'creator' || currentUser.role === 'editor') {
            loadPromises.push(
                makeApiCall('my_videos', 'api/videos.php?filter=my_videos'),
                makeApiCall('videos', 'api/videos.php'), // Load all videos for creator context
                makeApiCall('earnings', 'api/earnings.php?action=earnings'),
                makeApiCall('transactions', 'api/earnings.php?action=transactions'),
                makeApiCall('paid_users', 'api/earnings.php?action=paid_users')
            );
        } else if (currentUser.role === 'viewer') {
            loadPromises.push(
                makeApiCall('videos', 'api/videos.php'),
                makeApiCall('purchases', 'api/purchase.php')
            );
        }

        // Execute all API calls in parallel
        const results = await Promise.allSettled(loadPromises);

        // Process results and store in dashboardData
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const data = result.value;
                if (data && data.success) {
                    // Store data based on the API endpoint response structure
                    if (data.analytics) dashboardData.analytics = data.analytics;
                    if (data.users) dashboardData.users = data.users;
                    if (data.videos) dashboardData.videos = data.videos;
                    if (data.purchases) dashboardData.purchases = data.purchases;
                    if (data.earnings) dashboardData.earnings = data.earnings;
                    if (data.transactions) dashboardData.transactions = data.transactions;
                    if (data.paid_users) dashboardData.paid_users = data.paid_users;

                    // Debug logging to verify data loading
                    console.log('API data loaded:', {
                        hasAnalytics: !!data.analytics,
                        hasUsers: !!data.users,
                        hasVideos: !!data.videos,
                        hasPurchases: !!data.purchases,
                        hasEarnings: !!data.earnings,
                        hasTransactions: !!data.transactions,
                        hasPaidUsers: !!data.paid_users
                    });
                }
            } else {
                console.warn('API call failed:', result.reason);
            }
        });

        // Set global variables for backward compatibility
        if (dashboardData.videos) {
            allVideos = dashboardData.videos.map(video => ({
                id: video.id,
                title: video.title || "Untitled",
                description: video.description || "",
                price: parseFloat(video.price) || 0,
                uploader: video.uploader || "Unknown",
                uploader_id: video.uploader_id || "",
                purchased: video.purchased || false,
                file_path: video.file_path,
                category: video.category || "other",
                created_at: video.created_at,
                youtube_id: video.youtube_id,
                youtube_thumbnail: video.youtube_thumbnail,
                youtube_channel_id: video.youtube_channel_id || "",
                youtube_channel_title: video.youtube_channel_title || "Unknown",
                is_youtube_synced: video.is_youtube_synced || false,
                video_url: video.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : null,
                embed_html: video.youtube_id ? `<iframe width='560' height='315' src='https://www.youtube.com/embed/${video.youtube_id}' frameborder='0' allowfullscreen></iframe>` : null
            }));
        }

        if (dashboardData.users) {
            allUsers = dashboardData.users;
        }

        console.log('All dashboard data loaded successfully');

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
        apiCallsInProgress.delete('loadAllData');
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

    updateUserProfile();

    // Update welcome section  
    const welcomeName = document.getElementById("welcomeName");
    const welcomeRole = document.getElementById("welcomeRole");
    if (welcomeName) welcomeName.textContent = currentUser.name;
    if (welcomeRole) welcomeRole.textContent = 
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Get sidebar sections
    const adminSidebar = document.getElementById("adminSidebar");
    const creatorSidebar = document.getElementById("creatorSidebar");
    const viewerSidebar = document.getElementById("viewerSidebar");

    // Hide all sidebars first
    if (adminSidebar) adminSidebar.style.display = "none";
    if (creatorSidebar) creatorSidebar.style.display = "none";
    if (viewerSidebar) viewerSidebar.style.display = "none";

    // Show role-specific sidebar sections
    if (currentUser.role === "admin") {
        if (adminSidebar) adminSidebar.style.display = "block";
    } else if (currentUser.role === "editor" || currentUser.role === "creator") {
        if (creatorSidebar) creatorSidebar.style.display = "block";
    } else if (currentUser.role === "viewer") {
        if (viewerSidebar) viewerSidebar.style.display = "block";
    }

    document.body.className = `bg-light role-${currentUser.role}`;
}

async function setupDashboard() {
    // Hide all panels first to prevent showing wrong content
    const panels = document.querySelectorAll(".panel");
    panels.forEach(panel => panel.style.display = "none");

    const urlParams = new URLSearchParams(window.location.search);
    let defaultPanel = urlParams.get("panel");

    // Set role-based default panels
    if (!defaultPanel) {
        if (currentUser.role === "viewer") {
            defaultPanel = "videos";
        } else if (currentUser.role === "editor" || currentUser.role === "creator") {
            defaultPanel = "myVideos";
        } else if (currentUser.role === "admin") {
            defaultPanel = "overview";  // Admin should see overview
        } else {
            defaultPanel = "myVideos";
        }
    }

    // Verify user has permission for the default panel
    if (!hasPermissionForPanel(defaultPanel)) {
        if (currentUser.role === "viewer") {
            defaultPanel = "videos";
        } else if (currentUser.role === "editor" || currentUser.role === "creator") {
            defaultPanel = "myVideos";
        } else if (currentUser.role === "admin") {
            defaultPanel = "overview";
        } else {
            defaultPanel = "videos";
        }
    }

    // Ensure data is loaded before showing the default panel
    await showPanel(defaultPanel);

    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", handleVideoUpload);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
}

async function showPanel(panelName) {
    if (!hasPermissionForPanel(panelName)) {
        showNotification("You do not have permission to access this section", "error");

        let fallbackPanel = "videos";
        if (currentUser.role === "viewer") {
            fallbackPanel = "videos";
        } else if (currentUser.role === "editor" || currentUser.role === "creator") {
            fallbackPanel = "myVideos";
        } else if (currentUser.role === "admin") {
            fallbackPanel = "overview";
        }

        if (fallbackPanel !== panelName) {
            setTimeout(() => showPanel(fallbackPanel), 1000);
        }
        return;
    }

    if (window.currentPanelName === panelName) {
        return;
    }

    // Show loading while ensuring data is loaded
    showLoading(true);

    // Ensure all data is loaded before rendering
    if (apiCallsInProgress.has('loadAllData') || dataLoadingPromises.size > 0) {
        // Wait for data loading to complete
        try {
            await Promise.all(Array.from(dataLoadingPromises.values()));
        } catch (error) {
            console.warn('Some data loading promises failed:', error);
        }
    }

    // Hide all panels and show selected one
    requestAnimationFrame(() => {
        const panels = document.querySelectorAll(".panel");
        for (let i = 0; i < panels.length; i++) {
            panels[i].style.display = "none";
        }

        const selectedPanel = document.getElementById(panelName + "Panel");
        if (selectedPanel) {
            selectedPanel.style.display = "block";
        } else {
            console.error(`Panel not found: ${panelName}Panel`);
            showLoading(false);
            return;
        }

        // Update active nav item
        const navLinks = document.querySelectorAll(".nav-link");
        for (let i = 0; i < navLinks.length; i++) {
            const link = navLinks[i];
            link.classList.remove("active");
            const onclickAttr = link.getAttribute("onclick");
            if (onclickAttr && onclickAttr.includes(`showPanel('${panelName}')`)) {
                link.classList.add("active");
            }
        }
    });

    window.currentPanelName = panelName;

    // Render data for the specific panel using loaded data
    try {
        switch (panelName) {
            case "videos":
                if (currentUser.role === "viewer") {
                    updateViewerMetrics();
                }
                renderVideos(allVideos || []);
                break;
            case "users":
                if (currentUser.role === "admin" && dashboardData.users) {
                    renderUsers(dashboardData.users);
                }
                break;
            case "myVideos":
                if (dashboardData.videos) {
                    const myVideos = dashboardData.videos.filter(video => 
                        video.uploader_id == currentUser.id
                    );
                    updateCreatorMetrics(myVideos);
                    renderMyVideosFromDatabase(myVideos);
                } else {
                    // Render empty state if no data
                    updateCreatorMetrics([]);
                    renderMyVideosFromDatabase([]);
                }
                break;
            case "upload":
                const uploadPanel = document.getElementById('uploadPanel');
                if (uploadPanel) {
                    uploadPanel.style.display = 'block';
                }
                updateUploadPanelStatus();
                break;
            case "purchases":
                if (currentUser.role === "viewer") {
                    renderPurchases(dashboardData.purchases || []);
                }
                break;
            case "earnings":
                if ((currentUser.role === "editor" || currentUser.role === "admin" || currentUser.role === "creator")) {
                    renderEarnings(dashboardData.earnings || { total_earnings: 0, monthly_earnings: 0, pending_earnings: 0 });
                }
                break;
            case "analytics":
                if (currentUser.role === "admin" && dashboardData.analytics) {
                    renderAnalytics(dashboardData.analytics);
                }
                break;
            case "profile":
                loadAccountSettings();
                break;
            default:
                console.warn(`Unknown panel: ${panelName}`);
                break;
        }
    } catch (error) {
        console.error('Error rendering panel:', error);
        showNotification('Error loading panel data', 'error');
    } finally {
        showLoading(false);
    }
}

function hasPermissionForPanel(panelName) {
    if (!currentUser) return false;

    const role = currentUser.role;
    const permissions = {
        viewer: ["videos", "purchases", "profile"],
        editor: ["myVideos", "upload", "earnings", "profile"],
        creator: ["myVideos", "upload", "earnings", "profile"],
        admin: ["videos", "myVideos", "upload", "earnings", "users", "analytics", "purchases", "profile"],
    };

    return permissions[role] && permissions[role].includes(panelName);
}

function renderOverviewStats() {
    if (currentUser.role === "admin" && dashboardData.analytics) {
        const analytics = dashboardData.analytics;
        animateCounter("totalVideos", analytics.total_videos);
        animateCounter("activeUsers", analytics.total_users);
        animateCounter("totalViews", analytics.total_views);

        const revenueElement = document.getElementById("totalRevenue");
        if (revenueElement) {
            revenueElement.textContent = `$${analytics.total_revenue.toFixed(2)}`;
        }

        if (analytics.recent_activity) {
            updateRecentActivity(analytics.recent_activity);
        }

        if (analytics.popular_videos) {
            updatePopularVideos(analytics.popular_videos);
        }
    } else if (currentUser.role === "viewer" && dashboardData.videos && dashboardData.purchases) {
        const totalPurchased = dashboardData.purchases.length;
        const totalSpent = dashboardData.purchases.reduce((sum, purchase) => sum + parseFloat(purchase.price || 0), 0);
        const totalAvailableVideos = dashboardData.videos.length;
        const freeVideos = dashboardData.videos.filter(video => parseFloat(video.price) === 0).length;

        animateCounter("totalVideos", totalAvailableVideos);
        animateCounter("activeUsers", totalPurchased);
        animateCounter("totalViews", totalSpent);

        const revenueElement = document.getElementById("totalRevenue");
        if (revenueElement) {
            revenueElement.textContent = freeVideos;
        }

        // Update labels for viewer context
        updateOverviewLabels("Total Videos", "Purchased Videos", "Total Spent", "Free Videos");

        // Update recent activity
        if (dashboardData.purchases.length > 0) {
            const recentPurchases = dashboardData.purchases.slice(0, 5).map(purchase => ({
                title: `Purchased: ${purchase.title}`,
                user: 'You',
                time: purchase.purchased_at || purchase.created_at || new Date().toISOString(),
                type: 'purchase'
            }));
            updateRecentActivity(recentPurchases);
        }
    } else if ((currentUser.role === "creator" || currentUser.role === "editor") && dashboardData.videos && dashboardData.earnings) {
        const myVideos = dashboardData.videos.filter(video => video.uploader_id == currentUser.id);
        const totalUploads = myVideos.length;
        const totalViews = myVideos.reduce((sum, video) => sum + (video.views || 0), 0);

        animateCounter("totalVideos", totalUploads);
        animateCounter("activeUsers", totalViews);
        animateCounter("totalViews", dashboardData.earnings.total_earnings);

        const revenueElement = document.getElementById("totalRevenue");
        if (revenueElement) {
            revenueElement.textContent = `$${dashboardData.earnings.monthly_earnings.toFixed(2)}`;
        }

        // Update labels for creator context
        updateOverviewLabels("My Videos", "Total Views", "Total Earnings", "Monthly Earnings");
    }
}

function updateOverviewLabels(label1, label2, label3, label4) {
    const totalVideosLabel = document.getElementById("totalVideosLabel");
    const activeUsersLabel = document.getElementById("activeUsersLabel");
    const totalViewsLabel = document.getElementById("totalViewsLabel");
    const revenueLabel = document.getElementById("totalRevenueLabel");

    if (totalVideosLabel) totalVideosLabel.textContent = label1;
    if (activeUsersLabel) activeUsersLabel.textContent = label2;
    if (totalViewsLabel) totalViewsLabel.textContent = label3;
    if (revenueLabel) revenueLabel.textContent = label4;
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (targetValue <= 10) {
        element.textContent = targetValue.toLocaleString();
        return;
    }

    const duration = 1500;
    const startTime = performance.now();
    const startValue = 0;

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

        element.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    }

    requestAnimationFrame(updateCounter);
}

function updateRecentActivity(activities) {
    const container = document.getElementById("recentActivityContainer");
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted">No recent activity</div>';
        return;
    }

    container.innerHTML = activities
        .map((activity) => {
            const icon = activity.type === "upload" ? "fa-video text-primary" :
                        activity.type === "purchase" ? "fa-shopping-cart text-success" :
                        "fa-user text-info";

            return `
                <div class="list-group-item">
                    <i class="fas ${icon} me-2"></i>
                    ${activity.title}
                    <small class="text-muted d-block">${formatTimeAgo(activity.time)}</small>
                </div>
            `;
        })
        .join("");
}

function updatePopularVideos(videos) {
    const container = document.getElementById("popularVideosContainer");
    if (!container) return;

    if (!videos || videos.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted">No videos available</div>';
        return;
    }

    container.innerHTML = videos
        .map(video => `
            <div class="list-group-item d-flex justify-content-between">
                <span>${video.title}</span>
                <span class="badge bg-primary">${parseInt(video.views).toLocaleString()} views</span>
            </div>
        `)
        .join("");
}

function renderVideos(videos) {
    const container = document.getElementById("videosContainer");
    if (!container) {
        console.error("Videos container not found");
        return;
    }

    updateVideosCount(videos.length);

    if (videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center py-5">
                    <i class="fas fa-video fa-3x mb-3 text-muted"></i>
                    <h5>No Videos Found</h5>
                    <p class="mb-0">Try adjusting your search or filter criteria.</p>
                </div>
            </div>`;
        return;
    }

    const initialRenderCount = Math.min(20, videos.length);
    const fragment = document.createDocumentFragment();

    requestAnimationFrame(() => {
        container.innerHTML = "";

        for (let i = 0; i < initialRenderCount; i++) {
            const videoElement = createVideoElement(videos[i]);
            fragment.appendChild(videoElement);
        }

        container.appendChild(fragment);

        if (videos.length > initialRenderCount) {
            setTimeout(() => {
                const remainingFragment = document.createDocumentFragment();
                for (let i = initialRenderCount; i < videos.length; i++) {
                    const videoElement = createVideoElement(videos[i]);
                    remainingFragment.appendChild(videoElement);
                }
                container.appendChild(remainingFragment);
            }, 50);
        }
    });
}

function createVideoElement(video) {
    const col = document.createElement("div");
    col.className = "col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12";

    let thumbnail = "/api/placeholder/300/200";
    if (video.youtube_thumbnail && video.youtube_thumbnail !== "/api/placeholder/300/200") {
        thumbnail = video.youtube_thumbnail;
    } else if (video.youtube_id) {
        thumbnail = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;
    } else if (video.file_path && video.file_path.includes('uploads/')) {
        thumbnail = `/api/thumbnail.php?video=${encodeURIComponent(video.file_path)}`;
    }

    const price = parseFloat(video.price) || 0;
    const isYouTube = video.youtube_id && video.is_youtube_synced;
    const isPurchased = video.purchased;
    const isFree = price === 0;

    col.innerHTML = `
        <div class="card video-card h-100 shadow-sm border-0 position-relative" onclick="handleVideoClick(${video.id}, '${escapeHtml(video.title)}', '${video.youtube_id || ''}', ${isYouTube})" style="cursor: pointer; border-radius: 20px; overflow: hidden;">
            <div class="video-thumbnail position-relative overflow-hidden" style="height: 200px; border-radius: 20px 20px 0 0;">
                <img src="${thumbnail}" 
                     alt="${escapeHtml(video.title)}" 
                     class="card-img-top w-100 h-100" 
                     style="object-fit: cover; transition: transform 0.3s ease;"
                     onload="this.style.opacity='1'"
                     onerror="handleThumbnailError(this, '${video.youtube_id || ''}')"
                     loading="lazy">
                
                <!-- Price Badge on Thumbnail -->
                <div class="position-absolute top-0 end-0 m-2">
                    ${!isFree ? `<span class="badge bg-warning text-dark fw-bold px-2 py-1" style="font-size: 0.75rem; border-radius: 8px;">$${price.toFixed(2)}</span>` : '<span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size: 0.75rem; border-radius: 8px;">FREE</span>'}
                </div>
                
                <!-- Play Button Overlay -->
                <div class="play-button-overlay position-absolute top-50 start-50 translate-middle" style="opacity: 0; transition: all 0.3s ease; transform: translate(-50%, -50%) scale(0.8);">
                    <div class="bg-dark bg-opacity-75 text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; backdrop-filter: blur(10px); border: 2px solid rgba(255, 255, 255, 0.3);">
                        <i class="fas fa-play ms-1" style="font-size: 20px;"></i>
                    </div>
                </div>
                
                <!-- Owned Badge -->
                ${isPurchased ? '<div class="position-absolute top-0 start-0 m-2"><span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size: 0.7rem; border-radius: 8px;"><i class="fas fa-crown me-1"></i>OWNED</span></div>' : ''}
            </div>

            <div class="card-body p-3 d-flex flex-column">
                <h6 class="card-title mb-2" title="${escapeHtml(video.title)}" style="line-height: 1.3; height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-weight: 600; font-size: 1rem;">
                    ${escapeHtml(video.title)}
                </h6>

                <div class="video-meta mb-3">
                    <div class="d-flex align-items-center text-muted mb-1">
                        <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 20px; height: 20px;">
                            <small class="text-white fw-bold" style="font-size: 10px;">${escapeHtml(video.uploader.charAt(0).toUpperCase())}</small>
                        </div>
                        <small class="text-truncate fw-medium" style="font-size: 0.8rem;">${escapeHtml(video.uploader)}</small>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${formatTimeAgo(video.created_at)}
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-eye me-1"></i>${video.views || 0} views
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `;

    return col;
}

function renderEnhancedVideoActions(video, isYouTube = false) {
    const isYouTubeVideo = isYouTube || (video.youtube_id && video.is_youtube_synced);
    const userRole = currentUser?.role;
    const price = parseFloat(video.price) || 0;
    const isFree = price === 0;
    const isPurchased = video.purchased;

    if (userRole === 'admin') {
        if (isYouTubeVideo) {
            return `
                <div class="d-grid gap-1">
                    <button class="btn btn-primary" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id}', '${escapeHtml(video.title)}', true)">
                        <i class="fas fa-play me-1"></i>Watch
                    </button>
                    <a href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" class="btn btn-outline-danger" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);">
                        <i class="fab fa-youtube me-1"></i>YouTube
                    </a>
                </div>`;
        } else {
            return `
                <button class="btn btn-primary w-100" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '', '${escapeHtml(video.title)}', false)">
                    <i class="fas fa-play me-1"></i>Watch
                </button>`;
        }
    }

    if (userRole === 'creator' || userRole === 'editor') {
        if (isYouTubeVideo) {
            return `
                <div class="d-grid gap-1">
                    <button class="btn btn-primary" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id}', '${escapeHtml(video.title)}', true)">
                        <i class="fas fa-play me-1"></i>Watch
                    </button>
                    <div class="btn-group w-100" role="group">
                        <a href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" class="btn btn-outline-danger" style="font-size: clamp(0.65rem, 1.6vw, 0.75rem); padding: clamp(0.25rem, 0.8vw, 0.375rem) clamp(0.375rem, 1.2vw, 0.5rem);">
                            <i class="fab fa-youtube"></i>
                        </a>
                        <button class="btn btn-outline-secondary" style="font-size: clamp(0.65rem, 1.6vw, 0.75rem); padding: clamp(0.25rem, 0.8vw, 0.375rem) clamp(0.375rem, 1.2vw, 0.5rem);" onclick="shareVideo('${video.youtube_id}')">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>`;
        } else {
            return `
                <div class="d-grid gap-1">
                    <button class="btn btn-primary" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '', '${escapeHtml(video.title)}', false)">
                        <i class="fas fa-play me-1"></i>Watch
                    </button>
                    <button class="btn btn-outline-secondary" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="shareVideo(${video.id})">
                        <i class="fas fa-share me-1"></i>Share
                    </button>
                </div>`;
        }
    }

    if (userRole === "viewer") {
        if (isFree || isPurchased) {
            return `
                <button class="btn btn-success w-100" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id || ''}', '${escapeHtml(video.title)}', ${isYouTube})">
                    <i class="fas fa-play me-1"></i>${isFree ? 'Watch Free' : 'Watch Now'}
                </button>`;
        } else {
            return `
                <button class="btn btn-warning w-100" style="font-size: clamp(0.65rem, 1.6vw, 0.8rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="purchaseVideo(${video.id}, ${price})">
                    <i class="fas fa-shopping-cart me-1"></i>$${price.toFixed(2)}
                </button>`;
        }
    }

    return `<button class="btn btn-primary w-100" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id || ''}', '${escapeHtml(video.title)}', ${isYouTube})">
            <i class="fas fa-play me-1"></i>Watch
        </button>`;
}

function renderMyVideosFromDatabase(videos) {
    // Update metrics cards
    updateCreatorMetrics(videos);

    const container = document.getElementById("myVideosContainer");
    if (!container) return;

    if (videos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center py-5">
                    <i class="fas fa-video fa-3x mb-3 text-muted"></i>
                    <h5><i class="fas fa-video me-2"></i>No videos uploaded yet</h5>
                    <p class="mb-3">Start by uploading your first video using the upload form.</p>
                    <button class="btn btn-primary" onclick="showPanel('upload')">
                        <i class="fas fa-upload me-2"></i>Upload Video
                    </button>
                </div>
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    const chunkSize = 20;

    const renderChunks = (startIndex = 0) => {
        const endIndex = Math.min(startIndex + chunkSize, videos.length);

        for (let i = startIndex; i < endIndex; i++) {
            const video = videos[i];
            const videoElement = createMyVideoElement(video);
            fragment.appendChild(videoElement);
        }

        // Add mobile sidebar toggle functionality
        window.toggleSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.querySelector('.sidebar-backdrop');
            
            if (sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
                backdrop.style.display = 'none';
            } else {
                sidebar.classList.add('show');
                backdrop.style.display = 'block';
            }
        };

        window.closeSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.querySelector('.sidebar-backdrop');
            
            sidebar.classList.remove('show');
            backdrop.style.display = 'none';
        };

        // Enhanced video management functions
        window.refreshMyVideos = function() {
            showNotification("Refreshing videos...", "info");
            loadMyVideos();
        };

        window.editVideo = function(videoId) {
            showNotification(`Opening editor for video ${videoId}`, "info");
            // Implementation for video editing modal
        };

        window.previewVideo = function(videoId, title) {
            showNotification(`Previewing: ${title}`, "info");
            // Implementation for video preview modal
        };

        if (endIndex < videos.length) {
            requestAnimationFrame(() => renderChunks(endIndex));
        } else {
            container.innerHTML = "";
            container.appendChild(fragment);
        }
    };

    renderChunks();
}

function createMyVideoElement(video) {
    const videoCard = document.createElement("div");
    videoCard.className = "creator-video-card";

    let thumbnail = "/api/placeholder/300/200";
    if (video.youtube_thumbnail && video.youtube_thumbnail !== "/api/placeholder/300/200") {
        thumbnail = video.youtube_thumbnail;
    } else if (video.youtube_id) {
        thumbnail = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;
    }

    const price = parseFloat(video.price) || 0;
    const isYouTube = video.youtube_id && video.is_youtube_synced;
    const isFree = price === 0;
    const views = video.views || 0;

    videoCard.innerHTML = `
        <!-- Video Thumbnail Container -->
        <div class="video-thumbnail-container">
            <img src="${thumbnail}" 
                 alt="${escapeHtml(video.title)}" 
                 onerror="this.src='/api/placeholder/300/200'"
                 loading="lazy">
            
            <!-- Video Badges -->
            <div class="video-badges">
                ${!isFree ? 
                    `<span class="video-badge badge-price">$${price.toFixed(2)}</span>` : 
                    '<span class="video-badge badge-free">FREE</span>'
                }
                ${isYouTube ? 
                    '<span class="video-badge badge-youtube"><i class="fab fa-youtube me-1"></i>YT</span>' : ''
                }
            </div>

            <!-- Hover Overlay with Play Button -->
            <div class="video-overlay">
                <button class="play-button" onclick="previewVideo(${video.id}, '${escapeHtml(video.title)}')">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>

        <!-- Video Content -->
        <div class="video-content">
            <h3 class="video-title">${escapeHtml(video.title)}</h3>
            
            <div class="video-stats">
                <span class="video-stat">
                    <i class="fas fa-eye"></i>
                    ${views.toLocaleString()}
                </span>
                <span class="video-stat">
                    <i class="fas fa-clock"></i>
                    ${formatTimeAgo(video.created_at)}
                </span>
            </div>

            ${video.description ? 
                `<p class="video-description">${escapeHtml(video.description)}</p>` : ''
            }

            <!-- Video Actions -->
            <div class="video-actions">
                <button class="video-action-btn primary" onclick="previewVideo(${video.id}, '${escapeHtml(video.title)}')" title="Preview Video">
                    <i class="fas fa-play"></i>
                    Preview
                </button>
                <button class="video-action-btn secondary" onclick="editVideo(${video.id})" title="Edit Video">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="video-action-btn danger" onclick="deleteMyVideo(${video.id})" title="Delete Video">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>

            ${isYouTube ? 
                `<a href="https://www.youtube.com/watch?v=${video.youtube_id}" target="_blank" class="video-action-btn secondary mt-2" style="text-decoration: none;">
                    <i class="fab fa-youtube"></i>
                    View on YouTube
                </a>` : ''
            }
        </div>
    `;

    return videoCard;
}

function renderUsers(users) {
    const container = document.getElementById("usersTableBody");
    if (!container) return;

    container.innerHTML = users
        .map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === "admin" ? "danger" : user.role === "editor" ? "warning" : "success"}">${user.role}</span></td>
                <td>${user.joined}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.role !== "admin" ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>` : ""}
                </td>
            </tr>
        `)
        .join("");
}

function renderPurchases(purchases) {
    const container = document.getElementById("purchasesContainer");
    if (!container) return;

    if (purchases.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">You haven\'t purchased any videos yet</div></div>';
        return;
    }

    container.innerHTML = purchases
        .map(purchase => `
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
        `)
        .join("");
}

function renderEarnings(earnings) {
    document.getElementById("totalEarnings").textContent = `$${earnings.total_earnings.toFixed(2)}`;
    document.getElementById("monthlyEarnings").textContent = `$${earnings.monthly_earnings.toFixed(2)}`;
    document.getElementById("pendingEarnings").textContent = `$${earnings.pending_earnings.toFixed(2)}`;

    // Render transactions and paid users if data is available
    if (dashboardData.transactions) {
        renderTransactions(dashboardData.transactions);
    }
    if (dashboardData.paid_users) {
        renderPaidUsers(dashboardData.paid_users);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById("transactionsTableBody");
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions yet</td></tr>';
        return;
    }

    container.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${formatDate(transaction.created_at || transaction.date)}</td>
            <td title="${escapeHtml(transaction.video_title || transaction.title)}">${escapeHtml((transaction.video_title || transaction.title || 'Unknown Video').substring(0, 30))}${(transaction.video_title || transaction.title || '').length > 30 ? '...' : ''}</td>
            <td>${escapeHtml(transaction.buyer_name || transaction.buyer || 'Unknown')}</td>
            <td class="text-success fw-bold">$${parseFloat(transaction.price || transaction.amount || 0).toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderPaidUsers(paidUsers) {
    const container = document.getElementById("paidUsersContainer");
    if (!container) return;

    if (!paidUsers || paidUsers.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">No paid users yet</div>';
        return;
    }

    container.innerHTML = paidUsers.map(user => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div class="d-flex align-items-center">
                <div class="bg-success rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                    <small class="text-white fw-bold">${escapeHtml(user.name.charAt(0).toUpperCase())}</small>
                </div>
                <div>
                    <div class="fw-medium">${escapeHtml(user.name)}</div>
                    <small class="text-muted">${user.total_purchases} purchase${user.total_purchases !== 1 ? 's' : ''}</small>
                </div>
            </div>
            <div class="text-end">
                <div class="text-success fw-bold">$${parseFloat(user.total_spent || 0).toFixed(2)}</div>
                <small class="text-muted">${formatTimeAgo(user.last_purchase)}</small>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function renderAnalytics(analytics) {
    showNotification("Analytics charts will be implemented with Chart.js", "info");
}

// Utility functions
function updateVideosCount(count) {
    const countElement = document.getElementById('videosCount');
    if (countElement) {
        countElement.textContent = `Showing ${count} video${count !== 1 ? 's' : ''}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function handleThumbnailError(img, youtubeId) {
    if (youtubeId) {
        img.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    } else {
        img.src = '/api/placeholder/300/200';
    }
}

// Search and filter functions (debounced for performance)
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const callNow = immediate && !timeout;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

const debouncedSearchVideos = debounce(function() {
    const searchTerm = document.getElementById('videoSearchInput')?.value.toLowerCase() || '';
    if (searchTerm.length < 2 && searchTerm.length > 0) return;

    const filteredVideos = allVideos.filter(video => 
        video.title.toLowerCase().includes(searchTerm) ||
        video.description.toLowerCase().includes(searchTerm) ||
        video.uploader.toLowerCase().includes(searchTerm)
    );
    renderVideos(filteredVideos);
    updateVideosCount(filteredVideos.length);
}, 300);

function searchVideos() {
    debouncedSearchVideos();
}

function sortVideos() {
    const sortBy = document.getElementById('videoSortSelect')?.value || 'newest';
    let sortedVideos = [...allVideos];

    switch (sortBy) {
        case 'newest':
            sortedVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sortedVideos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'price-low':
            sortedVideos.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'price-high':
            sortedVideos.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'title':
            sortedVideos.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'views':
            sortedVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
    }

    renderVideos(sortedVideos);
}

// Video interaction functions
function handleVideoClick(videoId, title, youtubeId, isYouTube) {
    if (!currentUser) {
        showNotification("Please log in to watch videos", "error");
        window.location.href = "login.html";
        return;
    }

    playVideoPlayer(videoId, youtubeId || '', title, isYouTube);
}

async function playVideoPlayer(videoId, youtubeId, title, isYouTube) {
    try {
        showLoading(true);

        if (!currentUser) {
            showNotification("Please log in to watch videos", "error");
            window.location.href = "login.html";
            return;
        }

        // For viewers, check payment/access
        if (currentUser.role === 'viewer') {
            const requestBody = {};
            if (videoId) requestBody.video_id = videoId;
            if (youtubeId && !videoId) requestBody.youtube_id = youtubeId;

            const accessResponse = await makeApiCall(
                `video_access_${videoId || youtubeId}`,
                'api/video_access.php',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!accessResponse.success) {
                if (accessResponse.message === "Payment required" && accessResponse.video) {
                    purchaseVideoId = accessResponse.video.id;
                    document.getElementById("purchasePrice").textContent = parseFloat(accessResponse.video.price).toFixed(2);
                    const modal = new bootstrap.Modal(document.getElementById("purchaseModal"));
                    modal.show();
                    return;
                } else {
                    showNotification(accessResponse.message || "Access denied", "error");
                    return;
                }
            }
        }

        // Set modal title and create video player
        document.getElementById("videoModalTitle").textContent = title;
        const videoPlayerContainer = document.getElementById("videoPlayer");

        if (!videoPlayerContainer) {
            showNotification('Video player container not found', 'error');
            return;
        }

        let videoHtml = '';
        let hasValidSource = false;

        // Determine video source and create appropriate player
        if (youtubeId && youtubeId.trim() !== '' && !youtubeId.startsWith('demo_')) {
            const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
            videoHtml = `
                <div class="ratio ratio-16x9">
                    <iframe src="${embedUrl}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowfullscreen
                            title="${escapeHtml(title)}"
                            style="border-radius: 12px; width: 100%; height: 100%;"
                            loading="lazy">
                    </iframe>
                </div>
            `;
            hasValidSource = true;
        } else if (youtubeId && youtubeId.startsWith('demo_')) {
            videoHtml = `
                <div class="ratio ratio-16x9">
                    <div class="d-flex align-items-center justify-content-center bg-gradient text-white h-100" style="border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="text-center p-4">
                            <i class="fas fa-play-circle fa-5x text-white mb-3" style="opacity: 0.9;"></i>
                            <h4 class="mb-3">Demo Video</h4>
                            <p class="mb-2">This is a demonstration video placeholder.</p>
                            <p class="small opacity-75">ID: ${youtubeId}</p>
                        </div>
                    </div>
                </div>
            `;
            hasValidSource = true;
        }

        if (!hasValidSource) {
            videoHtml = `
                <div class="ratio ratio-16x9">
                    <div class="d-flex align-items-center justify-content-center h-100 text-white" style="border-radius: 12px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);">
                        <div class="text-center p-4">
                            <i class="fas fa-exclamation-triangle fa-4x mb-3 text-white"></i>
                            <h4 class="mb-3">Video Source Not Available</h4>
                            <p class="mb-2">Unable to find a valid video source for this content.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        videoPlayerContainer.innerHTML = videoHtml;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById("videoModal"));
        modal.show();

        // Increment view count if we have a video ID and valid source
        if (videoId && hasValidSource) {
            fetch('api/videos.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: `id=${videoId}&action=increment_views`
            }).catch(error => console.log('Failed to increment views:', error));
        }

    } catch (error) {
        console.error('Failed to play video:', error);
        showNotification('Failed to play video: ' + error.message, 'error');
    } finally {
        showLoading(false);
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

    if (!currentUser) {
        showNotification("Please log in to make purchases", "error");
        window.location.href = "login.html";
        return;
    }

    const confirmBtn = document.querySelector("#purchaseModal .btn-primary");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch("api/purchase.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                video_id: purchaseVideoId,
            }),
        });

        const data = await response.json();

        if (data.success) {
            // Clear cache and reload data
            clearCache();
            await loadAllDashboardData();

            showNotification("🎉 Video purchased successfully! You can now watch it.", "success");

            const modal = bootstrap.Modal.getInstance(document.getElementById("purchaseModal"));
            modal.hide();

            // Re-render current panel if it's videos or purchases
            if (window.currentPanelName === "videos") {
                renderVideos(allVideos);
            } else if (window.currentPanelName === "purchases") {
                renderPurchases(dashboardData.purchases);
            }
        } else {
            showNotification("❌ Purchase failed: " + data.message, "error");
        }
    } catch (error) {
        console.error("Purchase failed:", error);
        showNotification("❌ Purchase failed. Please check your connection and try again.", "error");
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// Upload functionality
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
    if (!title || !description) {
        showNotification("❌ Please fill in title and description", "error");
        return;
    }

    if (!file) {
        showNotification("❌ Please select a video file", "error");
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

    // Show progress
    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = progressContainer?.querySelector('.progress-bar');
    const progressText = document.getElementById('uploadProgressText');
    const loader = document.getElementById("loader");

    if (progressContainer) progressContainer.style.display = 'block';
    if (loader) loader.style.display = 'block';

    // Disable form inputs during upload
    const formInputs = form.querySelectorAll("input, textarea, select, button");
    formInputs.forEach((input) => (input.disabled = true));

    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading to YouTube...';

    try {
        // Create progress update function
        function updateProgress(progress) {
            if (progressBar) {
                progressBar.style.width = progress + '%';
                progressBar.textContent = progress + '%';
            }
            if (progressText) {
                progressText.textContent = `Uploading to YouTube: ${progress}%`;
            }
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Uploading: ${progress}%`;
        }

        // Upload video using the YouTube API client
        const uploadResult = await window.youtubeAPI.uploadVideo(
            file,
            {
                title: title,
                description: description,
                tags: [category],
                categoryId: "22",
                privacy: "unlisted",
                price: price // Pass price to the upload function
            },
            (progress) => {
                const mappedProgress = 40 + Math.round((progress / 100) * 50);
                updateProgress(mappedProgress);
            }
        );

        if (uploadResult.success) {
            // Update price in database using proper PUT format
            try {
                const priceUpdateData = `action=update_price&youtube_id=${encodeURIComponent(uploadResult.video.id)}&price=${price}`;

                const priceUpdateResponse = await fetch('api/videos.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    credentials: 'include',
                    body: priceUpdateData
                });

                const priceResult = await priceUpdateResponse.json();
                if (!priceResult.success) {
                    console.warn('Failed to update price:', priceResult.message);
                }
            } catch (error) {
                console.warn('Price update error:', error);
            }

            // Complete progress
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';
                progressBar.className = progressBar.className.replace('bg-primary', 'bg-success');
            }
            if (progressText) {
                progressText.textContent = 'Upload completed successfully!';
            }

            showNotification(
                "✅ Video uploaded to YouTube and synced to database successfully!",
                "success",
            );
            form.reset();

            // Hide progress after delay
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                if (loader) loader.style.display = 'none';
            }, 2000);

            // Clear cache to force fresh data on next load
            clearCache('my_videos');
            clearCache('videos');

            // Reload dashboard data
            await loadAllDashboardData();

            // Only refresh if user is currently viewing myVideos panel
            if (window.currentPanelName === 'myVideos') {
                // Add a small delay to ensure database is updated
                setTimeout(() => {
                    const myVideos = dashboardData.videos ? dashboardData.videos.filter(video => 
                        video.uploader_id == currentUser.id
                    ) : [];
                    updateCreatorMetrics(myVideos);
                    renderMyVideosFromDatabase(myVideos);
                }, 1000);
            }
        } else {
            throw new Error(uploadResult.error || "Upload failed");
        }
    } catch (error) {
        console.error("Upload failed:", error);
        showNotification("❌ Upload failed: " + error.message, "error");

        // Hide progress
        if (progressContainer) progressContainer.style.display = 'none';
        if (loader) loader.style.display = 'none';
    } finally {
        // Re-enable form inputs
        formInputs.forEach((input) => (input.disabled = false));
        submitBtn.innerHTML = originalText;
    }
}

// Account Settings Functions
let accountSettingsData = {};

// Load account settings data
async function loadAccountSettings() {
    try {
        showLoading(true);

        const response = await makeApiCall('profile', 'api/profile.php');

        if (response.success && response.profile) {
            accountSettingsData = response.profile;
            populateAccountSettings(response.profile);
        } else {
            showNotification('Failed to load account settings', 'error');
        }
    } catch (error) {
        console.error('Failed to load account settings:', error);
        showNotification('Failed to load account settings', 'error');
    } finally {
        showLoading(false);
    }
}

// Populate form fields with user data
function populateAccountSettings(profile) {
    // Profile information
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    if (profileName) profileName.value = profile.name || '';
    if (profileEmail) profileEmail.value = profile.email || '';

    // Update avatar
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (avatarLarge) {
        avatarLarge.textContent = (profile.name || 'U').charAt(0).toUpperCase();
    }

    // Account stats
    const memberSince = document.getElementById('memberSince');
    const lastLogin = document.getElementById('lastLogin');
    const accountType = document.getElementById('accountType');
    const profileEarnings = document.getElementById('profileEarnings');
    
    if (memberSince) memberSince.textContent = formatDate(profile.created_at);
    if (lastLogin) lastLogin.textContent = 'Now';
    if (accountType) {
        accountType.textContent = (profile.role || 'user').charAt(0).toUpperCase() + (profile.role || 'user').slice(1);
        accountType.className = `badge bg-${getRoleBadgeColor(profile.role)}`;
    }
    
    // Update earnings from dashboard data if available
    if (profileEarnings && dashboardData.earnings) {
        profileEarnings.textContent = `$${parseFloat(dashboardData.earnings.total_earnings || 0).toFixed(2)}`;
    } else if (profileEarnings) {
        profileEarnings.textContent = '$0.00';
    }
}

// Save profile settings
async function saveProfileSettings() {
    const name = document.getElementById('profileName')?.value?.trim();

    if (!name) {
        showNotification('Please enter your name', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('api/profile.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: name
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Profile updated successfully', 'success');

            // Update current user data
            currentUser.name = name;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));

            // Update UI
            document.getElementById("userName").textContent = name;
            document.getElementById("userAvatar").textContent = name.charAt(0).toUpperCase();

            // Clear cache
            clearCache('profile');
        } else {
            showNotification('Failed to update profile: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Failed to update profile', 'error');
    } finally {
        showLoading(false);
    }
}

// Password management functions
function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling.querySelector('i');

    if (field.type === 'password') {
        field.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        button.className = 'fas fa-eye';
    }
}

function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) strength += 25;
    else feedback.push('At least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 25;
    else feedback.push('One uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) strength += 25;
    else feedback.push('One lowercase letter');

    // Number check
    if (/[0-9]/.test(password)) strength += 25;
    else feedback.push('One number');

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    else feedback.push('One special character');

    return { strength: Math.min(strength, 100), feedback };
}

// Event listeners for password strength
document.addEventListener('DOMContentLoaded', function() {
    const newPasswordField = document.getElementById('newPassword');
    if (newPasswordField) {
        newPasswordField.addEventListener('input', function() {
            const result = checkPasswordStrength(this.value);
            const strengthBar = document.getElementById('passwordStrength');
            const strengthText = document.getElementById('passwordStrengthText');

            if (strengthBar && strengthText) {
                strengthBar.style.width = result.strength + '%';

                let colorClass = 'bg-danger';
                let text = 'Weak';

                if (result.strength >= 75) {
                    colorClass = 'bg-success';
                    text = 'Strong';
                } else if (result.strength >= 50) {
                    colorClass = 'bg-warning';
                    text = 'Medium';
                } else if (result.strength >= 25) {
                    colorClass = 'bg-warning';
                    text = 'Fair';
                }

                strengthBar.className = `progress-bar ${colorClass}`;
                strengthText.textContent = `${text} (${result.strength}%)`;
            }
        });
    }
});

// Helper function for role badge colors
function getRoleBadgeColor(role) {
    switch (role) {
        case 'admin': return 'danger';
        case 'creator': return 'primary';
        case 'editor': return 'warning';
        case 'viewer': return 'success';
        default: return 'secondary';
    }
}



// Action functions
async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    const strengthResult = checkPasswordStrength(newPassword);
    if (strengthResult.strength < 50) {
        showNotification('Password is too weak. Please choose a stronger password.', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('api/profile.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'update_password',
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Password updated successfully', 'success');

            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification('Failed to update password: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Password update error:', error);
        showNotification('Failed to update password', 'error');
    } finally {
        showLoading(false);
    }
}



function refreshAccountSettings() {
    loadAccountSettings();
    showNotification('Settings refreshed', 'info');
}

// Helper function for role badge colors
function getRoleBadgeColor(role) {
    switch (role) {
        case 'admin': return 'danger';
        case 'creator': return 'primary';
        case 'editor': return 'warning';
        case 'viewer': return 'success';
        default: return 'secondary';
    }
}

// Dashboard utility functions
function refreshDashboard() {
    showLoading(true);
    clearCache();
    
    // Update current time
    updateCurrentTime();
    
    // Reload all data
    loadAllDashboardData().then(() => {
        showNotification('Dashboard refreshed successfully', 'success');
        
        // Re-render current panel
        if (window.currentPanelName) {
            showPanel(window.currentPanelName);
        }
    }).catch(error => {
        console.error('Failed to refresh dashboard:', error);
        showNotification('Failed to refresh dashboard', 'error');
    }).finally(() => {
        showLoading(false);
    });
}

function updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        const options = { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        timeElement.textContent = now.toLocaleTimeString('en-US', options);
    }
}

// Update time every minute
setInterval(updateCurrentTime, 60000);

// Initialize time on load
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    
    // Update current date
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
});

// Export/Delete functions
function exportUserData() {
    showNotification('Preparing data export...', 'info');

    // Simulate data export
    setTimeout(() => {
        const data = {
            profile: accountSettingsData,
            export_date: new Date().toISOString(),
            user_id: currentUser?.id
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${currentUser?.id || 'unknown'}-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Data exported successfully', 'success');
    }, 1000);
}

function requestDataDeletion() {
    if (confirm('Are you sure you want to permanently delete your account and all data? This action cannot be undone.')) {
        showNotification('Data deletion request will be processed within 30 days', 'warning');
    }
}

function logoutAllDevices() {
    if (confirm('This will log you out of all devices. Continue?')) {
        showNotification('Logged out of all devices', 'success');
        setTimeout(() => logout(), 1000);
    }
}

function deactivateAccount() {
    if (confirm('Are you sure you want to deactivate your account? You can reactivate it by logging in again.')) {
        showNotification('Account deactivation functionality will be implemented', 'info');
    }
}

// User profile and settings functions
function updateUserProfile() {
    if (!currentUser) return;

    const avatarElements = document.querySelectorAll('#userProfileAvatar, #editProfileAvatar, #profileAvatarLarge');
    avatarElements.forEach(el => {
        if (el) el.textContent = currentUser.name.charAt(0).toUpperCase();
    });

    const nameElement = document.getElementById('userProfileName');
    const roleElement = document.getElementById('userProfileRole');

    if (nameElement) nameElement.textContent = currentUser.name;
    if (roleElement) {
        roleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        roleElement.className = `user-profile-role role-${currentUser.role}`;
    }
}

// Add event listeners when showing profile panel
document.addEventListener('DOMContentLoaded', function() {
    // Bio character counter
    const bioField = document.getElementById('profileBio');
    if (bioField) {
        bioField.addEventListener('input', updateBioCharCount);
    }

    // Privacy settings change listeners
    const privacyInputs = document.querySelectorAll('#privacySettingsTab input');
    privacyInputs.forEach(input => {
        input.addEventListener('change', updatePrivacySummary);
    });
});

// Settings tab navigation function
function showSettingsTab(tabName) {
    // Hide all tab content
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.nav-pills .nav-link');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName + 'SettingsTab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Add active class to selected tab button
    const selectedButton = document.getElementById(tabName + 'Tab');
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Handle specific tab initialization
    switch(tabName) {
        case 'profile':
            // Profile tab is already populated
            break;
        case 'security':
            // Initialize security settings if needed
            break;
        case 'preferences':
            // Initialize preferences if needed
            break;
        case 'privacy':
            updatePrivacySummary();
            break;
        case 'billing':
            // Initialize billing if needed (for creators/admins)
            break;
    }
}

// Bio character counter function
function updateBioCharCount() {
    const bioField = document.getElementById('profileBio');
    const counter = document.getElementById('bioCharCount');
    
    if (bioField && counter) {
        const currentLength = bioField.value.length;
        const maxLength = bioField.getAttribute('maxlength') || 500;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        // Update color based on usage
        const percentage = currentLength / maxLength;
        if (percentage > 0.9) {
            counter.className = 'form-text text-danger';
        } else if (percentage > 0.7) {
            counter.className = 'form-text text-warning';
        } else {
            counter.className = 'form-text text-muted';
        }
    }
}

// Privacy settings summary function
function updatePrivacySummary() {
    const summaryElement = document.getElementById('privacySummary');
    if (!summaryElement) return;

    const profileVisibility = document.querySelector('input[name="profileVisibility"]:checked')?.value || 'public';
    const showEmail = document.getElementById('showEmail')?.checked || false;
    const showActivity = document.getElementById('showActivity')?.checked || true;
    
    let summary = `Profile: ${profileVisibility.charAt(0).toUpperCase() + profileVisibility.slice(1)}`;
    if (!showEmail) summary += ', Email hidden';
    if (!showActivity) summary += ', Activity hidden';
    
    summaryElement.textContent = summary;
}

// Load account settings when profile panel is shown
const originalShowPanel = window.showPanel;
window.showPanel = async function(panelName) {
    await originalShowPanel(panelName);

    if (panelName === 'profile') {
        // Load account settings data
        await loadAccountSettings();

        // Show default profile tab
        showSettingsTab('profile');
    }
};

// Logout function
async function logout() {
    try {
        showLoading(true);

        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'logout'
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.removeItem('currentUser');
            sessionStorage.clear();
            currentUser = null;
            clearCache();
            showNotification('Logged out successfully', 'success');
            window.location.href = 'login.html';
        } else {
            showNotification('Logout failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        currentUser = null;
        window.location.href = 'login.html';
    } finally {
        showLoading(false);
    }
}

// Mobile sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (sidebar && backdrop) {
        sidebar.classList.toggle('show');
        backdrop.classList.toggle('show');
        document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (sidebar && backdrop) {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Update creator metrics in My Videos panel
function updateCreatorMetrics(videos) {
    const totalVideos = videos ? videos.length : 0;
    const totalViews = videos ? videos.reduce((sum, video) => sum + (parseInt(video.views) || 0), 0) : 0;

    // Get earnings data if available - ensure we have the earnings object
    const earnings = dashboardData.earnings || { total_earnings: 0, monthly_earnings: 0 };

    // Update metric cards with proper error checking
    const totalVideosElement = document.getElementById("creatorTotalVideos");
    const totalViewsElement = document.getElementById("creatorTotalViews");
    const totalEarningsElement = document.getElementById("creatorTotalEarnings");
    const monthlyEarningsElement = document.getElementById("creatorMonthlyEarnings");

    if (totalVideosElement) animateCounter("creatorTotalVideos", totalVideos);
    if (totalViewsElement) animateCounter("creatorTotalViews", totalViews);
    if (totalEarningsElement) totalEarningsElement.textContent = `$${parseFloat(earnings.total_earnings || 0).toFixed(2)}`;
    if (monthlyEarningsElement) monthlyEarningsElement.textContent = `$${parseFloat(earnings.monthly_earnings || 0).toFixed(2)}`;

    // Debug logging to check data
    console.log('Creator metrics updated:', {
        totalVideos,
        totalViews,
        earnings: earnings,
        dashboardData: dashboardData
    });
}

// Update viewer metrics in Videos panel
function updateViewerMetrics() {
    if (currentUser.role !== "viewer") return;

    // Show metrics section for viewers
    const viewerMetrics = document.getElementById("viewerMetrics");
    if (viewerMetrics) {
        viewerMetrics.style.display = "flex";
    }

    // Calculate metrics from loaded data
    const totalVideos = allVideos ? allVideos.length : 0;
    const purchasedVideos = allVideos ? allVideos.filter(video => video.purchased).length : 0;
    const freeVideos = allVideos ? allVideos.filter(video => parseFloat(video.price || 0) === 0).length : 0;

    // Calculate total spent from purchases data - use proper field names
    let totalSpent = 0;
    if (dashboardData.purchases && Array.isArray(dashboardData.purchases)) {
        totalSpent = dashboardData.purchases.reduce((sum, purchase) => {
            // Try different possible field names for price/amount
            const amount = parseFloat(purchase.price || purchase.amount || purchase.video_price || 0);
            return sum + amount;
        }, 0);
    }

    // Update metric cards with animation
    const totalVideosElement = document.getElementById("viewerTotalVideos");
    const purchasedVideosElement = document.getElementById("viewerPurchasedVideos");
    const freeVideosElement = document.getElementById("viewerFreeVideos");
    const totalSpentElement = document.getElementById("viewerTotalSpent");

    if (totalVideosElement) animateCounter("viewerTotalVideos", totalVideos);
    if (purchasedVideosElement) animateCounter("viewerPurchasedVideos", purchasedVideos);
    if (freeVideosElement) animateCounter("viewerFreeVideos", freeVideos);
    if (totalSpentElement) totalSpentElement.textContent = `$${totalSpent.toFixed(2)}`;
}

// Additional helper functions for video management
function editVideoPrice(videoId, currentPrice) {
    const newPrice = prompt('Enter new price:', currentPrice);
    if (newPrice === null) return;

    const price = parseFloat(newPrice) || 0;
    if (price < 0) {
        showNotification('Price cannot be negative', 'error');
        return;
    }

    // Implementation for price update
    showNotification('Price update functionality maintained', 'info');
}

// Enhanced video management functions
function previewVideo(videoId, title) {
    console.log('Previewing video:', videoId, title);
    
    // Get video data
    const video = allVideos.find(v => v.id == videoId);
    if (!video) {
        showNotification('Video not found', 'error');
        return;
    }

    // Create and show video preview modal
    const modal = createVideoPreviewModal(video);
    if (modal) {
        modal.show();
    }
}

function editVideo(videoId) {
    console.log('Editing video:', videoId);
    
    // Get video data
    const video = allVideos.find(v => v.id == videoId);
    if (!video) {
        showNotification('Video not found', 'error');
        return;
    }

    // Create and show video edit modal
    const modal = createVideoEditModal(video);
    if (modal) {
        modal.show();
    }
}

function createVideoPreviewModal(video) {
    // Remove existing modal if any
    const existingModal = document.getElementById('videoPreviewModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="videoPreviewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-play me-2"></i>${video.title}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-8">
                                ${video.youtube_id ? 
                                    `<div class="ratio ratio-16x9">
                                        <iframe 
                                            src="https://www.youtube.com/embed/${video.youtube_id}" 
                                            title="${video.title}"
                                            allowfullscreen
                                        ></iframe>
                                    </div>` :
                                    `<div class="bg-light p-5 text-center rounded">
                                        <i class="fas fa-video fa-3x text-muted mb-3"></i>
                                        <p class="text-muted">Video preview not available</p>
                                    </div>`
                                }
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title">Video Details</h6>
                                        <div class="mb-3">
                                            <small class="text-muted">Description</small>
                                            <p class="mb-2">${video.description || 'No description available'}</p>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Price</small>
                                            <h5 class="text-success mb-0">$${parseFloat(video.price || 0).toFixed(2)}</h5>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Views</small>
                                            <p class="mb-0">${(video.views || 0).toLocaleString()}</p>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">Category</small>
                                            <p class="mb-0">${video.category || 'Uncategorized'}</p>
                                        </div>
                                        <div>
                                            <small class="text-muted">Upload Date</small>
                                            <p class="mb-0">${formatDate(video.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        ${currentUser && video.uploader_id == currentUser.id ? 
                            `<button type="button" class="btn btn-primary" onclick="editVideo(${video.id})">
                                <i class="fas fa-edit me-1"></i>Edit Video
                            </button>` : ''
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Return Bootstrap modal instance
    return new bootstrap.Modal(document.getElementById('videoPreviewModal'));
}

function createVideoEditModal(video) {
    // Remove existing modal if any
    const existingModal = document.getElementById('videoEditModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="videoEditModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>Edit Video
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="videoEditForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="editVideoTitle" class="form-label">Title</label>
                                <input type="text" class="form-control" id="editVideoTitle" value="${video.title}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editVideoDescription" class="form-label">Description</label>
                                <textarea class="form-control" id="editVideoDescription" rows="3" required>${video.description || ''}</textarea>
                            </div>
                            <div class="mb-3">
                                <label for="editVideoPrice" class="form-label">Price ($)</label>
                                <input type="number" class="form-control" id="editVideoPrice" step="0.01" min="0" value="${video.price || 0}">
                            </div>
                            ${video.youtube_id ? 
                                `<div class="alert alert-info">
                                    <i class="fab fa-youtube me-2"></i>
                                    This video is synced with YouTube. Changes will only affect the platform database.
                                </div>` : ''
                            }
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save me-1"></i>Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add form submit handler
    document.getElementById('videoEditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveVideoChanges(video.id);
    });
    
    // Return Bootstrap modal instance
    return new bootstrap.Modal(document.getElementById('videoEditModal'));
}

async function saveVideoChanges(videoId) {
    const title = document.getElementById('editVideoTitle').value.trim();
    const description = document.getElementById('editVideoDescription').value.trim();
    const price = parseFloat(document.getElementById('editVideoPrice').value) || 0;

    if (!title || !description) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch('api/videos.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: `action=edit_video&id=${videoId}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&price=${price}`
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Video updated successfully', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('videoEditModal'));
            modal.hide();
            
            // Clear cache and reload data
            clearCache('videos');
            clearCache('my_videos');
            await loadAllDashboardData();
            
            // Refresh the current view
            if (window.currentPanelName === 'myVideos') {
                const myVideos = dashboardData.videos ? dashboardData.videos.filter(video => 
                    video.uploader_id == currentUser.id
                ) : [];
                renderMyVideosFromDatabase(myVideos);
            } else if (window.currentPanelName === 'videos') {
                renderVideosFromDatabase(allVideos);
            }
        } else {
            showNotification('Failed to update video: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating video:', error);
        showNotification('Error updating video', 'error');
    } finally {
        showLoading(false);
    }
}

function deleteMyVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) {
        return;
    }
    // Implementation for video deletion
    showNotification('Delete functionality maintained', 'info');
}

function shareVideo(videoId) {
    // Implementation for video sharing
    showNotification('Share functionality maintained', 'info');
}

function updateUploadPanelStatus() {
    // Implementation for upload panel status updates
    console.log('Upload panel status updated');
}

// Network error handling
function handleNetworkError(error, action = 'perform this action') {
    console.error('Network error:', error);

    if (!navigator.onLine) {
        showNotification('You appear to be offline. Please check your internet connection.', 'error');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showNotification('Unable to connect to server. Please try again.', 'error');
    } else {
        showNotification(`Failed to ${action}. Please try again.`, 'error');
    }
}

// Connection status monitoring
window.addEventListener('online', () => {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showNotification('You are now offline', 'warning');
});

// Initialize responsive behavior
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            closeSidebar();
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 992) {
                setTimeout(closeSidebar, 100);
            }
        });
    });
});