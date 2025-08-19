/**
 * YouTube Upload Manager for VideoHub
 * Handles video upload to YouTube and database sync
 */

class YouTubeUploadManager {
    constructor() {
        this.apiClient = null;
        this.uploadInProgress = false;
        this.currentUpload = null;
        this.progressCallback = null;
        
        this.init();
    }

    async init() {
        // Wait for YouTube API client to be available
        while (!window.YouTubeAPIClient) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.apiClient = new YouTubeAPIClient();
        await this.apiClient.initialize();
    }

    /**
     * Upload video file to YouTube and sync with database
     */
    async uploadVideo(videoFile, metadata, progressCallback) {
        if (this.uploadInProgress) {
            throw new Error('Upload already in progress');
        }

        this.uploadInProgress = true;
        this.progressCallback = progressCallback;

        try {
            // Step 1: Initialize upload
            this.updateProgress(5, 'Initializing YouTube upload...');
            
            // Check if we have valid tokens
            if (!await this.apiClient.initialize()) {
                // Need to authenticate
                await this.authenticateUser();
            }

            // Step 2: Upload to YouTube
            this.updateProgress(10, 'Starting upload to YouTube...');
            const youtubeVideo = await this.uploadToYouTube(videoFile, metadata);
            
            // Step 3: Sync with database
            this.updateProgress(95, 'Saving video details...');
            const dbVideo = await this.syncToDatabase(youtubeVideo, metadata);
            
            this.updateProgress(100, 'Upload completed successfully!');
            
            return {
                success: true,
                youtube_id: youtubeVideo.id,
                video_id: dbVideo.video_id,
                message: 'Video uploaded successfully to YouTube and synced with database'
            };

        } catch (error) {
            console.error('Upload failed:', error);
            this.updateProgress(0, 'Upload failed: ' + error.message);
            throw error;
        } finally {
            this.uploadInProgress = false;
            this.currentUpload = null;
        }
    }

    /**
     * Upload video file to YouTube using resumable upload
     */
    async uploadToYouTube(videoFile, metadata) {
        const uploadMetadata = {
            snippet: {
                title: metadata.title,
                description: metadata.description || '',
                tags: metadata.tags || [],
                categoryId: this.getCategoryId(metadata.category)
            },
            status: {
                privacyStatus: 'public', // or 'private' based on your needs
                selfDeclaredMadeForKids: false
            }
        };

        // Use resumable upload for large files
        const uploadUrl = await this.initiateResumableUpload(uploadMetadata);
        return await this.performResumableUpload(uploadUrl, videoFile);
    }

    /**
     * Initiate resumable upload session
     */
    async initiateResumableUpload(metadata) {
        const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiClient.accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': 'video/*'
            },
            body: JSON.stringify(metadata)
        });

        if (!response.ok) {
            throw new Error(`Failed to initiate upload: ${response.statusText}`);
        }

        return response.headers.get('Location');
    }

    /**
     * Perform resumable upload with progress tracking
     */
    async performResumableUpload(uploadUrl, videoFile) {
        const chunkSize = 1024 * 1024; // 1MB chunks
        let uploadedBytes = 0;
        
        while (uploadedBytes < videoFile.size) {
            const chunk = videoFile.slice(uploadedBytes, uploadedBytes + chunkSize);
            const isLastChunk = uploadedBytes + chunkSize >= videoFile.size;
            
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Range': `bytes ${uploadedBytes}-${uploadedBytes + chunk.size - 1}/${videoFile.size}`
                },
                body: chunk
            });

            if (response.status === 308) {
                // Continue uploading
                uploadedBytes += chunk.size;
                const progress = Math.round((uploadedBytes / videoFile.size) * 85) + 10; // 10-95%
                this.updateProgress(progress, `Uploading to YouTube... ${Math.round(uploadedBytes / 1024 / 1024)}MB of ${Math.round(videoFile.size / 1024 / 1024)}MB`);
            } else if (response.status === 200 || response.status === 201) {
                // Upload complete
                const result = await response.json();
                this.updateProgress(90, 'Upload to YouTube completed');
                return result;
            } else {
                throw new Error(`Upload failed with status: ${response.status}`);
            }
        }
    }

    /**
     * Sync uploaded video with VideoHub database
     */
    async syncToDatabase(youtubeVideo, metadata) {
        const config = window.videoHubConfig;
        const apiUrl = config ? config.getApiUrl() : '/api';
        
        // Get current user session
        const userSession = JSON.parse(localStorage.getItem('userSession') || sessionStorage.getItem('userSession') || '{}');
        
        const videoData = {
            title: youtubeVideo.snippet.title,
            description: youtubeVideo.snippet.description,
            user_id: userSession.id || 7, // fallback to default creator
            price: parseFloat(metadata.price) || 0,
            category: metadata.category || '',
            youtube_id: youtubeVideo.id,
            thumbnail: youtubeVideo.snippet.thumbnails?.medium?.url || youtubeVideo.snippet.thumbnails?.default?.url,
            channel_id: youtubeVideo.snippet.channelId,
            channel_title: youtubeVideo.snippet.channelTitle,
            status: 'active'
        };

        const response = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'youtube_upload',
                ...videoData
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to sync with database: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Authenticate user with YouTube
     */
    async authenticateUser() {
        const config = window.videoHubConfig;
        const baseUrl = config ? config.basePath : '';
        
        // Redirect to OAuth handler
        const redirectUrl = `${baseUrl}/oauth-handler.php`;
        const authUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${this.apiClient.clientId}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin + redirectUrl)}&` +
            `scope=${encodeURIComponent(this.apiClient.scope)}&` +
            `response_type=code&` +
            `access_type=offline&` +
            `prompt=consent`;

        // Save current state
        sessionStorage.setItem('youtube_auth_return_url', window.location.href);
        
        // Redirect to auth
        window.location.href = authUrl;
    }

    /**
     * Get YouTube category ID from category name
     */
    getCategoryId(category) {
        const categories = {
            'education': '27',
            'technology': '28',
            'business': '25',
            'entertainment': '24',
            'music': '10',
            'news': '25',
            'gaming': '20',
            'sports': '17'
        };
        
        return categories[category?.toLowerCase()] || '22'; // Default to People & Blogs
    }

    /**
     * Update upload progress
     */
    updateProgress(percentage, message) {
        if (this.progressCallback) {
            this.progressCallback({
                percentage: Math.min(100, Math.max(0, percentage)),
                message: message
            });
        }
    }

    /**
     * Cancel current upload
     */
    cancelUpload() {
        if (this.currentUpload) {
            // YouTube doesn't support upload cancellation directly
            // We can only stop our progress tracking
            this.uploadInProgress = false;
            this.currentUpload = null;
            this.updateProgress(0, 'Upload cancelled');
        }
    }
}

// Export to global scope
window.YouTubeUploadManager = YouTubeUploadManager;