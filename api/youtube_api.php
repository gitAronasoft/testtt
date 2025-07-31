<?php
session_start();
require_once 'youtube_service.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'connect':
        handleConnect($youtube_service);
        break;
    case 'status':
        handleStatus($youtube_service);
        break;
    case 'channel_info':
        handleChannelInfo($youtube_service);
        break;
    case 'videos':
        handleGetVideos($youtube_service);
        break;
    case 'statistics':
        handleGetStatistics($youtube_service);
        break;
    case 'upload':
        handleUploadVideo($youtube_service);
        break;
    case 'sync':
        handleSyncVideos($youtube_service);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleConnect($youtube_service) {
    $auth_url = $youtube_service->getAuthUrl();
    echo json_encode([
        'success' => true,
        'auth_url' => $auth_url
    ]);
}

function handleStatus($youtube_service) {
    $connected = $youtube_service->isConnected();
    $channel_info = $connected ? $youtube_service->getChannelInfo() : null;
    
    echo json_encode([
        'success' => true,
        'connected' => $connected,
        'channel_info' => $channel_info
    ]);
}

function handleChannelInfo($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode(['success' => false, 'message' => 'YouTube not connected']);
        return;
    }
    
    $channel_info = $youtube_service->getChannelInfo();
    echo json_encode([
        'success' => true,
        'channel_info' => $channel_info
    ]);
}

function handleGetVideos($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode(['success' => false, 'message' => 'YouTube not connected']);
        return;
    }
    
    $videos = $youtube_service->getChannelVideos();
    
    if ($videos !== false) {
        echo json_encode([
            'success' => true,
            'videos' => $videos
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch videos']);
    }
}

function handleGetStatistics($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode(['success' => false, 'message' => 'YouTube not connected']);
        return;
    }
    
    $statistics = $youtube_service->getChannelStatistics();
    
    if ($statistics !== false) {
        echo json_encode([
            'success' => true,
            'statistics' => $statistics
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch statistics']);
    }
}

function handleUploadVideo($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode(['success' => false, 'message' => 'YouTube not connected']);
        return;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'POST method required']);
        return;
    }
    
    // Check if file was uploaded
    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'No video file uploaded']);
        return;
    }
    
    $title = $_POST['title'] ?? 'Untitled Video';
    $description = $_POST['description'] ?? '';
    $tags = isset($_POST['tags']) ? explode(',', $_POST['tags']) : [];
    $privacy = $_POST['privacy'] ?? 'private';
    
    $upload_result = $youtube_service->uploadVideo(
        $_FILES['video']['tmp_name'],
        $title,
        $description,
        $tags,
        $privacy
    );
    
    if ($upload_result) {
        echo json_encode([
            'success' => true,
            'video' => $upload_result
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Upload failed']);
    }
}

function handleSyncVideos($youtube_service) {
    if (!$youtube_service->isConnected()) {
        echo json_encode(['success' => false, 'message' => 'YouTube not connected']);
        return;
    }
    
    $videos = $youtube_service->getChannelVideos();
    
    if ($videos === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to sync videos']);
        return;
    }
    
    // Sync videos to local database
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
                INSERT INTO videos (title, description, uploader_id, youtube_id, youtube_thumbnail, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)
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
        }
    }
    
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'synced_count' => $synced_count,
        'total_videos' => count($videos)
    ]);
}
?>
