
<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once 'config.php';

class YouTubeService {
    private $client;
    private $youtube;
    private $user_id;
    
    // YouTube API configuration
    const CLIENT_ID = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    const CLIENT_SECRET = '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';
    const REDIRECT_URI = 'https://2733f99a-66a9-4862-80b8-e425887aaf93-00-2d3swh2tz1w71.pike.replit.dev/api/youtube_oauth.php';
    
    public function __construct($user_id = null) {
        $this->user_id = $user_id;
        $this->initializeClient();
    }
    
    private function initializeClient() {
        $this->client = new Google_Client();
        $this->client->setClientId(self::CLIENT_ID);
        $this->client->setClientSecret(self::CLIENT_SECRET);
        $this->client->setRedirectUri(self::REDIRECT_URI);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');
        $this->client->addScope([
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
        ]);
        
        $this->youtube = new Google_Service_YouTube($this->client);
        
        // Auto-load stored token if user_id is provided
        if ($this->user_id) {
            $this->loadStoredToken();
        }
    }
    
    private function loadStoredToken() {
        $conn = getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $this->user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $token_data = $result->fetch_assoc();
            
            $token = [
                'access_token' => $token_data['access_token'],
                'refresh_token' => $token_data['refresh_token'],
                'expires_in' => strtotime($token_data['expires_at']) - time()
            ];
            
            $this->client->setAccessToken($token);
            
            // Auto-refresh if token is expired
            if ($this->client->isAccessTokenExpired() && !empty($token_data['refresh_token'])) {
                $this->refreshAccessToken();
            }
        }
        
