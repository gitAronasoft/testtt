/**
 * VideoHub Creator Module
 * Handles creator dashboard functionality with API integration
 */

class CreatorManager {
    constructor() {
        this.stats = {};
        this.videos = [];
        this.filteredVideos = [];
        this.earnings = [];
        this.isLoading = false;
        this.uploadValidator = null;
        this.editVideoValidator = null;
        this.currentPage = 1;
        this.init();
    }

    async init() {
        this.setupFormValidation();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        
        // Only load data if we haven't already loaded it
        if (!this.stats || Object.keys(this.stats).length === 0) {
            await this.loadDashboardData();
        }
        
        // Initialize filters after data loads
        setTimeout(() => {
            if (this.videos.length > 0) {
                this.filteredVideos = [...this.videos];
                this.updatePagination();
            }
        }, 1000);
    }

    setupFormValidation() {
        // Setup validation after a short delay to ensure DOM is ready
        setTimeout(() => {
            // Initialize upload form validation
            const uploadForm = document.getElementById('uploadForm');
            if (uploadForm && window.FormValidator) {
                this.uploadValidator = new FormValidator(uploadForm);
                this.uploadValidator
                    .addRule('videoTitle', [
                        { validator: FormValidator.rules.required, message: 'Video title is required' },
                        { validator: FormValidator.rules.minLength(3), message: 'Title must be at least 3 characters' },
                        { validator: FormValidator.rules.maxLength(100), message: 'Title must be less than 100 characters' }
                    ])
                    .addRule('videoDescription', [
                        { validator: FormValidator.rules.maxLength(5000), message: 'Description must be less than 5000 characters' }
                    ])
                    .addRule('videoPrice', [
                        { validator: FormValidator.rules.required, message: 'Price is required' },
                        { validator: FormValidator.rules.decimal, message: 'Price must be a valid number' },
                        { validator: (value) => parseFloat(value) >= 0, message: 'Price must be 0 or greater' }
                    ]);
            }

            // Initialize edit form validation  
            const editForm = document.getElementById('editVideoForm');
            if (editForm && window.FormValidator) {
                this.editVideoValidator = new FormValidator(editForm);
                this.editVideoValidator
                    .addRule('editTitle', [
                        { validator: FormValidator.rules.required, message: 'Video title is required' },
                        { validator: FormValidator.rules.minLength(3), message: 'Title must be at least 3 characters' },
                        { validator: FormValidator.rules.maxLength(100), message: 'Title must be less than 100 characters' }
                    ])
                    .addRule('editDescription', [
                        { validator: FormValidator.rules.maxLength(5000), message: 'Description must be less than 5000 characters' }
                    ])
                    .addRule('editPrice', [
                        { validator: FormValidator.rules.required, message: 'Price is required' },
                        { validator: FormValidator.rules.decimal, message: 'Price must be a valid number' },
                        { validator: (value) => parseFloat(value) >= 0, message: 'Price must be 0 or greater' }
                    ]);
            }
        }, 500);
    }

