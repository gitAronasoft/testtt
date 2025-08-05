
/**
 * YouTube Data API v3 Client for VideoHub
 * Handles authentication, token management, video upload, and metadata sync
 */
class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
        this.clientSecret = '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';
        this.scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
        this.isInitialized = false;

        // Initialize tokens from server
        this.initialize();
    }

    /**
     * Initialize the YouTube API client
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            await this.initializeTokens();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize YouTube API client:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Initialize tokens from database
     */
    async initializeTokens() {
        // Prevent multiple simultaneous calls
        if (this.initializingTokens) {
            // Wait for existing initialization to complete
            while (this.initializingTokens) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.initializingTokens = true;

        try {
            const response = await fetch('api/youtube_tokens.php?action=get_tokens', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.accessToken = data.tokens.access_token;
                this.refreshToken = data.tokens.refresh_token;
                this.tokenExpiry = new Date(data.tokens.expires_at);
                console.log('YouTube tokens initialized successfully');
            } else if (data.expired && data.refresh_token) {
                // Token expired, try to refresh
                console.log('Token expired, attempting refresh...');
                await this.refreshAccessToken(data.refresh_token);
            } else {
                console.log('No valid tokens found');
            }
        } catch (error) {
            console.error('Failed to initialize tokens:', error);
        } finally {
            this.initializingTokens = false;
        }
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry;
    }

    /**
     * Sign in to YouTube
     */
    async signIn() {
        return new Promise((resolve) => {
            const redirectUri = encodeURIComponent(window.location.origin + '/oauth/youtube');
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${redirectUri}&` +
                `scope=${encodeURIComponent(this.scope)}&` +
                `response_type=code&` +
                `access_type=offline&` +
                `prompt=consent`;

            const popup = window.open(authUrl, 'youtube-auth', 'width=500,height=600');

            const messageHandler = (event) => {
                if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    this.initializeTokens().then(() => resolve(true));
                } else if (event.data.type === 'YOUTUBE_AUTH_ERROR') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    console.error('YouTube auth error:', event.data.error);
                    resolve(false);
                }
            };

            window.addEventListener('message', messageHandler);

            // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    resolve(false);
                }
            }, 1000);
        });
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const response = await fetch('api/youtube_tokens.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            const data = await response.json();

            if (data.success) {
                this.accessToken = data.tokens.access_token;
                this.refreshToken = data.tokens.refresh_token;
                this.tokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour from now
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Ensure we have a valid access token
     */
    async ensureValidToken() {
        if (!this.accessToken) {
            throw new Error('No access token available. Please sign in first.');
        }

        if (this.tokenExpiry && new Date() >= this.tokenExpiry) {
            if (this.refreshToken) {
                const refreshed = await this.refreshAccessToken(this.refreshToken);
                if (!refreshed) {
                    throw new Error('Token expired and refresh failed. Please sign in again.');
                }
            } else {
                throw new Error('Token expired and no refresh token available. Please sign in again.');
            }
        }
    }

    /**
     * Make authenticated request to YouTube API
     */
    async makeYouTubeAPIRequest(url, options = {}) {
        await this.ensureValidToken();

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    /**
     * Upload video to YouTube with progress tracking using multipart upload
     */
    async uploadVideo(videoFile, metadata, progressCallback = null) {
        try {
            console.log('Starting video upload to YouTube...');
            await this.ensureValidToken();

            if (!videoFile || !videoFile.type.startsWith('video/')) {
                throw new Error('Invalid video file');
            }

            if (progressCallback) progressCallback(10);

            // Prepare metadata for upload
            const uploadMetadata = {
                snippet: {
                    title: metadata.title || 'Untitled Video',
                    description: metadata.description || '',
                    tags: metadata.tags || [],
                    categoryId: metadata.categoryId || '22'
                },
                status: {
                    privacyStatus: metadata.privacy || 'unlisted',
                    embeddable: true,
                    license: 'youtube'
                }
            };

            if (progressCallback) progressCallback(20);

            // Create multipart request body
            const boundary = "-------314159265358979323846";
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelim = `\r\n--${boundary}--`;

            if (progressCallback) progressCallback(30);

            // Convert file to base64
            const base64Data = await this.fileToBase64(videoFile, (progress) => {
                // Map file conversion progress to 30-70% of total progress
                const mappedProgress = 30 + Math.round((progress / 100) * 40);
                if (progressCallback) progressCallback(mappedProgress);
            });

            if (progressCallback) progressCallback(75);

            // Build multipart request body
            const multipartRequestBody =
                delimiter +
                "Content-Type: application/json\r\n\r\n" +
                JSON.stringify(uploadMetadata) +
                delimiter +
                "Content-Type: video/*\r\n" +
                "Content-Transfer-Encoding: base64\r\n\r\n" +
                base64Data +
                closeDelim;

            if (progressCallback) progressCallback(80);

            // Upload to YouTube
            const response = await fetch(
                "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        "Content-Type": `multipart/related; boundary="${boundary}"`,
                    },
                    body: multipartRequestBody,
                }
            );

            if (progressCallback) progressCallback(90);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload response error:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Upload success:', result);

            if (result.id) {
                // Step 3: Sync with our database
                const syncSuccess = await this.syncVideoToDatabase(result, metadata.price);

                if (progressCallback) progressCallback(100);

                return {
                    success: true,
                    video: result,
                    synced: syncSuccess
                };
            } else {
                throw new Error('Upload failed - no video ID returned');
            }

        } catch (error) {
            console.error('Video upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert file to base64 with progress tracking
     */
    async fileToBase64(file, progressCallback = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onprogress = (event) => {
                if (event.lengthComputable && progressCallback) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    progressCallback(progress);
                }
            };

            reader.onload = function() {
                try {
                    const base64Data = btoa(
                        new Uint8Array(reader.result).reduce(
                            (data, byte) => data + String.fromCharCode(byte),
                            ""
                        )
                    );
                    resolve(base64Data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Sync uploaded video metadata with our database
     */
    async syncVideoToDatabase(youtubeVideo, price = 0) {
        try {
            // Get detailed statistics for the video
            const videoDetails = await this.getVideoDetails([youtubeVideo.id]);
            const detailedVideo = videoDetails[0] || {};

            const videoData = {
                title: youtubeVideo.snippet?.title || 'Untitled',
                description: youtubeVideo.snippet?.description || '',
                youtube_id: youtubeVideo.id,
                youtube_thumbnail: youtubeVideo.snippet?.thumbnails?.medium?.url || youtubeVideo.snippet?.thumbnails?.default?.url,
                youtube_channel_id: youtubeVideo.snippet?.channelId,
                youtube_channel_title: youtubeVideo.snippet?.channelTitle,
                youtube_views: detailedVideo.views || 0,
                youtube_likes: detailedVideo.likes || 0,
                youtube_comments: detailedVideo.comments || 0,
                is_youtube_synced: true,
                price: parseFloat(price) || 0,
                category: 'youtube',
                file_path: ''
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
     * Get user's YouTube channel videos
     */
    async getChannelVideos(maxResults = 50) {
        try {
            const response = await this.makeYouTubeAPIRequest(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch channel videos');
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('Failed to get channel videos:', error);
            return [];
        }
    }

    /**
     * Get detailed video information
     */
    async getVideoDetails(videoIds) {
        try {
            const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;
            const response = await this.makeYouTubeAPIRequest(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch video details');
            }

            const data = await response.json();
            return data.items.map(video => ({
                youtube_id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
                channel_id: video.snippet.channelId,
                channel_title: video.snippet.channelTitle,
                views: parseInt(video.statistics?.viewCount || 0),
                likes: parseInt(video.statistics?.likeCount || 0),
                comments: parseInt(video.statistics?.commentCount || 0)
            }));
        } catch (error) {
            console.error('Failed to get video details:', error);
            return [];
        }
    }

    /**
     * Generate YouTube embed HTML
     */
    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }

    /**
     * Get my videos from YouTube
     */
    async getMyVideos(maxResults = 50) {
        try {
            const response = await this.makeYouTubeAPIRequest(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch videos');
            }

            const data = await response.json();
            return {
                videos: data.items?.map(item => ({
                    youtube_id: item.id.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                    published_at: item.snippet.publishedAt,
                    channel_id: item.snippet.channelId,
                    channel_title: item.snippet.channelTitle
                })) || []
            };
        } catch (error) {
            console.error('Failed to get my videos:', error);
            return { videos: [] };
        }
    }

    /**
     * Get channel information
     */
    async getMyChannelInfo() {
        try {
            const response = await this.makeYouTubeAPIRequest(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true'
            );

            if (!response.ok) {
                throw new Error('Failed to fetch channel info');
            }

            const data = await response.json();
            const channel = data.items?.[0];

            if (channel) {
                return {
                    id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnail: channel.snippet.thumbnails?.medium?.url,
                    subscriber_count: parseInt(channel.statistics?.subscriberCount || 0),
                    video_count: parseInt(channel.statistics?.videoCount || 0),
                    view_count: parseInt(channel.statistics?.viewCount || 0)
                };
            }
            return null;
        } catch (error) {
            console.error('Failed to get channel info:', error);
            return null;
        }
    }

    /**
     * Generate YouTube video URL
     */
    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    /**
     * Format numbers for display
     */
    formatNumber(num) {
        // Handle undefined, null, or non-numeric values
        if (num === undefined || num === null || isNaN(num)) {
            return '0';
        }

        const numValue = parseInt(num) || 0;

        if (numValue >= 1000000) {
            return (numValue / 1000000).toFixed(1) + 'M';
        } else if (numValue >= 1000) {
            return (numValue / 1000).toFixed(1) + 'K';
        }
        return numValue.toString();
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
}

// Initialize YouTube API client (singleton pattern)
if (!window.youtubeAPI) {
    window.youtubeAPI = new YouTubeAPIClient();
}
