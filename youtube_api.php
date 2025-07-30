
<?php
require_once 'config.php';

class YouTubeAPI {
    private $pdo;
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->clientId = YOUTUBE_CLIENT_ID;
        $this->clientSecret = YOUTUBE_CLIENT_SECRET;
        $this->redirectUri = YOUTUBE_REDIRECT_URI;
    }
    
    public function getAuthUrl() {
        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'scope' => YOUTUBE_SCOPE,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent'
        ];
        
        return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);
    }
    
    public function handleCallback($code, $userId) {
        $tokenData = $this->exchangeCodeForTokens($code);
        
        if ($tokenData) {
            $this->storeTokens($userId, $tokenData);
            return true;
        }
        return false;
    }
    
    private function exchangeCodeForTokens($code) {
        $data = [
            'code' => $code,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $this->redirectUri,
            'grant_type' => 'authorization_code'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    private function storeTokens($userId, $tokenData) {
        $expiresAt = date('Y-m-d H:i:s', time() + $tokenData['expires_in']);
        
        $stmt = $this->pdo->prepare("
            INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            access_token = VALUES(access_token), 
            refresh_token = VALUES(refresh_token), 
            expires_at = VALUES(expires_at)
        ");
        
        $stmt->execute([
            $userId,
            $tokenData['access_token'],
            $tokenData['refresh_token'],
            $expiresAt
        ]);
    }
    
    public function getValidAccessToken($userId) {
        $stmt = $this->pdo->prepare("SELECT access_token, refresh_token, expires_at FROM youtube_tokens WHERE user_id = ?");
        $stmt->execute([$userId]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$token) return null;
        
        if (strtotime($token['expires_at']) <= time()) {
            // Token expired, refresh it
            $newToken = $this->refreshToken($token['refresh_token']);
            if ($newToken) {
                $this->storeTokens($userId, $newToken);
                return $newToken['access_token'];
            }
            return null;
        }
        
        return $token['access_token'];
    }
    
    private function refreshToken($refreshToken) {
        $data = [
            'refresh_token' => $refreshToken,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'refresh_token'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function uploadVideo($userId, $videoFile, $title, $description, $tags = []) {
        $accessToken = $this->getValidAccessToken($userId);
        if (!$accessToken) return false;
        
        $metadata = [
            'snippet' => [
                'title' => $title,
                'description' => $description,
                'tags' => $tags
            ],
            'status' => [
                'privacyStatus' => 'private'
            ]
        ];
        
        // Upload video using resumable upload
        $uploadUrl = $this->initiateResumableUpload($accessToken, $metadata);
        if (!$uploadUrl) return false;
        
        $videoId = $this->uploadVideoFile($uploadUrl, $videoFile);
        
        if ($videoId) {
            // Store video info in database
            $stmt = $this->pdo->prepare("INSERT INTO videos (youtube_video_id, title, description, tags, uploaded_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$videoId, $title, $description, implode(',', $tags), $userId]);
        }
        
        return $videoId;
    }
    
    private function initiateResumableUpload($accessToken, $metadata) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($metadata));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
            'X-Upload-Content-Type: video/*'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            preg_match('/Location: (.*)/', $response, $matches);
            return trim($matches[1]);
        }
        
        return false;
    }
    
    private function uploadVideoFile($uploadUrl, $videoFile) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $uploadUrl);
        curl_setopt($ch, CURLOPT_PUT, true);
        curl_setopt($ch, CURLOPT_INFILE, fopen($videoFile, 'r'));
        curl_setopt($ch, CURLOPT_INFILESIZE, filesize($videoFile));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $responseData = json_decode($response, true);
        return isset($responseData['id']) ? $responseData['id'] : false;
    }
    
    public function updateVideo($userId, $videoId, $title, $description, $tags = []) {
        $accessToken = $this->getValidAccessToken($userId);
        if (!$accessToken) return false;
        
        $data = [
            'id' => $videoId,
            'snippet' => [
                'title' => $title,
                'description' => $description,
                'tags' => $tags
            ]
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/youtube/v3/videos?part=snippet');
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}
?>
