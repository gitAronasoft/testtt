<?php
/**
 * Video Access Control API for VideoHub
 * Handles video access verification for paid content
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Video.php';
require_once __DIR__ . '/../models/Purchase.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[3]) && $path_parts[3] === 'check' && isset($path_parts[4])) {
                // Check video access: /api/video-access/check/{video_id}
                checkVideoAccess($db, $path_parts[4]);
            } elseif (isset($path_parts[3]) && $path_parts[3] === 'stream' && isset($path_parts[4])) {
                // Stream video (for local videos): /api/video-access/stream/{video_id}
                streamVideo($db, $path_parts[4]);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid endpoint'
                ]);
            }
            break;
            
        case 'POST':
            if (isset($path_parts[3]) && $path_parts[3] === 'verify') {
                // Verify access and return video URL: /api/video-access/verify
                verifyAndGetVideoUrl($db);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid endpoint'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    error_log("Video Access API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error'
    ]);
}

/**
 * Check if user has access to a video
 */
function checkVideoAccess($db, $videoId) {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $data['user_id'] ?? $_GET['user_id'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID required'
        ]);
        return;
    }
    
    // Get video details
    $video = new Video($db);
    $video->id = $videoId;
    
    if (!$video->readOne()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Video not found'
        ]);
        return;
    }
    
    // Check if video is free
    if ($video->price == 0) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'has_access' => true,
            'access_type' => 'free',
            'message' => 'Free video - access granted'
        ]);
        return;
    }
    
    // Check if user has purchased the video
    $purchase = new Purchase($db);
    $hasPurchased = $purchase->hasPurchased($userId, $videoId);
    
    if ($hasPurchased) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'has_access' => true,
            'access_type' => 'purchased',
            'message' => 'Access granted - video purchased'
        ]);
    } else {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'has_access' => false,
            'access_type' => 'payment_required',
            'price' => $video->price,
            'message' => 'Payment required to access this video'
        ]);
    }
}

/**
 * Verify access and return video streaming URL
 */
function verifyAndGetVideoUrl($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $userId = $data['user_id'] ?? null;
    $videoId = $data['video_id'] ?? null;
    
    if (!$userId || !$videoId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID and Video ID required'
        ]);
        return;
    }
    
    // Get video details
    $video = new Video($db);
    $video->id = $videoId;
    
    if (!$video->readOne()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Video not found'
        ]);
        return;
    }
    
    // Check access
    $hasAccess = false;
    
    if ($video->price == 0) {
        // Free video
        $hasAccess = true;
    } else {
        // Check purchase
        $purchase = new Purchase($db);
        $hasAccess = $purchase->hasPurchased($userId, $videoId);
    }
    
    if (!$hasAccess) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied - payment required',
            'price' => $video->price
        ]);
        return;
    }
    
    // Increment view count
    $video->incrementViews();
    
    // Return video access information
    $videoData = [
        'id' => $video->id,
        'title' => $video->title,
        'description' => $video->description,
        'youtube_id' => $video->youtube_id,
        'youtube_thumbnail' => $video->youtube_thumbnail ?? $video->thumbnail
    ];
    
    // Add appropriate video URL
    if (!empty($video->youtube_id)) {
        // YouTube video - return embed URL
        $videoData['video_url'] = 'https://www.youtube.com/embed/' . $video->youtube_id;
        $videoData['video_type'] = 'youtube';
    } elseif (!empty($video->file_path)) {
        // Local video file - return secured streaming URL
        $videoData['video_url'] = '/api/video-access/stream/' . $video->id;
        $videoData['video_type'] = 'local';
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Video file not available'
        ]);
        return;
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Access verified',
        'data' => $videoData
    ]);
}

/**
 * Stream video file with access control
 */
function streamVideo($db, $videoId) {
    // This would be used for locally stored videos
    // For now, since you're using YouTube, this returns an error
    http_response_code(501);
    echo json_encode([
        'success' => false,
        'message' => 'Local video streaming not implemented - using YouTube for video hosting'
    ]);
}
?>