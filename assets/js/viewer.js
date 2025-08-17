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
        this.currentPage = 1;
        this.videosPerPage = 6;
        this.currentViewerId = null; // Will be set from session
        this.favorites = []; // Will be loaded from API
        this.init();
    }

    async init() {
        await this.loadDataFromAPI();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        this.initializePlayer();
    }

    async loadDataFromAPI() {
        const currentPage = window.location.pathname.split('/').pop();

        try {
            // Wait for API service to be available - reduced timeout
            let retries = 0;
            const maxRetries = 20;

            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 50));
                retries++;
            }

            if (window.apiService) {
                // Get current user info from session
                const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
                const userId = userSession.id || userSession.userId;
                this.currentViewerId = userId;

                if (!userId) {
                    console.error('No viewer ID found in session, redirecting to login');
                    const loginUrl = window.videoHubConfig ?
                        window.videoHubConfig.getUrl('/auth/login.html') :
                        '../auth/login.html';
                    window.location.href = loginUrl;
                    return;
                }

                // Load data based on current page - optimized for performance
                if (currentPage === 'dashboard.html') {
                    // Load videos only once, metrics loaded separately and cached
                    const videosResponse = await window.apiService.get('/api/videos');
                    this.videos = Array.isArray(videosResponse.videos) ? videosResponse.videos :
                                 Array.isArray(videosResponse.data?.videos) ? videosResponse.data.videos :
                                 Array.isArray(videosResponse.data) ? videosResponse.data : [];

                    // Load metrics with debouncing
                    this.loadMetricsWithDelay(userId);
                } else if (currentPage === 'purchases.html') {
                    // Load purchases for purchases page - cached for 30 seconds
                    const cached = sessionStorage.getItem(`purchases_${userId}`);
                    const cacheTime = sessionStorage.getItem(`purchases_time_${userId}`);

                    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 30000) {
                        this.purchases = JSON.parse(cached);
                        this.displayPurchases();
                    } else {
                        const purchasesResponse = await window.apiService.get(`/api/purchases?user_id=${userId}`);
                        this.purchases = Array.isArray(purchasesResponse.purchases) ? purchasesResponse.purchases :
                                        Array.isArray(purchasesResponse.data?.purchases) ? purchasesResponse.data.purchases :
                                        Array.isArray(purchasesResponse.data) ? purchasesResponse.data : [];

                        // Cache the results
                        sessionStorage.setItem(`purchases_${userId}`, JSON.stringify(this.purchases));
                        sessionStorage.setItem(`purchases_time_${userId}`, Date.now().toString());

                        this.displayPurchases();
                    }
                } else {
                    // Minimal loading for other pages
                    this.videos = [];
                }

                this.purchases = [];

                console.log('Viewer data loaded for', currentPage, {
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

            // Handle API error with proper user feedback
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Loading viewer data');
            }

            // Set empty values on error
            this.updateDashboardMetrics({
                totalVideosCount: 0,
                purchasedVideosCount: 0,
                totalSpentAmount: '0.00',
                favoritesCount: 0
            });
        } finally {
            // Hide section loaders
            const dashboardSection = document.querySelector('.dashboard-stats');
            const videosSection = document.querySelector('.videos-section');
            const purchasesSection = document.querySelector('.purchases-section');

            if (window.commonUtils) {
                if (dashboardSection) window.commonUtils.hideSectionLoader(dashboardSection);
                if (videosSection) window.commonUtils.hideSectionLoader(videosSection);
                if (purchasesSection) window.commonUtils.hideSectionLoader(purchasesSection);
            }
        }
    }

    updateDashboardMetrics(metrics) {
        console.log('Updating dashboard metrics:', metrics);

        // Update dashboard with user-specific metrics
        const totalVideosCountEl = document.getElementById('totalVideosCount');
        const purchasedVideosCountEl = document.getElementById('purchasedVideosCount');
        const totalSpentAmountEl = document.getElementById('totalSpentAmount');
        const totalCreatorsEl = document.getElementById('totalCreators');

        // Legacy element IDs for backward compatibility
        const totalPurchasesCountEl = document.getElementById('totalPurchasesCount');
        const platformRevenueEl = document.getElementById('platformRevenue');

        // Purchase page metrics
        const totalPurchasesEl = document.getElementById('totalPurchases');
        const totalSpentEl = document.getElementById('totalSpent');

        // Dashboard metrics - map to correct HTML elements
        if (totalVideosCountEl) totalVideosCountEl.textContent = metrics.totalVideosCount || 0;
        if (purchasedVideosCountEl) purchasedVideosCountEl.textContent = metrics.purchasedVideosCount || 0;
        if (totalSpentAmountEl) totalSpentAmountEl.textContent = '$' + (metrics.totalSpentAmount || '0.00');
        if (totalCreatorsEl) totalCreatorsEl.textContent = metrics.totalCreators || 0;

        // Legacy elements for backward compatibility
        if (totalPurchasesCountEl) totalPurchasesCountEl.textContent = metrics.purchasedVideosCount || 0;
        if (platformRevenueEl) platformRevenueEl.textContent = '$' + (metrics.totalSpentAmount || '0.00');

        // Purchase page metrics (user-specific)
        if (totalPurchasesEl) totalPurchasesEl.textContent = metrics.purchasedVideosCount || 0;
        if (totalSpentEl) totalSpentEl.textContent = '$' + (metrics.totalSpentAmount || '0.00');
    }

    updatePurchaseMetrics() {
        // Calculate metrics from purchases data
        const totalPurchases = this.purchases.length;
        const totalSpent = this.purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount || 0), 0);

        // Calculate this month's purchases
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthPurchases = this.purchases.filter(purchase => {
            const purchaseDate = new Date(purchase.purchase_date || purchase.purchased_at);
            return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
        }).length;

        // Calculate average price
        const avgPrice = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

        // Update purchase page elements
        const totalPurchasesEl = document.getElementById('totalPurchases');
        const totalSpentEl = document.getElementById('totalSpent');
        const thisMonthEl = document.getElementById('thisMonth');
        const avgPriceEl = document.getElementById('avgPrice');

        if (totalPurchasesEl) totalPurchasesEl.textContent = totalPurchases;
        if (totalSpentEl) totalSpentEl.textContent = '$' + totalSpent.toFixed(2);
        if (thisMonthEl) thisMonthEl.textContent = thisMonthPurchases;
        if (avgPriceEl) avgPriceEl.textContent = '$' + avgPrice.toFixed(2);
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
        // Handle purchase button clicks and card clicks for non-purchased videos
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('purchase-video-btn') || 
                (e.target.hasAttribute('data-video-id') && e.target.hasAttribute('data-video-price'))) {
                e.preventDefault();
                e.stopPropagation();
                
                const videoId = e.target.dataset.videoId;
                const videoTitle = e.target.dataset.videoTitle;
                const videoPrice = parseFloat(e.target.dataset.videoPrice);

                // Use the global purchaseVideo function which handles Stripe payments
                if (window.purchaseVideo) {
                    window.purchaseVideo(videoId, videoTitle, videoPrice);
                } else {
                    this.showError('Payment system not available');
                }
            }
        });

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
        const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
        const userId = userSession.id || userSession.userId;

        if (!userId) {
            console.error('No user ID found for purchases');
            this.purchases = [];
            return;
        }

        try {
            // Get user-specific purchases for card display
            const purchasesResponse = await window.apiService.get(`/api/purchases?user_id=${userId}`);

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
        const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
        const userId = userSession.id || userSession.userId;

        if (!userId) {
            console.error('No user ID found for purchases page');
            this.purchases = [];
            this.updatePurchaseStats();
            this.renderPurchasedVideos();
            return;
        }

        try {
            // Get user-specific purchases ONLY on purchases page
            const purchasesResponse = await window.apiService.get(`/api/purchases?user_id=${userId}`);
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
        const loader = document.getElementById('videosLoader');

        if (!container) return;

        // Hide loader and show videos
        if (loader) loader.style.display = 'none';

        container.innerHTML = '';
        container.className = 'row'; // Ensure it's always a row for grid

        if (this.filteredVideos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No videos found</h5>
                    <p class="text-muted">Try adjusting your search filters</p>
                </div>
            `;
            this.updatePagination();
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.videosPerPage;
        const endIndex = startIndex + this.videosPerPage;
        const videosToShow = this.filteredVideos.slice(startIndex, endIndex);

        videosToShow.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';
            col.innerHTML = this.createVideoCard(video);
            container.appendChild(col);
        });

        this.updatePagination();
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
                                (video.description && video.description.toLowerCase().includes(searchTerm)) ||
                                (video.creatorName && video.creatorName.toLowerCase().includes(searchTerm)) ||
                                (video.creator_name && video.creator_name.toLowerCase().includes(searchTerm)) ||
                                (video.youtube_channel_title && video.youtube_channel_title.toLowerCase().includes(searchTerm));

            const matchesCategory = !selectedCategory || video.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.currentPage = 1; // Reset to first page when filtering
        this.sortVideos();
    }

    sortVideos() {
        const sortBy = document.getElementById('sortBy')?.value || 'newest';

        switch (sortBy) {
            case 'newest':
                this.filteredVideos.sort((a, b) => new Date(b.uploadDate || b.created_at || 0) - new Date(a.uploadDate || a.created_at || 0));
                break;
            case 'oldest':
                this.filteredVideos.sort((a, b) => new Date(a.uploadDate || a.created_at || 0) - new Date(b.uploadDate || b.created_at || 0));
                break;
            case 'price-low':
                this.filteredVideos.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
                break;
            case 'price-high':
                this.filteredVideos.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
                break;
            case 'rating':
                this.filteredVideos.sort((a, b) => (parseFloat(b.rating) || 4.5) - (parseFloat(a.rating) || 4.5));
                break;
        }

        this.displayVideos();
    }

    switchViewMode(mode) {
        const container = document.getElementById('allVideos');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (!container) return;

        // Update button states
        if (gridBtn && listBtn) {
            if (mode === 'grid') {
                gridBtn.classList.remove('btn-outline-primary');
                gridBtn.classList.add('btn-primary');
                listBtn.classList.remove('btn-primary');
                listBtn.classList.add('btn-outline-primary');
            } else {
                listBtn.classList.remove('btn-outline-primary');
                listBtn.classList.add('btn-primary');
                gridBtn.classList.remove('btn-primary');
                gridBtn.classList.add('btn-outline-primary');
            }
        }

        if (mode === 'list') {
            // Create table view
            container.className = 'col-12';
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Video</th>
                                <th>Creator</th>
                                <th>Price</th>
                                <th>Category</th>
                                <th>Views</th>
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
                const isPurchased = this.purchases.some(p => p.video_id == video.id);
                const price = parseFloat(video.price || 0);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="position-relative me-3" style="width: 80px; height: 45px; background-color: #e9ecef;">
                                ${video.thumbnail ? `
                                    <img src="${video.thumbnail}" width="80" height="45" class="rounded" alt="${video.title}" style="object-fit: cover;">
                                ` : `
                                    <div class="d-flex align-items-center justify-content-center w-100 h-100">
                                        <i class="fas fa-play text-muted"></i>
                                    </div>
                                `}
                            </div>
                            <div>
                                <strong>${video.title}</strong><br>
                                <small class="text-muted">${(video.description || '').substring(0, 60)}...</small>
                            </div>
                        </div>
                    </td>
                    <td>${video.youtube_channel_title || video.creatorName || video.creator_name || 'Unknown Creator'}</td>
                    <td>${isPurchased ? '<span class="text-success fw-bold">Purchased</span>' : `<span class="text-primary fw-bold">$${price.toFixed(2)}</span>`}</td>
                    <td><span class="badge bg-secondary">${video.category || 'General'}</span></td>
                    <td>${video.views || 0} views</td>
                    <td>
                        <button class="btn btn-sm ${isPurchased ? 'btn-success' : 'btn-primary'} ${isPurchased ? '' : 'purchase-video-btn'}"
                                data-video-id="${video.id}" data-video-title="${video.title}" data-video-price="${video.price}"
                                onclick="${isPurchased ? `watchVideo('${video.youtube_id}', '${video.title}')` : ''}">
                            <i class="fas fa-${isPurchased ? 'play' : 'shopping-cart'} me-1"></i>
                            ${isPurchased ? 'Watch' : 'Purchase'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // Grid view is the default
            container.className = 'row';
            this.displayVideos();
        }
    }

    updatePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationList = document.getElementById('paginationList');

        if (!paginationContainer || !paginationList) return;

        const totalPages = Math.ceil(this.filteredVideos.length / this.videosPerPage);

        if (totalPages <= 1) {
            paginationContainer.classList.add('d-none');
            return;
        }

        paginationContainer.classList.remove('d-none');

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `;

        paginationList.innerHTML = paginationHTML;

        // Remove existing event listeners to prevent duplicates
        const existingHandler = paginationList._paginationHandler;
        if (existingHandler) {
            paginationList.removeEventListener('click', existingHandler);
        }

        // Add click handlers for pagination
        const paginationHandler = (e) => {
            e.preventDefault();
            if (e.target.classList.contains('page-link') && !e.target.parentElement.classList.contains('disabled')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage && page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.displayVideos();
                    // Scroll to top of videos section
                    document.getElementById('allVideos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        paginationList._paginationHandler = paginationHandler;
        paginationList.addEventListener('click', paginationHandler);
    }

    createVideoCard(video) {
        const isPurchased = this.purchases.some(p => p.video_id == video.id);
        const price = parseFloat(video.price || 0);
        const youtubeId = video.youtube_id || '';

        return `
            <div class="card h-100">
                <div class="position-relative" style="height: 180px; background-color: #e9ecef; cursor: pointer;"
                     onclick="${isPurchased ? `watchVideo('${youtubeId}', '${video.title}')` : ''}"
                     ${!isPurchased ? `data-video-id="${video.id}" data-video-title="${video.title}" data-video-price="${video.price}" class="purchase-video-btn"` : ''}>
                    ${youtubeId ? `
                        <img src="https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg"
                             class="card-img-top w-100 h-100" alt="${video.title}" style="object-fit: cover;"
                             onerror="this.src='https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg'">
                    ` : video.thumbnail ? `
                        <img src="${video.thumbnail}"
                             class="card-img-top w-100 h-100" alt="${video.title}" style="object-fit: cover;">
                    ` : `
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <i class="fas fa-play fa-3x text-muted"></i>
                        </div>
                    `}

                    <!-- Play Button Overlay -->
                    <div class="position-absolute top-50 start-50 translate-middle">
                        <div class="d-flex align-items-center justify-content-center"
                             style="width: 60px; height: 60px; background: rgba(0,0,0,0.7); border-radius: 50%;">
                            <i class="fas fa-play text-white" style="font-size: 24px; margin-left: 3px;"></i>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <h6 class="card-title mb-2">${video.title}</h6>
                    <p class="card-text text-muted small mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${video.description || 'No description available'}
                    </p>

                    <div class="d-flex justify-content-between align-items-center mb-2">
                        ${isPurchased ? `
                            <span class="text-success fw-bold">Purchased</span>
                        ` : `
                            <span class="text-primary fw-bold">${price > 0 ? `$${price.toFixed(2)}` : 'Free'}</span>
                        `}
                        <small class="text-muted">by ${video.youtube_channel_title || video.creatorName || video.creator_name || 'Unknown Creator'}</small>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${video.views || 0} views</small>
                        ${isPurchased ? `
                            <div class="btn-group">
                                <button class="btn btn-success btn-sm" onclick="watchVideo('${youtubeId}', '${video.title}')" title="Watch in modal">
                                    <i class="fas fa-play me-1"></i>Watch
                                </button>
                                <button class="btn btn-outline-success btn-sm" onclick="viewerManager.openVideoInNewTab(${video.id})" title="Open in new tab">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        ` : `
                            <button class="btn btn-primary btn-sm purchase-video-btn"
                                    data-video-id="${video.id}"
                                    data-video-title="${video.title}"
                                    data-video-price="${video.price}">
                                <i class="fas fa-shopping-cart me-1"></i>Purchase
                            </button>
                        `}
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
                            <div class="btn-group">
                                <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); viewerManager.playVideo(${videoId})" title="Watch in modal">
                                    <i class="fas fa-play me-1"></i>Watch
                                </button>
                                <button class="btn btn-outline-light btn-sm" onclick="event.stopPropagation(); viewerManager.openVideoInNewTab(${videoId})" title="Open in new tab">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title mb-2">${purchase.video.title || 'Untitled Video'}</h6>
                    <p class="card-text text-muted small mb-2">${purchase.video.description || purchase.description || 'No description available'}</p>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-success fw-bold">$${amount.toFixed(2)}</span>
                        <small class="text-muted">by ${purchase.video.creator || purchase.creator_name || 'Unknown Creator'}</small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">Purchased: ${purchaseDate}</small>
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm" onclick="viewerManager.playVideo(${videoId})" title="Watch in modal">
                                <i class="fas fa-play me-1"></i>Watch
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="viewerManager.openVideoInNewTab(${videoId})" title="Open in new tab">
                                <i class="fas fa-external-link-alt"></i>
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

            // Get YouTube video ID - prioritize youtube_id field over thumbnail extraction
            let youtubeVideoId = '';

            // First try to get YouTube ID from the video's youtube_id field
            if (video.youtube_id) {
                youtubeVideoId = video.youtube_id;
            } else if (video.thumbnail) {
                // Fallback: Extract from thumbnail URL
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
                alert('Video not available for playback - missing YouTube ID');
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
        // Use the static modal instead of creating a dynamic one (like purchases page)
        const modal = document.getElementById('videoPlayerModal');
        const iframe = document.getElementById('youtubePlayer');
        const titleElement = document.getElementById('videoTitle');
        const loading = document.getElementById('playerLoading');

        if (!modal || !iframe || !titleElement) {
            alert('Video player modal not found');
            return;
        }

        // Set title
        titleElement.textContent = title;

        // Show loading
        if (loading) loading.style.display = 'block';

        // Set iframe source
        iframe.src = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=1&modestbranding=1&rel=0`;

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Hide loading after iframe loads
        iframe.onload = function() {
            if (loading) loading.style.display = 'none';
        };

        // Clean up when modal closes
        modal.addEventListener('hidden.bs.modal', function() {
            iframe.src = '';
            if (loading) loading.style.display = 'block';
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

    showViewerConfirmModal(action, videoId, additionalData = {}) {
        return new Promise((resolve) => {
            const video = this.videos.find(v => v.id == videoId);
            if (!video) {
                resolve(false);
                return;
            }

            const actionTexts = {
                purchase: {
                    title: 'Purchase Video',
                    message: `purchase "${video.title}" for $${parseFloat(video.price || 0).toFixed(2)}`,
                    class: 'primary',
                    description: 'You will have lifetime access to this video after purchase.',
                    icon: 'fa-shopping-cart'
                },
                removeFromFavorites: {
                    title: 'Remove from Favorites',
                    message: 'remove this video from your favorites',
                    class: 'warning',
                    description: 'You can always add it back to favorites later.',
                    icon: 'fa-heart-broken'
                },
                reportVideo: {
                    title: 'Report Video',
                    message: 'report this video for inappropriate content',
                    class: 'danger',
                    description: 'This will notify our moderation team for review.',
                    icon: 'fa-flag'
                }
            };

            const actionData = actionTexts[action];
            if (!actionData) {
                resolve(false);
                return;
            }

            // Create confirmation modal
            let modal = document.getElementById('viewerActionConfirmModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'viewerActionConfirmModal';
                modal.setAttribute('tabindex', '-1');
            }

            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-bottom-0">
                            <h5 class="modal-title"><i class="fas ${actionData.icon} text-${actionData.class} me-2"></i>${actionData.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center py-4">
                            <h4>Are you sure you want to ${actionData.message}?</h4>
                            <p class="text-muted">${actionData.description}</p>
                        </div>
                        <div class="modal-footer justify-content-center border-top-0">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-${actionData.class} confirm-action-btn" data-action="${action}" data-video-id="${videoId}">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            // Handle action confirmation
            modal.querySelector('.confirm-action-btn').addEventListener('click', async () => {
                bootstrapModal.hide();
                let success = false;
                if (action === 'purchase') {
                    this.showPurchaseModal(videoId);
                    success = true; // Assume modal will handle the actual purchase flow
                } else if (action === 'removeFromFavorites') {
                    this.toggleFavorite(videoId);
                    success = true;
                } else if (action === 'reportVideo') {
                    try {
                        const reportResponse = await window.apiService.post('/api/reports/video', { videoId: videoId, userId: this.currentViewerId });
                        if (reportResponse.success) {
                            this.showNotification('Video reported successfully!', 'success');
                            success = true;
                        } else {
                            this.showNotification('Failed to report video.', 'error');
                        }
                    } catch (error) {
                        console.error('Error reporting video:', error);
                        this.showNotification('Error reporting video.', 'error');
                    }
                }
                resolve(success);
            });

            // Cleanup modal element when closed
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
        });
    }

    setupModalEventHandlers(modal, video, userId, bootstrapModal) {
        const form = modal.querySelector('#purchaseForm');
        const purchaseBtn = modal.querySelector('#purchaseBtn');

        // Payment method change handler
        modal.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', () => {
                // Hide all payment details
                modal.querySelectorAll('.payment-details').forEach(details => {
                    details.style.display = 'none';
                });

                // Show selected payment details
                const selectedMethod = radio.value;
                const detailsElement = modal.querySelector(`#${selectedMethod}Details`);
                if (detailsElement) {
                    detailsElement.style.display = 'block';
                }

                // Update payment option styling
                modal.querySelectorAll('.payment-option').forEach(option => {
                    option.classList.remove('border-primary', 'bg-light');
                });
                radio.closest('.payment-option').classList.add('border-primary', 'bg-light');
            });
        });

        // Set initial payment method styling
        const initialMethod = modal.querySelector('input[name="paymentMethod"]:checked');
        if (initialMethod) {
            initialMethod.closest('.payment-option').classList.add('border-primary', 'bg-light');
        }

        // Purchase button click handler
        purchaseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.processPurchase(modal, video, userId, bootstrapModal);
        });

        // Form submission handler
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processPurchase(modal, video, userId, bootstrapModal);
        });

        // Cleanup on modal close
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        // Card number formatting
        const cardNumberInput = modal.querySelector('input[name="cardNumber"]');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                e.target.value = value;
            });
        }

        // Expiry date formatting
        const expiryInput = modal.querySelector('input[name="expiry"]');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // CVV number only
        const cvvInput = modal.querySelector('input[name="cvv"]');
        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    }

    async processPurchase(modal, video, userId, bootstrapModal) {
        const form = modal.querySelector('#purchaseForm');
        const purchaseBtn = modal.querySelector('#purchaseBtn');
        const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked').value;

        // Validate form
        if (!this.validatePaymentForm(form, paymentMethod)) {
            return;
        }

        // Get payment details
        const paymentDetails = this.collectPaymentDetails(form, paymentMethod);

        try {
            // Show loading state
            this.showPaymentLoading(modal, purchaseBtn);

            // Make payment request
            const response = await window.apiService.post('/api/payments/purchase', {
                video_id: video.id,
                user_id: userId,
                payment_method: paymentMethod,
                payment_details: paymentDetails
            });

            if (response.success) {
                await this.handlePaymentSuccess(modal, response, bootstrapModal);
            } else {
                this.handlePaymentError(modal, response.message || 'Payment failed');
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            this.handlePaymentError(modal, 'Connection error. Please try again.');
        }
    }

    validatePaymentForm(form, paymentMethod) {
        let isValid = true;

        // Clear previous validation states
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        if (paymentMethod === 'card') {
            const cardNumber = form.querySelector('input[name="cardNumber"]').value.replace(/\s/g, '');
            const expiry = form.querySelector('input[name="expiry"]').value;
            const cvv = form.querySelector('input[name="cvv"]').value;

            // Validate card number
            if (cardNumber.length < 13 || cardNumber.length > 19) {
                form.querySelector('input[name="cardNumber"]').classList.add('is-invalid');
                isValid = false;
            }

            // Validate expiry
            if (!/^\d{2}\/\d{2}$/.test(expiry)) {
                form.querySelector('input[name="expiry"]').classList.add('is-invalid');
                isValid = false;
            }

            // Validate CVV
            if (cvv.length < 3 || cvv.length > 4) {
                form.querySelector('input[name="cvv"]').classList.add('is-invalid');
                isValid = false;
            }

        } else if (paymentMethod === 'paypal') {
            const email = form.querySelector('input[name="paypalEmail"]').value;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                form.querySelector('input[name="paypalEmail"]').classList.add('is-invalid');
                isValid = false;
            }
        }

        if (!isValid) {
            this.showNotification('Please correct the highlighted fields', 'error');
        }

        return isValid;
    }

    collectPaymentDetails(form, paymentMethod) {
        let details = {};

        switch (paymentMethod) {
            case 'card':
                details = {
                    card_number: form.querySelector('input[name="cardNumber"]').value.replace(/\s/g, ''),
                    expiry: form.querySelector('input[name="expiry"]').value,
                    cvv: form.querySelector('input[name="cvv"]').value
                };
                break;
            case 'paypal':
                details = {
                    paypal_email: form.querySelector('input[name="paypalEmail"]').value
                };
                break;
        }

        return details;
    }

    showPaymentLoading(modal, purchaseBtn) {
        // Disable purchase button with loading state
        purchaseBtn.disabled = true;
        purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing Payment...';

        // Create loading overlay
        const modalBody = modal.querySelector('.modal-body');
        const overlay = document.createElement('div');
        overlay.id = 'paymentOverlay';
        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        overlay.style.cssText = 'background: rgba(255,255,255,0.95); z-index: 1050; border-radius: 0.375rem;';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Processing...</span>
                </div>
                <h5 class="mb-2">Processing Payment</h5>
                <p class="text-muted mb-0">Please wait while we process your payment...</p>
            </div>
        `;

        modalBody.style.position = 'relative';
        modalBody.appendChild(overlay);
    }

    async handlePaymentSuccess(modal, response, bootstrapModal) {
        const overlay = modal.querySelector('#paymentOverlay');

        // Show success message
        overlay.innerHTML = `
            <div class="text-center">
                <div class="text-success mb-3">
                    <i class="fas fa-check-circle" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-success mb-2">Payment Successful!</h4>
                <p class="mb-3">You now have access to "<strong>${response.data.video_title}</strong>"</p>
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                <small class="text-muted">Updating your library...</small>
            </div>
        `;

        // Wait a moment, then refresh data and close modal
        setTimeout(async () => {
            try {
                await this.loadDataFromAPI();
                this.loadPageSpecificHandlers();
                bootstrapModal.hide();
                this.showNotification(`Successfully purchased "${response.data.video_title}"!`, 'success');
            } catch (error) {
                console.error('Error refreshing data after purchase:', error);
                bootstrapModal.hide();
                this.showNotification('Purchase successful! Please refresh the page to see your new video.', 'success');
            }
        }, 1500);
    }

    handlePaymentError(modal, errorMessage) {
        const overlay = modal.querySelector('#paymentOverlay');
        const purchaseBtn = modal.querySelector('#purchaseBtn');

        // Show error message
        overlay.innerHTML = `
            <div class="text-center">
                <div class="text-danger mb-3">
                    <i class="fas fa-times-circle" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-danger mb-2">Payment Failed</h4>
                <p class="mb-3">${errorMessage}</p>
                <button class="btn btn-primary" onclick="this.closest('#paymentOverlay').remove(); document.querySelector('#purchaseBtn').disabled = false; document.querySelector('#purchaseBtn').innerHTML = '<i class=\\'fas fa-credit-card me-2\\'></i>Try Again';">
                    <i class="fas fa-redo me-2"></i>Try Again
                </button>
            </div>
        `;

        // Reset button after 5 seconds if user doesn't click try again
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
                if (purchaseBtn) {
                    purchaseBtn.disabled = false;
                    purchaseBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Try Again';
                }
            }
        }, 5000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
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
    }

    // Cache management functions for better performance
    getCachedData(key, timeoutMs) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return null;

            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp > timeoutMs) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            return data.content;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    setCachedData(key, content) {
        try {
            const data = {
                timestamp: Date.now(),
                content: content
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }

    // Performance optimization: Load metrics with delay to reduce initial load time
    loadMetricsWithDelay(userId) {
        setTimeout(async () => {
            try {
                const metricsResponse = await window.apiService.get(`/api/metrics?type=viewer&user_id=${userId}`);
                if (metricsResponse.success) {
                    this.updateDashboardMetrics(metricsResponse.data);
                }
            } catch (error) {
                console.error('Failed to load metrics:', error);
            }
        }, 200); // Increased delay to further reduce initial load time
    }

    // Legacy method removed - now using Stripe payment system only

    openVideoInNewTab(videoId) {
        const video = this.videos.find(v => v.id == videoId);
        if (!video || !video.youtube_id) {
            alert('Video not available for playback');
            return;
        }

        const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
        window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    }
}