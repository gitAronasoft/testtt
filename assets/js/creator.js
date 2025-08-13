/**
 * VideoHub Creator Module
 * Handles creator dashboard functionality with API integration
 */

class CreatorManager {
    constructor() {
        this.stats = {};
        this.videos = [];
        this.earnings = [];
        this.isLoading = false;
        this.init();
    }

    async init() {
        this.bindEvents();
        this.loadPageSpecificHandlers();
        
        // Only load data if we haven't already loaded it
        if (!this.stats || Object.keys(this.stats).length === 0) {
            await this.loadDashboardData();
        }
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
                            window.apiService.get(`/metrics/creator?creator_id=${creatorId}`),
                            window.apiService.get(`/creator/videos?uploader_id=${creatorId}`),
                            window.apiService.get(`/creator/earnings?creator_id=${creatorId}`)
                        ]);
                    } else if (currentPage === 'videos.html') {
                        // Load only videos for videos page
                        videosResponse = await window.apiService.get(`/creator/videos?uploader_id=${creatorId}`);
                        metricsResponse = { success: false };
                        earningsResponse = { data: { earnings: [] } };
                    } else if (currentPage === 'earnings.html') {
                        // Load only earnings for earnings page
                        earningsResponse = await window.apiService.get(`/creator/earnings?creator_id=${creatorId}`);
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
            return;
        }

        videosGrid.innerHTML = this.videos.map(video => {
            const status = video.status || 'published'; // Default to published if no status
            const statusClass = status === 'published' ? 'bg-success' : 
                               status === 'pending' ? 'bg-warning' : 'bg-secondary';
            
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card">
                        <div class="video-thumbnail cursor-pointer" style="background-image: url('${video.youtube_thumbnail || video.thumbnail || 'https://via.placeholder.com/300x169'}'); background-size: cover; background-position: center; height: 180px; position: relative;" onclick="window.creatorManager.playVideo('${video.id}')">
                            <div class="video-overlay d-flex align-items-center justify-content-center" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s;">
                                <i class="fas fa-play fa-3x text-white" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.6);"></i>
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title">${video.title}</h6>
                            <p class="card-text text-muted small">${(video.description || '').substring(0, 50)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                                <span class="text-muted small">$${video.price || '0.00'}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">${video.youtube_views || video.views || 0} views</small>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary edit-video-btn" data-video-id="${video.id}">Edit</button>
                                    <button class="btn btn-sm btn-outline-danger delete-video-btn" data-video-id="${video.id}">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add hover effect for play overlay
        document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
            const overlay = thumbnail.querySelector('.video-overlay');
            thumbnail.addEventListener('mouseenter', () => {
                overlay.style.opacity = '1';
            });
            thumbnail.addEventListener('mouseleave', () => {
                overlay.style.opacity = '0';
            });
        });

        // Ensure edit and delete buttons are properly bound
        this.bindVideoButtons();
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
            if (window.commonUtils) {
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
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-warning text-dark border-0">
                        <h5 class="modal-title fw-bold">
                            <i class="fas fa-edit me-2"></i>Edit Video Details
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="alert alert-info border-0 bg-info-subtle mb-4">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-info-circle text-info me-3"></i>
                                <div>
                                    <h6 class="alert-heading mb-1">Video Information</h6>
                                    <small>Update your video details. Changes will be reflected across the platform.</small>
                                </div>
                            </div>
                        </div>
                        
                        <form id="editVideoForm">
                            <div class="row g-4">
                                <div class="col-12">
                                    <label for="editTitle" class="form-label fw-semibold">Video Title *</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0">
                                            <i class="fas fa-heading text-muted"></i>
                                        </span>
                                        <input type="text" class="form-control border-start-0 ps-0" id="editTitle" value="${video.title}" placeholder="Enter video title..." required>
                                    </div>
                                </div>
                                
                                <div class="col-12">
                                    <label for="editDescription" class="form-label fw-semibold">Description</label>
                                    <textarea class="form-control" id="editDescription" rows="4" placeholder="Describe your video content...">${video.description || ''}</textarea>
                                    <small class="text-muted">Help viewers understand what your video is about</small>
                                </div>
                                
                                <div class="col-md-6">
                                    <label for="editPrice" class="form-label fw-semibold">Price ($) *</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0">$</span>
                                        <input type="number" class="form-control border-start-0" id="editPrice" value="${video.price}" min="0" step="0.01" placeholder="0.00" required>
                                    </div>
                                    <small class="text-muted">Set to $0.00 for free viewing</small>
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
                    <div class="modal-footer bg-light border-0 px-4 py-3">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-warning px-4" onclick="window.creatorManager.saveVideoChanges('${videoId}')">
                            <i class="fas fa-save me-2"></i>Save Changes
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
        const saveButton = document.querySelector('#editVideoModal .btn-primary');
        const title = document.getElementById('editTitle').value;
        const description = document.getElementById('editDescription').value;
        const price = document.getElementById('editPrice').value;
        const status = document.getElementById('editStatus').value;

        if (!title.trim()) {
            if (window.commonUtils) {
                window.commonUtils.showToast('Title is required', 'warning');
            } else {
                alert('Title is required');
            }
            return;
        }

        try {
            // Set button loading state
            if (window.commonUtils) {
                window.commonUtils.setButtonLoading(saveButton, true, 'Saving...');
            }
            // Update video in our database first
            const response = await window.apiService.put(`/videos/${videoId}`, {
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
                            this.showNotification('✓ Video updated successfully in VideoHub and YouTube!', 'success');
                        } else {
                            console.warn('Video updated in VideoHub but YouTube sync failed:', youtubeResult.error);
                            if (youtubeResult.needsAuth) {
                                this.showNotification('Video updated in VideoHub. YouTube sync requires authentication. Please connect your YouTube account.', 'warning');
                                this.showYouTubeConnectOption();
                            } else {
                                this.showNotification('Video updated in VideoHub. YouTube sync failed: ' + youtubeResult.error, 'warning');
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

            const response = await window.apiService.delete(`/videos/${videoId}`);

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

        // Store original videos and update with filtered
        const originalVideos = this.videos;
        this.videos = filteredVideos;
        this.loadVideosGrid();
        this.videos = originalVideos; // Restore original array
    }
}

// Initialize creator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorManager = new CreatorManager();
    
    // Initialize YouTube upload functionality if on videos page
    if (window.location.pathname.includes('videos.html')) {
        new YouTubeUploadManager();
    }
});

/**
 * YouTube Upload Manager
 * Handles video uploads to YouTube and database sync
 */
class YouTubeUploadManager {
    constructor() {
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadForm = document.getElementById('uploadForm');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.authStatus = document.getElementById('authStatus');
        this.connectBtn = document.getElementById('connectYouTube');
        this.progressDiv = document.getElementById('uploadProgress');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressStatus = document.getElementById('progressStatus');
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        this.setupCharacterCounters();
        await this.checkAuthStatus();
    }
    
    bindEvents() {
        // Upload button click
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', (e) => this.handleUpload(e));
        }
        
        // Connect YouTube button
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', (e) => this.connectYouTube(e));
        }
        
        // Modal events
        if (this.uploadModal) {
            this.uploadModal.addEventListener('show.bs.modal', () => this.onModalShow());
            this.uploadModal.addEventListener('hidden.bs.modal', () => this.onModalHide());
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
    
    async checkAuthStatus() {
        try {
            if (window.youtubeAPI) {
                await window.youtubeAPI.initialize();
                
                if (window.youtubeAPI.isSignedIn()) {
                    this.authStatus.style.display = 'none';
                    this.uploadBtn.disabled = false;
                } else {
                    this.authStatus.style.display = 'block';
                    this.uploadBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.authStatus.style.display = 'block';
            this.uploadBtn.disabled = true;
        }
    }
    
    async connectYouTube(e) {
        e.preventDefault();
        
        try {
            this.connectBtn.disabled = true;
            this.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Connecting...';
            
            if (window.youtubeAPI) {
                const success = await window.youtubeAPI.signIn();
                
                if (success) {
                    await this.checkAuthStatus();
                    this.showSuccess('YouTube account connected successfully!');
                } else {
                    this.showError('Failed to connect YouTube account.');
                }
            } else {
                throw new Error('YouTube API not available');
            }
        } catch (error) {
            console.error('Connect failed:', error);
            this.showError('Failed to connect YouTube account.');
        } finally {
            this.connectBtn.disabled = false;
            this.connectBtn.innerHTML = '<i class="fab fa-youtube me-1"></i>Connect YouTube';
        }
    }
    
    async handleUpload(e) {
        e.preventDefault();
        
        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }
            
            // Check auth
            if (!window.youtubeAPI || !window.youtubeAPI.isSignedIn()) {
                this.showError('Please connect your YouTube account first.');
                return;
            }
            
            // Get form data
            const formData = this.getFormData();
            
            // Show progress
            this.showProgress();
            
            // Upload video
            const result = await window.youtubeAPI.uploadVideo(
                formData.file, 
                formData.metadata, 
                (progress) => this.updateProgress(progress)
            );
            
            if (result.success) {
                this.showSuccess('Video uploaded successfully!');
                this.hideProgress();
                this.resetForm();
                
                // Close modal and refresh videos
                const modal = bootstrap.Modal.getInstance(this.uploadModal);
                modal.hide();
                
                // Refresh videos list
                window.location.reload();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Upload failed:', error);
            this.showError(error.message);
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
    
    showProgress() {
        this.uploadForm.style.display = 'none';
        this.progressDiv.style.display = 'block';
        this.uploadBtn.disabled = true;
    }
    
    hideProgress() {
        this.uploadForm.style.display = 'block';
        this.progressDiv.style.display = 'none';
        this.uploadBtn.disabled = false;
    }
    
    updateProgress(progress) {
        this.progressBar.style.width = progress + '%';
        this.progressText.textContent = progress + '%';
        
        if (progress < 30) {
            this.progressStatus.textContent = 'Preparing upload...';
        } else if (progress < 75) {
            this.progressStatus.textContent = 'Converting video...';
        } else if (progress < 90) {
            this.progressStatus.textContent = 'Uploading to YouTube...';
        } else {
            this.progressStatus.textContent = 'Finalizing...';
        }
    }
    
    resetForm() {
        this.uploadForm.reset();
        document.getElementById('titleCount').textContent = '0';
        document.getElementById('descCount').textContent = '0';
    }
    
    onModalShow() {
        this.checkAuthStatus();
    }
    
    onModalHide() {
        this.resetForm();
        this.hideProgress();
    }
    
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    showError(message) {
        this.showAlert(message, 'danger');
    }
    
    showAlert(message, type) {
        // Remove existing alerts
        const existingAlert = this.uploadModal.querySelector('.alert-dismissible');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of modal body
        const modalBody = this.uploadModal.querySelector('.modal-body');
        modalBody.insertBefore(alert, modalBody.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize creator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorManager = new CreatorManager();
});