/**
 * YouTube Data API v3 Client for VideoHub
 * Handles authentication, token management, video upload, and metadata sync
 */
class YouTubeAPIClient {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.clientId =
            "824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com";
        // Client secret handled server-side for security
        this.scope =
            "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";
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
            console.error("Failed to initialize YouTube API client:", error);
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
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return;
        }

        this.initializingTokens = true;

        try {
            // Use configured base URL for YouTube tokens API
            const basePath = window.videoHubConfig ? window.videoHubConfig.basePath : '';
            const response = await fetch(
                `${basePath}/api/youtube_tokens.php?action=get_tokens`,
                {
                    credentials: "include",
                },
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const data = await response.json();

            if (data.success) {
                this.accessToken = data.tokens.access_token;
                this.refreshToken = data.tokens.refresh_token;
                this.tokenExpiry = new Date(data.tokens.expires_at);
                console.log("YouTube tokens initialized successfully", {
                    hasAccessToken: !!this.accessToken,
                    tokenExpiry: this.tokenExpiry
                });
            } else if (data.expired && data.refresh_token) {
                // Token expired, but still use it for now - refresh in background
                console.log("Token expired, but using stored token...");
                this.refreshToken = data.refresh_token;
                // Don't await refresh to avoid blocking the upload
                this.refreshAccessToken(data.refresh_token).catch(console.error);
            } else {
                console.log("No valid tokens found - user needs to authenticate");
                this.accessToken = null;
                this.refreshToken = null;
                this.tokenExpiry = null;
            }
        } catch (error) {
            console.error("Failed to initialize tokens:", error);
        } finally {
            this.initializingTokens = false;
        }
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return (
            this.accessToken &&
            this.tokenExpiry &&
            new Date() < this.tokenExpiry
        );
    }

    /**
     * Sign in to YouTube
     */
    async signIn() {
        return new Promise((resolve) => {
            const redirectUri = encodeURIComponent(
                window.location.origin + "/api/oauth/youtube.php",
            );
            const authUrl =
                `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${redirectUri}&` +
                `scope=${encodeURIComponent(this.scope)}&` +
                `response_type=code&` +
                `access_type=offline&` +
                `prompt=consent`;

            const popup = window.open(
                authUrl,
                "youtube-auth",
                "width=500,height=600",
            );

            const messageHandler = (event) => {
                if (event.data.type === "YOUTUBE_AUTH_SUCCESS") {
                    window.removeEventListener("message", messageHandler);
                    popup.close();
                    this.initializeTokens().then(() => resolve(true));
                } else if (event.data.type === "YOUTUBE_AUTH_ERROR") {
                    window.removeEventListener("message", messageHandler);
                    popup.close();
                    console.error("YouTube auth error:", event.data.error);
                    resolve(false);
                }
            };

            window.addEventListener("message", messageHandler);

            // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener("message", messageHandler);
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
            // Use configured base URL for YouTube tokens API
            const basePath = window.videoHubConfig ? window.videoHubConfig.basePath : '';
            const response = await fetch(`${basePath}/api/youtube_tokens.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    action: "refresh_token",
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.tokens) {
                this.accessToken = data.tokens.access_token;
                this.refreshToken = data.tokens.refresh_token || refreshToken;
                this.tokenExpiry = new Date(Date.now() + (data.tokens.expires_in || 3600) * 1000);
                console.log("Token refreshed successfully");
                return true;
            }

            console.error("Token refresh failed:", data.error || "Unknown error");
            return false;
        } catch (error) {
            console.error("Token refresh failed:", error);
            // Clear tokens on refresh failure
            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpiry = null;
            return false;
        }
    }

    /**
     * Ensure we have a valid access token (simplified version)
     */
    async ensureValidToken() {
        // Always initialize tokens first to get the latest from database
        await this.initializeTokens();
        
        if (!this.accessToken) {
            throw new Error("No access token available. Please sign in first.");
        }

        // For now, use the stored token directly without complex expiry checking
        // The token refresh will happen in the background if needed
        console.log("Using access token for API request:", !!this.accessToken);
    }

    /**
     * Update YouTube video metadata
     * @param {string} videoId - YouTube video ID
     * @param {Object} metadata - Updated metadata (title, description)
     * @returns {Promise<Object>} Update result
     */
    async updateVideoMetadata(videoId, metadata) {
        try {
            console.log('YouTube API updateVideoMetadata called with:', { videoId, metadata });
            console.log('Current accessToken:', this.accessToken);
            
            // Ensure we're initialized first
            if (!this.isInitialized) {
                console.log('YouTube client not initialized, initializing now...');
                await this.initialize();
            }
            
            if (!this.accessToken) {
                console.error('No YouTube access token available');
                return {
                    success: false,
                    error: 'Not authenticated with YouTube. Please connect your YouTube account first.',
                    needsAuth: true
                };
            }

            await this.ensureValidToken();

            const updateData = {
                id: videoId,
                snippet: {
                    title: metadata.title,
                    description: metadata.description,
                    categoryId: "22" // People & Blogs category
                }
            };

            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();
            console.log('YouTube video updated successfully:', result);

            return {
                success: true,
                videoId: result.id,
                title: result.snippet.title,
                description: result.snippet.description
            };

        } catch (error) {
            console.error('Error updating YouTube video:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Make authenticated request to YouTube API
     */
    async makeYouTubeAPIRequest(url, options = {}) {
        await this.ensureValidToken();

        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
        };

        return fetch(url, {
            ...options,
            headers,
        });
    }

    /**
     * Upload video to YouTube with progress tracking using multipart upload
     */
    async uploadVideo(videoFile, metadata, progressCallback = null) {
    try {
        console.log("Starting video upload to YouTube (resumable)...");
        await this.ensureValidToken();

        if (!videoFile || !videoFile.type.startsWith("video/")) {
            throw new Error("Invalid video file");
        }

        if (progressCallback) progressCallback(10);

        // Step 1 – Prepare metadata for upload
        const uploadMetadata = {
            snippet: {
                title: metadata.title || "Untitled Video",
                description: metadata.description || "",
                tags: metadata.tags || [],
                categoryId: metadata.categoryId || "22",
            },
            status: {
                privacyStatus: "private",
                embeddable: true,
                license: "youtube",
            },
        };

        if (progressCallback) progressCallback(20);

        // Step 2 – Initiate resumable upload session
        const initRes = await fetch(
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Upload-Content-Length": videoFile.size,
                    "X-Upload-Content-Type": videoFile.type
                },
                body: JSON.stringify(uploadMetadata)
            }
        );

        if (!initRes.ok) {
            throw new Error(`Failed to initiate upload: ${initRes.statusText}`);
        }

        const uploadUrl = initRes.headers.get("Location");
        if (!uploadUrl) {
            throw new Error("No upload URL returned by YouTube API");
        }

        console.log("Resumable upload URL:", uploadUrl);
        if (progressCallback) progressCallback(30);

        // Step 3 – Upload file in chunks
        const chunkSize = 1024 * 1024 * 5; // 5MB
        let offset = 0;

        while (offset < videoFile.size) {
            const chunkEnd = Math.min(offset + chunkSize, videoFile.size);
            const chunk = videoFile.slice(offset, chunkEnd);
            const contentRange = `bytes ${offset}-${chunkEnd - 1}/${videoFile.size}`;

            const res = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Length": chunk.size,
                    "Content-Range": contentRange,
                    "Content-Type": videoFile.type
                },
                body: chunk
            });

            if (res.status === 308) {
                // Partial upload, continue
                const range = res.headers.get("Range");
                if (range) {
                    offset = parseInt(range.split("-")[1], 10) + 1;
                } else {
                    offset = chunkEnd;
                }
            } else if (res.ok) {
                // Upload complete
                const result = await res.json();
                if (progressCallback) progressCallback(100);

                return {
                    success: true,
                    videoId: result.id,
                    thumbnail: result.snippet?.thumbnails?.default?.url || '',
                    duration: result.contentDetails?.duration || '',
                    video: result
                };
            } else {
                throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
            }

            // Progress update
            const progress = Math.round((offset / videoFile.size) * 100);
            if (progressCallback) progressCallback(progress);
        }
    } catch (error) {
        console.error("Video upload failed:", error);
        return {
            success: false,
            error: error.message,
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
                    const progress = Math.round(
                        (event.loaded / event.total) * 100,
                    );
                    progressCallback(progress);
                }
            };

            reader.onload = function () {
                try {
                    const base64Data = btoa(
                        new Uint8Array(reader.result).reduce(
                            (data, byte) => data + String.fromCharCode(byte),
                            "",
                        ),
                    );
                    resolve(base64Data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Sync uploaded video metadata with our database
     */
    async syncVideoToDatabase(youtubeVideo, price = 0) {
        try {
            // Get current user from session
            const localSession = localStorage.getItem("userSession");
            const sessionSession = sessionStorage.getItem("userSession");
            const userSession = JSON.parse(
                localSession || sessionSession || "{}",
            );
            const uploaderId = userSession.id;

            if (!uploaderId) {
                throw new Error("No user session found");
            }

            // Get detailed statistics for the video
            const videoDetails = await this.getVideoDetails([youtubeVideo.id]);
            const detailedVideo = videoDetails[0] || {};

            const videoData = {
                title: youtubeVideo.snippet?.title || "Untitled",
                description: youtubeVideo.snippet?.description || "",
                youtube_id: youtubeVideo.id,
                youtube_thumbnail:
                    youtubeVideo.snippet?.thumbnails?.medium?.url ||
                    youtubeVideo.snippet?.thumbnails?.default?.url,
                youtube_channel_id: youtubeVideo.snippet?.channelId,
                youtube_channel_title: youtubeVideo.snippet?.channelTitle,
                youtube_views: detailedVideo.views || 0,
                youtube_likes: detailedVideo.likes || 0,
                youtube_comments: detailedVideo.comments || 0,
                is_youtube_synced: true,
                price: parseFloat(price) || 0,
                category: "youtube",
                file_path: "",
                uploader_id: uploaderId,
            };

            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await fetch(`${apiUrl}/endpoints/videos.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(videoData),
            });

            const result = await response.json();

            if (!result.success) {
                console.error(
                    "Failed to sync video to database:",
                    result.message,
                );
            }

            return result.success;
        } catch (error) {
            console.error("Database sync failed:", error);
            return false;
        }
    }

    /**
     * Get detailed video information
     */
    async getVideoDetails(videoIds) {
        try {
            const ids = Array.isArray(videoIds) ? videoIds.join(",") : videoIds;
            const response = await this.makeYouTubeAPIRequest(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}`,
            );

            if (!response.ok) {
                throw new Error("Failed to fetch video details");
            }

            const data = await response.json();
            return data.items.map((video) => ({
                youtube_id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail:
                    video.snippet.thumbnails?.medium?.url ||
                    video.snippet.thumbnails?.default?.url,
                channel_id: video.snippet.channelId,
                channel_title: video.snippet.channelTitle,
                views: parseInt(video.statistics?.viewCount || 0),
                likes: parseInt(video.statistics?.likeCount || 0),
                comments: parseInt(video.statistics?.commentCount || 0),
            }));
        } catch (error) {
            console.error("Failed to get video details:", error);
            return [];
        }
    }
}

// Initialize YouTube API client (singleton pattern)
if (!window.youtubeAPI) {
    window.youtubeAPI = new YouTubeAPIClient();
}
