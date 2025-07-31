
<?php
session_start();
require_once 'youtube_service.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

$user_id = $_SESSION['user']['id'];
$youtube_service = new YouTubeService($user_id);

$action = $_GET['action'] ?? 'auto_sync';

switch ($action) {
    case 'auto_sync':
        handleAutoSync($youtube_service);
        break;
    case 'check_status':
        handleCheckStatus($youtube_service);
        break;
    case 'force_sync':
        handleForceSync($youtube_service);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleAutoSync($youtube_service) {
    // Check if user has YouTube tokens stored
    if (!$youtube_service->isConnected()) {
        echo json_encode([
            'success' => false, 
            'message' => 'No YouTube account connected. Please add tokens to youtube_tokens table.',
            'connected' => false
        ]);
        return;
    }
    
    // Perform automatic sync
    $result = $youtube_service->syncAllVideos();
    
    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'message' => "Successfully synced {$result['synced_count']} new videos from {$result['total_videos']} total videos",
            'synced_count' => $result['synced_count'],
            'total_videos' => $result['total_videos'],
            'connected' => true
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $result['message'],
            'connected' => true
        ]);
    }
}

function handleCheckStatus($youtube_service) {
    $connected = $youtube_service->isConnected();
    $channel_info = $connected ? $youtube_service->getChannelInfo() : null;
    
    echo json_encode([
        'success' => true,
        'connected' => $connected,
        'channel_info' => $channel_info
    ]);
}

function handleForceSync($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode([
            'success' => false, 
            'message' => 'No YouTube account connected',
            'connected' => false
        ]);
        return;
    }
    
    // Get all videos and update existing ones
    $videos = $youtube_service->getChannelVideos();
    
    if ($videos === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch videos from YouTube']);
        return;
    }
    
    $conn = getConnection();
    $synced_count = 0;
    $updated_count = 0;
    
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
            
            $uploader_id = $_SESSION['user']['id'];
            $created_at = date('Y-m-d H:i:s', strtotime($video['published_at']));
            
            $insert_stmt->bind_param("ssssss", 
                $video['title'], 
                $video['description'], 
                $uploader_id, 
                $video['youtube_id'],
                $video['thumbnail'],
                $created_at
            );
            
            if ($insert_stmt->execute()) {
                $synced_count++;
            }
        } else {
            // Update existing video
            $update_stmt = $conn->prepare("
                UPDATE videos 
                SET title = ?, description = ?, youtube_thumbnail = ?, is_youtube_synced = 1
                WHERE youtube_id = ?
            ");
            
            $update_stmt->bind_param("ssss", 
                $video['title'], 
                $video['description'], 
                $video['thumbnail'],
                $video['youtube_id']
            );
            
            if ($update_stmt->execute()) {
                $updated_count++;
            }
        }
    }
    
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'message' => "Force sync completed: {$synced_count} new videos, {$updated_count} updated videos",
        'synced_count' => $synced_count,
        'updated_count' => $updated_count,
        'total_videos' => count($videos)
    ]);
}
?>
