/**
 * YouTube Data API v3 Client for VideoHub
 * Handles authentication, token management, video upload, and metadata sync
 */
class YouTubeAPIClient {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
        this.apiKey = '';
        this.clientId = '';
    }

    async initialize() {
        try {
            // Mock initialization for demo purposes
            this.isInitialized = true;
            console.log('YouTube API initialized (demo mode)');
            return true;
        } catch (error) {
            console.error('YouTube API initialization failed:', error);
            return false;
        }
    }

    isSignedIn() {
        return this.isSignedIn;
    }

    async signIn() {
        try {
            // Mock sign in for demo
            this.isSignedIn = true;
            return true;
        } catch (error) {
            console.error('YouTube sign in failed:', error);
            return false;
        }
    }

    async signOut() {
        try {
            this.isSignedIn = false;
            return true;
        } catch (error) {
            console.error('YouTube sign out failed:', error);
            return false;
        }
    }

    async getMyVideos(maxResults = 50) {
        // Mock data for demo
        return {
            videos: []
        };
    }

    async getVideoDetails(videoIds) {
        // Mock video details
        return videoIds.map(id => ({
            youtube_id: id,
            title: 'Sample Video',
            description: 'Sample description',
            thumbnail: 'https://img.youtube.com/vi/' + id + '/maxresdefault.jpg',
            view_count: Math.floor(Math.random() * 10000),
            like_count: Math.floor(Math.random() * 1000),
            comment_count: Math.floor(Math.random() * 100),
            published_at: new Date().toISOString(),
            channel_id: 'UC_sample',
            channel_title: 'Sample Channel'
        }));
    }

    async getMyChannelInfo() {
        return {
            title: 'Demo Channel',
            description: 'Demo channel description',
            thumbnail: 'https://via.placeholder.com/80x80',
            subscriber_count: 1000,
            video_count: 50,
            view_count: 100000
        };
    }

    generateVideoURL(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    generateEmbedHTML(videoId, width = 560, height = 315) {
        return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    async uploadVideo(file, metadata, progressCallback) {
        // Mock upload with progress
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progressCallback) {
                    progressCallback(progress);
                }
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve({
                        success: true,
                        video: {
                            id: 'demo_' + Date.now(),
                            title: metadata.title,
                            description: metadata.description
                        }
                    });
                }
            }, 200);
        });
    }

    async syncVideoToDatabase(videoData) {
        try {
            const response = await fetch('api/videos.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: videoData.snippet.title,
                    description: videoData.snippet.description,
                    youtube_id: videoData.id,
                    youtube_thumbnail: videoData.snippet.thumbnails.medium.url,
                    youtube_channel_id: videoData.snippet.channelId,
                    youtube_channel_title: videoData.snippet.channelTitle,
                    is_youtube_synced: true,
                    price: 0
                })
            });

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to sync video to database:', error);
            return false;
        }
    }
}

// Initialize global YouTube API client
window.youtubeAPI = new YouTubeAPIClient();