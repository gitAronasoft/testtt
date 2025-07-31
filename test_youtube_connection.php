
<?php
session_start();
require_once 'api/youtube_service.php';

// Set a test user if not authenticated (for debugging)
if (!isset($_SESSION['user'])) {
    $_SESSION['user'] = ['id' => '1', 'name' => 'Test User'];
}

$user_id = $_SESSION['user']['id'];
$youtube_service = new YouTubeService($user_id);

echo "<h1>YouTube Connection Test</h1>";
echo "<h2>User ID: $user_id</h2>";

// Test connection
echo "<h3>1. Testing YouTube Connection</h3>";
$connected = $youtube_service->isConnected();
echo "Connected: " . ($connected ? "✅ YES" : "❌ NO") . "<br>";

if ($connected) {
    echo "<h3>2. Getting Channel Info</h3>";
    $channel_info = $youtube_service->getChannelInfo();
    if ($channel_info) {
        echo "Channel ID: " . $channel_info['channel_id'] . "<br>";
        echo "Channel Title: " . $channel_info['channel_title'] . "<br>";
    } else {
        echo "❌ No channel info found<br>";
    }
    
    echo "<h3>3. Fetching Channel Videos</h3>";
    $videos = $youtube_service->getChannelVideos(10);
    if ($videos !== false) {
        echo "✅ Found " . count($videos) . " videos<br>";
        if (count($videos) > 0) {
            echo "<ul>";
            foreach ($videos as $video) {
                echo "<li>" . $video['title'] . " (ID: " . $video['youtube_id'] . ")</li>";
            }
            echo "</ul>";
        }
    } else {
        echo "❌ Failed to fetch videos<br>";
    }
} else {
    echo "<h3>Database Check</h3>";
    $conn = getConnection();
    $stmt = $conn->prepare("SELECT * FROM youtube_tokens WHERE user_id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $token_data = $result->fetch_assoc();
        echo "✅ Tokens found in database<br>";
        echo "Channel ID: " . ($token_data['channel_id'] ?? 'Not set') . "<br>";
        echo "Channel Title: " . ($token_data['channel_title'] ?? 'Not set') . "<br>";
        echo "Access Token: " . (substr($token_data['access_token'], 0, 20) . '...') . "<br>";
        echo "Refresh Token: " . ($token_data['refresh_token'] ? 'Present' : 'Missing') . "<br>";
        echo "Expires At: " . $token_data['expires_at'] . "<br>";
    } else {
        echo "❌ No tokens found in database for user ID: $user_id<br>";
        echo "<p>To fix this, you need to:</p>";
        echo "<ol>";
        echo "<li>Set up OAuth flow properly</li>";
        echo "<li>Or manually insert YouTube tokens into the youtube_tokens table</li>";
        echo "</ol>";
    }
    $conn->close();
}
?>