        $conn->close();
    }
    
    public function getAuthUrl() {
        return $this->client->createAuthUrl();
    }
    
    public function handleOAuthCallback($code) {
        try {
            $token = $this->client->fetchAccessTokenWithAuthCode($code);
            
            if (isset($token['error'])) {
                throw new Exception('OAuth error: ' . $token['error_description']);
            }
            
            // Store tokens in database
            $this->storeTokens($token);
            
            // Get channel info
            $this->client->setAccessToken($token);
            $channelResponse = $this->youtube->channels->listChannels('snippet,statistics', [
                'mine' => true
            ]);
            
            if (!empty($channelResponse->getItems())) {
                $channel = $channelResponse->getItems()[0];
                $this->updateChannelInfo($channel);
            }
            
            return true;
        } catch (Exception $e) {
            error_log('YouTube OAuth error: ' . $e->getMessage());
            return false;
        }
    }
    
    private function storeTokens($token) {
        $conn = getConnection();
        
        $access_token = $token['access_token'];
        $refresh_token = $token['refresh_token'] ?? '';
        $expires_at = date('Y-m-d H:i:s', time() + $token['expires_in']);
        
        $stmt = $conn->prepare("
            INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            expires_at = VALUES(expires_at),
            updated_at = CURRENT_TIMESTAMP
        ");
        
        $stmt->bind_param("ssss", $this->user_id, $access_token, $refresh_token, $expires_at);
        $stmt->execute();
        $conn->close();
    }
    
    private function updateChannelInfo($channel) {
        $conn = getConnection();
        
        $channel_id = $channel->getId();
        $channel_title = $channel->getSnippet()->getTitle();
        
        $stmt = $conn->prepare("
            UPDATE youtube_tokens 
            SET channel_id = ?, channel_title = ?
            WHERE user_id = ?
        ");
        
        $stmt->bind_param("sss", $channel_id, $channel_title, $this->user_id);
        $stmt->execute();
        $conn->close();
    }
    
    public function refreshAccessToken() {
        $conn = getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $this->user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return false;
        }
        
        $token_data = $result->fetch_assoc();
        $conn->close();
        
        try {
            $this->client->setAccessToken([
                'access_token' => $token_data['access_token'],
                'refresh_token' => $token_data['refresh_token'],
                'expires_in' => strtotime($token_data['expires_at']) - time()
            ]);
            
            if ($this->client->isAccessTokenExpired() && !empty($token_data['refresh_token'])) {
                $new_token = $this->client->fetchAccessTokenWithRefreshToken($token_data['refresh_token']);
                
                if (isset($new_token['error'])) {
                    throw new Exception('Token refresh error: ' . $new_token['error_description']);
                }
                
                $this->storeTokens($new_token);
                return true;
            }
            
            return true;
        } catch (Exception $e) {
            error_log('Token refresh error: ' . $e->getMessage());
            return false;
        }
    }
    
    public function getChannelVideos($maxResults = 50) {
        if (!$this->isAuthenticated()) {
            return false;
        }
        
        try {
            $searchResponse = $this->youtube->search->listSearch('snippet', [
                'forMine' => true,
                'type' => 'video',
                'order' => 'date',
                'maxResults' => $maxResults
            ]);
            
            $videos = [];
            foreach ($searchResponse->getItems() as $item) {
                $videos[] = [
                    'youtube_id' => $item->getId()->getVideoId(),
                    'title' => $item->getSnippet()->getTitle(),
                    'description' => $item->getSnippet()->getDescription(),
                    'thumbnail' => $item->getSnippet()->getThumbnails()->getDefault()->getUrl(),
                    'published_at' => $item->getSnippet()->getPublishedAt()
                ];
            }
            
            return $videos;
        } catch (Exception $e) {
            error_log('Error fetching channel videos: ' . $e->getMessage());
            return false;
        }
    }
    
    public function getChannelStatistics() {
        if (!$this->isAuthenticated()) {
            return false;
        }
        
        try {
            $channelResponse = $this->youtube->channels->listChannels('statistics', [
                'mine' => true
            ]);
            
            if (!empty($channelResponse->getItems())) {
                $statistics = $channelResponse->getItems()[0]->getStatistics();
                return [
                    'subscriber_count' => $statistics->getSubscriberCount(),
                    'video_count' => $statistics->getVideoCount(),
                    'view_count' => $statistics->getViewCount()
                ];
            }
            
            return false;
        } catch (Exception $e) {
            error_log('Error fetching channel statistics: ' . $e->getMessage());
            return false;
        }
    }
    
    public function uploadVideo($videoPath, $title, $description, $tags = [], $privacy = 'private') {
        if (!$this->isAuthenticated()) {
            return false;
        }
        
        try {
            $snippet = new Google_Service_YouTube_VideoSnippet();
            $snippet->setTitle($title);
            $snippet->setDescription($description);
            $snippet->setTags($tags);
            $snippet->setCategoryId('22'); // People & Blogs category
            
            $status = new Google_Service_YouTube_VideoStatus();
            $status->setPrivacyStatus($privacy);
            
            $video = new Google_Service_YouTube_Video();
            $video->setSnippet($snippet);
            $video->setStatus($status);
            
            $chunkSizeBytes = 1 * 1024 * 1024; // 1MB chunks
            
            $this->client->setDefer(true);
            $insertRequest = $this->youtube->videos->insert('status,snippet', $video);
            
            $media = new Google_Http_MediaFileUpload(
                $this->client,
                $insertRequest,
                'video/*',
                null,
                true,
                $chunkSizeBytes
            );
            $media->setFileSize(filesize($videoPath));
            
            $status = false;
            $handle = fopen($videoPath, "rb");
            while (!$status && !feof($handle)) {
                $chunk = fread($handle, $chunkSizeBytes);
                $status = $media->nextChunk($chunk);
            }
            fclose($handle);
            
            $this->client->setDefer(false);
            
            if ($status) {
                return [
                    'youtube_id' => $status['id'],
                    'title' => $status['snippet']['title'],
                    'description' => $status['snippet']['description'],
                    'privacy' => $status['status']['privacyStatus']
                ];
            }
            
            return false;
        } catch (Exception $e) {
            error_log('Error uploading video: ' . $e->getMessage());
            return false;
        }
    }
    
    private function isAuthenticated() {
        if (!$this->user_id) {
            return false;
        }
        
        // Check if we have a valid access token
        $access_token = $this->client->getAccessToken();
        if (!$access_token) {
            // Try to load token from database
            $this->loadStoredToken();
            $access_token = $this->client->getAccessToken();
        }
        
        if (!$access_token) {
            return false;
        }
        
        // Check if token is expired and refresh if needed
        if ($this->client->isAccessTokenExpired()) {
            return $this->refreshAccessToken();
        }
        
        return true;
    }
    
    public function isConnected() {
        if (!$this->user_id) {
            return false;
        }
        
        $conn = getConnection();
        
        $stmt = $conn->prepare("SELECT id FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $this->user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $connected = $result->num_rows > 0;
        $conn->close();
        
        return $connected;
    }
    
    public function getChannelInfo() {
        if (!$this->user_id) {
            return false;
        }
        
        $conn = getConnection();
        
        $stmt = $conn->prepare("SELECT channel_id, channel_title FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $this->user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $data = $result->fetch_assoc();
            $conn->close();
            return $data;
        }
        
        $conn->close();
        return false;
    }
    
    public function syncAllVideos() {
        if (!$this->isAuthenticated()) {
            return ['success' => false, 'message' => 'Not authenticated'];
        }
        
        $videos = $this->getChannelVideos();
        
        if ($videos === false) {
            return ['success' => false, 'message' => 'Failed to fetch videos from YouTube'];
        }
        
        $conn = getConnection();
        $synced_count = 0;
        
        foreach ($videos as $video) {
            // Check if video already exists
            $check_stmt = $conn->prepare("SELECT id FROM videos WHERE youtube_id = ?");
            $check_stmt->bind_param("s", $video['youtube_id']);
            $check_stmt->execute();
            $result = $check_stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Insert new video
                $insert_stmt = $conn->prepare("
                    INSERT INTO videos (title, description, uploader_id, youtube_id, youtube_thumbnail, is_youtube_synced, created_at) 
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                ");
                
                $created_at = date('Y-m-d H:i:s', strtotime($video['published_at']));
                
                $insert_stmt->bind_param("ssssss", 
                    $video['title'], 
                    $video['description'], 
                    $this->user_id, 
                    $video['youtube_id'],
                    $video['thumbnail'],
                    $created_at
                );
                
                if ($insert_stmt->execute()) {
                    $synced_count++;
                }
            }
        }
        
        $conn->close();
        
        return [
            'success' => true,
            'synced_count' => $synced_count,
            'total_videos' => count($videos)
        ];
    }
}
?>
