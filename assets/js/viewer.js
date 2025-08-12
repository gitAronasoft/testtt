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
            const maxRetries = 50; // 5 seconds
            
            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (window.apiService) {
                // Load data from API
                const [videosResponse, purchasesResponse] = await Promise.all([
                    window.apiService.getVideos(),
                    window.apiService.getPurchases()
                ]);
                
                // Handle API response format properly
                this.videos = Array.isArray(videosResponse.videos) ? videosResponse.videos : 
                             Array.isArray(videosResponse.data?.videos) ? videosResponse.data.videos : 
                             Array.isArray(videosResponse.data) ? videosResponse.data : [];
                             
                this.purchases = Array.isArray(purchasesResponse.purchases) ? purchasesResponse.purchases : 
                                Array.isArray(purchasesResponse.data?.purchases) ? purchasesResponse.data.purchases : 
                                Array.isArray(purchasesResponse.data) ? purchasesResponse.data : [];
                
                console.log('Raw API responses:', {
                    videosResponse: videosResponse,
                    purchasesResponse: purchasesResponse,
                    processedVideos: this.videos.length,
                    processedPurchases: this.purchases.length
                });
            } else {
                console.error('API service not available');
                this.videos = [];
                this.purchases = [];
            }
            
            // Filter purchases for current viewer
            this.purchases = this.purchases.filter(p => p.viewerId === this.currentViewerId);
            
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

    loadDashboardPage() {
        this.renderPurchaseStats();
        this.renderAllVideos();
        this.bindAllVideosEvents();
    }

    loadPurchasesPage() {
        this.renderPurchasedVideos();
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
        const isPurchased = this.purchases.some(p => p.videoId === video.id);
        const isFavorite = this.favorites.includes(video.id);

        return `
            <div class="card video-card h-100">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}">
                    <div class="video-duration">${video.duration}</div>
                    <div class="video-price">${isPurchased ? 'Owned' : '$' + video.price.toFixed(2)}</div>
                    <div class="video-overlay" onclick="viewerManager.${isPurchased ? 'playVideo' : 'showVideoPreview'}(${video.id})">
                        <i class="fas fa-${isPurchased ? 'play' : 'eye'} fa-2x"></i>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="video-title">${video.title}</h6>
                    <p class="video-creator">By ${video.creatorName}</p>
                    <div class="video-stats">
                        <small class="text-muted">
                            <i class="fas fa-eye me-1"></i>${video.views ? video.views.toLocaleString() : '0'} views
                            <i class="fas fa-star me-1 ms-2"></i>${video.rating || '4.5'}
                        </small>
                        <div class="video-actions">
                            <button class="btn btn-sm ${isFavorite ? 'btn-warning' : 'btn-outline-warning'}" 
                                    onclick="viewerManager.toggleFavorite(${video.id})" title="Add to favorites">
                                <i class="fas fa-heart"></i>
                            </button>
                            ${!isPurchased ? `
                                <button class="btn btn-sm btn-success ms-1" 
                                        onclick="viewerManager.showPurchaseModal(${video.id})" title="Purchase">
                                    <i class="fas fa-shopping-cart"></i>
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-primary ms-1" 
                                        onclick="viewerManager.playVideo(${video.id})" title="Watch">
                                    <i class="fas fa-play"></i>
                                </button>
                            `}
                        </div>
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
        const gridContainer = document.getElementById('videosGrid');
        const listContainer = document.getElementById('videosTableBody');

        if (gridContainer) {
            gridContainer.innerHTML = '';
            this.purchases.forEach(purchase => {
                const col = document.createElement('div');
                col.className = 'col-lg-4 col-md-6 mb-4';
                col.innerHTML = this.createPurchasedVideoCard(purchase);
                gridContainer.appendChild(col);
            });
        }

        if (listContainer) {
            listContainer.innerHTML = '';
            this.purchases.forEach(purchase => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${purchase.video.thumbnail}" width="60" height="34" class="rounded me-3" alt="${purchase.video.title}">
                            <div>
                                <strong>${purchase.video.title}</strong><br>
                                <small class="text-muted">${purchase.video.duration}</small>
                            </div>
                        </div>
                    </td>
                    <td>${purchase.video.creatorName}</td>
                    <td>${purchase.video.duration}</td>
                    <td>${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                    <td>$${purchase.price.toFixed(2)}</td>
                    <td>
                        <span class="badge bg-${purchase.watchProgress > 0 ? 'success' : 'secondary'}">
                            ${purchase.watchProgress > 0 ? 'Watched' : 'Unwatched'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewerManager.playVideo(${purchase.videoId})">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="viewerManager.showVideoOptions(${purchase.videoId})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </td>
                `;
                listContainer.appendChild(row);
            });
        }
    }

    createPurchasedVideoCard(purchase) {
        const progress = purchase.watchProgress || 0;
        const isFavorite = this.favorites.includes(purchase.videoId);

        return `
            <div class="card video-card h-100">
                <div class="video-thumbnail">
                    <img src="${purchase.video.thumbnail}" class="card-img-top" alt="${purchase.video.title}">
                    <div class="video-duration">${purchase.video.duration}</div>
                    <div class="video-progress">
                        <div class="progress" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div class="video-overlay" onclick="viewerManager.playVideo(${purchase.videoId})">
                        <i class="fas fa-play fa-2x"></i>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="video-title">${purchase.video.title}</h6>
                    <p class="video-creator">By ${purchase.video.creatorName}</p>
                    <div class="video-stats">
                        <small class="text-muted">
                            Purchased: ${new Date(purchase.purchaseDate).toLocaleDateString()}
                            <br>Progress: ${progress}%
                        </small>
                        <div class="video-actions mt-2">
                            <button class="btn btn-sm btn-primary" onclick="viewerManager.playVideo(${purchase.videoId})">
                                <i class="fas fa-play me-1"></i>Watch
                            </button>
                            <button class="btn btn-sm ${isFavorite ? 'btn-warning' : 'btn-outline-warning'} ms-1" 
                                    onclick="viewerManager.toggleFavorite(${purchase.videoId})">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
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
        // Player initialization code
    }

    // Event handlers
    showVideoPreview(videoId) {
        console.log('Showing preview for video:', videoId);
    }

    showPurchaseModal(videoId) {
        console.log('Showing purchase modal for video:', videoId);
    }

    playVideo(videoId) {
        console.log('Playing video:', videoId);
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