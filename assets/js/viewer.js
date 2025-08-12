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
        this.init();
    }

    init() {
        this.loadMockData();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        this.initializePlayer();
    }

    loadMockData() {
        // Mock available videos for browsing
        this.videos = [
            {
                id: 1,
                title: 'JavaScript Advanced Concepts',
                description: 'Deep dive into advanced JavaScript concepts including closures, prototypes, and async programming. Learn how to write more efficient and maintainable code.',
                creator: 'John Creator',
                creatorId: 1,
                duration: '45:30',
                price: 19.99,
                category: 'technology',
                rating: 4.8,
                views: 1234,
                likes: 89,
                uploadDate: '2024-03-10',
                thumbnail: 'https://via.placeholder.com/400x225/007bff/ffffff?text=JS+Advanced',
                featured: true,
                tags: ['javascript', 'programming', 'advanced']
            },
            {
                id: 2,
                title: 'React Hooks Complete Guide',
                description: 'Complete guide to React Hooks with practical examples and best practices. Master useState, useEffect, and custom hooks.',
                creator: 'Jane Developer',
                creatorId: 2,
                duration: '32:15',
                price: 14.99,
                category: 'technology',
                rating: 4.6,
                views: 856,
                likes: 67,
                uploadDate: '2024-03-08',
                thumbnail: 'https://via.placeholder.com/400x225/28a745/ffffff?text=React+Hooks',
                featured: true,
                tags: ['react', 'hooks', 'frontend']
            },
            {
                id: 3,
                title: 'Business Strategy Fundamentals',
                description: 'Learn the fundamental principles of business strategy and how to apply them in real-world scenarios.',
                creator: 'Mike Producer',
                creatorId: 3,
                duration: '28:45',
                price: 24.99,
                category: 'business',
                rating: 4.5,
                views: 567,
                likes: 45,
                uploadDate: '2024-03-12',
                thumbnail: 'https://via.placeholder.com/400x225/ffc107/000000?text=Business+Strategy',
                featured: false,
                tags: ['business', 'strategy', 'management']
            },
            {
                id: 4,
                title: 'UI/UX Design Principles',
                description: 'Master the essential principles of user interface and user experience design.',
                creator: 'Sarah Designer',
                creatorId: 4,
                duration: '52:10',
                price: 29.99,
                category: 'design',
                rating: 4.9,
                views: 789,
                likes: 102,
                uploadDate: '2024-03-05',
                thumbnail: 'https://via.placeholder.com/400x225/6f42c1/ffffff?text=UI%2FUX+Design',
                featured: true,
                tags: ['design', 'ui', 'ux']
            },
            {
                id: 5,
                title: 'Python for Data Science',
                description: 'Complete introduction to Python programming for data science applications.',
                creator: 'Dr. Analytics',
                creatorId: 5,
                duration: '67:30',
                price: 34.99,
                category: 'education',
                rating: 4.7,
                views: 423,
                likes: 58,
                uploadDate: '2024-03-01',
                thumbnail: 'https://via.placeholder.com/400x225/17a2b8/ffffff?text=Python+Data+Science',
                featured: false,
                tags: ['python', 'data-science', 'programming']
            }
        ];

        // Mock purchased videos
        this.purchases = [
            {
                id: 1,
                videoId: 1,
                video: this.videos[0],
                purchaseDate: '2024-03-15',
                price: 19.99,
                transactionId: 'TXN_' + Date.now(),
                status: 'completed',
                watchProgress: 75,
                lastWatched: '2024-03-16',
                favorite: true
            },
            {
                id: 2,
                videoId: 2,
                video: this.videos[1],
                purchaseDate: '2024-03-14',
                price: 14.99,
                transactionId: 'TXN_' + (Date.now() - 86400000),
                status: 'completed',
                watchProgress: 45,
                lastWatched: '2024-03-15',
                favorite: false
            }
        ];

        // Mock favorites
        this.favorites = [1, 4];
    }

    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', this.handleSearch.bind(this));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Filter events
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', this.handleApplyFilters.bind(this));
        }

        // View toggle
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', this.toggleView.bind(this));
        }

        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.addEventListener('click', () => this.setView('grid'));
            listViewBtn.addEventListener('click', () => this.setView('list'));
        }

        // Purchase events
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

        const preferencesForm = document.getElementById('preferencesForm');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', this.handlePreferencesUpdate.bind(this));
        }

        const notificationForm = document.getElementById('notificationForm');
        if (notificationForm) {
            notificationForm.addEventListener('submit', this.handleNotificationUpdate.bind(this));
        }

        // Video player events
        this.bindVideoPlayerEvents();

        // Share functionality
        const shareBtn = document.getElementById('shareBtn');
        const copyUrlBtn = document.getElementById('copyUrl');
        if (shareBtn) {
            shareBtn.addEventListener('click', this.handleShare.bind(this));
        }
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', this.handleCopyUrl.bind(this));
        }

        // Load more videos
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', this.handleLoadMore.bind(this));
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'dashboard.html':
                this.loadDashboardPage();
                break;
            case 'browse.html':
                this.loadBrowsePage();
                break;
            case 'purchases.html':
                this.loadPurchasesPage();
                break;
            case 'profile.html':
                this.loadProfilePage();
                break;
            case 'video-player.html':
                this.loadVideoPlayerPage();
                break;
        }
    }

    loadDashboardPage() {
        this.renderPurchaseStats();
        this.renderRecentPurchases();
        this.renderFeaturedVideos();
        this.renderContinueWatching();
        this.initializeDashboardCharts();
    }

    loadBrowsePage() {
        this.renderFeaturedVideos();
        this.renderVideosGrid();
        this.updateVideoCount();
    }

    loadPurchasesPage() {
        this.renderPurchaseStats();
        this.renderRecentPurchases();
        this.renderPurchasedVideos();
    }

    loadProfilePage() {
        this.loadProfileData();
    }

    loadVideoPlayerPage() {
        this.loadCurrentVideo();
        this.loadVideoComments();
        this.loadRelatedVideos();
    }

    renderFeaturedVideos() {
        const container = document.getElementById('featuredVideos');
        if (!container) return;

        const featuredVideos = this.videos.filter(video => video.featured);
        container.innerHTML = '';

        featuredVideos.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';
            col.innerHTML = this.createVideoCard(video, true);
            container.appendChild(col);
        });
    }

    renderVideosGrid() {
        const container = document.getElementById('videosGrid');
        if (!container) return;

        container.innerHTML = '';

        this.videos.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
            col.innerHTML = this.createVideoCard(video);
            container.appendChild(col);
        });
    }

    createVideoCard(video, featured = false) {
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
                    <p class="video-creator">By ${video.creator}</p>
                    <div class="video-stats">
                        <small class="text-muted">
                            <i class="fas fa-eye me-1"></i>${video.views.toLocaleString()} views
                            <i class="fas fa-star me-1 ms-2"></i>${video.rating}
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
        const totalVideos = document.getElementById('totalVideos');
        const totalSpent = document.getElementById('totalSpent');
        const totalWatchTime = document.getElementById('totalWatchTime');
        const favoriteVideos = document.getElementById('favoriteVideos');

        if (totalVideos) totalVideos.textContent = this.purchases.length;
        if (totalSpent) {
            const total = this.purchases.reduce((sum, p) => sum + p.price, 0);
            totalSpent.textContent = '$' + total.toFixed(2);
        }
        if (totalWatchTime) {
            // Calculate total watch time based on progress
            const totalMinutes = this.purchases.reduce((sum, p) => {
                const videoDuration = this.parseDuration(p.video.duration);
                return sum + (videoDuration * p.watchProgress / 100);
            }, 0);
            totalWatchTime.textContent = (totalMinutes / 60).toFixed(1) + ' hrs';
        }
        if (favoriteVideos) {
            favoriteVideos.textContent = this.purchases.filter(p => p.favorite).length;
        }
    }

    renderRecentPurchases() {
        const container = document.getElementById('recentPurchases');
        if (!container) return;

        const recentPurchases = this.purchases.slice(0, 3);
        container.innerHTML = '';

        recentPurchases.forEach(purchase => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            col.innerHTML = this.createVideoCard(purchase.video);
            container.appendChild(col);
        });
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
                    <td>${purchase.video.creator}</td>
                    <td>${purchase.video.duration}</td>
                    <td>${purchase.purchaseDate}</td>
                    <td>$${purchase.price.toFixed(2)}</td>
                    <td>
                        <span class="badge bg-${purchase.watchProgress > 0 ? 'success' : 'secondary'}">
                            ${purchase.watchProgress > 0 ? 'Watched' : 'Unwatched'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" onclick="viewerManager.playVideo(${purchase.videoId})">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="viewerManager.showVideoOptions(${purchase.id})">
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
        return `
            <div class="card video-card h-100">
                <div class="video-thumbnail">
                    <img src="${purchase.video.thumbnail}" class="card-img-top" alt="${purchase.video.title}">
                    <div class="video-duration">${purchase.video.duration}</div>
                    <div class="video-overlay" onclick="viewerManager.playVideo(${purchase.videoId})">
                        <i class="fas fa-play fa-2x"></i>
                    </div>
                    <div class="watch-progress">
                        <div class="progress" style="height: 4px;">
                            <div class="progress-bar" style="width: ${purchase.watchProgress}%"></div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="video-title">${purchase.video.title}</h6>
                    <p class="video-creator">By ${purchase.video.creator}</p>
                    <div class="video-stats">
                        <small class="text-muted">
                            Purchased: ${purchase.purchaseDate}<br>
                            Progress: ${purchase.watchProgress}%
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-sm btn-primary" onclick="viewerManager.playVideo(${purchase.videoId})">
                            <i class="fas fa-play me-1"></i>Watch
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewerManager.showVideoOptions(${purchase.id})">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showVideoPreview(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        // Populate preview modal
        document.getElementById('previewTitle').textContent = 'Video Preview';
        document.getElementById('previewVideoTitle').textContent = video.title;
        document.getElementById('previewCreator').textContent = video.creator;
        document.getElementById('previewDuration').textContent = video.duration;
        document.getElementById('previewCategory').textContent = video.category;
        document.getElementById('previewRating').innerHTML = this.createRatingStars(video.rating);
        document.getElementById('previewPrice').textContent = video.price.toFixed(2);
        document.getElementById('previewDescription').textContent = video.description;
        document.getElementById('previewThumbnail').src = video.thumbnail;

        // Store current video for purchase
        this.currentVideo = video;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('videoPreviewModal'));
        modal.show();
    }

    showPurchaseModal(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        // Populate purchase modal
        document.getElementById('purchaseVideoTitle').textContent = video.title;
        document.getElementById('purchaseCreator').textContent = video.creator;
        document.getElementById('purchasePrice').textContent = video.price.toFixed(2);
        document.getElementById('totalPrice').textContent = (video.price + 0.99).toFixed(2);

        // Store current video for purchase
        this.currentVideo = video;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
        modal.show();
    }

    handlePurchaseFromPreview() {
        if (this.currentVideo) {
            const previewModal = bootstrap.Modal.getInstance(document.getElementById('videoPreviewModal'));
            previewModal.hide();
            
            setTimeout(() => {
                this.showPurchaseModal(this.currentVideo.id);
            }, 300);
        }
    }

    handleConfirmPurchase() {
        if (!this.currentVideo) return;

        const loaderId = window.commonUtils.showLoading('Processing payment...');

        // Simulate payment processing
        setTimeout(() => {
            // Add to purchases
            const newPurchase = {
                id: this.purchases.length + 1,
                videoId: this.currentVideo.id,
                video: this.currentVideo,
                purchaseDate: new Date().toISOString().split('T')[0],
                price: this.currentVideo.price,
                transactionId: 'TXN_' + Date.now(),
                status: 'completed',
                watchProgress: 0,
                lastWatched: null,
                favorite: false
            };

            this.purchases.push(newPurchase);

            // Hide purchase modal
            const purchaseModal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
            purchaseModal.hide();

            window.commonUtils.hideLoading(loaderId);
            window.commonUtils.showToast('Purchase successful! Starting video...', 'success');

            // Update UI
            this.renderVideosGrid();
            
            // Auto-play video after purchase
            setTimeout(() => {
                this.showVideoPlayerModal(this.currentVideo, newPurchase);
            }, 500);

            this.currentVideo = null;

        }, 2000);
    }

    showVideoPlayerModal(video, purchase) {
        if (!video || !purchase) return;

        // Set video information
        document.getElementById('modalVideoTitle').textContent = video.title;
        document.getElementById('modalVideoTitleInfo').textContent = video.title;
        document.getElementById('modalVideoCreator').textContent = video.creator;
        document.getElementById('modalVideoViews').textContent = video.views.toLocaleString();
        document.getElementById('modalVideoDate').textContent = window.commonUtils.formatDate(video.uploadDate);
        document.getElementById('modalVideoDescription').textContent = video.description;
        document.getElementById('modalLikeCount').textContent = video.likes;

        // Set video source (demo)
        const modalVideo = document.getElementById('modalVideo');
        modalVideo.poster = video.thumbnail;
        modalVideo.src = `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`;

        // Update progress
        this.updateModalWatchProgress(purchase.watchProgress);

        // Bind modal video events
        this.bindModalVideoEvents();

        // Load related videos
        this.loadModalRelatedVideos(video.id);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('videoPlayerModal'));
        modal.show();

        this.currentVideo = video;
        this.currentPurchase = purchase;
    }

    bindModalVideoEvents() {
        const modalVideo = document.getElementById('modalVideo');
        const modalLikeBtn = document.getElementById('modalLikeBtn');
        const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
        const modalShareBtn = document.getElementById('modalShareBtn');
        const modalSaveNotes = document.getElementById('modalSaveNotes');

        // Unbind existing events
        modalVideo.removeEventListener('timeupdate', this.updateModalProgress.bind(this));
        modalVideo.removeEventListener('loadedmetadata', this.updateModalDuration.bind(this));

        // Bind new events
        modalVideo.addEventListener('timeupdate', this.updateModalProgress.bind(this));
        modalVideo.addEventListener('loadedmetadata', this.updateModalDuration.bind(this));

        // Bind action buttons
        if (modalLikeBtn) modalLikeBtn.onclick = () => this.toggleModalLike();
        if (modalFavoriteBtn) modalFavoriteBtn.onclick = () => this.toggleModalFavorite();
        if (modalShareBtn) modalShareBtn.onclick = () => this.handleModalShare();
        if (modalSaveNotes) modalSaveNotes.onclick = () => this.saveModalNotes();
    }

    updateModalProgress() {
        const modalVideo = document.getElementById('modalVideo');
        if (!modalVideo) return;

        const progress = (modalVideo.currentTime / modalVideo.duration) * 100;
        this.updateModalWatchProgress(progress);

        // Update time displays
        document.getElementById('modalWatchedTime').textContent = this.formatTime(modalVideo.currentTime);
        
        // Update progress percentage
        const progressPercent = document.getElementById('modalProgressPercent');
        if (progressPercent) {
            progressPercent.textContent = Math.round(progress) + '%';
        }
    }

    updateModalDuration() {
        const modalVideo = document.getElementById('modalVideo');
        if (!modalVideo) return;
        document.getElementById('modalTotalTime').textContent = this.formatTime(modalVideo.duration);
    }

    updateModalWatchProgress(progress) {
        const progressBar = document.getElementById('modalWatchProgress');
        if (progressBar) {
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
        
        // Update progress percentage display
        const progressPercent = document.getElementById('modalProgressPercent');
        if (progressPercent) {
            progressPercent.textContent = Math.round(Math.min(progress, 100)) + '%';
        }
    }

    loadModalRelatedVideos(currentVideoId) {
        const container = document.getElementById('modalRelatedVideos');
        const countElement = document.getElementById('relatedVideosCount');
        if (!container) return;

        const relatedVideos = this.videos.filter(v => v.id !== currentVideoId).slice(0, 4);
        container.innerHTML = '';
        
        if (countElement) {
            countElement.textContent = relatedVideos.length;
        }

        relatedVideos.forEach(video => {
            const isPurchased = this.purchases.some(p => p.videoId === video.id);
            const videoItem = document.createElement('div');
            videoItem.className = 'related-video-item cursor-pointer';
            videoItem.innerHTML = `
                <img src="${video.thumbnail}" class="related-video-thumbnail" alt="${video.title}">
                <div class="related-video-info">
                    <div class="related-video-title">${video.title}</div>
                    <div class="related-video-creator">${video.creator}</div>
                    <div class="related-video-duration">${video.duration} ${isPurchased ? '• Owned' : '• $' + video.price.toFixed(2)}</div>
                </div>
            `;
            
            videoItem.addEventListener('click', () => {
                if (isPurchased) {
                    const purchase = this.purchases.find(p => p.videoId === video.id);
                    this.showVideoPlayerModal(video, purchase);
                } else {
                    // Hide current modal and show purchase modal
                    const currentModal = bootstrap.Modal.getInstance(document.getElementById('videoPlayerModal'));
                    currentModal.hide();
                    setTimeout(() => {
                        this.showPurchaseModal(video.id);
                    }, 300);
                }
            });
            
            container.appendChild(videoItem);
        });

        // Auto-save notes functionality
        const notesTextarea = document.getElementById('modalVideoNotes');
        if (notesTextarea) {
            let saveTimeout;
            notesTextarea.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.autoSaveNotes();
                }, 2000);
            });
        }
    }

    autoSaveNotes() {
        if (!this.currentVideo) return;
        const notes = document.getElementById('modalVideoNotes').value;
        localStorage.setItem(`video_notes_${this.currentVideo.id}`, notes);
        
        // Show a subtle indication that notes are saved
        const saveBtn = document.getElementById('modalSaveNotes');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check me-1"></i>Saved';
            saveBtn.classList.add('btn-success');
            saveBtn.classList.remove('btn-outline-primary');
            
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-outline-primary');
            }, 1500);
        }
    }

    toggleModalLike() {
        if (!this.currentVideo) return;
        this.currentVideo.likes++;
        document.getElementById('modalLikeCount').textContent = this.currentVideo.likes;
        window.commonUtils.showToast('Video liked!', 'success');
    }

    toggleModalFavorite() {
        if (!this.currentVideo) return;
        this.toggleFavorite(this.currentVideo.id);
    }

    handleModalShare() {
        if (!this.currentVideo) return;
        const shareUrl = `${window.location.origin}/viewer/browse.html?video=${this.currentVideo.id}`;
        window.commonUtils.copyToClipboard(shareUrl);
        window.commonUtils.showToast('Video link copied to clipboard!', 'success');
    }

    saveModalNotes() {
        const notes = document.getElementById('modalVideoNotes').value;
        // Save notes to localStorage or send to server
        localStorage.setItem(`video_notes_${this.currentVideo.id}`, notes);
        window.commonUtils.showToast('Notes saved successfully!', 'success');
    }

    playVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        // Check if purchased
        const purchase = this.purchases.find(p => p.videoId === videoId);
        if (!purchase) {
            this.showPurchaseModal(videoId);
            return;
        }

        // Show video in modal
        this.showVideoPlayerModal(video, purchase);
    }

    initializePlayer() {
        if (window.location.pathname.includes('video-player.html')) {
            this.setupVideoPlayer();
        }
    }

    setupVideoPlayer() {
        const videoElement = document.getElementById('mainVideo');
        if (!videoElement) return;

        this.player = videoElement;
        
        // Bind video player events
        this.bindVideoPlayerEvents();
        
        // Load video from URL parameter
        const videoId = window.commonUtils.getQueryParam('video');
        if (videoId) {
            this.loadVideo(parseInt(videoId));
        }
    }

    bindVideoPlayerEvents() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const muteBtn = document.getElementById('muteBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const playbackSpeed = document.getElementById('playbackSpeed');
        const videoQuality = document.getElementById('videoQuality');

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        }

        if (muteBtn) {
            muteBtn.addEventListener('click', this.toggleMute.bind(this));
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        }

        if (playbackSpeed) {
            playbackSpeed.addEventListener('change', this.changePlaybackSpeed.bind(this));
        }

        if (videoQuality) {
            videoQuality.addEventListener('change', this.changeVideoQuality.bind(this));
        }

        // Video element events
        if (this.player) {
            this.player.addEventListener('timeupdate', this.updateProgress.bind(this));
            this.player.addEventListener('loadedmetadata', this.updateDuration.bind(this));
            this.player.addEventListener('play', this.onVideoPlay.bind(this));
            this.player.addEventListener('pause', this.onVideoPause.bind(this));
        }

        // Comment events
        const submitCommentBtn = document.getElementById('submitComment');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', this.submitComment.bind(this));
        }

        // Video actions
        const likeBtn = document.getElementById('likeBtn');
        const favoriteBtn = document.getElementById('favoriteBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        if (likeBtn) likeBtn.addEventListener('click', this.toggleLike.bind(this));
        if (favoriteBtn) favoriteBtn.addEventListener('click', this.toggleVideoFavorite.bind(this));
        if (downloadBtn) downloadBtn.addEventListener('click', this.downloadVideo.bind(this));
    }

    loadVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        const purchase = this.purchases.find(p => p.videoId === videoId);

        if (!video || !purchase) {
            window.commonUtils.showToast('Video not found or not purchased', 'error');
            return;
        }

        // Update video information
        document.getElementById('videoTitle').textContent = video.title;
        document.getElementById('videoCreator').textContent = video.creator;
        document.getElementById('videoViews').textContent = video.views.toLocaleString();
        document.getElementById('videoDate').textContent = window.commonUtils.formatDate(video.uploadDate);
        document.getElementById('videoDuration').textContent = video.duration;
        document.getElementById('videoCategory').textContent = video.category;
        document.getElementById('videoPrice').textContent = video.price.toFixed(2);
        document.getElementById('videoDescription').textContent = video.description;
        document.getElementById('likeCount').textContent = video.likes;

        // Set video source (demo)
        this.player.poster = video.thumbnail;
        this.player.src = `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`;

        // Update progress
        this.updateWatchProgress(purchase.watchProgress);

        this.currentVideo = video;
    }

    togglePlayPause() {
        if (!this.player) return;

        if (this.player.paused) {
            this.player.play();
        } else {
            this.player.pause();
        }
    }

    toggleMute() {
        if (!this.player) return;

        this.player.muted = !this.player.muted;
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.innerHTML = this.player.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        }
    }

    toggleFullscreen() {
        if (!this.player) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.player.requestFullscreen();
        }
    }

    changePlaybackSpeed(e) {
        if (!this.player) return;
        this.player.playbackRate = parseFloat(e.target.value);
    }

    changeVideoQuality(e) {
        // In a real implementation, this would switch video sources
        window.commonUtils.showToast(`Video quality changed to ${e.target.value}`, 'info');
    }

    updateProgress() {
        if (!this.player) return;

        const progress = (this.player.currentTime / this.player.duration) * 100;
        this.updateWatchProgress(progress);

        // Update time displays
        document.getElementById('watchedTime').textContent = this.formatTime(this.player.currentTime);
    }

    updateDuration() {
        if (!this.player) return;
        document.getElementById('totalTime').textContent = this.formatTime(this.player.duration);
    }

    updateWatchProgress(progress) {
        const progressBar = document.getElementById('watchProgress');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }

    onVideoPlay() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    onVideoPause() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    // Filter and Search Methods
    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filteredVideos = this.videos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            video.description.toLowerCase().includes(searchTerm) ||
            video.creator.toLowerCase().includes(searchTerm) ||
            video.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );

        this.renderFilteredVideos(filteredVideos);
        this.updateVideoCount(filteredVideos.length);
    }

    handleApplyFilters() {
        const category = document.getElementById('categoryFilter').value;
        const priceRange = document.getElementById('priceFilter').value;
        const duration = document.getElementById('durationFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        let filteredVideos = [...this.videos];

        // Apply category filter
        if (category) {
            filteredVideos = filteredVideos.filter(video => video.category === category);
        }

        // Apply price filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(p => parseFloat(p) || Infinity);
            filteredVideos = filteredVideos.filter(video => {
                if (max === Infinity) return video.price >= min;
                return video.price >= min && video.price <= max;
            });
        }

        // Apply duration filter
        if (duration) {
            filteredVideos = filteredVideos.filter(video => {
                const videoDuration = this.parseDuration(video.duration);
                if (duration === '0-30') return videoDuration <= 30;
                if (duration === '30-60') return videoDuration > 30 && videoDuration <= 60;
                if (duration === '60+') return videoDuration > 60;
                return true;
            });
        }

        // Apply sorting
        this.sortVideos(filteredVideos, sortBy);

        this.renderFilteredVideos(filteredVideos);
        this.updateVideoCount(filteredVideos.length);
    }

    sortVideos(videos, sortBy) {
        switch (sortBy) {
            case 'newest':
                videos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                break;
            case 'popular':
                videos.sort((a, b) => b.views - a.views);
                break;
            case 'price-low':
                videos.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                videos.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                videos.sort((a, b) => b.rating - a.rating);
                break;
        }
    }

    renderFilteredVideos(videos) {
        const container = document.getElementById('videosGrid');
        if (!container) return;

        container.innerHTML = '';

        if (videos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No videos found</h4>
                    <p class="text-muted">Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        videos.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';
            col.innerHTML = this.createVideoCard(video);
            container.appendChild(col);
        });
    }

    updateVideoCount(count = null) {
        const countElement = document.getElementById('videoCount');
        if (countElement) {
            const total = count !== null ? count : this.videos.length;
            countElement.textContent = `${total} video${total !== 1 ? 's' : ''} found`;
        }
    }

    toggleView() {
        const currentView = document.getElementById('viewToggle').innerHTML.includes('fa-th') ? 'grid' : 'list';
        this.setView(currentView === 'grid' ? 'list' : 'grid');
    }

    setView(view) {
        const gridContainer = document.getElementById('videosGrid');
        const listContainer = document.getElementById('videosList');
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');

        if (view === 'grid') {
            if (gridContainer) gridContainer.classList.remove('d-none');
            if (listContainer) listContainer.classList.add('d-none');
            if (gridViewBtn) gridViewBtn.classList.add('active');
            if (listViewBtn) listViewBtn.classList.remove('active');
        } else {
            if (gridContainer) gridContainer.classList.add('d-none');
            if (listContainer) listContainer.classList.remove('d-none');
            if (gridViewBtn) gridViewBtn.classList.remove('active');
            if (listViewBtn) listViewBtn.classList.add('active');
        }
    }

    // Profile and Settings Methods
    handleProfileUpdate(e) {
        e.preventDefault();
        window.commonUtils.showToast('Profile updated successfully!', 'success');
    }

    handlePasswordChange(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            window.commonUtils.showToast('Passwords do not match!', 'danger');
            return;
        }

        if (newPassword.length < 8) {
            window.commonUtils.showToast('Password must be at least 8 characters long!', 'danger');
            return;
        }

        window.commonUtils.showToast('Password changed successfully!', 'success');
        e.target.reset();
    }

    handlePreferencesUpdate(e) {
        e.preventDefault();
        window.commonUtils.showToast('Preferences updated successfully!', 'success');
    }

    // Dashboard-specific Methods
    renderContinueWatching() {
        const container = document.getElementById('continueWatching');
        if (!container) return;

        // Filter purchases with incomplete progress
        const continueWatchingVideos = this.purchases.filter(p => p.watchProgress < 100).slice(0, 4);
        container.innerHTML = '';

        if (continueWatchingVideos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <i class="fas fa-play fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No videos in progress</p>
                    <a href="browse.html" class="btn btn-primary">Start Watching</a>
                </div>
            `;
            return;
        }

        continueWatchingVideos.forEach(purchase => {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-6 mb-3';
            col.innerHTML = `
                <div class="card video-card h-100">
                    <div class="video-thumbnail position-relative">
                        <img src="${purchase.video.thumbnail}" class="card-img-top" alt="${purchase.video.title}">
                        <div class="video-duration">${purchase.video.duration}</div>
                        <div class="video-progress">
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${purchase.watchProgress}%" 
                                     aria-valuenow="${purchase.watchProgress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                        <div class="video-overlay" onclick="viewerManager.playVideo(${purchase.video.id})">
                            <i class="fas fa-play fa-2x"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${purchase.video.title}</h6>
                        <p class="card-text small text-muted">${purchase.video.creator}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${purchase.watchProgress}% complete</small>
                            <button class="btn btn-sm btn-primary" onclick="viewerManager.playVideo(${purchase.video.id})">
                                <i class="fas fa-play me-1"></i>Continue
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    }

    initializeDashboardCharts() {
        this.initViewingActivityChart();
        this.initCategoriesChart();
    }

    initViewingActivityChart() {
        const ctx = document.getElementById('viewingActivityChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Minutes Watched',
                    data: [45, 62, 38, 85, 72, 96, 54],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' min';
                            }
                        }
                    }
                }
            }
        });
    }

    initCategoriesChart() {
        const ctx = document.getElementById('categoriesChart');
        if (!ctx) return;

        const categoryData = this.purchases.reduce((acc, purchase) => {
            const category = purchase.video.category;
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    handleNotificationUpdate(e) {
        e.preventDefault();
        window.commonUtils.showToast('Notification settings updated successfully!', 'success');
    }

    // Favorite and Social Methods
    toggleFavorite(videoId) {
        const index = this.favorites.indexOf(videoId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            window.commonUtils.showToast('Removed from favorites', 'info');
        } else {
            this.favorites.push(videoId);
            window.commonUtils.showToast('Added to favorites', 'success');
        }
        this.renderVideosGrid();
    }

    toggleVideoFavorite() {
        if (!this.currentVideo) return;
        this.toggleFavorite(this.currentVideo.id);
    }

    toggleLike() {
        if (!this.currentVideo) return;
        // Simulate like toggle
        this.currentVideo.likes++;
        document.getElementById('likeCount').textContent = this.currentVideo.likes;
        window.commonUtils.showToast('Video liked!', 'success');
    }

    handleShare() {
        if (!this.currentVideo) return;

        const shareUrl = `${window.location.origin}/viewer/browse.html?video=${this.currentVideo.id}`;
        document.getElementById('shareUrl').value = shareUrl;

        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }

    handleCopyUrl() {
        const shareUrl = document.getElementById('shareUrl').value;
        window.commonUtils.copyToClipboard(shareUrl);
    }

    downloadVideo() {
        window.commonUtils.showToast('Download feature coming soon!', 'info');
    }

    // Comments Methods
    loadVideoComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        // Mock comments
        const comments = [
            {
                id: 1,
                user: 'John Doe',
                comment: 'Great tutorial! Really helped me understand the concepts.',
                time: '2 hours ago',
                avatar: 'JD'
            },
            {
                id: 2,
                user: 'Jane Smith',
                comment: 'Very detailed explanation. Thanks for sharing!',
                time: '1 day ago',
                avatar: 'JS'
            }
        ];

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            commentDiv.innerHTML = `
                <div class="d-flex">
                    <div class="comment-avatar me-3">
                        ${comment.avatar}
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <strong>${comment.user}</strong>
                            <small class="text-muted">${comment.time}</small>
                        </div>
                        <p class="mb-0">${comment.comment}</p>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentDiv);
        });

        document.getElementById('commentsCount').textContent = comments.length;
    }

    submitComment() {
        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText) return;

        // Simulate comment submission
        window.commonUtils.showToast('Comment added successfully!', 'success');
        document.getElementById('commentText').value = '';
    }

    loadRelatedVideos() {
        const container = document.getElementById('relatedVideos');
        if (!container) return;

        const relatedVideos = this.videos.slice(0, 4);
        container.innerHTML = '';

        relatedVideos.forEach(video => {
            const videoItem = document.createElement('a');
            videoItem.href = `video-player.html?video=${video.id}`;
            videoItem.className = 'related-video-item';
            videoItem.innerHTML = `
                <img src="${video.thumbnail}" class="related-video-thumbnail" alt="${video.title}">
                <div class="related-video-info">
                    <div class="related-video-title">${video.title}</div>
                    <div class="related-video-creator">${video.creator}</div>
                </div>
            `;
            container.appendChild(videoItem);
        });
    }

    // Utility Methods
    createRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let starsHtml = '';

        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star text-warning"></i>';
        }

        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star text-warning"></i>';
        }

        return `${starsHtml} <span class="ms-1">${rating.toFixed(1)}</span>`;
    }

    parseDuration(duration) {
        const parts = duration.split(':');
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes + (seconds / 60);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    showVideoOptions(purchaseId) {
        // Show video options modal
        const modal = new bootstrap.Modal(document.getElementById('videoOptionsModal'));
        modal.show();
    }

    handleLoadMore() {
        window.commonUtils.showToast('Loading more videos...', 'info');
        // Simulate loading more videos
        setTimeout(() => {
            window.commonUtils.showToast('All videos loaded!', 'success');
        }, 1000);
    }

    loadProfileData() {
        // Load and populate profile data
        console.log('Profile data loaded');
    }
}

// Initialize viewer manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.viewerManager = new ViewerManager();
});