    async loadDashboardData() {
        // Prevent multiple concurrent loads using global state
        if (window.VideoHubState && window.VideoHubState.isLoading('creatorData')) {
            console.log('Creator data loading already in progress, skipping...');
            return;
        }
        
        this.isLoading = true;
        if (window.VideoHubState) {
            window.VideoHubState.setLoading('creatorData', true);
        }

        // Show section loaders
        const dashboardSection = document.querySelector('.dashboard-stats');
        const videosSection = document.querySelector('.recent-videos');
        const earningsSection = document.querySelector('.recent-earnings');

        if (window.commonUtils) {
            if (dashboardSection) window.commonUtils.showSectionLoader(dashboardSection, 'Loading dashboard metrics...');
            if (videosSection) window.commonUtils.showSectionLoader(videosSection, 'Loading recent videos...');
            if (earningsSection) window.commonUtils.showSectionLoader(earningsSection, 'Loading earnings data...');
        }
        
        try {
            // Wait for API service to be available
            let retries = 0;
            const maxRetries = 50;
            
            while (retries < maxRetries && !window.apiService) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            if (window.apiService) {
                // Get current user info from both localStorage and sessionStorage
                const localSession = localStorage.getItem('userSession');
                const sessionSession = sessionStorage.getItem('userSession');
                const userSession = JSON.parse(localSession || sessionSession || '{}');
                
                // Get creator ID from session
                const creatorId = userSession.id;
                
                if (!creatorId) {
                    console.error('No creator ID found in session, redirecting to login');
                    window.location.href = '../auth/login.html';
                    return;
                }
                
                console.log('Loading data for creator ID:', creatorId);
                
                // Check cache first
                const cachedMetrics = window.VideoHubState?.getCached('metrics', creatorId);
                const cachedVideos = window.VideoHubState?.getCached('videos', creatorId);
                const cachedEarnings = window.VideoHubState?.getCached('earnings', creatorId);
                
                let metricsResponse, videosResponse, earningsResponse;
                
                if (cachedMetrics && cachedVideos && cachedEarnings) {
                    console.log('Using cached creator data');
                    metricsResponse = { success: true, data: cachedMetrics };
                    videosResponse = { data: { videos: cachedVideos } };
                    earningsResponse = { data: { earnings: cachedEarnings } };
                } else {
                    // Load data based on current page
                    const currentPage = window.location.pathname.split('/').pop();
                    
                    if (currentPage === 'dashboard.html') {
                        // Load all data for dashboard
                        [metricsResponse, videosResponse, earningsResponse] = await Promise.all([
                            window.apiService.get(`/api/endpoints/metrics.php?type=creator&creator_id=${creatorId}`),
                            window.apiService.get(`/api/endpoints/creator.php/videos?uploader_id=${creatorId}`),
                            window.apiService.get(`/api/endpoints/creator.php/earnings?creator_id=${creatorId}`)
                        ]);
                    } else if (currentPage === 'videos.html') {
                        // Load only videos for videos page
                        videosResponse = await window.apiService.get(`/api/endpoints/creator.php/videos?uploader_id=${creatorId}`);
                        metricsResponse = { success: false };
                        earningsResponse = { data: { earnings: [] } };
                    } else if (currentPage === 'earnings.html') {
                        // Load only earnings for earnings page
                        earningsResponse = await window.apiService.get(`/api/endpoints/creator.php/earnings?creator_id=${creatorId}`);
                        metricsResponse = { success: false };
                        videosResponse = { data: { videos: [] } };
                    } else {
                        // Minimal loading for other pages
                        metricsResponse = { success: false };
                        videosResponse = { data: { videos: [] } };
                        earningsResponse = { data: { earnings: [] } };
                    }
                    
                    // Cache the responses
                    if (window.VideoHubState) {
                        if (metricsResponse.success) window.VideoHubState.setCached('metrics', metricsResponse.data, creatorId);
                        if (videosResponse.data) window.VideoHubState.setCached('videos', videosResponse.data.videos || videosResponse.data, creatorId);
                        if (earningsResponse.data) window.VideoHubState.setCached('earnings', earningsResponse.data.earnings || earningsResponse.data, creatorId);
                    }
                }
                
                // Process metrics
                if (metricsResponse.success) {
                    this.stats = metricsResponse.data;
                }
                
                // Process videos 
                this.videos = Array.isArray(videosResponse.data?.videos) ? videosResponse.data.videos : 
                             Array.isArray(videosResponse.videos) ? videosResponse.videos : 
                             Array.isArray(videosResponse.data) ? videosResponse.data : [];
                             
                // Process earnings
                this.earnings = Array.isArray(earningsResponse.data?.earnings) ? earningsResponse.data.earnings : 
                               Array.isArray(earningsResponse.earnings) ? earningsResponse.earnings : 
                               Array.isArray(earningsResponse.data) ? earningsResponse.data : [];
                
                console.log('Creator data loaded successfully:', {
                    videosLength: this.videos.length,
                    earningsLength: this.earnings.length,
                    stats: this.stats
                });

                // Update UI
                this.updateDashboardMetrics(this.stats);
                
                // Update page-specific content based on current page
                if (window.location.pathname.includes('dashboard.html')) {
                    this.updateRecentVideos();
                    this.updateRecentEarnings();
                } else if (window.location.pathname.includes('videos.html')) {
                    this.loadVideosGrid();
                    this.updateVideoPageStats();
                }
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            
            // Handle API error with proper user feedback
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Loading creator dashboard data');
            }
            
            // Set empty values on error
            this.updateDashboardMetrics({
                totalVideos: 0,
                totalViews: 0,
                totalEarnings: '0.00',
                subscribers: 0
            });
        } finally {
            this.isLoading = false;
            if (window.VideoHubState) {
                window.VideoHubState.setLoading('creatorData', false);
            }

            // Hide section loaders
            const dashboardSection = document.querySelector('.dashboard-stats');
            const videosSection = document.querySelector('.recent-videos');
            const earningsSection = document.querySelector('.recent-earnings');

            if (window.commonUtils) {
                if (dashboardSection) window.commonUtils.hideSectionLoader(dashboardSection);
                if (videosSection) window.commonUtils.hideSectionLoader(videosSection);
                if (earningsSection) window.commonUtils.hideSectionLoader(earningsSection);
            }
        }
    }

    updateDashboardMetrics(stats) {
        // Update dashboard metric displays
        const totalVideosEl = document.getElementById('totalVideos');
        const totalViewsEl = document.getElementById('totalViews');
        const totalEarningsEl = document.getElementById('totalEarnings');
        const subscribersEl = document.getElementById('subscribers');
        
        if (totalVideosEl) totalVideosEl.textContent = stats.totalVideos || 0;
        if (totalViewsEl) totalViewsEl.textContent = stats.totalViews || 0;
        if (totalEarningsEl) totalEarningsEl.textContent = '$' + (stats.totalEarnings || '0.00');
        if (subscribersEl) subscribersEl.textContent = stats.subscribers || 0;

        // Update earnings table
        this.updateEarningsTable();
    }

    updateEarningsTable() {
        const earningsTableBody = document.getElementById('earningsTable');
        if (!earningsTableBody) return;

        if (!this.earnings.length) {
            earningsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No earnings data available</td></tr>';
            return;
        }

        earningsTableBody.innerHTML = this.earnings.map(earning => `
            <tr>
                <td>${earning.videoTitle || 'N/A'}</td>
                <td>${earning.viewerName || 'N/A'}</td>
                <td>${earning.date || 'N/A'}</td>
                <td>$${earning.amount || '0.00'}</td>
            </tr>
        `).join('');
    }

