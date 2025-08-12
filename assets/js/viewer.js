/**
 * VideoHub Viewer Module
 * Handles viewer functionality including browsing, purchasing, and watching videos
 */

class ViewerManager {
    constructor() {
        this.videos = [];
        this.purchases = [];
        this.favorites = [];
        this.currentVideo = null;
        this.player = null;
        this.filteredVideos = [];
        this.currentViewerId = 2; // Demo viewer ID (Sarah Davis)
        this.favorites = [1, 2]; // Demo favorites - videos 1 and 2
        this.init();
    }

    async init() {
        await this.loadDataFromAPI();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        this.initializePlayer();
    }

    async loadDataFromAPI() {
        try {
            // Wait for API service to be available and load data
            let retries = 0;
            const maxRetries = 50;
            
            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (window.apiService) {
                // Get current user info
                const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
                const userId = userSession.userId || 8; // Default to test viewer
                
                // Load general platform metrics (with optional user data)
                const metricsResponse = await window.apiService.get(`/metrics/viewer?user_id=${userId}`);
                if (metricsResponse.success) {
                    this.updateDashboardMetrics(metricsResponse.data);
                }
                
                // Load videos data (needed for all pages)
                const videosResponse = await window.apiService.get('/videos');
                
                // Handle API response format properly
                this.videos = Array.isArray(videosResponse.videos) ? videosResponse.videos : 
                             Array.isArray(videosResponse.data?.videos) ? videosResponse.data.videos : 
                             Array.isArray(videosResponse.data) ? videosResponse.data : [];
                             
                // Initialize purchases as empty - will be loaded on purchases page only
                this.purchases = [];
                
                console.log('Viewer data loaded:', {
                    videosLength: this.videos.length,
                    purchasesLength: this.purchases.length
                });
            } else {
                console.error('API service not available');
                this.videos = [];
                this.purchases = [];
            }
        } catch (error) {
            console.error('Failed to load viewer data:', error);
            // Set empty values on error
            this.updateDashboardMetrics({
                totalVideosCount: 0,
                purchasedVideosCount: 0,
                totalSpentAmount: '0.00',
                favoritesCount: 0
            });
        }
    }

    updateDashboardMetrics(metrics) {
        // Update dashboard with general platform metrics
        const totalVideosCountEl = document.getElementById('totalVideosCount');
        const totalPurchasesCountEl = document.getElementById('totalPurchasesCount');
        const platformRevenueEl = document.getElementById('platformRevenue');
        const totalCreatorsEl = document.getElementById('totalCreators');
        
        // Update purchase page metrics
        const purchasedVideosCountEl = document.getElementById('purchasedVideosCount');
        const totalSpentAmountEl = document.getElementById('totalSpentAmount');
        const totalPurchasesEl = document.getElementById('totalPurchases');
        const totalSpentEl = document.getElementById('totalSpent');
        
        // Dashboard metrics (general platform stats)
        if (totalVideosCountEl) totalVideosCountEl.textContent = metrics.totalVideosCount || 0;
        if (totalPurchasesCountEl) totalPurchasesCountEl.textContent = metrics.totalPurchases || 0;
        if (platformRevenueEl) platformRevenueEl.textContent = '$' + (metrics.platformRevenue || '0.00');
        if (totalCreatorsEl) totalCreatorsEl.textContent = metrics.totalCreators || 0;
        
        // Purchase page metrics (user-specific)
        if (purchasedVideosCountEl) purchasedVideosCountEl.textContent = metrics.userPurchases || 0;
        if (totalSpentAmountEl) totalSpentAmountEl.textContent = '$' + (metrics.userSpent || '0.00');
        if (totalPurchasesEl) totalPurchasesEl.textContent = metrics.userPurchases || 0;
        if (totalSpentEl) totalSpentEl.textContent = '$' + (metrics.userSpent || '0.00');
    }

