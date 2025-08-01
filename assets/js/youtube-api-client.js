/**
 * YouTube Data API v3 Client for VideoHub
 * Handles authentication, token management, video upload, and metadata sync
 */
class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.isInitialized = false;
        this.clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
        this.clientSecret = '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';
        this.apiKey = 'AIzaSyBqDXoJu_8YyOh8i6r8VnHgOcBgfKGrxjo'; // Your YouTube API key
        this.scope = 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload';
    }

    /**
     * Initialize the YouTube API client
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            const success = await this.loadStoredTokens();
            this.isInitialized = true;
            console.log('YouTube API client initialized');
            return success;
        } catch (error) {
            console.error('Failed to initialize YouTube API:', error);
            return false;
        }
    }

    /**
     * Load stored tokens from the server
     */
    async loadStoredTokens() {
        try {
            const response = await fetch('api/youtube_tokens.php?action=get_tokens', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.log('No stored tokens found');
                return false;
            }

            const result = await response.json();

            if (result.success && result.tokens) {
                this.accessToken = result.tokens.access_token;
                this.refreshToken = result.tokens.refresh_token;
                this.tokenExpiry = new Date(result.tokens.expires_at);

                // Check if token is expired and refresh if needed
                if (this.isTokenExpired()) {
                    return await this.refreshAccessToken();
                }

                return true;
            } else if (result.expired && result.refresh_token) {
                console.log('Token expired, attempting refresh...');
                this.refreshToken = result.refresh_token;
                return await this.refreshAccessToken();
            }

            return false;
        } catch (error) {
            console.error('Error loading stored tokens:', error);
            return false;
        }
    }

    /**
     * Check if the current access token is expired
     */
    isTokenExpired() {
        if (!this.tokenExpiry) return true;
        return new Date() >= this.tokenExpiry;
    }

    /**
     * Refresh the access token using the refresh token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            console.error('No refresh token available');
            return false;
        }

        try {
            const response = await fetch('api/youtube_tokens.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            const result = await response.json();

            if (result.success && result.tokens) {
                this.accessToken = result.tokens.access_token;
                this.refreshToken = result.tokens.refresh_token;
                // Set expiry to 1 hour from now (YouTube access tokens expire in 1 hour)
                this.tokenExpiry = new Date(Date.now() + 3600000);
                console.log('Access token refreshed successfully');
                return true;
            } else {
                console.error('Token refresh failed:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Ensure we have a valid access token
     */
    async ensureValidToken() {
        if (!this.accessToken || this.isTokenExpired()) {
            if (!await this.refreshAccessToken()) {
                throw new Error('Unable to obtain valid access token');
            }
        }
        return true;
    }

    /**
     * Make an authenticated API request to YouTube
     */
    async makeYouTubeAPIRequest(url, options = {}) {
        await this.ensureValidToken();

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token might be expired, try to refresh once more
            console.log('Received 401, attempting token refresh...');
            if (await this.refreshAccessToken()) {
                headers.Authorization = `Bearer ${this.accessToken}`;
                return fetch(url, { ...options, headers });
            }
            throw new Error('Authentication failed - unable to refresh token');
        }

        return response;
    }

    /**
     * Sign in to YouTube (OAuth flow)
     */
    async signIn() {
        return new Promise((resolve) => {
            const width = 500;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/youtube')}&` +
                `scope=${encodeURIComponent(this.scope)}&` +
                `response_type=code&` +
                `access_type=offline&` +
                `prompt=consent`;

            const popup = window.open(
                authUrl,
                'youtube_auth',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
            );

            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    this.loadStoredTokens().then(success => {
                        resolve(success);
                    });
                }
            }, 1000);

            // Listen for messages from the OAuth callback
            window.addEventListener('message', async (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
                    clearInterval(checkClosed);
                    popup.close();
                    const success = await this.loadStoredTokens();
                    resolve(success);
                } else if (event.data.type === 'YOUTUBE_AUTH_ERROR') {
                    clearInterval(checkClosed);
                    popup.close();
                    resolve(false);
                }
            });
        });
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return this.accessToken !== null && !this.isTokenExpired();
    }

    /**
     * Sign out from YouTube
     */
    async signOut() {
        try {
            await fetch('api/youtube_tokens.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'clear_tokens'
                })
            });

            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpiry = null;
            return true;
        } catch (error) {
            console.error('Sign out failed:', error);
            return false;
        }
    }

    /**
     * Upload video to YouTube
     */
    async uploadVideo(videoFile, metadata, progressCallback = null) {
        try {
            await this.ensureValidToken();

            if (!videoFile || !videoFile.type.startsWith('video/')) {
                throw new Error('Invalid video file');
            }

            // Step 1: Initialize resumable upload
            const initPayload = {
                snippet: {
                    title: metadata.title || 'Untitled Video',
                    description: metadata.description || '',
                    tags: metadata.tags || [],
                    categoryId: metadata.categoryId || '22' // People & Blogs
                },
                status: {
                    privacyStatus: metadata.privacy || 'private',
                    embeddable: true,
                    license: 'youtube'
                }
            };

            const initResponse = await this.makeYouTubeAPIRequest(
                'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
                {
                    method: 'POST',
                    headers: {
                        'X-Upload-Content-Length': videoFile.size.toString(),
                        'X-Upload-Content-Type': videoFile.type
                    },
                    body: JSON.stringify(initPayload)
                }
            );

            if (!initResponse.ok) {
                const error = await initResponse.json();
                throw new Error(`Upload initialization failed: ${error.error?.message || initResponse.statusText}`);
            }

            const uploadUrl = initResponse.headers.get('Location');
            if (!uploadUrl) {
                throw new Error('No upload URL received from YouTube');
            }

            // Step 2: Upload the video file in chunks
            const chunkSize = 256 * 1024; // 256KB chunks
            let uploadedBytes = 0;
            const totalBytes = videoFile.size;

            while (uploadedBytes < totalBytes) {
                const chunk = videoFile.slice(uploadedBytes, Math.min(uploadedBytes + chunkSize, totalBytes));
                const chunkEnd = uploadedBytes + chunk.size - 1;

                const chunkResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Length': chunk.size.toString(),
                        'Content-Range': `bytes ${uploadedBytes}-${chunkEnd}/${totalBytes}`
                    },
                    body: chunk
                });

                if (chunkResponse.status === 308) {
                    // Continue uploading
                    const range = chunkResponse.headers.get('Range');
                    if (range) {
                        uploadedBytes = parseInt(range.split('-')[1]) + 1;
                    } else {
                        uploadedBytes += chunk.size;
                    }
                } else if (chunkResponse.status === 200 || chunkResponse.status === 201) {
                    // Upload complete
                    const result = await chunkResponse.json();

                    // Step 3: Sync with our database
                    await this.syncVideoToDatabase(result);

                    return {
                        success: true,
                        video: result,
                        youtube_id: result.id,
                        message: 'Video uploaded successfully'
                    };
                } else {
                    const error = await chunkResponse.text();
                    throw new Error(`Upload failed: ${error}`);
                }

                // Report progress
                if (progressCallback) {
                    const progress = Math.round((uploadedBytes / totalBytes) * 100);
                    progressCallback(progress);
                }
            }

        } catch (error) {
            console.error('Video upload failed:', error);
            throw error;
        }
    }

    /**
     * Sync uploaded video metadata with our database
     */
    async syncVideoToDatabase(youtubeVideo) {
        try {
            const videoData = {
                title: youtubeVideo.snippet.title,
                description: youtubeVideo.snippet.description,
                youtube_id: youtubeVideo.id,
                youtube_thumbnail: youtubeVideo.snippet.thumbnails?.medium?.url || youtubeVideo.snippet.thumbnails?.default?.url,
                youtube_channel_id: youtubeVideo.snippet.channelId,
                youtube_channel_title: youtubeVideo.snippet.channelTitle,
                youtube_views: 0,
                youtube_likes: 0,
                youtube_comments: 0,
                is_youtube_synced: true,
                price: 0, // Default price
                category: 'youtube'
            };

            const response = await fetch('api/videos.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(videoData)
            });

            const result = await response.json();

            if (!result.success) {
                console.error('Failed to sync video to database:', result.message);
            }

            return result.success;
        } catch (error) {
            console.error('Database sync failed:', error);
            return false;
        }
    }

    /**
     * Get my YouTube channel information
     */
    async getMyChannelInfo() {
        try {
            const response = await this.makeYouTubeAPIRequest(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true'
            );

            if (!response.ok) {
                throw new Error(`Failed to get channel info: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                return {
                    channel_id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnail: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
                    subscriber_count: parseInt(channel.statistics.subscriberCount) || 0,
                    video_count: parseInt(channel.statistics.videoCount) || 0,
                    view_count: parseInt(channel.statistics.viewCount) || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching channel info:', error);
            throw error;
        }
    }

    /**
     * Get my YouTube videos
     */
    async getMyVideos(maxResults = 50, pageToken = '') {
        try {
            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`;
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await this.makeYouTubeAPIRequest(url);

            if (!response.ok) {
                throw new Error(`Failed to get videos: ${response.statusText}`);
            }

            const data = await response.json();
            return this.processVideoResponse(data);
        } catch (error) {
            console.error('Error fetching my videos:', error);
            throw error;
        }
    }

    /**
     * Get detailed video statistics
     */
    async getVideoDetails(videoIds) {
        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return [];
        }

        try {
            const chunks = [];
            for (let i = 0; i < videoIds.length; i += 50) {
                chunks.push(videoIds.slice(i, i + 50));
            }

            const allVideos = [];
            for (const chunk of chunks) {
                const response = await this.makeYouTubeAPIRequest(
                    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}`
                );

                if (!response.ok) {
                    console.error(`Failed to get video details: ${response.statusText}`);
                    continue;
                }

                const data = await response.json();
                const videos = (data.items || []).map(item => ({
                    youtube_id: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                    channel_title: item.snippet.channelTitle,
                    channel_id: item.snippet.channelId,
                    published_at: item.snippet.publishedAt,
                    view_count: parseInt(item.statistics.viewCount) || 0,
                    like_count: parseInt(item.statistics.likeCount) || 0,
                    comment_count: parseInt(item.statistics.commentCount) || 0,
                    duration: item.contentDetails.duration
                }));

                allVideos.push(...videos);
            }

            return allVideos;
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }

    /**
     * Process video response from YouTube API
     */
    processVideoResponse(data) {
        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch videos');
        }

        const videos = (data.items || []).map(item => ({
            youtube_id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            channel_title: item.snippet.channelTitle,
            channel_id: item.snippet.channelId,
            published_at: item.snippet.publishedAt,
            view_count: 0, // Will be populated by getVideoDetails if needed
            like_count: 0,
            comment_count: 0
        }));

        return {
            videos: videos,
            nextPageToken: data.nextPageToken || null
        };
    }

    /**
     * Utility: Format numbers (1000 -> 1K, 1000000 -> 1M)
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Utility: Format ISO 8601 duration to readable format
     */
    formatDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return '';

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Generate YouTube video URL
     */
    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    /**
     * Generate embed HTML
     */
    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }
}

// Create global instance
window.youtubeAPI = new YouTubeAPIClient();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.youtubeAPI.initialize().catch(console.error);
});