    bindEvents() {
        // Upload button event
        const uploadBtn = document.querySelector('[data-bs-target="#uploadModal"]');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.showUploadModal());
        }

        // Filter and search events
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.applyVideoFilters();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyVideoFilters();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyVideoFilters();
            });
        }

        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                this.applyVideoFilters();
            });
        }

        // Video management events - use more specific targeting to prevent duplicates
        document.addEventListener('click', (e) => {
            // Check for edit video button
            if (e.target.classList.contains('edit-video-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const videoId = e.target.dataset.videoId;
                if (videoId) {
                    this.editVideo(videoId);
                }
            }
            // Check for delete video button  
            if (e.target.classList.contains('delete-video-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const videoId = e.target.dataset.videoId;
                if (videoId && !this.isDeleting) {
                    this.deleteVideo(videoId);
                }
            }
        });
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.initDashboard();
                break;
            case 'videos.html':
                this.initVideosPage();
                break;
            case 'earnings.html':
                this.initEarningsPage();
                break;
        }
    }

    initDashboard() {
        console.log('Creator dashboard initialized');
        this.updateRecentVideos();
        this.updateRecentEarnings();
    }

    updateRecentVideos() {
        const recentVideosContainer = document.getElementById('recentVideos');
        if (!recentVideosContainer) return;

        if (!this.videos || this.videos.length === 0) {
            recentVideosContainer.innerHTML = '<p class="text-muted">No videos uploaded yet.</p>';
            return;
        }

        // Get the 3 most recent videos
        const recentVideos = this.videos
            .sort((a, b) => new Date(b.created_at || b.uploadDate) - new Date(a.created_at || a.uploadDate))
            .slice(0, 3);

        recentVideosContainer.innerHTML = recentVideos.map(video => {
            const statusClass = video.status === 'published' ? 'bg-success' : 
                               video.status === 'pending' ? 'bg-warning' : 'bg-secondary';
            const statusIcon = video.status === 'published' ? 'fa-play' : 
                              video.status === 'pending' ? 'fa-clock' : 'fa-pause';
            
            return `
                <div class="d-flex mb-3">
                    <div class="me-3">
                        <div class="${statusClass} text-white d-flex align-items-center justify-content-center" style="width: 60px; height: 40px; border-radius: 4px;">
                            <i class="fas ${statusIcon}"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${video.title}</h6>
                        <small class="text-muted">${(video.status || 'unknown').charAt(0).toUpperCase() + (video.status || 'unknown').slice(1)}</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateRecentEarnings() {
        const earningsTableBody = document.getElementById('earningsTable');
        if (!earningsTableBody) return;

        if (!this.earnings || this.earnings.length === 0) {
            earningsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No earnings data available</td></tr>';
            return;
        }

        // Get the 5 most recent earnings
        const recentEarnings = this.earnings
            .sort((a, b) => new Date(b.date || b.purchaseDate) - new Date(a.date || a.purchaseDate))
            .slice(0, 5);

        earningsTableBody.innerHTML = recentEarnings.map(earning => `
            <tr>
                <td>${earning.videoTitle || 'N/A'}</td>
                <td>${earning.viewerName || 'Anonymous'}</td>
                <td>${earning.date || earning.purchaseDate || 'N/A'}</td>
                <td>$${earning.amount || '0.00'}</td>
            </tr>
        `).join('');
    }

    initVideosPage() {
        this.loadVideosGrid();
        this.updateVideoPageStats();
    }

    initEarningsPage() {
        this.loadEarningsTable();
    }

    async loadVideosGrid() {
        const videosGrid = document.getElementById('videosGrid');
        if (!videosGrid) return;

        if (!this.videos.length) {
            videosGrid.innerHTML = '<div class="col-12 text-center text-muted"><p>No videos found. Upload your first video to get started!</p></div>';
            const pagination = document.querySelector('.pagination');
            if (pagination) pagination.parentElement.style.display = 'none';
            return;
        }

        // Initialize filtered videos and apply initial filters
        this.filteredVideos = [...this.videos];
        this.currentPage = 1;
        this.applyVideoFilters();
        return;

        // Filters and pagination will handle the display
    }

    updateVideoPageStats() {
        const totalVideos = this.videos ? this.videos.length : 0;
        const publishedVideos = this.videos ? this.videos.filter(v => (v.status || 'published') === 'published').length : 0;
        const pendingVideos = this.videos ? this.videos.filter(v => v.status === 'pending').length : 0;
        const totalViews = this.videos ? this.videos.reduce((sum, v) => sum + (parseInt(v.views) || 0), 0) : 0;

        // Update stats cards on videos page
        const totalVideosEl = document.getElementById('totalVideos');
        const publishedVideosEl = document.getElementById('publishedVideos');
        const pendingVideosEl = document.getElementById('pendingVideos');
        const totalViewsEl = document.getElementById('totalViews');

        if (totalVideosEl) totalVideosEl.innerHTML = totalVideos;
        if (publishedVideosEl) publishedVideosEl.innerHTML = publishedVideos;
        if (pendingVideosEl) pendingVideosEl.innerHTML = pendingVideos;
        if (totalViewsEl) totalViewsEl.innerHTML = totalViews.toLocaleString();
    }

    async loadEarningsTable() {
        const tbody = document.getElementById('earningsTableBody');
        if (!tbody) return;

        if (!this.earnings.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No earnings found</td></tr>';
            return;
        }

        tbody.innerHTML = this.earnings.map(earning => `
            <tr>
                <td>${earning.date || 'N/A'}</td>
                <td>${earning.videoTitle || 'N/A'}</td>
                <td>${earning.viewerName || 'N/A'}</td>
                <td>$${earning.amount || '0.00'}</td>
                <td><span class="badge bg-success">Completed</span></td>
            </tr>
        `).join('');
    }

    showUploadModal() {
        console.log('Show upload modal');
    }

    playVideo(videoId) {
        const video = this.videos.find(v => v.id == videoId);
        if (!video) {
            alert('Video not found');
            return;
        }

        // Extract YouTube video ID
        let youtubeVideoId = '';
        if (video.youtube_id) {
            youtubeVideoId = video.youtube_id;
        } else if (video.youtube_thumbnail) {
            // Extract from thumbnail URL
            const match = video.youtube_thumbnail.match(/\/vi\/([^\/]+)\//);
            if (match) {
                youtubeVideoId = match[1];
            }
        }

        if (!youtubeVideoId) {
            alert('Video not available for playback');
            return;
        }

        // Create video player modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'videoPlayerModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${video.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="ratio ratio-16x9">
                            <iframe src="https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1" 
                                    title="${video.title}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen></iframe>
                        </div>
                        <div class="p-3">
                            <h6>${video.title}</h6>
                            <p class="text-muted">${video.description || 'No description available'}</p>
                            <div class="d-flex justify-content-between">
                                <span>Views: ${video.youtube_views || video.views || 0}</span>
                                <span>Price: $${video.price}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        // Remove modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    editVideo(videoId) {
        console.log('Edit video called with ID:', videoId, 'Available videos:', this.videos.length);
        
        // Convert videoId to string for comparison since IDs may be numbers or strings
        const video = this.videos.find(v => String(v.id) === String(videoId));
        if (!video) {
            console.error('Video not found. Looking for ID:', videoId, 'Available IDs:', this.videos.map(v => v.id));
            if (window.notificationManager) {
                window.notificationManager.showError('Video not found');
            } else if (window.commonUtils) {
                window.commonUtils.showToast('Video not found', 'error');
            } else {
                alert('Video not found');
            }
            return;
        }

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'editVideoModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>Edit Video
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-light">
                            <i class="fas fa-info-circle text-success me-2"></i>
                            Update your video details and settings.
                        </div>
                        
                        <form id="editVideoForm">
                            <div class="row g-4">
                                <div class="col-12">
                                    <label for="editTitle" class="form-label">Video Title *</label>
                                    <input type="text" class="form-control" id="editTitle" value="${video.title}" placeholder="Enter video title..." required>
                                </div>
                                
                                <div class="col-12">
                                    <label for="editDescription" class="form-label">Description</label>
                                    <textarea class="form-control" id="editDescription" rows="3" placeholder="Describe your video...">${video.description || ''}</textarea>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="editPrice" class="form-label">Price ($) *</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" class="form-control" id="editPrice" value="${video.price}" min="0" step="0.01" placeholder="0.00" required>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="editStatus" class="form-label fw-semibold">Publication Status</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0">
                                            <i class="fas fa-toggle-on text-muted"></i>
                                        </span>
                                        <select class="form-select border-start-0" id="editStatus">
                                            <option value="published" ${video.status === 'published' ? 'selected' : ''}>📺 Published (Live)</option>
                                            <option value="pending" ${video.status === 'pending' ? 'selected' : ''}>⏳ Pending Review</option>
                                            <option value="draft" ${video.status === 'draft' ? 'selected' : ''}>📝 Draft (Private)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Video Preview -->
                            <div class="mt-4">
                                <h6 class="fw-semibold text-muted mb-3">
                                    <i class="fas fa-eye me-2"></i>Current Video Preview
                                </h6>
                                <div class="card border-0 bg-light-subtle">
                                    <div class="card-body p-3">
                                        <div class="row align-items-center">
                                            <div class="col-auto">
                                                <img src="${video.thumbnail || video.youtube_thumbnail || 'https://via.placeholder.com/120x68/666/fff?text=Video'}" 
                                                     class="rounded" style="width: 120px; height: 68px; object-fit: cover;" alt="Video thumbnail">
                                            </div>
                                            <div class="col">
                                                <h6 class="mb-1">${video.title}</h6>
                                                <small class="text-muted">
                                                    <i class="fas fa-eye me-1"></i>${video.views || 0} views
                                                    <span class="mx-2">•</span>
                                                    <i class="fas fa-calendar me-1"></i>${video.upload_date || 'Unknown date'}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="window.creatorManager.saveVideoChanges('${videoId}')">
                            <i class="fas fa-save me-1"></i>Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        // Remove modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    async saveVideoChanges(videoId) {
        // Validate form first
        if (this.editVideoValidator && !this.editVideoValidator.validateForm()) {
            if (window.notificationManager) {
                window.notificationManager.showError('Please fix the errors below');
            }
            return;
        }
        
        const saveButton = document.querySelector('#editVideoModal .btn-success');
        const title = document.getElementById('editTitle').value;
        const description = document.getElementById('editDescription').value;
        const price = document.getElementById('editPrice').value;
        const status = document.getElementById('editStatus').value;

        if (!title.trim()) {
            if (window.notificationManager) {
                window.notificationManager.showWarning('Title is required');
            } else if (window.commonUtils) {
                window.commonUtils.showToast('Title is required', 'warning');
            } else {
                alert('Title is required');
            }
            return;
        }

        try {
            // Set button loading state
            if (window.ButtonLoader) {
                window.ButtonLoader.setLoading(saveButton, 'Saving...');
            } else if (window.commonUtils) {
                window.commonUtils.setButtonLoading(saveButton, true, 'Saving...');
            }
            // Update video in our database first
            const response = await window.apiService.put(`/api/videos/${videoId}`, {
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(price),
                status: status
            });

            if (response.success) {
                // Update local video data
                const videoIndex = this.videos.findIndex(v => v.id == videoId);
                if (videoIndex !== -1) {
                    this.videos[videoIndex] = { ...this.videos[videoIndex], title, description, price, status };
                }

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editVideoModal'));
                modal.hide();

                // If video has YouTube ID, sync with YouTube
                if (response.data?.youtube_id) {
                    console.log('Syncing video update to YouTube...');
                    this.showNotification('Video updated! Syncing with YouTube...', 'info');
                    
                    try {
                        // Use the global YouTube API instance
                        if (!window.youtubeAPI) {
                            console.error('YouTube API client not available');
                            throw new Error('YouTube API client not available');
                        }
                        
                        // Ensure YouTube client is properly initialized
                        await window.youtubeAPI.initialize();
                        
                        const youtubeResult = await window.youtubeAPI.updateVideoMetadata(response.data.youtube_id, {
                            title: title.trim(),
                            description: description.trim()
                        });
                        
                        if (youtubeResult.success) {
                            console.log('Video successfully updated on YouTube');
                            if (window.notificationManager) {
                                window.notificationManager.showSuccess('✓ Video updated successfully in VideoHub and YouTube!');
                            } else {
                                this.showNotification('✓ Video updated successfully in VideoHub and YouTube!', 'success');
                            }
                        } else {
                            console.warn('Video updated in VideoHub but YouTube sync failed:', youtubeResult.error);
                            if (youtubeResult.needsAuth) {
                                if (window.notificationManager) {
                                    window.notificationManager.showWarning('Video updated in VideoHub. YouTube sync requires authentication. Please connect your YouTube account.');
                                } else {
                                    this.showNotification('Video updated in VideoHub. YouTube sync requires authentication. Please connect your YouTube account.', 'warning');
                                }
                                this.showYouTubeConnectOption();
                            } else {
                                if (window.notificationManager) {
                                    window.notificationManager.showWarning('Video updated in VideoHub. YouTube sync failed: ' + youtubeResult.error);
                                } else {
                                    this.showNotification('Video updated in VideoHub. YouTube sync failed: ' + youtubeResult.error, 'warning');
                                }
                            }
                        }
                    } catch (youtubeError) {
                        console.error('YouTube sync error:', youtubeError);
                        this.showNotification('Video updated in VideoHub. YouTube sync failed - please check authentication.', 'warning');
                        this.showYouTubeConnectOption();
                    }
                } else {
                    this.showNotification('✓ Video updated successfully!', 'success');
                }

                // Reload videos grid
                this.loadVideosGrid();
                this.updateVideoPageStats();
            } else {
                this.showNotification('Failed to update video: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error updating video:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Updating video');
            } else {
                this.showNotification('Error updating video. Please try again.', 'error');
            }
        } finally {
            // Reset button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(saveButton, false);
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showYouTubeConnectOption() {
        // Create YouTube connect notification
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '350px';
        notification.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <span>Connect YouTube to sync video changes</span>
                <button type="button" class="btn btn-sm btn-primary ms-2" onclick="window.creatorManager.connectYouTubeFromToast()">
                    <i class="fab fa-youtube me-1"></i>Connect
                </button>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    async connectYouTubeFromToast() {
        try {
            if (window.youtubeAPI) {
                const success = await window.youtubeAPI.signIn();
                if (success) {
                    this.showNotification('✓ YouTube account connected successfully!', 'success');
                } else {
                    this.showNotification('Failed to connect YouTube account.', 'error');
                }
            } else {
                this.showNotification('YouTube API not available', 'error');
            }
        } catch (error) {
            console.error('Connect failed:', error);
            this.showNotification('Failed to connect YouTube account.', 'error');
        }
    }

    async deleteVideo(videoId) {
        // Prevent multiple confirmations by checking if one is already showing
        if (this.isDeleting) {
            return;
        }
        
        this.isDeleting = true;
        
        try {
            if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
                return;
            }

            // Find and disable the delete button to prevent multiple calls
            const deleteButton = document.querySelector(`[data-video-id="${videoId}"].delete-video-btn`);
            if (deleteButton) {
                deleteButton.disabled = true;
                if (window.commonUtils) {
                    window.commonUtils.setButtonLoading(deleteButton, true, 'Deleting...');
                }
            }

            const response = await window.apiService.delete(`/api/videos/${videoId}`);

            if (response.success) {
                // Remove from local videos array
                this.videos = this.videos.filter(v => String(v.id) !== String(videoId));

                // Reload videos grid
                this.loadVideosGrid();
                this.updateVideoPageStats();

                if (window.commonUtils) {
                    window.commonUtils.showToast('Video deleted successfully!', 'success');
                } else {
                    alert('Video deleted successfully!');
                }
            } else {
                if (window.commonUtils) {
                    window.commonUtils.showToast('Failed to delete video: ' + (response.message || 'Unknown error'), 'error');
                } else {
                    alert('Failed to delete video: ' + (response.message || 'Unknown error'));
                }
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            if (window.commonUtils) {
                window.commonUtils.handleAPIError(error, 'Deleting video');
            } else {
                alert('Error deleting video. Please try again.');
            }
        } finally {
            this.isDeleting = false;
            // Re-enable the delete button
            const deleteButton = document.querySelector(`[data-video-id="${videoId}"].delete-video-btn`);
            if (deleteButton && window.commonUtils) {
                window.commonUtils.setButtonLoading(deleteButton, false);
                deleteButton.disabled = false;
            }
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num || 0);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    bindVideoButtons() {
        // Bind edit buttons
        document.querySelectorAll('.edit-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const videoId = e.target.dataset.videoId;
                if (videoId) {
                    console.log('Edit button clicked for video:', videoId);
                    this.editVideo(videoId);
                }
            });
        });

        // Bind delete buttons
        document.querySelectorAll('.delete-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const videoId = e.target.dataset.videoId;
                if (videoId && !this.isDeleting) {
                    console.log('Delete button clicked for video:', videoId);
                    this.deleteVideo(videoId);
                }
            });
        });
    }

    // Add missing debounce utility function
    debounce(func, wait) {
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

    // Add missing filter functionality
    applyVideoFilters() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');

        let filteredVideos = [...this.videos];

        // Apply search filter
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredVideos = filteredVideos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                (video.description && video.description.toLowerCase().includes(searchTerm))
            );
        }

        // Apply status filter
        if (statusFilter && statusFilter.value) {
            filteredVideos = filteredVideos.filter(video => 
                (video.status || 'published') === statusFilter.value
            );
        }

        // Apply category filter
        if (categoryFilter && categoryFilter.value) {
            filteredVideos = filteredVideos.filter(video => 
                video.category === categoryFilter.value
            );
        }

        // Apply sorting
        if (sortFilter && sortFilter.value) {
            switch (sortFilter.value) {
                case 'newest':
                    filteredVideos.sort((a, b) => new Date(b.uploadDate || b.created_at) - new Date(a.uploadDate || a.created_at));
                    break;
                case 'oldest':
                    filteredVideos.sort((a, b) => new Date(a.uploadDate || a.created_at) - new Date(b.uploadDate || b.created_at));
                    break;
                case 'views':
                    filteredVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
            }
        }

        // Store filtered videos and update display
        this.filteredVideos = filteredVideos;
        this.currentPage = 1;
        this.displayFilteredVideos();
        this.updatePagination();
    }

    displayFilteredVideos() {
        const videosGrid = document.getElementById('videosGrid');
        if (!videosGrid) return;

        const videosPerPage = 6;
        const startIndex = (this.currentPage - 1) * videosPerPage;
        const endIndex = startIndex + videosPerPage;
        const videosToShow = this.filteredVideos.slice(startIndex, endIndex);

        if (videosToShow.length === 0) {
            videosGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No videos found</h5>
                    <p class="text-muted">Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        videosGrid.innerHTML = videosToShow.map(video => {
            const status = video.status || 'published';
            const statusClass = status === 'published' ? 'bg-success' : 
                               status === 'pending' ? 'bg-warning' : 'bg-secondary';
            const statusIcon = status === 'published' ? 'fa-check-circle' : 
                              status === 'pending' ? 'fa-clock' : 'fa-pause-circle';
            
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100 video-card">
                        <div class="video-thumbnail cursor-pointer" 
                             style="background-image: url('${video.youtube_thumbnail || video.thumbnail || 'https://via.placeholder.com/300x169'}'); 
                                    background-size: cover; background-position: center; height: 180px; position: relative;" 
                             onclick="window.creatorManager.playVideo('${video.id}')">
                            <div class="video-overlay d-flex align-items-center justify-content-center" 
                                 style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                                        background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s;">
                                <i class="fas fa-play fa-3x text-white" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.6);"></i>
                            </div>
                            <div class="position-absolute top-0 end-0 m-2">
                                <span class="badge ${statusClass}">
                                    <i class="fas ${statusIcon} me-1"></i>${status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title">${video.title}</h6>
                            <p class="card-text text-muted small">${(video.description || '').substring(0, 100)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="fas fa-eye me-1"></i>${video.youtube_views || video.views || 0} views
                                </small>
                                <small class="text-muted">
                                    $${video.price || '0.00'}
                                </small>
                            </div>
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm edit-video-btn" data-video-id="${video.id}">
                                    <i class="fas fa-edit me-1"></i>Edit
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-video-btn" data-video-id="${video.id}">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add hover effect for play overlay
        setTimeout(() => {
            document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
                const overlay = thumbnail.querySelector('.video-overlay');
                if (overlay) {
                    thumbnail.addEventListener('mouseenter', () => {
                        overlay.style.opacity = '1';
                    });
                    thumbnail.addEventListener('mouseleave', () => {
                        overlay.style.opacity = '0';
                    });
                }
            });
        }, 100);
    }

    updatePagination() {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const videosPerPage = 6;
        const totalPages = Math.ceil(this.filteredVideos.length / videosPerPage);
        
        if (totalPages <= 1) {
            pagination.parentElement.style.display = 'none';
            return;
        }

        pagination.parentElement.style.display = 'block';
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Remove existing event listeners to prevent duplicates
        const existingHandler = pagination._paginationHandler;
        if (existingHandler) {
            pagination.removeEventListener('click', existingHandler);
        }
        
        // Add click handlers for pagination
        const paginationHandler = (e) => {
            e.preventDefault();
            if (e.target.classList.contains('page-link') && !e.target.parentElement.classList.contains('disabled')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage && page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.displayFilteredVideos();
                    this.updatePagination();
                    // Scroll to top of videos section
                    document.getElementById('videosGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };
        
        pagination._paginationHandler = paginationHandler;
        pagination.addEventListener('click', paginationHandler);
    }
}

// Initialize creator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorManager = new CreatorManager();
    
    // Initialize VideoHub upload functionality if on videos page
    if (window.location.pathname.includes('videos.html')) {
        new VideoHubUploadManager();
    }
});

/**
 * VideoHub Upload Manager
 * Handles video uploads directly to VideoHub
 */
class VideoHubUploadManager {
    constructor() {
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadForm = document.getElementById('uploadForm');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        
        // Upload area elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileSelectedArea = document.getElementById('fileSelectedArea');
        this.uploadProgressArea = document.getElementById('uploadProgressArea');
        this.uploadSuccess = document.getElementById('uploadSuccess');
        
        // File display elements
        this.selectedFileName = document.getElementById('selectedFileName');
        this.selectedFileSize = document.getElementById('selectedFileSize');
        this.uploadingFileName = document.getElementById('uploadingFileName');
        
        // Progress elements
        this.uploadProgressBar = document.getElementById('uploadProgressBar');
        this.uploadPercentage = document.getElementById('uploadPercentage');
        this.uploadStatus = document.getElementById('uploadStatus');
        this.uploadSpeed = document.getElementById('uploadSpeed');
        this.uploadTimeRemaining = document.getElementById('uploadTimeRemaining');
        
        // Upload state
        this.selectedFile = null;
        this.uploadStartTime = null;
        this.uploadBytesUploaded = 0;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        this.setupCharacterCounters();
        this.setupDragAndDrop();
    }
    
    bindEvents() {
        // Upload button click
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', (e) => this.handleUpload(e));
        }
        
        // Modal events
        if (this.uploadModal) {
            this.uploadModal.addEventListener('show.bs.modal', () => this.onModalShow());
            this.uploadModal.addEventListener('hidden.bs.modal', () => this.onModalHide());
        }
        
        // File input change
        const fileInput = document.getElementById('videoFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.onFileSelect(e));
        }
    }
    
    setupDragAndDrop() {
        if (!this.uploadArea) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.highlight(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.unhighlight(), false);
        });
        
        // Handle dropped files
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        this.uploadArea.style.borderColor = '#198754';
        this.uploadArea.style.background = '#f8fffe';
        this.uploadArea.style.transform = 'scale(1.02)';
    }
    
    unhighlight() {
        this.uploadArea.style.borderColor = '#dee2e6';
        this.uploadArea.style.background = '#f8f9fa';
        this.uploadArea.style.transform = 'scale(1)';
    }
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                this.setSelectedFile(file);
            } else {
                this.showError('Please select a valid video file (MP4, MOV, AVI, WMV)');
            }
        }
    }
    
    setupCharacterCounters() {
        // Title counter
        const titleInput = document.getElementById('videoTitle');
        const titleCount = document.getElementById('titleCount');
        if (titleInput && titleCount) {
            titleInput.addEventListener('input', (e) => {
                titleCount.textContent = e.target.value.length;
            });
        }
        
        // Description counter  
        const descInput = document.getElementById('videoDescription');
        const descCount = document.getElementById('descCount');
        if (descInput && descCount) {
            descInput.addEventListener('input', (e) => {
                descCount.textContent = e.target.value.length;
            });
        }
    }
    
    onFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.setSelectedFile(file);
        }
    }
    
    setSelectedFile(file) {
        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.showError('Please select a valid video file (MP4, MOV, AVI, WMV)');
            return;
        }
        
        // Validate file size (2GB max)
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
        if (file.size > maxSize) {
            this.showError('File size exceeds 2GB limit. Please choose a smaller file.');
            return;
        }
        
        this.selectedFile = file;
        
        // Update UI to show selected file
        const fileSize = this.formatFileSize(file.size);
        this.selectedFileName.textContent = file.name;
        this.selectedFileSize.textContent = fileSize;
        
        // Show file selected state
        this.uploadArea.style.display = 'none';
        this.fileSelectedArea.style.display = 'block';
        
        // Update file input
        const fileInput = document.getElementById('videoFile');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    onModalShow() {
        // Reset form when modal is shown
        this.resetForm();
    }
    
    onModalHide() {
        // Clean up when modal is hidden
        this.hideProgress();
        this.resetForm();
    }
    
    clearFileSelection() {
        this.selectedFile = null;
        this.uploadArea.style.display = 'block';
        this.fileSelectedArea.style.display = 'none';
        this.uploadProgressArea.style.display = 'none';
        
        // Clear file input
        const fileInput = document.getElementById('videoFile');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    async handleUpload(e) {
        e.preventDefault();
        
        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }
            
            // Get form data
            const formData = this.getFormData();
            
            // Show progress
            this.showUploadProgress();
            this.updateUploadProgress(10, 'Preparing upload...');
            
            // Get current user session
            const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
            const creatorId = userSession.id;
            
            if (!creatorId) {
                this.showError('User session not found. Please login again.');
                return;
            }
            
            this.updateUploadProgress(20, 'Authenticating with YouTube...');
            
            // Upload video directly to YouTube using JavaScript API
            const youtubeResult = await window.youtubeAPI.uploadVideo(
                formData.file, 
                formData.metadata, 
                (progress) => this.updateUploadProgress(Math.min(progress, 80), 'Uploading to YouTube...')
            );
            
            if (youtubeResult.success) {
                this.updateUploadProgress(85, 'Syncing with VideoHub...');
                
                // Sync with database after successful YouTube upload (fixed fields to match schema)
                const syncData = {
                    title: formData.metadata.title,
                    description: formData.metadata.description,
                    uploader_id: creatorId, // Fixed: changed from user_id to uploader_id
                    price: formData.metadata.price,
                    category: formData.metadata.tags.join(','),
                    youtube_id: youtubeResult.videoId,
                    thumbnail: youtubeResult.thumbnail || '',
                    status: formData.metadata.privacy === 'public' ? 'published' : 'pending'
                    // Removed duration and file_size as they don't exist in the database
                };
                
                // Use configured API base URL
                const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
                const syncResponse = await fetch(`${apiUrl}/videos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(syncData)
                });
                
                this.updateUploadProgress(100, 'Upload complete!');
                
                const syncResult = await syncResponse.json();
                
                if (syncResult.success) {
                    this.showUploadSuccess();
                    
                    // Wait a moment for user to see success
                    setTimeout(() => {
                        this.hideProgress();
                        this.resetForm();
                        
                        // Close modal and refresh videos
                        const modal = bootstrap.Modal.getInstance(this.uploadModal);
                        modal.hide();
                        
                        // Refresh videos list
                        if (window.creatorManager) {
                            window.creatorManager.loadDashboardData();
                        }
                        setTimeout(() => window.location.reload(), 500);
                    }, 2000);
                } else {
                    throw new Error('Video uploaded to YouTube but failed to sync with database: ' + syncResult.message);
                }
            } else {
                throw new Error(youtubeResult.error || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Upload failed:', error);
            this.showError(error.message || 'Upload failed. Please try again.');
            this.hideProgress();
        }
    }
    
    validateForm() {
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showError('Please select a video file.');
            return false;
        }
        
        if (!titleInput.value.trim()) {
            this.showError('Please enter a video title.');
            return false;
        }
        
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
            this.showError('File size must be less than 2GB.');
            return false;
        }
        
        return true;
    }
    
    getFormData() {
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        const descInput = document.getElementById('videoDescription');
        const priceInput = document.getElementById('videoPrice');
        const privacyInput = document.getElementById('videoPrivacy');
        const tagsInput = document.getElementById('videoTags');
        
        const tags = tagsInput.value ? tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        return {
            file: fileInput.files[0],
            metadata: {
                title: titleInput.value.trim(),
                description: descInput.value.trim(),
                price: parseFloat(priceInput.value) || 0,
                privacy: privacyInput.value,
                tags: tags,
                categoryId: '22' // Education category
            }
        };
    }
    
    resetForm() {
        if (this.uploadForm) {
            this.uploadForm.reset();
        }
        
        // Reset upload states
        this.clearFileSelection();
        this.selectedFile = null;
        this.uploadStartTime = null;
        this.uploadBytesUploaded = 0;
        
        // Reset character counters
        const titleCount = document.getElementById('titleCount');
        const descCount = document.getElementById('descCount');
        if (titleCount) titleCount.textContent = '0';
        if (descCount) descCount.textContent = '0';
        
        // Hide all upload areas except default
        if (this.uploadArea) this.uploadArea.style.display = 'block';
        if (this.fileSelectedArea) this.fileSelectedArea.style.display = 'none';
        if (this.uploadProgressArea) this.uploadProgressArea.style.display = 'none';
        if (this.uploadSuccess) this.uploadSuccess.style.display = 'none';
    }
    
    showUploadProgress() {
        // Set up file name for upload
        if (this.selectedFile && this.uploadingFileName) {
            this.uploadingFileName.textContent = this.selectedFile.name;
        }
        
        // Show upload progress area
        if (this.fileSelectedArea) this.fileSelectedArea.style.display = 'none';
        if (this.uploadProgressArea) this.uploadProgressArea.style.display = 'block';
        
        // Disable upload button and show uploading state
        if (this.uploadBtn) {
            this.uploadBtn.disabled = true;
            this.uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
        }
        
        // Track upload start time
        this.uploadStartTime = Date.now();
    }
    
    hideProgress() {
        // Re-enable upload button
        if (this.uploadBtn) {
            this.uploadBtn.disabled = false;
            this.uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt me-2"></i>Upload to YouTube';
        }
    }
    
    updateUploadProgress(percentage, status = 'Uploading...') {
        // Update progress bar
        if (this.uploadProgressBar) {
            this.uploadProgressBar.style.width = percentage + '%';
        }
        
        // Update percentage badge
        if (this.uploadPercentage) {
            this.uploadPercentage.textContent = Math.round(percentage) + '%';
        }
        
        // Update status
        if (this.uploadStatus) {
            this.uploadStatus.textContent = status;
        }
        
        // Calculate and update upload speed and time remaining
        if (this.selectedFile && this.uploadStartTime) {
            const now = Date.now();
            const elapsed = (now - this.uploadStartTime) / 1000; // seconds
            const bytesUploaded = (percentage / 100) * this.selectedFile.size;
            
            if (elapsed > 1 && bytesUploaded > 0) {
                const speed = bytesUploaded / elapsed; // bytes per second
                const remaining = this.selectedFile.size - bytesUploaded;
                const timeRemaining = remaining / speed; // seconds
                
                // Update speed display
                if (this.uploadSpeed) {
                    this.uploadSpeed.textContent = this.formatSpeed(speed);
                }
                
                // Update time remaining
                if (this.uploadTimeRemaining && percentage < 99) {
                    this.uploadTimeRemaining.textContent = this.formatTime(timeRemaining);
                } else if (this.uploadTimeRemaining) {
                    this.uploadTimeRemaining.textContent = 'Almost done...';
                }
            }
        }
    }
    
    showUploadSuccess() {
        // Hide progress area and show success
        if (this.uploadProgressArea) this.uploadProgressArea.style.display = 'none';
        if (this.uploadSuccess) {
            this.uploadSuccess.style.display = 'block';
        }
    }
    
    formatSpeed(bytesPerSecond) {
        const mbps = bytesPerSecond / (1024 * 1024);
        if (mbps >= 1) {
            return mbps.toFixed(1) + ' MB/s';
        } else {
            const kbps = bytesPerSecond / 1024;
            return kbps.toFixed(1) + ' KB/s';
        }
    }
    
    formatTime(seconds) {
        if (seconds < 60) {
            return Math.round(seconds) + ' seconds left';
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return minutes + ' minute' + (minutes !== 1 ? 's' : '') + ' left';
        } else {
            const hours = Math.round(seconds / 3600);
            return hours + ' hour' + (hours !== 1 ? 's' : '') + ' left';
        }
    }
    
    showSuccess(message) {
        if (window.commonUtils) {
            window.commonUtils.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
    
    showError(message) {
        if (window.commonUtils) {
            window.commonUtils.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Global function to clear file selection
window.clearFileSelection = function() {
    // Find the upload manager instance and call its clearFileSelection method
    const uploadArea = document.getElementById('uploadArea');
    const fileSelectedArea = document.getElementById('fileSelectedArea');
    const uploadProgressArea = document.getElementById('uploadProgressArea');
    const fileInput = document.getElementById('videoFile');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileSelectedArea) fileSelectedArea.style.display = 'none';
    if (uploadProgressArea) uploadProgressArea.style.display = 'none';
    if (fileInput) fileInput.value = '';
};