// Global variables
        let currentUser = null;
        let allVideos = [];
        let allUsers = [];
        let purchaseVideoId = null;
        let apiCallsInProgress = new Set();
        let lastLoadedData = {};
        let dataCache = new Map();
        let cacheTimestamps = new Map();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

        // Cache utility functions
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

        // Optimized loading with minimal DOM manipulation
        let loadingCount = 0;

        // Utility functions
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

            // Fallback spinner - create only once
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
                // Fallback to alert if toast elements not found
                alert(message);
            }
        }

        // Initialize dashboard
        document.addEventListener("DOMContentLoaded", function () {
            // Prevent any unwanted navigation
            preventUnwantedNavigation();

            // Initialize YouTube API client first (but don't fail if it doesn't work)
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

        let authCheckInProgress = false; // Flag to prevent multiple auth checks

        async function checkAuth() {
            // Prevent multiple simultaneous auth checks
            if (authCheckInProgress) {
                return;
            }
            authCheckInProgress = true;

            try {
                // Check localStorage first for immediate UI setup
                const storedUser = localStorage.getItem("currentUser");
                if (storedUser) {
                    try {
                        currentUser = JSON.parse(storedUser);
                        setupUserRole();
                        setupDashboard();
                    } catch (e) {
                        localStorage.removeItem("currentUser");
                    }
                }

                // Verify with server
                const response = await fetch("api/auth.php", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include"
                });

                const data = await response.json();

                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem("currentUser", JSON.stringify(data.user));

                    // Only update UI if different from stored user
                    if (!storedUser || JSON.stringify(JSON.parse(storedUser)) !== JSON.stringify(data.user)) {
                        setupUserRole();
                        setupDashboard();
                    }

                    // Load overview stats only once
                    if (!lastLoadedData.overviewLoaded) {
                        loadOverviewStats();
                        lastLoadedData.overviewLoaded = true;
                    }
                } else {
                    localStorage.removeItem("currentUser");
                    window.location.href = "login.html";
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                if (!currentUser) {
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1000);
                }
            } finally {
                authCheckInProgress = false;
            }
        }

        function setupUserRole() {
            if (!currentUser) return;

            // Update user info in navigation
            const userNameEl = document.getElementById("userName");
            const userRoleEl = document.getElementById("userRole");
            const userAvatarEl = document.getElementById("userAvatar");

            if (userNameEl) userNameEl.textContent = currentUser.name;
            if (userRoleEl) userRoleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
            if (userAvatarEl) userAvatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

            // Update profile section
            updateUserProfile();

            // Update welcome section  
            const welcomeName = document.getElementById("welcomeName");
            const welcomeRole = document.getElementById("welcomeRole");
            if (welcomeName) welcomeName.textContent = currentUser.name;
            if (welcomeRole) welcomeRole.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

            // Get sidebar sections
            const adminSidebar = document.getElementById("adminSidebar");
            const creatorSidebar = document.getElementById("creatorSidebar");
            const viewerSidebar = document.getElementById("viewerSidebar");

            // Hide all sidebars first with immediate effect
            const allSidebars = [adminSidebar, creatorSidebar, viewerSidebar];
            allSidebars.forEach(sidebar => {
                if (sidebar) {
                    sidebar.style.display = "none";
                    sidebar.style.visibility = "hidden";
                }
            });

            // Show role-specific sidebar sections based on user role
            let targetSidebar = null;
            if (currentUser.role === "admin") {
                targetSidebar = adminSidebar;
            } else if (currentUser.role === "editor" || currentUser.role === "creator") {
                targetSidebar = creatorSidebar;
            } else if (currentUser.role === "viewer") {
                targetSidebar = viewerSidebar;
            }

            // Show the correct sidebar
            if (targetSidebar) {
                targetSidebar.style.display = "block";
                targetSidebar.style.visibility = "visible";
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

            // Validate panel access before showing
            if (!hasPermissionForPanel(defaultPanel)) {
                // Fallback to the first available panel for the user role
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

        async function showPanel(panelName) {
            // Check if user has permission to access this panel
            if (!hasPermissionForPanel(panelName)) {
                showNotification("You do not have permission to access this section", "error");

                // Redirect to appropriate default panel for user role
                let fallbackPanel = "overview";
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

            // Early return if already on this panel
            if (window.currentPanelName === panelName) {
                return;
            }

            // Use requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
                // Hide all panels efficiently
                const panels = document.querySelectorAll(".panel");
                for (let i = 0; i < panels.length; i++) {
                    panels[i].style.display = "none";
                }

                // Show selected panel
                const selectedPanel = document.getElementById(panelName + "Panel");
                if (selectedPanel) {
                    selectedPanel.style.display = "block";
                } else {
                    console.error(`Panel not found: ${panelName}Panel`);
                    return;
                }

                // Update active nav item efficiently
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

            const lastPanel = window.currentPanelName;
            window.currentPanelName = panelName;

            // Check cache first
            const cacheKey = `panel_${panelName}`;
            const cachedData = getCachedData(cacheKey);

            if (cachedData && lastLoadedData[panelName]) {
                return; // Use cached data
            }

            // Prevent multiple calls
            const loadKey = `load_${panelName}`;
            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            // Load data only when needed with optimized loading
            switch (panelName) {
                case "overview":
                    if (!lastLoadedData.overview) {
                        loadOverviewStats();
                    }
                    break;
                case "videos":
                    if (!lastLoadedData.videos) {
                        loadVideosFromYouTube();
                    }
                    break;
                case "users":
                    if (currentUser.role === "admin" && !lastLoadedData.users) {
                        loadUsers();
                    }
                    break;
                case "myVideos":
                    if ((currentUser.role === "editor" || currentUser.role === "admin" || currentUser.role === "creator") && !lastLoadedData.myVideos) {
                        loadMyVideosFromDatabase();
                    }
                    break;
                case "upload":
                    document.getElementById('uploadPanel').style.display = 'block';
                    updateUploadPanelStatus();
                    break;
                case "purchases":
                    if (!lastLoadedData.purchases) {
                        loadPurchases();
                    }
                    break;
                case "earnings":
                    if ((currentUser.role === "editor" || currentUser.role === "admin" || currentUser.role === "creator") && !lastLoadedData.earnings) {
                        loadEarnings();
                    }
                    break;
                case "analytics":
                    if (currentUser.role === "admin" && !lastLoadedData.analytics) {
                        loadAnalytics();
                    }
                    break;
                default:
                    console.warn(`Unknown panel: ${panelName}`);
                    break;
            }
        }

        function hasPermissionForPanel(panelName) {
            if (!currentUser) return false;

            const role = currentUser.role;

            // Define role-based permissions - corrected
            const permissions = {
                viewer: ["overview", "videos", "purchases"],
                editor: [
                    "overview",
                    "myVideos",
                    "upload",
                    "earnings",
                ],
                creator: [
                    "overview",
                    "myVideos",
                    "upload",
                    "earnings",
                ],
                admin: [
                    "overview",
                    "videos",
                    "myVideos",
                    "upload",
                    "earnings",
                    "users",
                    "analytics",
                    "purchases"
                ],
            };

            return permissions[role] && permissions[role].includes(panelName);
        }

        // Optimized video loading with caching
        async function loadVideosFromYouTube() {
            const loadKey = 'load_videos';
            const cacheKey = 'all_videos';

            // Check cache first
            const cachedData = getCachedData(cacheKey);
            if (cachedData && lastLoadedData.videos) {
                allVideos = cachedData;
                renderVideos(allVideos);
                return;
            }

            // Prevent multiple simultaneous calls
            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);

            try {
                showLoading(true);

                const response = await fetch('api/videos.php', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    // Process data efficiently
                    allVideos = data.videos.map((video) => ({
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

                    // Cache the data
                    setCachedData(cacheKey, allVideos);

                    renderVideos(allVideos);
                    lastLoadedData.videos = true;
                } else {
                    console.error("Failed to load videos:", data.message);
                    renderVideos([]);
                }
            } catch (error) {
                console.error("Failed to load videos:", error);
                showNotification("Unable to load videos. Please try again.", "error");

                const container = document.getElementById("videosContainer");
                if (container) {
                    container.innerHTML = `
                        <div class="col-12">
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Unable to load videos at the moment. Please check your connection and try again.
                                <button class="btn btn-sm btn-outline-warning ms-2" onclick="refreshVideos()">Retry</button>
                            </div>
                        </div>
                    `;
                }
            } finally {
                showLoading(false);
                apiCallsInProgress.delete(loadKey);
            }
        }

        // Helper function to refresh videos
        function refreshVideos() {
            lastLoadedData.videos = false;
            loadVideosFromYouTube();
        }

        // Debounced search for better performance
        const debouncedSearchVideos = debounce(function() {
            const searchTerm = document.getElementById('videoSearchInput').value.toLowerCase();
            if (searchTerm.length < 2 && searchTerm.length > 0) return; // Avoid too short searches

            const filteredVideos = allVideos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                video.uploader.toLowerCase().includes(searchTerm)
            );
            renderVideos(filteredVideos);
            updateVideosCount(filteredVideos.length);
        }, 300);

        // Search videos function
        function searchVideos() {
            debouncedSearchVideos();
        }

        // Sort videos function
        function sortVideos() {
            const sortBy = document.getElementById('videoSortSelect').value;
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

        // Toggle view mode function
        function toggleViewMode(mode) {
            const container = document.getElementById('videosContainer');
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');

            if (mode === 'list') {
                container.classList.add('list-view');
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');

                // Update column classes for list view
                const columns = container.querySelectorAll('[class*="col-"]');
                columns.forEach(col => {
                    col.className = 'col-12 mb-3';
                });
            } else {
                container.classList.remove('list-view');
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');

                // Restore grid view
                renderVideos(allVideos);
            }
        }

        // Update videos count
        function updateVideosCount(count) {
            const countElement = document.getElementById('videosCount');
            if (countElement) {
                countElement.textContent = `Showing ${count} video${count !== 1 ? 's' : ''}`;
            }
        }

        // Optimized my videos loading with caching
        async function loadMyVideosFromDatabase() {
            const loadKey = 'load_my_videos';
            const cacheKey = 'my_videos';

            // Check cache first
            const cachedData = getCachedData(cacheKey);
            if (cachedData && lastLoadedData.myVideos) {
                allMyVideos = cachedData;
                renderMyVideosFromDatabase(allMyVideos);
                updateMyVideosCount(allMyVideos.length);
                return;
            }

            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);
            showLoading(true);

            try {
                const response = await fetch('api/videos.php?filter=my_videos', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    allMyVideos = data.videos.map((video) => ({
                        id: video.id,
                        title: video.title || "Untitled",
                        description: video.description || "",
                        price: parseFloat(video.price) || 0,
                        uploader: video.uploader || currentUser.name,
                        uploader_id: video.uploader_id || currentUser.id,
                        views: video.views || 0,
                        file_path: video.file_path,
                        category: video.category || "other",
                        created_at: video.created_at,
                        youtube_id: video.youtube_id,
                        youtube_thumbnail: video.youtube_thumbnail || '/api/placeholder/300/200',
                        is_youtube_synced: video.is_youtube_synced || false
                    }));

                    // Cache the data
                    setCachedData(cacheKey, allMyVideos);

                    renderMyVideosFromDatabase(allMyVideos);
                    updateMyVideosCount(allMyVideos.length);
                    lastLoadedData.myVideos = true;
                } else {
                    console.error("Failed to load my videos:", data.message);
                    renderMyVideosFromDatabase([]);
                    updateMyVideosCount(0);
                }
            } catch (error) {
                console.error("Failed to load my videos:", error);
                showNotification("Unable to load your videos. Please try again.", "error");
                renderMyVideosFromDatabase([]);
                updateMyVideosCount(0);
            } finally {
                showLoading(false);
                apiCallsInProgress.delete(loadKey);
            }
        }

        // Keep the YouTube function for backwards compatibility but make it call database version
        async function loadMyVideosFromYouTube() {
            await loadMyVideosFromDatabase();
        }

        // Global variable to store all my videos for filtering/searching
        let allMyVideos = [];

        // Update loadMyVideosFromDatabase to store videos globally
        async function loadMyVideosFromDatabaseOriginal() {
            const loadKey = 'load_my_videos';

            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);
            showLoading(true);

            try {
                const response = await fetch('api/videos.php?filter=my_videos', {
                    method: 'GET',
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.success) {
                    allMyVideos = data.videos.map((video) => ({
                        id: video.id,
                        title: video.title || "Untitled",
                        description: video.description || "",
                        price: parseFloat(video.price) || 0,
                        uploader: video.uploader || currentUser.name,
                        uploader_id: video.uploader_id || currentUser.id,
                        views: video.views || 0,
                        file_path: video.file_path,
                        category: video.category || "other",
                        created_at: video.created_at,
                        youtube_id: video.youtube_id,
                        youtube_thumbnail: video.youtube_thumbnail || '/api/placeholder/300/200',
                        is_youtube_synced: video.is_youtube_synced || false
                    }));

                    renderMyVideosFromDatabase(allMyVideos);
                    updateMyVideosCount(allMyVideos.length);
                    lastLoadedData.myVideos = true;
                } else {
                    console.error("Failed to load my videos:", data.message);
                    renderMyVideosFromDatabase([]);
                    updateMyVideosCount(0);
                }
            } catch (error) {
                console.error("Failed to load my videos:", error);
                showNotification("Unable to load your videos. Please try again.", "error");
                renderMyVideosFromDatabase([]);
                updateMyVideosCount(0);
            } finally {
                showLoading(false);
                apiCallsInProgress.delete(loadKey);
            }
        }

        // Search my videos function
        function searchMyVideos() {
            const searchTerm = document.getElementById('myVideoSearchInput').value.toLowerCase();
            const filteredVideos = allMyVideos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                (video.category && video.category.toLowerCase().includes(searchTerm))
            );
            renderMyVideosFromDatabase(filteredVideos);
            updateMyVideosCount(filteredVideos.length);
        }

        // Sort my videos function
        function sortMyVideos() {
            const sortBy = document.getElementById('myVideoSortSelect').value;
            let sortedVideos = [...allMyVideos];

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

            renderMyVideosFromDatabase(sortedVideos);
        }

        // Filter my videos function
        function filterMyVideos(filter) {
            let filteredVideos = [...allMyVideos];

            switch (filter) {
                case 'free':
                    filteredVideos = allMyVideos.filter(video => (video.price || 0) === 0);
                    break;
                case 'paid':
                    filteredVideos = allMyVideos.filter(video => (video.price || 0) > 0);
                    break;
                case 'youtube':
                    filteredVideos = allMyVideos.filter(video => video.is_youtube_synced);
                    break;
                case 'all':
                default:
                    filteredVideos = allMyVideos;
                    break;
            }

            renderMyVideosFromDatabase(filteredVideos);
            updateMyVideosCount(filteredVideos.length);
            updateMyVideoFilterButtons(filter);
        }

        // Update my videos count
        function updateMyVideosCount(count) {
            const countElement = document.getElementById('myVideosCount');
            if (countElement) {
                countElement.textContent = `Showing ${count} video${count !== 1 ? 's' : ''}`;
            }
        }

        // Update filter button states for my videos
        function updateMyVideoFilterButtons(activeFilter) {
            const filterButtons = document.querySelectorAll('#myVideosPanel .btn-group .btn[data-filter]');
            filterButtons.forEach((btn) => {
                btn.classList.remove("active");
                if (btn.getAttribute('data-filter') === activeFilter) {
                    btn.classList.add("active");
                }
            });
        }

        function renderVideos(videos) {
            const container = document.getElementById("videosContainer");

            if (!container) {
                console.error("Videos container not found");
                return;
            }

            // Update count
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

            // Limit initial render for performance (virtual scrolling concept)
            const initialRenderCount = Math.min(20, videos.length);
            const fragment = document.createDocumentFragment();

            // Batch DOM updates
            requestAnimationFrame(() => {
                // Clear container efficiently
                container.innerHTML = "";

                // Create elements in batch
                for (let i = 0; i < initialRenderCount; i++) {
                    const videoElement = createVideoElement(videos[i]);
                    fragment.appendChild(videoElement);
                }

                container.appendChild(fragment);

                // Load remaining videos if needed
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
            col.className = "col-12 col-sm-4 col-md-4 col-lg-4 col-xl-4 mb-4";

            // Enhanced dynamic thumbnail handling with fallbacks
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
            const userRole = currentUser?.role;

            col.innerHTML = `
                <div class="card video-card h-100 shadow-sm border-0 position-relative" onclick="handleVideoClick(${video.id}, '${escapeHtml(video.title)}', '${video.youtube_id || ''}', ${isYouTube})" style="cursor: pointer;">
                    <div class="video-thumbnail position-relative overflow-hidden" style="height: 200px;">
                        <img src="${thumbnail}" 
                             alt="${escapeHtml(video.title)}" 
                             class="card-img-top w-100 h-100" 
                             style="object-fit: cover; transition: transform 0.3s ease;"
                             onload="this.style.opacity='1'"
                             onerror="handleThumbnailError(this, '${video.youtube_id || ''}')"
                             loading="lazy">


                    </div>

                    <div class="card-body p-3 d-flex flex-column">
                        <h6 class="card-title mb-2" title="${escapeHtml(video.title)}" style="line-height: 1.3; height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-weight: 600; font-size: 1rem;">
                            ${escapeHtml(video.title)}
                        </h6>

                        <p class="card-text text-muted small mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; height: 2.8em; font-size: 0.85rem;">
                            ${escapeHtml(video.description || 'No description available')}
                        </p>

                        <div class="video-meta mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="d-flex align-items-center text-muted">
                                    <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 20px; height: 20px;">
                                        <small class="text-white fw-bold" style="font-size: 10px;">${escapeHtml(video.uploader.charAt(0).toUpperCase())}</small>
                                    </div>
                                    <small class="text-truncate fw-medium" style="font-size: 0.8rem;">${escapeHtml(video.uploader)}</small>
                                </div>
                                ${isPurchased ? '<small class="text-success fw-bold"><i class="fas fa-crown me-1"></i>Owned</small>' : ''}
                            </div>

                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>${formatTimeAgo(video.created_at)}
                                </small>
                                ${!isFree ? `<span class="badge bg-warning text-dark">$${price.toFixed(2)}</span>` : '<span class="badge bg-success">FREE</span>'}
                            </div>
                        </div>

                        <div class="mt-auto" onclick="event.stopPropagation();">
                            ${renderEnhancedVideoActions(video)}
                        </div>
                    </div>
                </div>
            `;

            return col;
        }

        function renderMyVideosFromDatabase(videos) {
            const container = document.getElementById("myVideosContainer");

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

            // Use DocumentFragment for efficient DOM manipulation
            const fragment = document.createDocumentFragment();

            // Process videos in chunks to prevent blocking
            const chunkSize = 20;
            const renderChunks = (startIndex = 0) => {
                const endIndex = Math.min(startIndex + chunkSize, videos.length);

                for (let i = startIndex; i < endIndex; i++) {
                    const video = videos[i];
                    const videoElement = createMyVideoElement(video);
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

        function createMyVideoElement(video) {
            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4";

            // Dynamic thumbnail handling
            let thumbnail = "/api/placeholder/300/200";
            if (video.youtube_thumbnail) {
                thumbnail = video.youtube_thumbnail;
            } else if (video.youtube_id) {
                thumbnail = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;
            }

            const price = parseFloat(video.price) || 0;
            const isYouTube = video.youtube_id && video.is_youtube_synced;
            const isFree = price === 0;

            col.innerHTML = `
                <div class="card video-card h-100 shadow-sm border-0 position-relative">
                    <div class="video-thumbnail position-relative overflow-hidden" style="height: 200px;">
                        <img src="${thumbnail}" alt="${escapeHtml(video.title)}" 
                             class="card-img-top w-100 h-100" 
                             style="object-fit: cover; transition: transform 0.3s ease;"
                             onmouseover="this.style.transform='scale(1.05)'"
                             onmouseout="this.style.transform='scale(1)'"
                             onerror="this.src='/api/placeholder/300/200'">


                    </div>

                    <div class="card-body p-3 d-flex flex-column">
                        <h6 class="card-title mb-2" title="${escapeHtml(video.title)}" style="line-height: 1.3; height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-weight: 600;">
                            ${escapeHtml(video.title)}
                        </h6>

                        <p class="card-text text-muted small mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; height: 2.8em;">
                            ${escapeHtml(video.description || 'No description available')}
                        </p>

                        <div class="video-meta mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>${formatTimeAgo(video.created_at)}
                                </small>
                                ${!isFree ? `<span class="text-primary fw-bold">$${price.toFixed(2)}</span>` : '<span class="text-success fw-bold">FREE</span>'}
                            </div>
                        </div>

                        <div class="mt-auto">
                            <div class="d-grid gap-1">
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-primary" onclick="editVideoPrice(${video.id}, ${video.price})" title="Edit Price">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-success" onclick="previewVideo('${video.youtube_id || video.id}', '${escapeHtml(video.title)}')" title="Preview">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="deleteMyVideo(${video.id})" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return col;
        }

        // Keep YouTube rendering for backwards compatibility
        function renderMyVideosFromYouTube(videos) {
            renderMyVideosFromDatabase(videos);
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
                                <small class="text-muted">By ${video.uploader}</small>
                                <small class="text-muted">$${video.price}</small>
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
            const userRole = currentUser?.role;

            // For creators and admins, always allow direct access without payment
            if (userRole === 'creator' || userRole === 'admin' || userRole === 'editor') {
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
                } else {
                    return `<button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                                <i class="fas fa-play me-2"></i>Watch Now
                            </button>`;
                }
            }

            // For viewers only - show payment logic
            if (userRole === "viewer") {
                if (isYouTubeVideo) {
                    return `
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-primary" onclick="checkPaymentAndWatch('${video.youtube_id}', '${escapeHtml(video.title)}')">
                                <i class="fas fa-play me-2"></i>Watch
                            </button>
                            <a href="${window.youtubeAPI.generateVideoURL(video.youtube_id)}" target="_blank" class="btn btn-outline-danger">
                                <i class="fab fa-youtube"></i>
                            </a>
                        </div>`;
                }

                const canWatch = video.price === 0 || video.purchased;

                if (canWatch) {
                    return `<button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                                <i class="fas fa-play me-2"></i>Watch Now
                            </button>`;
                } else {
                    return `${currentUser.role === 'viewer' ? `
                            <button class="btn btn-success w-100" onclick="purchaseVideo(${video.id}, ${video.price})">
                                <i class="fas fa-dollar-sign me-2"></i>Purchase ($${video.price})
                            </button>` : `
                            <button class="btn btn-info w-100" onclick="watchVideo(${video.id})">
                                <i class="fas fa-play me-2"></i>View Video
                            </button>`}`;
                }
            }

            // Default fallback
            return `<button class="btn btn-success w-100" onclick="watchVideo(${video.id})">
                        <i class="fas fa-play me-2"></i>Watch Now
                    </button>`;
        }

        function renderEnhancedVideoActions(video) {
            const isYouTubeVideo = video.youtube_id && video.is_youtube_synced;
            const userRole = currentUser?.role;
            const price = parseFloat(video.price) || 0;
            const isFree = price === 0;
            const isPurchased = video.purchased;

            // Admin actions
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

            // Creator/Editor actions
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

            // Viewer actions
            if (userRole === "viewer") {
                if (isFree || isPurchased) {
                    // Can watch for free or already purchased
                    return `
                        <button class="btn btn-success w-100" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id || ''}', '${escapeHtml(video.title)}', ${isYouTube})">
                            <i class="fas fa-play me-1"></i>${isFree ? 'Watch Free' : 'Watch Now'}
                        </button>`;
                } else {
                    // Need to purchase
                    return `
                        <button class="btn btn-warning w-100" style="font-size: clamp(0.65rem, 1.6vw, 0.8rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="purchaseVideo(${video.id}, ${price})">
                            <i class="fas fa-shopping-cart me-1"></i>$${price.toFixed(2)}
                        </button>`;
                }
            }

            // Default fallback
            return `<button class="btn btn-primary w-100" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);" onclick="playVideoPlayer(${video.id}, '${video.youtube_id || ''}', '${escapeHtml(video.title)}', ${isYouTube})">
                        <i class="fas fa-play me-1"></i>Watch
                    </button>`;
        }

        // Function to check payment before watching YouTube videos
        async function checkPaymentAndWatch(youtubeId, title) {
            try {
                showLoading(true);

                // Ensure user is authenticated before making request
                if (!currentUser) {
                    showNotification("Please log in to watch videos", "error");
                    window.location.href = "login.html";
                    return;
                }

                // Check if user has paid for this YouTube video
                const response = await fetch('api/video_access.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        youtube_id: youtubeId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    // User has access, play the video
                    watchYouTubeVideo(youtubeId, title);
                } else if (data.message === "Payment required" && data.video) {
                    // Show purchase modal for YouTube video
                    purchaseVideoId = data.video.id;
                    document.getElementById("purchasePrice").textContent = data.video.price.toFixed(2);
                    const modal = new bootstrap.Modal(document.getElementById("purchaseModal"));
                    modal.show();
                } else {
                    showNotification(data.message || "Access denied", "error");
                }
            } catch (error) {
                console.error("Error checking video access:", error);
                showNotification("Failed to check video access. Please try again.", "error");
            } finally {
                showLoading(false);
            }
        }

        // Function to watch YouTube videos in embed modal
        function watchYouTubeVideo(youtubeId, title) {
            try {
                document.getElementById("videoModalTitle").textContent = title;

                // Handle demo videos or real YouTube IDs
                let embedHtml;
                if (youtubeId && youtubeId.startsWith('demo_')) {
                    embedHtml = `
                        <div class="ratio ratio-16x9">
                            <div class="d-flex align-items-center justify-content-center bg-dark text-white" style="border-radius: 12px;">
                                <div class="text-center">
                                    <i class="fas fa-play-circle fa-5x text-primary mb-3"></i>
                                    <h5>Demo Video</h5>
                                    <p class="text-muted">This is a demonstration video. In production, this would be a real YouTube video.</p>
                                    <p class="small text-info">YouTube ID: ${youtubeId}</p>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (youtubeId && youtubeId.trim() !== '') {
                    // Create proper YouTube embed URL with all necessary parameters
                    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

                    embedHtml = `
                        <div class="ratio ratio-16x9">
                            <iframe src="${embedUrl}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowfullscreen
                                    title="${escapeHtml(title)}"
                                    style="border-radius: 12px; width: 100%; height: 100%;">
                            </iframe>
                        </div>
                    `;
                } else {
                    embedHtml = `
                        <div class="ratio ratio-16x9">
                            <div class="d-flex align-items-center justify-content-center bg-dark text-white" style="border-radius: 12px;">
                                <div class="text-center">
                                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                                    <h5>Video Not Available</h5>
                                    <p class="text-muted">Unable to load video content.</p>
                                    <small class="text-info">YouTube ID: ${youtubeId || 'None'}</small>
                                </div>
                            </div>
                        </div>
                    `;
                }

                const videoPlayerContainer = document.getElementById("videoPlayer");
                if (videoPlayerContainer) {
                    videoPlayerContainer.innerHTML = embedHtml;
                } else {
                    console.error('Video player container not found');
                    showNotification('Video player not found', 'error');
                    return;
                }

                const modal = new bootstrap.Modal(document.getElementById("videoModal"));
                modal.show();
            } catch (error) {
                console.error('Error playing YouTube video:', error);
                showNotification('Failed to play video', 'error');
            }
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
                return
        (numValue / 1000).toFixed(1) + "K";
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
            const loadKey = 'load_overview';

            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);

                if (currentUser.role === "admin") {
                    const response = await fetch("api/admin.php?action=analytics", {
                        credentials: 'include'
                    });
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

                        lastLoadedData.overview = true;
                    }
                }
                 else if (currentUser.role === "viewer") {
                    // For viewers, load their purchase statistics
                    try {
                        const response = await fetch("api/purchase.php", {
                            credentials: 'include'
                        });
                        const data = await response.json();

                        if (data.success) {
                            const purchases = data.purchases || [];
                            const totalPurchased = purchases.length;
                            const totalSpent = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.price || 0), 0);

                            // Load all available videos count
                            const videosResponse = await fetch('api/videos.php', {
                                credentials: 'include'
                            });
                            const videosData = await videosResponse.json();
                            const totalAvailableVideos = videosData.success ? videosData.videos.length : 0;

                            // Update metrics for viewers
                            animateCounter("totalVideos", totalAvailableVideos);
                            animateCounter("activeUsers", totalPurchased);
                            animateCounter("totalViews", totalSpent);

                            // Update labels for viewer context
                            const totalVideosLabel = document.getElementById("totalVideosLabel");
                            const activeUsersLabel = document.getElementById("activeUsersLabel");
                            const totalViewsLabel = document.getElementById("totalViewsLabel");
                            const revenueLabel = document.getElementById("totalRevenueLabel");

                            if (totalVideosLabel) totalVideosLabel.textContent = "Total Videos";
                            if (activeUsersLabel) activeUsersLabel.textContent = "Purchased Videos";
                            if (totalViewsLabel) totalViewsLabel.textContent = "Total Spent";
                            if (revenueLabel) revenueLabel.textContent = "Free Videos";

                            // Count free videos available
                            const freeVideos = videosData.success ? videosData.videos.filter(video => parseFloat(video.price) === 0).length : 0;
                            const revenueElement = document.getElementById("totalRevenue");
                            if (revenueElement) {
                                revenueElement.textContent = freeVideos;
                            }

                            // Update recent activity with user's purchases
                            if (purchases.length > 0) {
                                const recentPurchases = purchases.slice(0, 5).map(purchase => ({
                                    title: `Purchased: ${purchase.title}`,
                                    user: 'You',
                                    time: purchase.created_at || new Date().toISOString(),
                                    type: 'purchase'
                                }));
                                updateRecentActivity(recentPurchases);
                            }

                            // Update popular videos with user's purchased videos
                            const popularPurchases = purchases.slice(0, 3).map(purchase => ({
                                title: purchase.title,
                                views: `$${parseFloat(purchase.price || 0).toFixed(2)}`
                            }));
                            updatePopularVideos(popularPurchases);
                        }
                    } catch (error) {
                        console.error("Failed to load viewer stats:", error);
                        // Fallback to basic stats
                        loadViewerFallbackStats();
                    } finally {
                        lastLoadedData.overview = true;
                    }
                } else if (currentUser.role === "creator" || currentUser.role === "editor") {
                // For creators/editors, show their video statistics
                    try {
                        const response = await fetch('api/videos.php?filter=my_videos', {
                            credentials: 'include'
                        });
                        const data = await response.json();

                        if (data.success) {
                            const myVideos = data.videos || [];
                            const totalUploads = myVideos.length;
                            const totalViews = myVideos.reduce((sum, video) => sum + (video.views || 0), 0);

                            // Get earnings data
                            const earningsResponse = await fetch("api/earnings.php?action=earnings", {
                                credentials: 'include'
                            });
                            const earningsData = await earningsResponse.json();

                            // Update metrics for creators
                            animateCounter("totalVideos", totalUploads);
                            animateCounter("activeUsers", totalViews);

                            if (earningsData.success) {
                                const earnings = earningsData.earnings;
                                animateCounter("totalViews", earnings.total_earnings);

                                const revenueElement = document.getElementById("totalRevenue");
                                if (revenueElement) {
                                    revenueElement.textContent = `$${earnings.monthly_earnings.toFixed(2)}`;
                                }
                            }

                            // Update labels for creator context
                            const totalVideosLabel = document.getElementById("totalVideosLabel");
                            const activeUsersLabel = document.getElementById("activeUsersLabel");
                            const totalViewsLabel = document.getElementById("totalViewsLabel");
                            const revenueLabel = document.getElementById("totalRevenueLabel");

                            if (totalVideosLabel) totalVideosLabel.textContent = "My Videos";
                            if (activeUsersLabel) activeUsersLabel.textContent = "Total Views";
                            if (totalViewsLabel) totalViewsLabel.textContent = "Total Earnings";
                            if (revenueLabel) revenueLabel.textContent = "Monthly Earnings";

                            // Update recent activity with uploads
                            const recentUploads = myVideos.slice(0, 5).map(video => ({
                                title: `Uploaded: ${video.title}`,
                                user: 'You',
                                time: video.created_at || new Date().toISOString(),
                                type: 'upload'
                            }));
                            updateRecentActivity(recentUploads);

                            // Update popular videos with creator's top videos
                            const popularVideos = myVideos
                                .sort((a, b) => (b.views || 0) - (a.views || 0))
                                .slice(0, 3)
                                .map(video => ({
                                    title: video.title,
                                    views: (video.views || 0).toString()
                                }));
                            updatePopularVideos(popularVideos);
                        }
                    } catch (error) {
                        console.error("Failed to load creator stats:", error);
                        loadBasicStats();
                    } finally {
                        lastLoadedData.overview = true;
                    }
                } else {
                    // For other roles, show basic stats
                    loadBasicStats();
                    lastLoadedData.overview = true;
                }
            apiCallsInProgress.delete(loadKey);
        }

        function loadViewerFallbackStats() {
            // Fallback stats for viewers when API fails
            animateCounter("totalVideos", 0);
            animateCounter("activeUsers", 0);
            animateCounter("totalViews", 0);

            const revenueElement = document.getElementById("totalRevenue");
            if (revenueElement) {
                revenueElement.textContent = "0";
            }

            // Update labels
            const totalVideosLabel = document.getElementById("totalVideosLabel");
            const activeUsersLabel = document.getElementById("activeUsersLabel");
            const totalViewsLabel = document.getElementById("totalViewsLabel");
            const revenueLabel = document.getElementById("totalRevenueLabel");

            if (totalVideosLabel) totalVideosLabel.textContent = "Total Videos";
            if (activeUsersLabel) activeUsersLabel.textContent = "Purchased Videos";
            if (totalViewsLabel) totalViewsLabel.textContent = "Total Spent";
            if (revenueLabel) revenueLabel.textContent = "Free Videos";
        }

        function loadBasicStats() {
            animateCounter("totalVideos", allVideos.length);

            const activeUsersElement = document.getElementById("activeUsers");
            const totalRevenueElement = document.getElementById("totalRevenue");

            if (activeUsersElement) activeUsersElement.textContent = "-";
            if (totalRevenueElement) totalRevenueElement.textContent = "-";

            const totalViews = allVideos.reduce(
                (sum, video) => sum + (video.views || 0),
                0,
            );
            animateCounter("totalViews", totalViews);
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
            const container = document.getElementById("recentActivityContainer");
            if (!container) return;

            if (!activities || activities.length === 0) {
                container.innerHTML = '<div class="list-group-item text-center text-muted">No recent activity</div>';
                return;
            }

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
                .map(
                    (video) => `
                <div class="list-group-item d-flex justify-content-between">
                    <span>${video.title}</span>
                    <span class="badge bg-primary">${parseInt(video.views).toLocaleString()} views</span>
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
                const response = await fetch("api/admin.php?action=users", {
                    credentials: 'include'
                });
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

        async function loadEarnings() {
            const loadKey = 'load_earnings';

            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);
            showLoading(true);

            try {
                const response = await fetch("api/earnings.php?action=earnings", {
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success) {
                    const earnings = data.earnings;
                    document.getElementById("totalEarnings").textContent =
                        `$${earnings.total_earnings.toFixed(2)}`;
                    document.getElementById("monthlyEarnings").textContent =
                        `$${earnings.monthly_earnings.toFixed(2)}`;
                    document.getElementById("pendingEarnings").textContent =
                        `$${earnings.pending_earnings.toFixed(2)}`;

                    // Load recent transactions and paid users
                    await Promise.all([loadTransactions(), loadPaidUsers()]);
                    lastLoadedData.earnings = true;
                } else {
                    showNotification(
                        "Failed to load earnings: " + data.message,
                        "error",
                    );
                }
            } catch (error) {
                console.error("Failed to load earnings:", error);
                showNotification("Failed to load earnings", "error");
            } finally {
                showLoading(false);
                apiCallsInProgress.delete(loadKey);
            }
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
            const loadKey = 'load_paid_users';

            if (apiCallsInProgress.has(loadKey)) {
                return;
            }

            apiCallsInProgress.add(loadKey);

            try {
                const response = await fetch("api/earnings.php?action=paid_users", {
                    credentials: 'include'
                });
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
            } finally {
                apiCallsInProgress.delete(loadKey);
            }
        }

        function renderPaidUsers(paidUsers) {
            const container = document.getElementById("paidUsersContainer");

            if (paidUsers.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No paid users yet</div>';
                return;
            }

            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover table-sm">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Purchases</th>
                                <th>Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paidUsers
                                .map(
                                    (user) => `
                                <tr>
                                    <td>
                                        <div class="fw-bold">${user.name}</div>
                                        <small class="text-muted">${user.email}</small>
                                    </td>
                                    <td><span class="badge bg-primary">${user.purchases_count}</span></td>
                                    <td class="fw-bold text-success">$${user.total_spent.toFixed(2)}</td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
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

            // Check if YouTube is available and connected for creators
            if (!window.youtubeAPI || !window.youtubeAPI.isInitialized) {
                showNotification(
                    "❌ YouTube API not available. Please ask an admin to set up YouTube integration.",
                    "error",
                );
                return;
            }

            if (!window.youtubeAPI.isSignedIn()) {
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
                // Use the YouTube API client's upload method with progress tracking
                const metadata = {
                    title: title,
                    description: description,
                    tags: [category],
                    privacy: 'unlisted',
                    categoryId: '22', // People & Blogs
                    price: price // Include price in metadata
                };

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
                    lastLoadedData.myVideos = false;

                    // Only refresh if user is currently viewing myVideos panel
                    if (window.currentPanelName === 'myVideos') {
                        // Add a small delay to ensure database is updated
                        setTimeout(() => {
                            loadMyVideosFromDatabase();
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

        // Optimized debounce function
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
            // Add video to allVideos array    allVideos.unshift(video);

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
                    // Clear relevant cache
                    clearCache('videos');
                    clearCache('purchases');
                    clearCache('overview');

                    // Reset data flags to force reload
                    lastLoadedData.videos = false;
                    lastLoadedData.purchases = false;
                    lastLoadedData.overview = false;

                    showNotification("🎉 Video purchased successfully! You can now watch it.", "success");

                    const modal = bootstrap.Modal.getInstance(document.getElementById("purchaseModal"));
                    modal.hide();

                    // Update video card after purchase
                    updateVideoCardAfterPurchase(purchaseVideoId);

                    // Efficiently reload only current panel
                    const currentPanel = window.currentPanelName;
                    if (currentPanel === "videos") {
                        loadVideosFromYouTube();
                    } else if (currentPanel === "purchases") {
                        loadPurchases();
                    }

                    if (currentUser.role === "admin") {
                        loadOverviewStats();
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

        // Update video card after purchase
        function updateVideoCardAfterPurchase(videoId) {
            // Find the video in allVideos and mark as purchased
            const videoIndex = allVideos.findIndex(v => v.id == videoId || v.youtube_id == videoId);
            if (videoIndex !== -1) {
                allVideos[videoIndex].purchased = true;

                // Update the UI by re-rendering videos
                renderVideos(allVideos);
            }
        }

        // Video upload functionality


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
                    // Clear localStorage
                    localStorage.removeItem('currentUser');

                    // Clear session storage
                    sessionStorage.clear();

                    // Clear user data
                    currentUser = null;

                    showNotification('Logged out successfully', 'success');

                    // Redirect to login page
                    window.location.href = 'login.html';
                } else {
                    showNotification('Logout failed: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout even if API fails
                localStorage.removeItem('currentUser');
                sessionStorage.clear();
                currentUser = null;
                window.location.href = 'login.html';
            } finally {
                showLoading(false);
            }
        }

        // Update YouTube connection status
        async function updateYouTubeConnectionStatus() {
            // Check YouTube connection status
            const connectionStatus = document.getElementById('youtubeConnectionStatus');
            if (connectionStatus) {
                // Wait a bit for API to initialize
                setTimeout(async () => {
                    try {
                        await window.youtubeAPI.initialize();
                        if (window.youtubeAPI && window.youtubeAPI.isSignedIn()) {
                            connectionStatus.innerHTML = '<i class="fab fa-youtube text-success me-1"></i>Connected to YouTube';
                            connectionStatus.className = 'badge bg-success';

                            // Add sign out button
                            connectionStatus.onclick = async () => {
                                if (confirm('Sign out from YouTube?')) {
                                    await window.youtubeAPI.signOut();
                                    showPanel('upload'); // Refresh the panel
                                }
                            };
                            connectionStatus.style.cursor = 'pointer';
                        } else {
                            connectionStatus.innerHTML = '<i class="fab fa-youtube text-warning me-1"></i>Click to connect to YouTube';
                            connectionStatus.className = 'badge bg-warning';
                            connectionStatus.onclick = async () => {
                                const success = await window.youtubeAPI.signIn();
                                if (success) {
                                    showPanel('upload'); // Refresh the panel
                                    showNotification('✅ Successfully connected to YouTube!', 'success');
                                } else {
                                    showNotification('❌ Failed to connect to YouTube', 'error');
                                }
                            };
                            connectionStatus.style.cursor = 'pointer';
                        }
                    } catch (error) {
                        console.error('Error checking YouTube status:', error);
                        connectionStatus.innerHTML = '<i class="fab fa-youtube text-danger me-1"></i>Connection error';
                        connectionStatus.className = 'badge bg-danger';
                    }
                }, 1000);
            }
        }

        // Edit video price
        async function editVideoPrice(videoId, currentPrice) {
            const newPrice = prompt('Enter new price:', currentPrice);
            if (newPrice === null) return;

            const price = parseFloat(newPrice) || 0;
            if (price < 0) {
                showNotification('Price cannot be negative', 'error');
                return;
            }

            try {
                const response = await fetch('api/videos.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: videoId,
                        price: price
                    })
                });

                const data = await response.json();
                if (data.success) {
                    showNotification('Price updated successfully', 'success');
                    loadMyVideosFromDatabase();
                } else {
                    showNotification('Failed to update price: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Failed to update price:', error);
                showNotification('Failed to update price', 'error');
            }
        }

        // Preview video
        function previewVideo(youtubeId, title) {
            if (youtubeId && youtubeId.startsWith('local_')) {
                // For demo videos, show placeholder
                document.getElementById("videoModalTitle").textContent = title;
                document.getElementById("videoPlayer").outerHTML = 
                    `<div id="videoPlayer" class="text-center p-4">
                        <i class="fas fa-play-circle fa-5x text-primary mb-3"></i>
                        <h5>Demo Video Preview</h5>
                        <p class="text-muted">This is a demo video upload. In production, this would show the actual video.</p>
                    </div>`;

                const modal = new bootstrap.Modal(document.getElementById("videoModal"));
                modal.show();
            } else {
                watchYouTubeVideo(youtubeId, title);
            }
        }

        // Delete video
        async function deleteMyVideo(videoId) {
            if (!confirm('Are you sure you want to delete this video?')) {
                return;
            }

            try {
                const response = await fetch('api/videos.php', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: videoId
                    })
                });

                const data = await response.json();
                if (data.success) {
                    showNotification('Video deleted successfully', 'success');
                    loadMyVideosFromDatabase();
                } else {
                    showNotification('Failed to delete video: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Failed to delete video:', error);
                showNotification('Failed to delete video', 'error');
            }
        }

        // Share video function
        function shareVideo(videoId) {
            const video = allVideos.find(v => v.id == videoId || v.youtube_id == videoId);
            if (!video) return;

            const shareUrl = video.youtube_id ? 
                `https://www.youtube.com/watch?v=${video.youtube_id}` : 
                `${window.location.origin}/dashboard.html?video=${video.id}`;

            if (navigator.share) {
                navigator.share({
                    title: video.title,
                    text: video.description,
                    url: shareUrl
                }).catch(console.error);
            } else {
                // Fallback to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showNotification('Video link copied to clipboard!', 'success');
                }).catch(() => {
                    showNotification('Unable to copy link', 'error');
                });
            }
        }

        // Handle video click with proper access checking
        function handleVideoClick(videoId, title, youtubeId, isYouTube) {
            // Ensure user is authenticated
            if (!currentUser) {
                showNotification("Please log in to watch videos", "error");
                window.location.href = "login.html";
                return;
            }

            // Use unified video player for all users
            playVideoPlayer(videoId, youtubeId || '', title, isYouTube);
        }

        // Unified video player function
        async function playVideoPlayer(videoId, youtubeId, title, isYouTube) {
            try {
                showLoading(true);

                // Ensure user is authenticated
                if (!currentUser) {
                    showNotification("Please log in to watch videos", "error");
                    window.location.href = "login.html";
                    return;
                }

                let videoData = null;

                // First, get video details from database if we have a videoId
                if (videoId) {
                    try {
                        const response = await fetch(`api/videos.php?id=${videoId}`, {
                            credentials: 'include'
                        });
                        const data = await response.json();

                        if (data.success && data.video) {
                            videoData = data.video;
                            // Update title and youtube info from database
                            title = videoData.title || title;
                            if (videoData.youtube_id) {
                                youtubeId = videoData.youtube_id;
                                isYouTube = videoData.is_youtube_synced;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load video details:', error);
                    }
                }

                // For viewers, check payment/access
                if (currentUser.role === 'viewer') {
                    const requestBody = {};
                    if (videoId) requestBody.video_id = videoId;
                    if (youtubeId && !videoId) requestBody.youtube_id = youtubeId;

                    const accessResponse = await fetch('api/video_access.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'include',
                        body: JSON.stringify(requestBody)
                    });

                    if (!accessResponse.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const accessData = await accessResponse.json();

                    if (!accessData.success) {
                        if (accessData.message === "Payment required" && accessData.video) {
                            purchaseVideoId = accessData.video.id;
                            document.getElementById("purchasePrice").textContent = parseFloat(accessData.video.price).toFixed(2);
                            const modal = new bootstrap.Modal(document.getElementById("purchaseModal"));
                            modal.show();
                            return;
                        } else {
                            showNotification(accessData.message || "Access denied", "error");
                            return;
                        }
                    }
                }

                // Set modal title
                document.getElementById("videoModalTitle").textContent = title;

                // Create the video player
                const videoPlayerContainer = document.getElementById("videoPlayer");
                if (!videoPlayerContainer) {
                    showNotification('Video player container not found', 'error');
                    return;
                }

                // Clear previous content
                videoPlayerContainer.innerHTML = '';

                // Determine how to play the video with better error handling and iframe embedding
                let videoHtml = '';
                let hasValidSource = false;

                // Try YouTube video first (most reliable)
                if (youtubeId && youtubeId.trim() !== '' && !youtubeId.startsWith('demo_')) {
                    // Real YouTube video with embedded iframe
                    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

                    videoHtml = `
                        <div class="ratio ratio-16x9">
                            <iframe src="${embedUrl}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowfullscreen
                                    title="${escapeHtml(title)}"
                                    style="border-radius: 12px; width: 100%; height: 100%;"
                                    onload="this.style.opacity='1'"
                                    onerror="handleVideoError(this)"
                                    loading="lazy">
                            </iframe>
                        </div>
                    `;
                    hasValidSource = true;
                } 
                // Try demo video
                else if (youtubeId && youtubeId.startsWith('demo_')) {
                    videoHtml = `
                        <div class="ratio ratio-16x9">
                            <div class="d-flex align-items-center justify-content-center bg-gradient text-white h-100" style="border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <div class="text-center p-4">
                                    <i class="fas fa-play-circle fa-5x text-white mb-3" style="opacity: 0.9;"></i>
                                    <h4 class="mb-3">Demo Video</h4>
                                    <p class="mb-2">This is a demonstration video placeholder.</p>
                                    <p class="small opacity-75">ID: ${youtubeId}</p>
                                    <button class="btn btn-light btn-sm mt-2" onclick="playDemoVideo()">
                                        <i class="fas fa-play me-1"></i>Simulate Play
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    hasValidSource = true;
                }
                // Try database YouTube video
                else if (videoData && videoData.youtube_id && videoData.is_youtube_synced) {
                    const embedUrl = `https://www.youtube.com/embed/${videoData.youtube_id}?autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

                    videoHtml = `
                        <div class="ratio ratio-16x9">
                            <iframe src="${embedUrl}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowfullscreen
                                    title="${escapeHtml(title)}"
                                    style="border-radius: 12px; width: 100%; height: 100%;"
                                    onload="this.style.opacity='1'"
                                    onerror="handleVideoError(this)"
                                    loading="lazy">
                            </iframe>
                        </div>
                    `;
                    hasValidSource = true;
                }
                // Try local video file
                else if (videoData && videoData.file_path && videoData.file_path.trim() !== '') {
                    // For local files, create a more robust video player
                    videoHtml = `
                        <div class="ratio ratio-16x9">
                            <video controls autoplay preload="metadata" class="w-100 h-100" style="border-radius: 12px; background: #000;" onloadstart="handleVideoLoadStart(this)" onerror="handleVideoError(this)">
                                <source src="${videoData.file_path}" type="video/mp4">
                                <source src="${videoData.file_path}" type="video/webm">
                                <source src="${videoData.file_path}" type="video/ogg">
                                <p class="text-center text-white p-4">
                                    Your browser does not support the video tag.
                                    <br><a href="${videoData.file_path}" target="_blank" class="btn btn-primary btn-sm mt-2">Download Video</a>
                                </p>
                            </video>
                        </div>
                    `;
                    hasValidSource = true;
                }

                // If no valid source found, show error message
                if (!hasValidSource) {
                    videoHtml = `
                        <div class="ratio ratio-16x9">
                            <div class="d-flex align-items-center justify-content-center h-100 text-white" style="border-radius: 12px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);">
                                <div class="text-center p-4">
                                    <i class="fas fa-exclamation-triangle fa-4x mb-3 text-white"></i>
                                    <h4 class="mb-3">Video Source Not Available</h4>
                                    <p class="mb-2">Unable to find a valid video source for this content.</p>
                                    <div class="alert alert-warning bg-warning bg-opacity-25 border-warning text-white mt-3">
                                        <small>
                                            <strong>Debug Info:</strong><br>
                                            Video ID: ${videoId || 'N/A'}<br>
                                            YouTube ID: ${youtubeId || 'N/A'}<br>
                                            Is YouTube: ${isYouTube ? 'Yes' : 'No'}<br>
                                            File Path: ${videoData?.file_path || 'N/A'}
                                        </small>
                                    </div>
                                    <button class="btn btn-light btn-sm mt-2" onclick="refreshVideoSource(${videoId})">
                                        <i class="fas fa-refresh me-1"></i>Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Set the video content
                videoPlayerContainer.innerHTML = videoHtml;

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

                // Show modal with cleanup on close
                const modal = new bootstrap.Modal(document.getElementById("videoModal"));

                // Add event listener to stop video when modal is closed
                const modalElement = document.getElementById("videoModal");
                const handleModalHide = () => {
                    stopVideoPlayback();
                    modalElement.removeEventListener('hidden.bs.modal', handleModalHide);
                };
                modalElement.addEventListener('hidden.bs.modal', handleModalHide);

                modal.show();

            } catch (error) {
                console.error('Failed to play video:', error);
                showNotification('Failed to play video: ' + error.message, 'error');

                // Show error in modal if it's open
                const videoPlayerContainer = document.getElementById("videoPlayer");
                if (videoPlayerContainer) {
                    videoPlayerContainer.innerHTML = `
                        <div class="ratio ratio-16x9">
                            <div class="d-flex align-items-center justify-content-center h-100 text-white bg-danger" style="border-radius: 12px;">
                                <div class="text-center p-4">
                                    <i class="fas fa-times-circle fa-4x mb-3"></i>
                                    <h4>Playback Error</h4>
                                    <p>${error.message}</p>
                                    <button class="btn btn-light btn-sm" onclick="location.reload()">
                                        <i class="fas fa-refresh me-1"></i>Refresh Page
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } finally {
                showLoading(false);
            }
        }

        // Helper functions for video error handling
        function handleVideoError(element) {
            console.error('Video/iframe failed to load:', element.src);

            const container = element.closest('.ratio');
            if (container) {
                container.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center h-100 text-white bg-warning" style="border-radius: 12px;">
                        <div class="text-center p-4">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                            <h5>Media Load Error</h5>
                            <p class="mb-2">Unable to load the video content.</p>
                            <button class="btn btn-light btn-sm" onclick="location.reload()">
                                <i class="fas fa-refresh me-1"></i>Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        function handleVideoLoadStart(video) {
            console.log('Video loading started:', video.src);
            // You can add loading indicators here if needed
        }

        function playDemoVideo() {
            showNotification('This is a demo video. In production, this would play a real video.', 'info');
        }

        function refreshVideoSource(videoId) {
            if (videoId) {
                playVideoPlayer(videoId, '', 'Refreshing...', false);
            } else {
                location.reload();
            }
        }

        // Function to stop video playback when modal is closed
        function stopVideoPlayback() {
            const videoPlayerContainer = document.getElementById("videoPlayer");
            if (!videoPlayerContainer) return;

            // Find all iframes (YouTube videos)
            const iframes = videoPlayerContainer.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                // Stop YouTube videos by replacing src with blank
                if (iframe.src.includes('youtube.com')) {
                    iframe.src = 'about:blank';
                }
            });

            // Find all video elements (local videos)
            const videos = videoPlayerContainer.querySelectorAll('video');
            videos.forEach(video => {
                video.pause();
                video.currentTime = 0;
            });

            // Clear the container to completely stop playback
            setTimeout(() => {
                videoPlayerContainer.innerHTML = '';
            }, 100);
        }

        // Connect to YouTube function
        async function connectToYouTube() {
            const statusElement = document.getElementById('youtubeConnectionStatus');
            if (statusElement) {
                statusElement.className = 'badge bg-info';
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Connecting...';
                statusElement.onclick = null;
            }

            try {
                const success = await window.youtubeAPI.signIn();
                if (success) {
                    showNotification('Successfully connected to YouTube!', 'success');
                    updateYouTubeConnectionStatus();
                } else {
                    showNotification('Failed to connect to YouTube', 'error');
                    updateYouTubeConnectionStatus();
                }
            } catch (error) {
                console.error('YouTube connection failed:', error);
                showNotification('YouTube connection failed: ' + error.message, 'error');
                updateYouTubeConnectionStatus();
            }
        }

        // New function to initialize YouTube panel
        async function initializeYouTubePanel() {
            // Perform any initialization tasks here, like loading data, connecting to the API, etc.
            console.log("Initializing YouTube panel...");
            loadYouTubePanel();
        }
        // User Profile Functions
        function updateUserProfile() {
            if (!currentUser) return;

            // Update profile avatar and info
            const avatarElements = document.querySelectorAll('#userProfileAvatar, #editProfileAvatar');
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

            // Update profile stats based on role
            updateUserStats();

            // Update edit form
            const editNameField = document.getElementById('editProfileName');
            const editEmailField = document.getElementById('editProfileEmail');
            if (editNameField) editNameField.value = currentUser.name;
            if (editEmailField) editEmailField.value = currentUser.email;
        }

        async function updateUserStats() {
            if (!currentUser) return;

            const videosEl = document.getElementById('userStatVideos');
            const viewsEl = document.getElementById('userStatViews');

            try {
                if (currentUser.role === 'admin') {
                    const response = await fetch('api/admin.php?action=analytics', {
                        credentials: 'include'
                    });
                    const data = await response.json();

                    if (data.success) {
                        if (videosEl) videosEl.textContent = data.analytics.total_videos || '0';
                        if (viewsEl) viewsEl.textContent = formatNumber(data.analytics.total_views || 0);

                        // Update stat labels for admin
                        const videoLabel = document.querySelector('#userStatVideos + .user-stat-label');
                        const viewLabel = document.querySelector('#userStatViews + .user-stat-label');
                        if (videoLabel) videoLabel.textContent = 'Total Videos';
                        if (viewLabel) viewLabel.textContent = 'Total Views';
                    }
                } else if (currentUser.role === 'creator' || currentUser.role === 'editor') {
                    const response = await fetch('api/videos.php?filter=my_videos', {
                        credentials: 'include'
                    });
                    const data = await response.json();

                    if (data.success) {
                        const myVideos = data.videos || [];
                        const totalViews = myVideos.reduce((sum, video) => sum + (video.views || 0), 0);

                        if (videosEl) videosEl.textContent = myVideos.length.toString();
                        if (viewsEl) viewsEl.textContent = formatNumber(totalViews);

                        // Update stat labels for creator
                        const videoLabel = document.querySelector('#userStatVideos + .user-stat-label');
                        const viewLabel = document.querySelector('#userStatViews + .user-stat-label');
                        if (videoLabel) videoLabel.textContent = 'My Videos';
                        if (viewLabel) viewLabel.textContent = 'My Views';
                    }
                } else if (currentUser.role === 'viewer') {
                    const response = await fetch('api/purchase.php', {
                        credentials: 'include'
                    });
                    const data = await response.json();

                    if (data.success) {
                        const purchases = data.purchases || [];
                        const totalSpent = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.price || 0), 0);

                        if (videosEl) videosEl.textContent = purchases.length.toString();
                        if (viewsEl) viewsEl.textContent = `$${totalSpent.toFixed(2)}`;

                        // Update stat labels for viewer
                        const videoLabel = document.querySelector('#userStatVideos + .user-stat-label');
                        const viewLabel = document.querySelector('#userStatViews + .user-stat-label');
                        if (videoLabel) videoLabel.textContent = 'Purchased';
                        if (viewLabel) viewLabel.textContent = 'Total Spent';
                    }
                }
            } catch (error) {
                console.error('Failed to load user stats:', error);
                if (videosEl) videosEl.textContent = '0';
                if (viewsEl) viewsEl.textContent = '0';
            }
        }



        // Mobile sidebar controls
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

        // Profile modal functions
        function showEditProfileModal() {
            updateEditProfileForm();
            const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            modal.show();
        }

        function updateEditProfileForm() {
            if (!currentUser) return;

            const nameField = document.getElementById('editProfileName');
            const emailField = document.getElementById('editProfileEmail');
            const avatar = document.getElementById('editProfileAvatar');

            if (nameField) nameField.value = currentUser.name;
            if (emailField) emailField.value = currentUser.email;
            if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }

        async function saveProfile() {
            const nameField = document.getElementById('editProfileName');
            const bioField = document.getElementById('editProfileBio');
            const websiteField = document.getElementById('editProfileWebsite');

            if (!nameField) return;

            const formData = {
                name: nameField.value.trim(),
                bio: bioField ? bioField.value.trim() : '',
                website: websiteField ? websiteField.value.trim() : ''
            };

            if (!formData.name) {
                showNotification('Name is required', 'error');
                return;
            }

            try {
                const response = await fetch('api/auth.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        action: 'update_profile',
                        ...formData
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update current user with the returned profile data
                    if (data.user) {
                        currentUser = { ...currentUser, ...data.user };
                        // Update localStorage
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } else {
                        currentUser.name = formData.name;
                    }

                    updateUserProfile();
                    showNotification('Profile updated successfully!', 'success');

                    const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                    modal.hide();
                } else {
                    showNotification('Failed to update profile: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Failed to save profile:', error);
                showNotification('Failed to save profile. Please try again.', 'error');
            }
        }

        function showUserSettings() {
            const modal = new bootstrap.Modal(document.getElementById('userSettingsModal'));

            // Show YouTube settings tab only for admins
            const youtubeTab = document.getElementById('youtubeSettingsTab');
            if (youtubeTab && currentUser && currentUser.role === 'admin') {
                youtubeTab.style.display = 'block';
                // Update YouTube status when settings are opened
                setTimeout(updateAdminYouTubeStatus, 100);
            } else if (youtubeTab) {
                youtubeTab.style.display = 'none';
            }

            modal.show();
        }

        function loadUserSettings() {
            // Load last login time
            const lastLoginEl = document.getElementById('lastLogin');
            if (lastLoginEl) {
                lastLoginEl.textContent = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
            }
        }

        function changePassword() {
            showNotification('Password change functionality will redirect to secure page', 'info');
            // In a real application, this would redirect to a secure password change page
        }

        function changeProfilePicture() {
            showNotification('Profile picture upload functionality coming soon!', 'info');
            // In a real application, this would open a file picker and handle image upload
        }

        async function saveUserSettings() {
            const settings = {
                profilePublic: document.getElementById('profilePublic')?.checked || false,
                showOnlineStatus: document.getElementById('showOnlineStatus')?.checked || false,
                timezone: document.getElementById('timezone')?.value || 'UTC',
                twoFactorAuth: document.getElementById('twoFactorAuth')?.checked || false,
                emailNotifications: document.getElementById('emailNotifications')?.checked || false,
                pushNotifications: document.getElementById('pushNotifications')?.checked || false,
                marketingEmails: document.getElementById('marketingEmails')?.checked || false,
                analyticsOptIn: document.getElementById('analyticsOptIn')?.checked || false,
                thirdPartySharing: document.getElementById('thirdPartySharing')?.checked || false
            };

            try {
                // In a real application, this would save settings to the server
                localStorage.setItem('userSettings', JSON.stringify(settings));
                showNotification('Settings saved successfully!', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('userSettingsModal'));
                modal.hide();
            } catch (error) {
                console.error('Failed to save settings:', error);
                showNotification('Failed to save settings. Please try again.', 'error');
            }
        }

        function downloadUserData() {
            showNotification('Preparing your data for download...', 'info');
            // In a real application, this would trigger a data export process
            setTimeout(() => {
                showNotification('Data export will be emailed to you within 24 hours', 'success');
            }, 2000);
        }

        // Initialize responsive behavior
        document.addEventListener('DOMContentLoaded', function() {
            // Handle window resize
            window.addEventListener('resize', function() {
                if (window.innerWidth > 992) {
                    closeSidebar();
                }
            });

            // Close sidebar when clicking nav links on mobile
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 992) {
                        setTimeout(closeSidebar, 100);
                    }
                });
            });
        });

        // Helper function to update YouTube status for admin settings
        async function updateAdminYouTubeStatus() {
            const youtubeStatusElement = document.getElementById('adminYouTubeStatus');
            const connectionStatusElement = document.getElementById('adminYoutubeConnectionStatus');

            if (!youtubeStatusElement) return;

            try {
                await window.youtubeAPI.initialize();
                if (window.youtubeAPI.isSignedIn()) {
                    const channelInfo = await window.youtubeAPI.getMyChannelInfo();

                    youtubeStatusElement.innerHTML = `
                        <div class="d-flex align-items-center">
                            <img src="${channelInfo.thumbnail}" alt="Channel Thumbnail" class="rounded-circle me-3" style="width: 50px; height: 50px; border: 2px solid #28a745;">
                            <div>
                                <div class="fw-bold text-success">${channelInfo.title}</div>
                                <small class="text-muted">
                                    <i class="fas fa-users me-1"></i>${channelInfo.subscriber_count ? window.youtubeAPI.formatNumber(channelInfo.subscriber_count) : 'N/A'} subscribers
                                    <span class="mx-2">•</span>
                                    <i class="fas fa-video me-1"></i>${channelInfo.video_count ? window.youtubeAPI.formatNumber(channelInfo.video_count) : 'N/A'} videos
                                </small>
                                <div class="mt-1">
                                    <span class="badge bg-success">
                                        <i class="fas fa-check me-1"></i>Connected
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;

                    if (connectionStatusElement) {
                        connectionStatusElement.innerHTML = '<i class="fas fa-check-circle me-1"></i>Connected';
                        connectionStatusElement.className = 'badge bg-success fs-6 px-3 py-2';
                    }
                } else {
                    youtubeStatusElement.innerHTML = `
                        <div class="d-flex align-items-center">
                            <div class="bg-light rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; border: 2px solid #dc3545;">
                                <i class="fab fa-youtube text-danger fa-lg"></i>
                            </div>
                            <div>
                                <div class="fw-bold text-danger">Not Connected</div>
                                <small class="text-muted">YouTube API access required for uploads</small>
                                <div class="mt-1">
                                    <span class="badge bg-danger">
                                        <i class="fas fa-times me-1"></i>Disconnected
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;

                    if (connectionStatusElement) {
                        connectionStatusElement.innerHTML = '<i class="fas fa-times-circle me-1"></i>Disconnected';
                        connectionStatusElement.className = 'badge bg-danger fs-6 px-3 py-2';
                    }
                }
            } catch (error) {
                console.error("Failed to update admin YouTube status:", error);
                youtubeStatusElement.innerHTML = `
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; border: 2px solid #ffc107;">
                            <i class="fas fa-exclamation-triangle text-warning fa-lg"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-warning">Connection Error</div>
                            <small class="text-muted">Unable to verify YouTube connection</small>
                            <div class="mt-1">
                                <span class="badge bg-warning">
                                    <i class="fas fa-exclamation-triangle me-1"></i>Error
                                </span>
                            </div>
                        </div>
                    </div>
                `;

                if (connectionStatusElement) {
                    connectionStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Error';
                    connectionStatusElement.className = 'badge bg-warning fs-6 px-3 py-2';
                }
            }
        }

        // Enhanced YouTube connection functions for admin
        async function refreshYouTubeConnection() {
            const refreshBtn = document.getElementById('refreshYoutubeTokenBtn');
            if (refreshBtn) {
                const originalText = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
                refreshBtn.disabled = true;

                try {
                    // Call the refresh token API directly
                    const response = await fetch('api/youtube_tokens.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            action: 'refresh_token'
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Update the YouTube API client with new tokens
                        if (window.youtubeAPI) {
                            window.youtubeAPI.accessToken = data.tokens.access_token;
                            window.youtubeAPI.refreshToken = data.tokens.refresh_token;
                            window.youtubeAPI.tokenExpiry = new Date(data.tokens.expires_at);
                        }

                        showNotification('YouTube token refreshed successfully!', 'success');
                        setTimeout(() => updateAdminYouTubeStatus(), 1000);
                    } else {
                        showNotification('Failed to refresh YouTube token: ' + data.message, 'error');
                    }
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    showNotification('Token refresh failed: ' + error.message, 'error');
                } finally {
                    setTimeout(() => {
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;
                    }, 2000);
                }
            }
        }

        async function testYouTubeConnection() {
            try {
                showLoading(true);

                if (!window.youtubeAPI.isSignedIn()) {
                    showNotification('Not connected to YouTube', 'warning');
                    return;
                }

                // Test the connection by attempting to get channel info
                const channelInfo = await window.youtubeAPI.getMyChannelInfo();

                if (channelInfo) {
                    showNotification('YouTube connection test successful!', 'success');
                } else {
                    showNotification('YouTube connection test failed', 'error');
                }
            } catch (error) {
                console.error('YouTube connection test failed:', error);
                showNotification('Connection test failed: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        }

        // Helper function to update status in the upload panel
        function updateUploadPanelStatus() {
            // Check and update YouTube connection status
            updateYouTubeConnectionStatus();

            // Show appropriate message for creators about YouTube setup
            if (currentUser && (currentUser.role === 'creator' || currentUser.role === 'editor')) {
                const statusContainer = document.querySelector('#uploadPanel .alert');
                if (!statusContainer) {
                    const uploadPanel = document.getElementById('uploadPanel');
                    if (uploadPanel && (!window.youtubeAPI || !window.youtubeAPI.isSignedIn())) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert alert-info';
                        alertDiv.innerHTML = `
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Note:</strong> YouTube integration needs to be set up by an administrator before you can upload videos.
                        `;
                        uploadPanel.insertBefore(alertDiv, uploadPanel.firstChild);
                    }
                }
            }

            console.log('Upload panel status updated.');
        }
// Add better error handling for network issues
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

        // Add connection status monitoring
        window.addEventListener('online', () => {
            showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            showNotification('You are now offline', 'warning');
        });