
class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.isInitialized = false;
        this.clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
        this.clientSecret = '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';
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
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
        return new Promise((resolve) => {
            const width = 500;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            const authUrl = `https://accounts.google.com/oauth/authorize?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/youtube')}&` +
                `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube')}&` +
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

    async getMyVideos(maxResults = 50, pageToken = '') {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}`;
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Try to refresh token
                    const refreshed = await this.refreshAccessToken(this.refreshToken);
                    if (refreshed) {
                        // Retry with new token
                        const retryResponse = await fetch(url, {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`
                            }
                        });
                        const retryData = await retryResponse.json();
                        return this.processVideoResponse(retryData);
                    }
                }
                throw new Error(`Failed to get videos: ${response.statusText}`);
            }

            const data = await response.json();
            return this.processVideoResponse(data);
        } catch (error) {
            console.error('Error fetching my videos:', error);
            throw error;
        }
    }

    processVideoResponse(data) {
        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch videos');
        }

        const videos = (data.items || []).map(item => ({
            youtube_id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
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

    async getMyChannelInfo() {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Try to refresh token
                    const refreshed = await this.refreshAccessToken(this.refreshToken);
                    if (refreshed) {
                        // Retry with new token
                        const retryResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`
                            }
                        });
                        const retryData = await retryResponse.json();
                        return this.processChannelResponse(retryData);
                    }
                }
                throw new Error(`Failed to get channel info: ${response.statusText}`);
            }

            const data = await response.json();
            return this.processChannelResponse(data);
        } catch (error) {
            console.error('Error fetching channel info:', error);
            throw error;
        }
    }

    processChannelResponse(data) {
        if (data.error) {
            throw new Error(data.error.message || 'Failed to fetch channel info');
        }

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
    }

    async getVideoDetails(videoIds) {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            if (!Array.isArray(videoIds) || videoIds.length === 0) {
                return [];
            }

            const idsString = videoIds.join(',');
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsString}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get video details: ${response.statusText}`);
            }

            const data = await response.json();

            return (data.items || []).map(item => ({
                youtube_id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                channel_title: item.snippet.channelTitle,
                channel_id: item.snippet.channelId,
                published_at: item.snippet.publishedAt,
                view_count: parseInt(item.statistics.viewCount) || 0,
                like_count: parseInt(item.statistics.likeCount) || 0,
                comment_count: parseInt(item.statistics.commentCount) || 0,
                duration: item.contentDetails.duration
            }));
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    }

    async searchChannels(query, maxResults = 10) {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to search channels: ${response.statusText}`);
            }

            const data = await response.json();

            return (data.items || []).map(item => ({
                channel_id: item.id.channelId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.default?.url
            }));
        } catch (error) {
            console.error('Error searching channels:', error);
            throw error;
        }
    }

    async getVideosByChannelId(channelId, maxResults = 50) {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=${maxResults}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get channel videos: ${response.statusText}`);
            }

            const data = await response.json();
            return this.processVideoResponse(data);
        } catch (error) {
            console.error('Error fetching channel videos:', error);
            throw error;
        }
    }

    async getChannelInfo(channelId) {
        try {
            if (!this.accessToken) {
                await this.loadStoredTokens();
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get channel info: ${response.statusText}`);
            }

            const data = await response.json();
            return this.processChannelResponse(data);
        } catch (error) {
            console.error('Error fetching channel info:', error);
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

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDuration(duration) {
        // Convert ISO 8601 duration to readable format
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

    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }
}

// Create global instance
window.youtubeAPI = new YouTubeAPIClient();
