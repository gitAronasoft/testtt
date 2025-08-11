/**
 * YouTube Integration for VideoShare platform
 * Handles YouTube Data API v3 integration for video uploads
 */

class YouTubeIntegration {
    constructor() {
        this.apiKey = null;
        this.isApiLoaded = false;
        this.accessToken = null;
        this.init();
    }

    /**
     * Initialize YouTube API
     */
    init() {
        // Load Google APIs client
        if (typeof gapi === 'undefined') {
            this.loadGoogleAPI();
        } else {
            this.initializeAPI();
        }
    }

    /**
     * Load Google API client
     */
    loadGoogleAPI() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            this.initializeAPI();
        };
        document.head.appendChild(script);
    }

    /**
     * Initialize Google API client
     */
    async initializeAPI() {
        try {
            await new Promise((resolve) => {
                gapi.load('client:auth2', resolve);
            });

            // Note: In a real implementation, you would need:
            // 1. A Google Cloud Project with YouTube Data API v3 enabled
            // 2. OAuth 2.0 credentials configured
            // 3. API key for the YouTube Data API
            
            // For now, we'll create a dummy implementation
            this.isApiLoaded = true;
            console.log('YouTube API integration ready (demo mode)');
        } catch (error) {
            console.error('Failed to initialize YouTube API:', error);
        }
    }

    /**
     * Authenticate user with YouTube
     */
    async authenticate() {
        // In a real implementation, this would handle OAuth flow
        return new Promise((resolve) => {
            // Simulate authentication
            setTimeout(() => {
                this.accessToken = 'demo_access_token';
                resolve({
                    success: true,
                    message: 'Authenticated successfully (demo mode)'
                });
            }, 1000);
        });
    }

    /**
     * Upload video to YouTube
     */
    async uploadVideo(videoFile, metadata) {
        if (!this.isApiLoaded) {
            throw new Error('YouTube API not loaded');
        }

        if (!this.accessToken) {
            await this.authenticate();
        }

        // Simulate video upload process
        return new Promise((resolve, reject) => {
            // Show upload progress simulation
            this.simulateUploadProgress(metadata.title);
            
            setTimeout(() => {
                // Generate a demo YouTube video ID
                const youtubeVideoId = 'demo_' + Date.now();
                
                resolve({
                    success: true,
                    videoId: youtubeVideoId,
                    videoUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
                    metadata: {
                        ...metadata,
                        duration: this.getVideoDuration(videoFile),
                        fileSize: videoFile.size
                    }
                });
            }, 3000); // Simulate 3 second upload
        });
    }

    /**
     * Simulate upload progress
     */
    simulateUploadProgress(title) {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-3" role="status">
                            <span class="visually-hidden">Uploading...</span>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="fw-semibold">Uploading "${title}"</span>
                                <span class="small" id="progressPercent">0%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" role="progressbar" id="progressBar" 
                                     style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Simulate progress updates
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(progressInterval);
                }
                
                const progressBar = document.getElementById('progressBar');
                const progressPercent = document.getElementById('progressPercent');
                
                if (progressBar && progressPercent) {
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress);
                    progressPercent.textContent = `${Math.round(progress)}%`;
                }
            }, 200);
        }
    }

    /**
     * Get video duration from file (simplified)
     */
    getVideoDuration(videoFile) {
        // In a real implementation, you would extract actual duration
        // For demo, return a random duration between 5-30 minutes
        return Math.floor(Math.random() * (1800 - 300) + 300); // 5-30 minutes in seconds
    }

    /**
     * Sync uploaded video with VideoShare database
     */
    async syncVideoWithDatabase(youtubeData) {
        try {
            const videoData = {
                title: youtubeData.metadata.title,
                description: youtubeData.metadata.description,
                price: youtubeData.metadata.price,
                youtube_video_id: youtubeData.videoId,
                video_url: youtubeData.videoUrl,
                thumbnail_url: youtubeData.thumbnailUrl,
                duration: youtubeData.metadata.duration,
                file_size: youtubeData.metadata.fileSize,
                category: youtubeData.metadata.category || null,
                tags: youtubeData.metadata.tags || null
            };

            const response = await API.uploadVideo(videoData);
            
            if (response.success) {
                return {
                    success: true,
                    message: 'Video uploaded and synced successfully!',
                    videoId: response.data.video_id,
                    youtubeVideoId: youtubeData.videoId
                };
            } else {
                throw new Error(response.message || 'Failed to sync video with database');
            }
        } catch (error) {
            console.error('Database sync error:', error);
            throw new Error(`Database sync failed: ${error.message}`);
        }
    }

    /**
     * Complete upload process (YouTube + Database sync)
     */
    async completeVideoUpload(videoFile, metadata) {
        try {
            // Step 1: Upload to YouTube
            const youtubeResult = await this.uploadVideo(videoFile, metadata);
            
            if (!youtubeResult.success) {
                throw new Error('YouTube upload failed');
            }

            // Step 2: Sync with VideoShare database
            const syncResult = await this.syncVideoWithDatabase(youtubeResult);
            
            return {
                success: true,
                message: 'Video uploaded successfully to YouTube and synced with VideoShare!',
                youtube: youtubeResult,
                database: syncResult
            };
            
        } catch (error) {
            console.error('Complete upload failed:', error);
            throw error;
        }
    }

    /**
     * Show upload success message
     */
    showUploadSuccess(result) {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-check-circle fa-2x text-success me-3"></i>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">Upload Successful!</h6>
                            <p class="mb-2">Your video has been uploaded to YouTube and is now available on VideoShare.</p>
                            <div class="small text-success">
                                <strong>YouTube Video ID:</strong> ${result.youtube.videoId}<br>
                                <strong>Database ID:</strong> ${result.database.videoId}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <a href="creator-videos.html" class="btn btn-success btn-sm me-2">
                            <i class="fas fa-video me-1"></i>View My Videos
                        </a>
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                            <i class="fas fa-plus me-1"></i>Upload Another Video
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Show upload error message
     */
    showUploadError(error) {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="alert alert-danger">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-exclamation-triangle fa-2x text-danger me-3"></i>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">Upload Failed</h6>
                            <p class="mb-0">${error.message}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                            <i class="fas fa-refresh me-1"></i>Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Initialize YouTube integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.youtubeIntegration = new YouTubeIntegration();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeIntegration;
}