    async loadRemainingData() {
        try {
            // Filter purchases for current viewer (if needed)
            // this.purchases = this.purchases.filter(p => p.viewerId === this.currentViewerId);
            
            // Enrich purchases with video data
            this.purchases = this.purchases.map(purchase => {
                const video = this.videos.find(v => v.id === purchase.videoId);
                return {
                    ...purchase,
                    video: video ? {
                        ...video,
                        creator: video.creatorName || 'Unknown Creator',
                        thumbnail: video.thumbnail || 'https://via.placeholder.com/400x225/666/fff?text=Video',
                        rating: 4.5 // Default rating
                    } : null
                };
            }).filter(p => p.video); // Remove purchases without video data
            
            console.log('Viewer data loaded:', { videos: this.videos.length, purchases: this.purchases.length });
        } catch (error) {
            console.error('Error loading viewer data:', error);
            this.videos = [];
            this.purchases = [];
        }
    }

    bindEvents() {
        // Filter and search events
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const searchInput = document.getElementById('searchInput');
        const applyFilters = document.getElementById('applyFilters');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (applyFilters) {
            applyFilters.addEventListener('click', () => this.applyFilters());
        }

        // View mode toggle
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        
        if (gridView) {
            gridView.addEventListener('click', () => this.switchViewMode('grid'));
        }
        if (listView) {
            listView.addEventListener('click', () => this.switchViewMode('list'));
        }

        // Purchase modal events
        const purchaseFromPreviewBtn = document.getElementById('purchaseFromPreview');
        const confirmPurchaseBtn = document.getElementById('confirmPurchase');
        if (purchaseFromPreviewBtn) {
            purchaseFromPreviewBtn.addEventListener('click', this.handlePurchaseFromPreview.bind(this));
        }
        if (confirmPurchaseBtn) {
            confirmPurchaseBtn.addEventListener('click', this.handleConfirmPurchase.bind(this));
        }

        // Profile form events
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.loadDashboardPage();
                break;
            case 'purchases.html':
                this.loadPurchasesPage();
                break;
            case 'profile.html':
                this.loadProfilePage();
                break;
        }
    }

    async loadDashboardPage() {
        console.log('Loading dashboard page...');
        
        // Load user purchases for proper card display
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userId = userSession.userId || 8;
        
        try {
            // Get user-specific purchases for card display
            const purchasesResponse = await window.apiService.get(`/purchases?user_id=${userId}`);
            
            if (purchasesResponse.success) {
                this.purchases = Array.isArray(purchasesResponse.purchases) ? purchasesResponse.purchases : 
                                Array.isArray(purchasesResponse.data?.purchases) ? purchasesResponse.data.purchases : 
                                Array.isArray(purchasesResponse.data) ? purchasesResponse.data : [];
                
                console.log('Dashboard user purchases loaded:', this.purchases);
            }
        } catch (error) {
            console.error('Failed to load user purchases for dashboard:', error);
            this.purchases = [];
        }
        
        this.renderAllVideos();
        this.bindAllVideosEvents();
    }

    async loadPurchasesPage() {
        console.log('Loading purchases page data...');
        
        // Load user's purchase data from API
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userId = userSession.userId || 8;
        
        try {
            // Get user-specific purchases ONLY on purchases page
            const purchasesResponse = await window.apiService.get(`/purchases?user_id=${userId}`);
            console.log('Purchases API response:', purchasesResponse);
            
            if (purchasesResponse.success) {
                // Update purchases with proper data structure
                this.purchases = Array.isArray(purchasesResponse.purchases) ? purchasesResponse.purchases : 
                                Array.isArray(purchasesResponse.data?.purchases) ? purchasesResponse.data.purchases : 
                                Array.isArray(purchasesResponse.data) ? purchasesResponse.data : [];
                
                console.log('User purchases loaded:', this.purchases);
                
                // Enrich purchases with video data
                this.purchases = this.purchases.map(purchase => {
                    const video = this.videos.find(v => v.id === purchase.video_id);
                    return {
                        ...purchase,
                        video: video ? {
                            ...video,
                            creator: video.creatorName || video.creator_name || purchase.creator_name || 'Unknown Creator',
                            thumbnail: video.thumbnail || purchase.thumbnail || 'https://via.placeholder.com/400x225/666/fff?text=Video'
                        } : null
                    };
                }).filter(p => p.video); // Remove purchases without video data
            }
            
            // Update purchase stats in UI
            this.updatePurchaseStats();
            this.renderPurchasedVideos();
            
        } catch (error) {
            console.error('Failed to load purchases:', error);
            this.purchases = [];
            this.updatePurchaseStats();
            this.renderPurchasedVideos();
        }
    }
    
    updatePurchaseStats() {
        const totalPurchasesEl = document.getElementById('totalPurchases');
        const totalSpentEl = document.getElementById('totalSpent');
        const thisMonthEl = document.getElementById('thisMonth');
        
        if (totalPurchasesEl) {
            totalPurchasesEl.textContent = this.purchases.length;
        }
        
        if (totalSpentEl) {
            const totalSpent = this.purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            totalSpentEl.textContent = '$' + totalSpent.toFixed(2);
        }
        
        if (thisMonthEl) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const thisMonthPurchases = this.purchases.filter(p => {
                const purchaseDate = new Date(p.purchase_date || p.created_at);
                return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
            });
            thisMonthEl.textContent = thisMonthPurchases.length;
        }
    }

    loadProfilePage() {
        this.loadProfileData();
    }

    renderAllVideos() {
        const container = document.getElementById('allVideos');
        if (!container) return;

        this.filteredVideos = this.videos;
        this.displayVideos();
    }

    displayVideos() {
        const container = document.getElementById('allVideos');
        if (!container) return;

        container.innerHTML = '';

        this.filteredVideos.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
            col.innerHTML = this.createVideoCard(video);
            container.appendChild(col);
        });
    }

    bindAllVideosEvents() {
        // Search functionality
        const searchInput = document.getElementById('videoSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterVideos();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterVideos();
            });
        }

        // Sort functionality
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.sortVideos();
            });
        }

        // View mode toggle
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        
        if (gridView) {
            gridView.addEventListener('change', () => {
                if (gridView.checked) {
                    this.switchViewMode('grid');
                }
            });
        }
        
        if (listView) {
            listView.addEventListener('change', () => {
                if (listView.checked) {
                    this.switchViewMode('list');
                }
            });
        }
    }

    filterVideos() {
        const searchTerm = document.getElementById('videoSearch')?.value.toLowerCase() || '';
        const selectedCategory = document.getElementById('categoryFilter')?.value || '';

        this.filteredVideos = this.videos.filter(video => {
            const matchesSearch = video.title.toLowerCase().includes(searchTerm) ||
                                video.description.toLowerCase().includes(searchTerm) ||
                                video.creatorName.toLowerCase().includes(searchTerm);
            
            const matchesCategory = !selectedCategory || video.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.sortVideos();
    }

    sortVideos() {
        const sortBy = document.getElementById('sortBy')?.value || 'newest';

        switch (sortBy) {
            case 'newest':
                this.filteredVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                break;
            case 'oldest':
                this.filteredVideos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                break;
            case 'price-low':
                this.filteredVideos.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredVideos.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                this.filteredVideos.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
                break;
        }

        this.displayVideos();
    }

    switchViewMode(mode) {
        const container = document.getElementById('allVideos');
        if (!container) return;

        if (mode === 'list') {
            // Create table view
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Video</th>
                                <th>Creator</th>
                                <th>Duration</th>
                                <th>Price</th>
                                <th>Category</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="videosTableBody">
                        </tbody>
                    </table>
                </div>
            `;
            
            const tbody = document.getElementById('videosTableBody');
            this.filteredVideos.forEach(video => {
                const isPurchased = this.purchases.some(p => p.videoId === video.id);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${video.thumbnail}" width="60" height="34" class="rounded me-3" alt="${video.title}">
                            <div>
                                <strong>${video.title}</strong><br>
                                <small class="text-muted">${video.category}</small>
                            </div>
                        </div>
                    </td>
                    <td>${video.creatorName}</td>
                    <td>${video.duration}</td>
                    <td>${isPurchased ? 'Owned' : '$' + video.price.toFixed(2)}</td>
                    <td><span class="badge bg-secondary">${video.category}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewerManager.${isPurchased ? 'playVideo' : 'showVideoPreview'}(${video.id})">
                                <i class="fas fa-${isPurchased ? 'play' : 'eye'}"></i>
                            </button>
                            ${!isPurchased ? `
                                <button class="btn btn-outline-success" onclick="viewerManager.showPurchaseModal(${video.id})">
                                    <i class="fas fa-shopping-cart"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // Grid view is the default
            this.displayVideos();
        }
    }

    createVideoCard(video) {
        const isPurchased = this.purchases.some(p => p.video_id == video.id);
        const isFavorite = this.favorites.includes(video.id);
        const price = parseFloat(video.price || 0);
        
        return `
            <div class="card h-100 shadow-sm border-0 video-card">
                <div class="position-relative video-thumbnail-container" style="height: 180px; background-color: #e9ecef; cursor: pointer;" 
                     onclick="viewerManager.${isPurchased ? `playVideo(${video.id})` : `showPurchaseModal(${video.id})`}">
                    ${video.thumbnail ? `
                        <img src="${video.thumbnail}" 
                             class="card-img-top w-100 h-100" alt="${video.title}" style="object-fit: cover;">
                    ` : `
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <i class="fas fa-play fa-3x text-muted"></i>
                        </div>
                    `}
                    
                    <!-- Play Button Overlay -->
                    <div class="position-absolute top-50 start-50 translate-middle">
                        <div class="play-button-overlay d-flex align-items-center justify-content-center" 
                             style="width: 60px; height: 60px; background: rgba(0,0,0,0.7); border-radius: 50%; transition: all 0.3s ease;">
                            <i class="fas fa-play text-white" style="font-size: 24px; margin-left: 3px;"></i>
                        </div>
                    </div>
                    
                    ${isPurchased ? `
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-success"><i class="fas fa-check"></i></span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-body p-3">
                    <h6 class="card-title mb-2 fw-bold" style="line-height: 1.3;">${video.title}</h6>
                    <p class="card-text text-muted small mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                        ${video.description || 'No description available'}
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        ${isPurchased ? `
                            <span class="text-success fw-bold">Purchased</span>
                        ` : `
                            <span class="text-primary fw-bold">${price > 0 ? `$${price.toFixed(2)}` : 'Free'}</span>
                        `}
                        <small class="text-muted">by ${video.creatorName || 'Unknown Creator'}</small>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <small class="text-muted">${video.views || 0} views</small>
                        <button class="btn btn-sm ${isPurchased ? 'btn-success' : 'btn-primary'}" 
                                onclick="viewerManager.${isPurchased ? `playVideo(${video.id})` : `showPurchaseModal(${video.id})`}">
                            ${isPurchased ? 'Watch' : 'Purchase'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPurchaseStats() {
        const totalVideosCount = document.getElementById('totalVideosCount');
        const purchasedVideosCount = document.getElementById('purchasedVideosCount');
        const totalSpentAmount = document.getElementById('totalSpentAmount');
        const favoritesCount = document.getElementById('favoritesCount');

        // Total videos available in platform
        if (totalVideosCount) totalVideosCount.textContent = this.videos.length;
        
        // Purchased videos count
        if (purchasedVideosCount) purchasedVideosCount.textContent = this.purchases.length;
        
        // Total spent by current viewer
        if (totalSpentAmount) {
            const total = this.purchases.reduce((sum, p) => sum + p.price, 0);
            totalSpentAmount.textContent = '$' + total.toFixed(2);
        }
        
        // Favorites count
        if (favoritesCount) {
            favoritesCount.textContent = this.favorites.length;
        }
    }

    renderPurchasedVideos() {
        const gridContainer = document.getElementById('purchasesGrid');
        
        if (!gridContainer) {
            console.warn('Purchase grid container not found');
            return;
        }

        console.log('Rendering purchases:', this.purchases);

        if (this.purchases.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No purchased videos yet</h5>
                    <p class="text-muted">Browse and purchase videos to watch them here</p>
                    <a href="dashboard.html" class="btn btn-primary">Browse Videos</a>
                </div>
            `;
            return;
        }

        gridContainer.innerHTML = '';
        this.purchases.forEach(purchase => {
            if (purchase.video) {
                const col = document.createElement('div');
                col.className = 'col-lg-4 col-md-6 mb-4';
                col.innerHTML = this.createPurchasedVideoCard(purchase);
                gridContainer.appendChild(col);
            }
        });

        // Grid view only - no list view needed for purchases page
    }

    createPurchasedVideoCard(purchase) {
        const purchaseDate = new Date(purchase.purchase_date || purchase.created_at).toLocaleDateString();
        const videoId = purchase.video_id || purchase.video.id;
        const amount = parseFloat(purchase.amount || 0);

        return `
            <div class="card h-100 shadow-sm border-0">
                <div class="position-relative" style="cursor: pointer;" onclick="viewerManager.playVideo(${videoId})">
                    <img src="${purchase.video.thumbnail}" class="card-img-top" alt="${purchase.video.title}" style="height: 200px; object-fit: cover;">
                    
                    <!-- Play Button Overlay -->
                    <div class="position-absolute top-50 start-50 translate-middle">
                        <div class="play-button-overlay d-flex align-items-center justify-content-center" 
                             style="width: 60px; height: 60px; background: rgba(0,0,0,0.7); border-radius: 50%; transition: all 0.3s ease;">
                            <i class="fas fa-play text-white" style="font-size: 24px; margin-left: 3px;"></i>
                        </div>
                    </div>
                    
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-success">Purchased</span>
                    </div>
                    <div class="position-absolute bottom-0 start-0 end-0 p-3" style="background: linear-gradient(transparent, rgba(0,0,0,0.7));">
                        <div class="d-flex justify-content-between align-items-end">
                            <span class="badge bg-dark">${purchase.video.duration || '0:00'}</span>
                            <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); viewerManager.playVideo(${videoId})">
                                <i class="fas fa-play me-1"></i>Watch Now
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title mb-2">${purchase.video.title || 'Untitled Video'}</h6>
                    <p class="card-text text-muted small mb-2">${purchase.video.description || purchase.description || 'No description available'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-success fw-bold">$${amount.toFixed(2)}</span>
                        <small class="text-muted">by ${purchase.video.creator || purchase.creator_name || 'Unknown Creator'}</small>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">Purchased: ${purchaseDate}</small>
                    </div>
                </div>
            </div>
        `;
    }

    applyFilters() {
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const search = document.getElementById('searchInput')?.value.toLowerCase() || '';

        let filtered = this.purchases;

        if (category) {
            filtered = filtered.filter(p => p.video.category === category);
        }

        if (status) {
            if (status === 'watched') {
                filtered = filtered.filter(p => p.watchProgress > 80);
            } else if (status === 'unwatched') {
                filtered = filtered.filter(p => p.watchProgress < 20);
            } else if (status === 'favorite') {
                filtered = filtered.filter(p => this.favorites.includes(p.videoId));
            }
        }

        if (search) {
            filtered = filtered.filter(p => 
                p.video.title.toLowerCase().includes(search) ||
                p.video.creatorName.toLowerCase().includes(search)
            );
        }

        // Update display with filtered results
        this.renderFilteredPurchases(filtered);
    }

    renderFilteredPurchases(purchases) {
        const gridContainer = document.getElementById('videosGrid');
        if (gridContainer) {
            gridContainer.innerHTML = '';
            purchases.forEach(purchase => {
                const col = document.createElement('div');
                col.className = 'col-lg-4 col-md-6 mb-4';
                col.innerHTML = this.createPurchasedVideoCard(purchase);
                gridContainer.appendChild(col);
            });
        }
    }

    // Utility methods
    parseDuration(duration) {
        const parts = duration.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    initializePlayer() {
        // Initialize YouTube API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            
            window.onYouTubeIframeAPIReady = () => {
                console.log('YouTube API ready');
            };
        }
    }

    async playVideo(videoId) {
        try {
            // Find the video
            const video = this.videos.find(v => v.id == videoId);
            if (!video) {
                alert('Video not found');
                return;
            }
            
            // Check if user has purchased this video
            const isPurchased = this.purchases.some(p => p.video_id == videoId);
            if (!isPurchased) {
                alert('You need to purchase this video first');
                this.showPurchaseModal(videoId);
                return;
            }
            
            // Extract YouTube video ID from thumbnail URL
            let youtubeVideoId = '';
            if (video.thumbnail) {
                // Try different YouTube URL patterns
                const patterns = [
                    /\/vi\/([^\/]+)\//,  // Standard thumbnail format
                    /watch\?v=([^&]+)/,  // Watch URL format
                    /youtu\.be\/([^?]+)/, // Short URL format
                    /embed\/([^?]+)/     // Embed URL format
                ];
                
                for (const pattern of patterns) {
                    const match = video.thumbnail.match(pattern);
                    if (match) {
                        youtubeVideoId = match[1];
                        break;
                    }
                }
            }
            
            if (!youtubeVideoId) {
                alert('Video not available for playback');
                return;
            }
            
            // Create video player modal
            this.showVideoPlayer(youtubeVideoId, video.title);
            
        } catch (error) {
            console.error('Error playing video:', error);
            alert('Error loading video');
        }
    }

    showVideoPlayer(youtubeVideoId, title) {
        // Create modal with YouTube player
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'videoPlayerModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" onclick="viewerManager.stopVideo()"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="youtubePlayer" style="width: 100%; height: 500px;"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Initialize YouTube player
        if (window.YT && window.YT.Player) {
            this.ytPlayer = new window.YT.Player('youtubePlayer', {
                height: '500',
                width: '100%',
                videoId: youtubeVideoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0
                }
            });
        } else {
            // Fallback to iframe embed
            document.getElementById('youtubePlayer').innerHTML = `
                <iframe width="100%" height="500" 
                        src="https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=1" 
                        frameborder="0" allowfullscreen>
                </iframe>
            `;
        }
        
        // Clean up on modal close
        modal.addEventListener('hidden.bs.modal', () => {
            this.stopVideo();
            modal.remove();
        });
    }

    stopVideo() {
        if (this.ytPlayer && this.ytPlayer.destroy) {
            this.ytPlayer.destroy();
            this.ytPlayer = null;
        }
    }

    toggleFavorite(videoId) {
        const index = this.favorites.indexOf(videoId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            console.log(`Removed video ${videoId} from favorites`);
        } else {
            this.favorites.push(videoId);
            console.log(`Added video ${videoId} to favorites`);
        }
        
        // Re-render the current view to update favorite icons
        if (window.location.href.includes('purchases.html')) {
            this.renderPurchasedVideos();
        } else {
            this.displayVideos();
        }
    }

    shareVideo(videoId) {
        const video = this.videos.find(v => v.id == videoId);
        if (video) {
            // Simple share functionality
            if (navigator.share) {
                navigator.share({
                    title: video.title,
                    text: `Check out this video: ${video.title}`,
                    url: window.location.href
                });
            } else {
                // Fallback to copying to clipboard
                const shareText = `Check out this video: ${video.title} - ${window.location.href}`;
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('Video link copied to clipboard!');
                }).catch(() => {
                    alert('Share link: ' + shareText);
                });
            }
        }
    }

    // Event handlers
    showVideoPreview(videoId) {
        console.log('Showing preview for video:', videoId);
    }

    async purchaseVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) {
            alert('Video not found');
            return;
        }
        
        // Check if already purchased
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userId = userSession.userId || 8;
        const alreadyPurchased = this.purchases.some(p => p.video_id === videoId);
        
        if (alreadyPurchased) {
            alert('You have already purchased this video');
            return;
        }
        
        // Show purchase modal
        this.showPurchaseModal(video, userId);
    }

    showPurchaseModal(videoId) {
        const video = this.videos.find(v => v.id == videoId);
        if (!video) {
            alert('Video not found');
            return;
        }
        
        // Get current user ID
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userId = userSession.userId || 8;
        
        // Create payment modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'purchaseModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Purchase Video</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4">
                                <img src="${video.thumbnail || 'https://via.placeholder.com/400x225/666/fff?text=Video'}" class="img-fluid rounded" alt="${video.title}">
                            </div>
                            <div class="col-md-8">
                                <h5>${video.title}</h5>
                                <p class="text-muted">By ${video.creatorName || video.creator_name || 'Unknown Creator'}</p>
                                <p>${video.description || 'No description available'}</p>
                                <div class="alert alert-info">
                                    <strong>Price: $${video.price ? parseFloat(video.price).toFixed(2) : '0.00'}</strong>
                                    <br><small>One-time purchase - lifetime access</small>
                                </div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <form id="paymentForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Payment Method</h6>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="paymentMethod" value="card" id="cardPayment" checked>
                                            <label class="form-check-label" for="cardPayment">
                                                <i class="fas fa-credit-card me-2"></i>Credit/Debit Card
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="paymentMethod" value="paypal" id="paypalPayment">
                                            <label class="form-check-label" for="paypalPayment">
                                                <i class="fab fa-paypal me-2"></i>PayPal
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="paymentMethod" value="crypto" id="cryptoPayment">
                                            <label class="form-check-label" for="cryptoPayment">
                                                <i class="fab fa-bitcoin me-2"></i>Cryptocurrency
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div id="cardDetails">
                                        <h6>Card Details</h6>
                                        <div class="mb-2">
                                            <input type="text" class="form-control" placeholder="Card Number" name="cardNumber" value="4242 4242 4242 4242">
                                        </div>
                                        <div class="row">
                                            <div class="col-6">
                                                <input type="text" class="form-control" placeholder="MM/YY" name="expiry" value="12/26">
                                            </div>
                                            <div class="col-6">
                                                <input type="text" class="form-control" placeholder="CVV" name="cvv" value="123">
                                            </div>
                                        </div>
                                    </div>
                                    <div id="paypalDetails" style="display: none;">
                                        <h6>PayPal Details</h6>
                                        <input type="email" class="form-control" placeholder="PayPal Email" name="paypalEmail" value="demo@example.com">
                                    </div>
                                    <div id="cryptoDetails" style="display: none;">
                                        <h6>Crypto Wallet</h6>
                                        <input type="text" class="form-control" placeholder="Wallet Address" name="walletAddress" value="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa">
                                    </div>
                                </div>
                            </div>
                        </form>
                        
                        <div class="alert alert-warning mt-3">
                            <i class="fas fa-info-circle me-2"></i>
                            This is a demo payment system. No real charges will be made.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="viewerManager.processPayment(${video.id}, ${userId})">
                            <i class="fas fa-shopping-cart me-2"></i>Purchase for $${video.price ? parseFloat(video.price).toFixed(2) : '0.00'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Handle payment method change
        modal.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', function() {
                modal.querySelectorAll('#cardDetails, #paypalDetails, #cryptoDetails').forEach(detail => {
                    detail.style.display = 'none';
                });
                modal.querySelector('#' + this.value + 'Details').style.display = 'block';
            });
        });
        
        // Clean up when closed
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async processPayment(videoId, userId) {
        const modal = document.querySelector('.modal.show');
        const form = modal.querySelector('#paymentForm');
        const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked').value;
        
        // Get payment details based on method
        let paymentDetails = {};
        switch (paymentMethod) {
            case 'card':
                paymentDetails = {
                    card_number: form.querySelector('input[name="cardNumber"]').value,
                    expiry: form.querySelector('input[name="expiry"]').value,
                    cvv: form.querySelector('input[name="cvv"]').value
                };
                break;
            case 'paypal':
                paymentDetails = {
                    paypal_email: form.querySelector('input[name="paypalEmail"]').value
                };
                break;
            case 'crypto':
                paymentDetails = {
                    wallet_address: form.querySelector('input[name="walletAddress"]').value
                };
                break;
        }
        
        try {
            // Show loading
            const purchaseBtn = modal.querySelector('button[onclick*="processPayment"]');
            purchaseBtn.disabled = true;
            purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            
            const response = await window.apiService.post('/payments/purchase', {
                video_id: videoId,
                user_id: userId,
                payment_method: paymentMethod,
                payment_details: paymentDetails
            });
            
            if (response.success) {
                // Close modal
                bootstrap.Modal.getInstance(modal).hide();
                
                // Show success message
                alert(`Purchase successful! You now have access to "${response.data.video_title}"`);
                
                // Refresh data to show purchased video
                await this.loadDataFromAPI();
                this.loadPageSpecificHandlers();
                
            } else {
                alert('Payment failed: ' + response.message);
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            const purchaseBtn = modal.querySelector('button[onclick*="processPayment"]');
            if (purchaseBtn) {
                purchaseBtn.disabled = false;
                purchaseBtn.innerHTML = '<i class="fas fa-shopping-cart me-2"></i>Purchase for $' + (this.videos.find(v => v.id === videoId)?.price || '0.00');
            }
        }
    }

    async playVideo(videoId) {
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userId = userSession.userId || 8;
        
        try {
            // Check if user has access to this video
            const accessResponse = await window.apiService.get(`/payments/check-access?video_id=${videoId}&user_id=${userId}`);
            
            if (accessResponse.success && accessResponse.has_access) {
                // User has access, play the video
                this.openVideoPlayer(videoId);
            } else {
                // User doesn't have access, show purchase option
                alert('You need to purchase this video to watch it.');
                this.purchaseVideo(videoId);
            }
        } catch (error) {
            console.error('Access check error:', error);
            alert('Error checking video access. Please try again.');
        }
    }
    
    openVideoPlayer(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) {
            alert('Video not found');
            return;
        }
        
        // Create video player modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${video.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="ratio ratio-16x9">
                            <video controls class="w-100">
                                <source src="${video.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div class="p-3">
                            <h6>${video.title}</h6>
                            <p class="text-muted">By ${video.creatorName || video.creator_name || 'Unknown Creator'}</p>
                            <p>${video.description || 'No description available'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Clean up when closed
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    toggleFavorite(videoId) {
        const index = this.favorites.indexOf(videoId);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(videoId);
        }
        // Refresh display
        this.loadPageSpecificHandlers();
    }

    showVideoOptions(videoId) {
        console.log('Showing options for video:', videoId);
    }

    handlePurchaseFromPreview() {
        console.log('Handling purchase from preview');
    }

    handleConfirmPurchase() {
        console.log('Handling confirm purchase');
    }

    handleProfileUpdate(event) {
        event.preventDefault();
        console.log('Handling profile update');
    }

    handlePasswordChange(event) {
        event.preventDefault();
        console.log('Handling password change');
    }

    loadProfileData() {
        console.log('Loading profile data');
    }
}