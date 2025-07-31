
<?php
require_once 'config.php';

class YouTubeAPI {
    private $apiKey;
    
    public function __construct() {
        $this->apiKey = YOUTUBE_API_KEY;
    }
    
    /**
     * Get channel information
     */
    public function getChannelInfo($channelId) {
        $url = "https://www.googleapis.com/youtube/v3/channels";
        $params = [
            'part' => 'snippet,statistics,brandingSettings',
            'id' => $channelId,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeRequest($url, $params);
        
        if ($response && isset($response['items'][0])) {
            return $response['items'][0];
        }
        
        return null;
    }
    
    /**
     * Get channel videos
     */
    public function getChannelVideos($channelId, $maxResults = 50) {
        // First get the uploads playlist ID
        $channelInfo = $this->getChannelInfo($channelId);
        if (!$channelInfo || !isset($channelInfo['contentDetails']['relatedPlaylists']['uploads'])) {
            return [];
        }
        
        $uploadsPlaylistId = $channelInfo['contentDetails']['relatedPlaylists']['uploads'];
        
        // Get playlist items
        $url = "https://www.googleapis.com/youtube/v3/playlistItems";
        $params = [
            'part' => 'snippet,contentDetails',
            'playlistId' => $uploadsPlaylistId,
            'maxResults' => $maxResults,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeRequest($url, $params);
        
        if ($response && isset($response['items'])) {
            // Get video IDs to fetch additional details
            $videoIds = [];
            foreach ($response['items'] as $item) {
                $videoIds[] = $item['contentDetails']['videoId'];
            }
            
            // Get video statistics and details
            $videos = $this->getVideoDetails($videoIds);
            return $videos;
        }
        
        return [];
    }
    
    /**
     * Get video details
     */
    public function getVideoDetails($videoIds) {
        if (empty($videoIds)) return [];
        
        $url = "https://www.googleapis.com/youtube/v3/videos";
        $params = [
            'part' => 'snippet,statistics,contentDetails',
            'id' => implode(',', $videoIds),
            'key' => $this->apiKey
        ];
        
        $response = $this->makeRequest($url, $params);
        
        if ($response && isset($response['items'])) {
            return $response['items'];
        }
        
        return [];
    }
    
    /**
     * Search videos
     */
    public function searchVideos($query, $maxResults = 25) {
        $url = "https://www.googleapis.com/youtube/v3/search";
        $params = [
            'part' => 'snippet',
            'q' => $query,
            'type' => 'video',
            'maxResults' => $maxResults,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeRequest($url, $params);
        
        if ($response && isset($response['items'])) {
            return $response['items'];
        }
        
        return [];
    }
    
    /**
     * Sync channel data to database
     */
    public function syncChannelToDatabase($channelId, $userId) {
        try {
            $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Get channel info
            $channelInfo = $this->getChannelInfo($channelId);
            if (!$channelInfo) {
                return ['success' => false, 'message' => 'Channel not found'];
            }
            
            // Save/update channel info
            $stmt = $pdo->prepare("
                INSERT INTO channels (user_id, channel_id, title, description, thumbnail_url, subscriber_count, video_count, view_count) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                thumbnail_url = VALUES(thumbnail_url),
                subscriber_count = VALUES(subscriber_count),
                video_count = VALUES(video_count),
                view_count = VALUES(view_count),
                updated_at = CURRENT_TIMESTAMP
            ");
            
            $stmt->execute([
                $userId,
                $channelId,
                $channelInfo['snippet']['title'],
                $channelInfo['snippet']['description'] ?? '',
                $channelInfo['snippet']['thumbnails']['default']['url'] ?? '',
                $channelInfo['statistics']['subscriberCount'] ?? 0,
                $channelInfo['statistics']['videoCount'] ?? 0,
                $channelInfo['statistics']['viewCount'] ?? 0
            ]);
            
            // Get and save videos
            $videos = $this->getChannelVideos($channelId);
            $videoCount = 0;
            
            foreach ($videos as $video) {
                $stmt = $pdo->prepare("
                    INSERT INTO videos (channel_id, video_id, title, description, thumbnail_url, duration, view_count, like_count, published_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    description = VALUES(description),
                    thumbnail_url = VALUES(thumbnail_url),
                    duration = VALUES(duration),
                    view_count = VALUES(view_count),
                    like_count = VALUES(like_count),
                    updated_at = CURRENT_TIMESTAMP
                ");
                
                $stmt->execute([
                    $channelId,
                    $video['id'],
                    $video['snippet']['title'],
                    $video['snippet']['description'] ?? '',
                    $video['snippet']['thumbnails']['medium']['url'] ?? '',
                    $video['contentDetails']['duration'] ?? '',
                    $video['statistics']['viewCount'] ?? 0,
                    $video['statistics']['likeCount'] ?? 0,
                    $video['snippet']['publishedAt']
                ]);
                
                $videoCount++;
            }
            
            return [
                'success' => true, 
                'message' => "Successfully synced channel with {$videoCount} videos",
                'channel' => $channelInfo['snippet']['title']
            ];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    /**
     * Make HTTP request to YouTube API
     */
    private function makeRequest($url, $params) {
        $queryString = http_build_query($params);
        $fullUrl = $url . '?' . $queryString;
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => 'User-Agent: YouTube Manager App'
            ]
        ]);
        
        $response = file_get_contents($fullUrl, false, $context);
        
        if ($response === false) {
            return null;
        }
        
        return json_decode($response, true);
    }
}

// API endpoint handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $youtube = new YouTubeAPI();
    
    switch ($action) {
        case 'sync_channel':
            $channelId = $input['channel_id'] ?? '';
            $userId = $_SESSION['user_id'] ?? 1; // Default for demo
            
            if (empty($channelId)) {
                echo json_encode(['success' => false, 'message' => 'Channel ID is required']);
                break;
            }
            
            $result = $youtube->syncChannelToDatabase($channelId, $userId);
            echo json_encode($result);
            break;
            
        case 'get_channel_info':
            $channelId = $input['channel_id'] ?? '';
            
            if (empty($channelId)) {
                echo json_encode(['success' => false, 'message' => 'Channel ID is required']);
                break;
            }
            
            $channelInfo = $youtube->getChannelInfo($channelId);
            echo json_encode(['success' => true, 'data' => $channelInfo]);
            break;
            
        case 'search_videos':
            $query = $input['query'] ?? '';
            $maxResults = $input['max_results'] ?? 25;
            
            if (empty($query)) {
                echo json_encode(['success' => false, 'message' => 'Search query is required']);
                break;
            }
            
            $videos = $youtube->searchVideos($query, $maxResults);
            echo json_encode(['success' => true, 'data' => $videos]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}
?>
