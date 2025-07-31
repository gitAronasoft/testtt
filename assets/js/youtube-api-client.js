

class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.isInitialized = false;
        this.clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
        this.clientSecret = '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';
        this.requestQueue = [];
        this.isRefreshing = false;
        this.tokenCheckInterval = null;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            const success = await this.loadStoredTokens();
            this.isInitialized = true;
            
            // Set up automatic token validation
            this.startTokenValidation();
            
            return success;
        } catch (error) {
            console.error('Failed to initialize YouTube API:', error);
            return false;
        }
    }

    startTokenValidation() {
        // Check token validity every 10 minutes
        this.tokenCheckInterval = setInterval(async () => {
            if (this.accessToken) {
                await this.validateCurrentToken();
            }
        }, 10 * 60 * 1000);
    }

    stopTokenValidation() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
        }
    }

    async validateCurrentToken() {
        try {
            const response = await fetch('api/youtube_tokens.php?action=validate_token');
            const result = await response.json();
            
            if (!result.success || !result.valid) {
                console.log('Token validation failed, refreshing...');
                await this.loadStoredTokens();
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }

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
                const tokens = result.tokens;
                this.accessToken = tokens.access_token;
                this.refreshToken = tokens.refresh_token;
                return true;
            } else if (result.expired && result.refresh_token) {
                console.log('Token expired, attempting refresh...');
                return await this.refreshAccessToken(result.refresh_token);
            }
            
            return false;
        } catch (error) {
            console.error('Error loading stored tokens:', error);
            return false;
        }
    }

    async refreshAccessToken(refreshToken) {
        if (this.isRefreshing) {
            return new Promise((resolve) => {
                this.requestQueue.push(resolve);
            });
        }

        this.isRefreshing = true;

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

            const result = await response.json();

            if (result.success && result.tokens) {
                this.accessToken = result.tokens.access_token;
                this.refreshToken = result.tokens.refresh_token;

                this.requestQueue.forEach(resolve => resolve(true));
                this.requestQueue = [];
                
                return true;
            } else {
                console.error('Token refresh failed:', result.message);
                this.requestQueue.forEach(resolve => resolve(false));
                this.requestQueue = [];
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.requestQueue.forEach(resolve => resolve(false));
            this.requestQueue = [];
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    async storeTokens(authResponse) {
        try {
            const tokenData = {
                access_token: authResponse.access_token,
                refresh_token: authResponse.refresh_token || this.refreshToken || '',
                expires_in: authResponse.expires_in || 3600,
                scope: authResponse.scope || 'https://www.googleapis.com/auth/youtube',
                token_type: authResponse.token_type || 'Bearer'
            };

            const response = await fetch('api/youtube_tokens.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'store_tokens',
                    tokens: tokenData
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.error('Failed to store tokens:', result.message);
            }
            return result.success;
        } catch (error) {
            console.error('Error storing tokens:', error);
            return false;
        }
    }

    isSignedIn() {
        return this.accessToken !== null;
    }

    async signOut() {
        this.stopTokenValidation();
        this.accessToken = null;
        this.refreshToken = null;
        await this.clearStoredTokens();
    }

    async clearStoredTokens() {
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
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    async makeAuthenticatedRequest(endpoint, params = {}) {
        // Create cache key for request deduplication
        const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
        const now = Date.now();
        
        // Check if same request was made recently (within 5 seconds)
        if (this.requestCache && this.requestCache[cacheKey] && (now - this.requestCache[cacheKey].timestamp) < 5000) {
            console.log('Using cached request result for:', endpoint);
            return this.requestCache[cacheKey].response;
        }

        // Initialize cache if needed
        if (!this.requestCache) {
            this.requestCache = {};
        }

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            if (!this.accessToken) {
                const loaded = await this.loadStoredTokens();
                if (!loaded) {
                    throw new Error('No access token available. Please authenticate first.');
                }
            }

            const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });

            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.status === 401 && attempts < maxAttempts - 1 && this.refreshToken) {
                    console.log('Token expired, attempting refresh...');
                    const refreshed = await this.refreshAccessToken(this.refreshToken);
                    if (refreshed) {
                        attempts++;
                        continue;
                    }
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                }

                // Cache successful response
                this.requestCache[cacheKey] = {
                    response: response.clone(),
                    timestamp: now
                };

                return response;
            } catch (error) {
                if (attempts === maxAttempts - 1) {
                    throw error;
                }
                attempts++;
            }
        }
    }

    async syncVideoToDatabase(video) {
        try {
            const response = await fetch('api/videos.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'sync_youtube_video',
                    video: video
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Error syncing video to database:', error);
            throw error;
        }
    }

    async getMyChannelInfo() {
        try {
            const response = await this.makeAuthenticatedRequest('channels', {
                part: 'snippet,statistics,brandingSettings,contentDetails',
                mine: 'true'
            });

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                return {
                    channel_id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
                    subscriber_count: parseInt(channel.statistics.subscriberCount) || 0,
                    video_count: parseInt(channel.statistics.videoCount) || 0,
                    view_count: parseInt(channel.statistics.viewCount) || 0,
                    published_at: channel.snippet.publishedAt,
                    custom_url: channel.snippet.customUrl || '',
                    country: channel.snippet.country || '',
                    uploads_playlist: channel.contentDetails?.relatedPlaylists?.uploads
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching my channel info:', error);
            throw error;
        }
    }

    async getMyVideos(maxResults = 50, pageToken = '') {
        try {
            const channelInfo = await this.getMyChannelInfo();
            if (!channelInfo) {
                throw new Error('Could not get channel information');
            }

            return await this.getVideosByChannelId(channelInfo.channel_id, maxResults, pageToken);
        } catch (error) {
            console.error('Error fetching my videos:', error);
            throw error;
        }
    }

    async getVideosByChannelId(channelId, maxResults = 50, pageToken = '') {
        try {
            const params = {
                part: 'snippet',
                channelId: channelId,
                type: 'video',
                order: 'date',
                maxResults: Math.min(maxResults, 50)
            };

            if (pageToken) {
                params.pageToken = pageToken;
            }

            const response = await this.makeAuthenticatedRequest('search', params);
            const data = await response.json();

            if (!data.items) {
                return { videos: [], nextPageToken: null, totalResults: 0 };
            }

            const videoIds = data.items.map(item => item.id.videoId);
            const detailedVideos = await this.getVideoDetails(videoIds);

            // Sync videos to database
            for (const video of detailedVideos) {
                try {
                    await this.syncVideoToDatabase(video);
                } catch (syncError) {
                    console.error('Failed to sync video to database:', syncError);
                }
            }

            return {
                videos: detailedVideos,
                nextPageToken: data.nextPageToken || null,
                totalResults: data.pageInfo?.totalResults || 0
            };
        } catch (error) {
            console.error('Error fetching videos by channel ID:', error);
            throw error;
        }
    }

    async getVideoDetails(videoIds) {
        try {
            if (!Array.isArray(videoIds)) {
                videoIds = [videoIds];
            }

            if (videoIds.length === 0) {
                return [];
            }

            const batchSize = 50;
            const allVideos = [];

            for (let i = 0; i < videoIds.length; i += batchSize) {
                const batch = videoIds.slice(i, i + batchSize);
                
                const response = await this.makeAuthenticatedRequest('videos', {
                    part: 'snippet,statistics,contentDetails,status',
                    id: batch.join(',')
                });

                const data = await response.json();

                if (data.items) {
                    const batchVideos = data.items.map(item => ({
                        youtube_id: item.id,
                        title: item.snippet.title,
                        description: item.snippet.description,
                        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                        published_at: item.snippet.publishedAt,
                        channel_id: item.snippet.channelId,
                        channel_title: item.snippet.channelTitle,
                        duration: item.contentDetails.duration,
                        view_count: parseInt(item.statistics.viewCount) || 0,
                        like_count: parseInt(item.statistics.likeCount) || 0,
                        comment_count: parseInt(item.statistics.commentCount) || 0,
                        tags: item.snippet.tags || [],
                        category_id: item.snippet.categoryId,
                        default_language: item.snippet.defaultLanguage,
                        privacy_status: item.status.privacyStatus,
                        upload_status: item.status.uploadStatus
                    }));
                    
                    allVideos.push(...batchVideos);
                }
            }

            return allVideos;
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }

    async uploadVideo(videoFile, metadata) {
        try {
            if (!this.accessToken) {
                const loaded = await this.loadStoredTokens();
                if (!loaded) {
                    throw new Error('No access token available. Please authenticate first.');
                }
            }

            // Step 1: Initiate resumable upload
            const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Length': videoFile.size.toString(),
                    'X-Upload-Content-Type': videoFile.type
                },
                body: JSON.stringify({
                    snippet: {
                        title: metadata.title,
                        description: metadata.description,
                        tags: metadata.tags || [],
                        categoryId: metadata.categoryId || '22'
                    },
                    status: {
                        privacyStatus: metadata.privacyStatus || 'private'
                    }
                })
            });

            if (!initResponse.ok) {
                throw new Error(`Upload initialization failed: ${initResponse.statusText}`);
            }

            const uploadUrl = initResponse.headers.get('Location');
            if (!uploadUrl) {
                throw new Error('No upload URL received');
            }

            // Step 2: Upload video file
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': videoFile.type
                },
                body: videoFile
            });

            if (!uploadResponse.ok) {
                throw new Error(`Video upload failed: ${uploadResponse.statusText}`);
            }

            const result = await uploadResponse.json();
            
            // Sync uploaded video to database
            const videoData = {
                youtube_id: result.id,
                title: result.snippet.title,
                description: result.snippet.description,
                thumbnail: result.snippet.thumbnails?.default?.url,
                published_at: result.snippet.publishedAt,
                channel_id: result.snippet.channelId,
                channel_title: result.snippet.channelTitle,
                privacy_status: result.status.privacyStatus,
                upload_status: result.status.uploadStatus
            };

            await this.syncVideoToDatabase(videoData);

            return {
                success: true,
                video: result,
                youtube_id: result.id
            };
        } catch (error) {
            console.error('Error uploading video:', error);
            throw error;
        }
    }

    async getChannelInfo(channelId) {
        try {
            const response = await this.makeAuthenticatedRequest('channels', {
                part: 'snippet,statistics',
                id: channelId
            });

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                return {
                    channel_id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
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

    async searchChannels(query, maxResults = 25) {
        try {
            const response = await this.makeAuthenticatedRequest('search', {
                part: 'snippet',
                q: query,
                type: 'channel',
                maxResults: Math.min(maxResults, 50)
            });

            const data = await response.json();

            return data.items ? data.items.map(item => ({
                channel_id: item.snippet.channelId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                published_at: item.snippet.publishedAt
            })) : [];
        } catch (error) {
            console.error('Error searching channels:', error);
            throw error;
        }
    }

    formatDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return '0:00';

        const hours = (match[1] || '').replace('H', '');
        const minutes = (match[2] || '').replace('M', '');
        const seconds = (match[3] || '').replace('S', '');

        if (hours) {
            return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        } else {
            return `${minutes || '0'}:${seconds.padStart(2, '0')}`;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }

    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
}

// Create global instance
window.youtubeAPI = new YouTubeAPIClient();

