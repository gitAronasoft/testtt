class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Load tokens from database
            const success = await this.loadStoredTokens();
            this.isInitialized = true;
            return success;
        } catch (error) {
            console.error('Failed to initialize YouTube API:', error);
            return false;
        }
    }

    async loadStoredTokens() {
        try {
            const response = await fetch('api/youtube_tokens.php?action=get_tokens', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success && result.tokens) {
                const tokens = result.tokens;
                const expiresAt = new Date(tokens.expires_at);

                if (expiresAt > new Date()) {
                    this.accessToken = tokens.access_token;
                    this.refreshToken = tokens.refresh_token;
                    return true;
                } else if (tokens.refresh_token) {
                    return await this.refreshAccessToken(tokens.refresh_token);
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading stored tokens:', error);
            return false;
        }
    }

    async refreshAccessToken(refreshToken) {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com',
                    client_secret: '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',
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const tokenData = await response.json();

            if (tokenData.access_token) {
                this.accessToken = tokenData.access_token;
                this.refreshToken = refreshToken;

                await this.storeTokens({
                    access_token: tokenData.access_token,
                    refresh_token: refreshToken,
                    expires_in: tokenData.expires_in || 3600
                });

                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    async storeTokens(authResponse) {
        try {
            const tokenData = {
                access_token: authResponse.access_token,
                refresh_token: authResponse.refresh_token || this.refreshToken || '',
                expires_at: new Date(Date.now() + (authResponse.expires_in * 1000)).toISOString(),
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
        } catch (error) {
            console.error('Error storing tokens:', error);
        }
    }

    isSignedIn() {
        return this.accessToken !== null;
    }

    async signOut() {
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

    async signIn() {
        // For now, return false since we're using stored tokens
        // In a full implementation, this would handle OAuth flow
        return false;
    }

    async makeAuthenticatedRequest(endpoint, params = {}) {
        if (!this.accessToken) {
            // Try to load tokens first
            await this.loadStoredTokens();
            if (!this.accessToken) {
                throw new Error('No access token available. Please authenticate first.');
            }
        }

        const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.refreshAccessToken(this.refreshToken);
            if (refreshed) {
                response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                });
            } else {
                throw new Error('Authentication failed - please authenticate again');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }

    async getMyChannelInfo() {
        try {
            const response = await this.makeAuthenticatedRequest('channels', {
                part: 'snippet,statistics,brandingSettings',
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
                    country: channel.snippet.country || ''
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching my channel info:', error);
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
                    published_at: channel.snippet.publishedAt
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching channel info:', error);
            throw error;
        }
    }

    async getMyVideos(maxResults = 50, pageToken = '') {
        try {
            const params = {
                part: 'snippet',
                forMine: 'true',
                type: 'video',
                order: 'date',
                maxResults: maxResults
            };

            if (pageToken) {
                params.pageToken = pageToken;
            }

            const response = await this.makeAuthenticatedRequest('search', params);
            const data = await response.json();

            const videos = data.items ? data.items.map(item => ({
                youtube_id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                published_at: item.snippet.publishedAt,
                channel_id: item.snippet.channelId,
                channel_title: item.snippet.channelTitle
            })) : [];

            return {
                videos: videos,
                nextPageToken: data.nextPageToken || null,
                totalResults: data.pageInfo?.totalResults || 0
            };
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
                maxResults: maxResults
            };

            if (pageToken) {
                params.pageToken = pageToken;
            }

            const response = await this.makeAuthenticatedRequest('search', params);
            const data = await response.json();

            const videos = data.items ? data.items.map(item => ({
                youtube_id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                published_at: item.snippet.publishedAt,
                channel_id: item.snippet.channelId,
                channel_title: item.snippet.channelTitle
            })) : [];

            return {
                videos: videos,
                nextPageToken: data.nextPageToken || null,
                totalResults: data.pageInfo?.totalResults || 0
            };
        } catch (error) {
            console.error('Error fetching videos by channel ID:', error);
            throw error;
        }
    }

    async searchChannels(query, maxResults = 25) {
        try {
            const response = await this.makeAuthenticatedRequest('search', {
                part: 'snippet',
                q: query,
                type: 'channel',
                maxResults: maxResults
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

    async getVideoDetails(videoIds) {
        try {
            if (!Array.isArray(videoIds)) {
                videoIds = [videoIds];
            }

            const response = await this.makeAuthenticatedRequest('videos', {
                part: 'snippet,statistics,contentDetails',
                id: videoIds.join(',')
            });

            const data = await response.json();

            return data.items ? data.items.map(item => ({
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
                tags: item.snippet.tags || []
            })) : [];
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }

    formatDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
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

    async fetchVideos(maxResults = 50) {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            if (!this.accessToken) {
                throw new Error('No access token available');
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });

            if (response.status === 401) {
                const refreshed = await this.refreshAccessToken(this.refreshToken);
                if (refreshed) {
                    const retryResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}`, {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`
                        }
                    });
                    const data = await retryResponse.json();
                    return data.items || [];
                } else {
                    throw new Error('Token refresh failed');
                }
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('Error fetching videos:', error);
            throw error;
        }
    }

    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }

    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    async fetchAndDisplayVideos(containerId, videosPerPage = 10) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

            const videos = await this.fetchVideos(50);
            
            if (videos.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No videos found in your YouTube channel.</div>';
                return;
            }

            this.renderVideoGrid(videos, container, videosPerPage);
        } catch (error) {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<div class="alert alert-danger">Failed to load videos: ${error.message}</div>`;
            }
            throw error;
        }
    }

    renderVideoGrid(videos, container, videosPerPage = 10, currentPage = 1) {
        const start = (currentPage - 1) * videosPerPage;
        const end = start + videosPerPage;
        const pageVideos = videos.slice(start, end);
        const totalPages = Math.ceil(videos.length / videosPerPage);

        let html = '<div class="row">';
        
        pageVideos.forEach(video => {
            const { title, description, thumbnails, publishedAt } = video.snippet;
            const videoId = video.id.videoId;
            const thumbnail = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;
            
            html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card video-card h-100">
                        <div class="video-thumbnail position-relative" style="height: 200px; overflow: hidden;">
                            <img src="${thumbnail}" class="card-img-top" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(title)}">
                            <div class="position-absolute top-50 start-50 translate-middle">
                                <button class="btn btn-danger btn-lg rounded-circle" onclick="playYouTubeVideo('${videoId}', '${escapeHtml(title)}')">
                                    <i class="fab fa-youtube"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title">${escapeHtml(title)}</h6>
                            <p class="card-text text-muted small">${escapeHtml(description ? description.substring(0, 100) + (description.length > 100 ? "..." : "") : 'No description')}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${new Date(publishedAt).toLocaleDateString()}</small>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary" onclick="playYouTubeVideo('${videoId}', '${escapeHtml(title)}')">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <button class="btn btn-outline-success" onclick="syncSpecificVideo('${videoId}')">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="btn btn-outline-danger">
                                        <i class="fab fa-youtube"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';

        // Add pagination if needed
        if (totalPages > 1) {
            html += `
                <nav aria-label="Video pagination">
                    <ul class="pagination justify-content-center">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <button class="page-link" onclick="window.youtubeAPI.changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                        </li>
            `;
            
            for (let i = 1; i <= totalPages; i++) {
                html += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <button class="page-link" onclick="window.youtubeAPI.changePage(${i})">${i}</button>
                    </li>
                `;
            }
            
            html += `
                        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                            <button class="page-link" onclick="window.youtubeAPI.changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
                        </li>
                    </ul>
                </nav>
            `;
        }

        container.innerHTML = html;
        
        // Store pagination data
        this.currentVideos = videos;
        this.currentPage = currentPage;
        this.videosPerPage = videosPerPage;
    }

    changePage(page) {
        if (this.currentVideos) {
            const container = document.getElementById('youtubeVideosList');
            if (container) {
                this.renderVideoGrid(this.currentVideos, container, this.videosPerPage, page);
            }
        }
    }
}

// Create global instance
window.youtubeAPI = new YouTubeAPIClient();