
<?php
session_start();
require_once 'youtube_service.php';

header('Content-Type: text/plain');

echo "YouTube API Connection Test\n";
echo "=" . str_repeat("=", 30) . "\n\n";

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    echo "❌ User not logged in\n";
    echo "Please log in first and then run this test.\n";
    exit();
}

$user_id = $_SESSION['user']['id'];
echo "✅ User logged in: {$user_id}\n";

try {
    // Test YouTube service initialization
    $youtube_service = new YouTubeService($user_id);
    echo "✅ YouTube service initialized\n";
    
    // Check database connection
    $conn = getConnection();
    echo "✅ Database connection established\n";
    
    // Check if user has YouTube tokens
    $stmt = $conn->prepare("SELECT * FROM youtube_tokens WHERE user_id = ?");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $token_data = $result->fetch_assoc();
        echo "✅ YouTube tokens found in database\n";
        echo "   Channel ID: " . ($token_data['channel_id'] ?? 'Not set') . "\n";
        echo "   Channel Title: " . ($token_data['channel_title'] ?? 'Not set') . "\n";
        echo "   Token expires: " . $token_data['expires_at'] . "\n";
        
        // Test connection
        if ($youtube_service->isConnected()) {
            echo "✅ YouTube API connection successful\n";
            
            // Test fetching channel info
            $channel_info = $youtube_service->getChannelInfo();
            if ($channel_info) {
                echo "✅ Channel info retrieved successfully\n";
                echo "   Channel: " . $channel_info['channel_title'] . "\n";
            } else {
                echo "❌ Failed to retrieve channel info\n";
            }
            
            // Test fetching videos
            echo "\nTesting video fetch...\n";
            $videos = $youtube_service->getChannelVideos(5); // Fetch only 5 for testing
            
            if ($videos !== false) {
                echo "✅ Videos fetched successfully\n";
                echo "   Found " . count($videos) . " videos\n";
                
                if (count($videos) > 0) {
                    echo "\nFirst video details:\n";
                    $first_video = $videos[0];
                    echo "   Title: " . $first_video['title'] . "\n";
                    echo "   YouTube ID: " . $first_video['youtube_id'] . "\n";
                    echo "   Published: " . $first_video['published_at'] . "\n";
                }
            } else {
                echo "❌ Failed to fetch videos\n";
            }
            
        } else {
            echo "❌ YouTube API connection failed\n";
        }
    } else {
        echo "❌ No YouTube tokens found in database\n";
        echo "\nTo fix this:\n";
        echo "1. Add your YouTube API credentials to the youtube_tokens table\n";
        echo "2. Or use the OAuth flow to connect your YouTube account\n";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n" . str_repeat("=", 40) . "\n";
echo "Test completed. Check the results above.\n";
?>
