<?php
/**
 * Video Upload API Endpoint for VideoHub
 * Handles file uploads and YouTube integration
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Video.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            // Handle file upload
            if (isset($_FILES['video']) && $_FILES['video']['error'] === UPLOAD_ERR_OK) {
                handleFileUpload($db);
            } elseif (isset($_POST['youtube_upload']) || (isset($_POST['action']) && $_POST['action'] === 'youtube_upload')) {
                // Handle YouTube upload with metadata
                handleYouTubeUpload($db);
            } else {
                // Handle metadata-only video creation (for YouTube-first uploads)
                handleMetadataUpload($db);
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
    error_log("Upload API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}

/**
 * Handle direct file upload to server
 */
function handleFileUpload($db) {
    $uploadDir = __DIR__ . '/../../uploads/videos/';
    
    // Create upload directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $video = $_FILES['video'];
    $allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    $maxSize = 500 * 1024 * 1024; // 500MB
    
    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $video['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid file type. Only MP4, AVI, MOV, WMV, and WebM files are allowed.'
        ]);
        return;
    }
    
    // Validate file size
    if ($video['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'File too large. Maximum size is 500MB.'
        ]);
        return;
    }
    
    // Generate unique filename
    $extension = pathinfo($video['name'], PATHINFO_EXTENSION);
    $filename = uniqid('video_') . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    // Move uploaded file
    if (move_uploaded_file($video['tmp_name'], $filepath)) {
        // Save video metadata to database
        $videoModel = new Video($db);
        $videoModel->title = $_POST['title'] ?? 'Untitled Video';
        $videoModel->description = $_POST['description'] ?? '';
        $videoModel->user_id = $_POST['user_id'] ?? 7; // Default creator
        $videoModel->price = $_POST['price'] ?? 0;
        $videoModel->category = $_POST['category'] ?? '';
        $videoModel->file_path = '/uploads/videos/' . $filename;
        $videoModel->status = 'processing';
        
        if ($videoModel->create()) {
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Video uploaded successfully',
                'data' => [
                    'video_id' => $videoModel->id,
                    'filename' => $filename,
                    'file_path' => $videoModel->file_path
                ]
            ]);
        } else {
            // Clean up uploaded file if database save fails
            unlink($filepath);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to save video metadata'
            ]);
        }
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to save uploaded file'
        ]);
    }
}

/**
 * Handle YouTube upload with metadata sync
 */
function handleYouTubeUpload($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // If data is null, try to get from POST
    if (!$data) {
        $data = $_POST;
    }
    
    if (!isset($data['youtube_id']) || empty($data['youtube_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'YouTube ID is required for YouTube uploads'
        ]);
        return;
    }
    
    // Create video record with YouTube metadata
    $videoModel = new Video($db);
    $videoModel->title = $data['title'] ?? 'Untitled Video';
    $videoModel->description = $data['description'] ?? '';
    $videoModel->user_id = $data['user_id'] ?? 7; // Default creator
    $videoModel->price = floatval($data['price'] ?? 0);
    $videoModel->category = $data['category'] ?? '';
    $videoModel->youtube_id = $data['youtube_id'];
    $videoModel->youtube_thumbnail = $data['thumbnail'] ?? '';
    $videoModel->is_youtube_synced = 1;
    $videoModel->youtube_channel_id = $data['channel_id'] ?? '';
    $videoModel->youtube_channel_title = $data['channel_title'] ?? '';
    $videoModel->status = 'active'; // YouTube videos are immediately available
    
    if ($videoModel->create()) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'YouTube video synced successfully',
            'data' => [
                'video_id' => $videoModel->id,
                'youtube_id' => $videoModel->youtube_id
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to sync YouTube video'
        ]);
    }
}

/**
 * Handle metadata-only upload (for pre-uploaded YouTube videos)
 */
function handleMetadataUpload($db) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No data provided'
        ]);
        return;
    }
    
    // Create video record
    $videoModel = new Video($db);
    $videoModel->title = $data['title'] ?? 'Untitled Video';
    $videoModel->description = $data['description'] ?? '';
    $videoModel->user_id = $data['user_id'] ?? 7; // Default creator
    $videoModel->price = floatval($data['price'] ?? 0);
    $videoModel->category = $data['category'] ?? '';
    $videoModel->youtube_id = $data['youtube_id'] ?? '';
    $videoModel->youtube_thumbnail = $data['thumbnail'] ?? '';
    $videoModel->status = $data['status'] ?? 'pending';
    
    if ($videoModel->create()) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Video metadata saved successfully',
            'data' => [
                'video_id' => $videoModel->id
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to save video metadata'
        ]);
    }
}
?>