<?php
session_start();
require_once 'config.php';

// Set content type as JSON
header('Content-Type: application/json');

// Allow only your frontend domain for CORS (if you're using credentials)
header('Access-Control-Allow-Origin: https://your-frontend-domain.com'); // Replace with your actual frontend URL

// Allow required HTTP methods
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Allow specific headers for cross-origin requests
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Allow credentials (cookies, HTTP auth headers, etc.)
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS preflight requests (for browsers)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); // OK
    exit();
}

// Error handler to ensure JSON responses
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $message]);
    exit();
});

// Exception handler
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Exception: ' . $exception->getMessage()]);
    exit();
});

// Check authentication for POST, PUT, DELETE requests
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE']) && !isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGetVideos();
        break;
    case 'POST':
        handleUploadVideo();
        break;
    case 'PUT':
        handleUpdateVideo();
        break;
    case 'DELETE':
        handleDeleteVideo();
        break;
}

function handleGetVideos() {
    $conn = getConnection();

    // Get filter parameters
    $filter = $_GET['filter'] ?? 'all';
    $user_id = $_SESSION['user']['id'] ?? null;

    $sql = "
        SELECT v.*, u.name as uploader_name,
               CASE WHEN p.user_id IS NOT NULL THEN 1 ELSE 0 END as purchased
        FROM videos v 
        JOIN users u ON v.uploader_id = u.id 
        LEFT JOIN purchases p ON v.id = p.video_id AND p.user_id = ?
    ";

    $params = [$user_id];
    $types = "s";

    // Apply filters
    switch ($filter) {
        case 'free':
            $sql .= " WHERE v.price = 0";
            break;
        case 'paid':
            $sql .= " WHERE v.price > 0";
            break;
        case 'purchased':
            $sql .= " WHERE p.user_id IS NOT NULL";
            break;
        case 'my_videos':
            $sql .= " WHERE v.uploader_id = ?";
            $params[] = $user_id;
            $types .= "s";
            break;
    }

    $sql .= " ORDER BY v.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $videos = [];
    while ($row = $result->fetch_assoc()) {
        $videos[] = [
            'id' => (int)$row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'price' => (float)$row['price'],
            'uploader' => $row['uploader_name'],
            'uploader_id' => $row['uploader_id'],
            'views' => (int)$row['views'],
            'purchased' => (bool)$row['purchased'],
            'file_path' => $row['file_path'],
            'category' => $row['category'],
            'created_at' => $row['created_at'],
            'youtube_id' => $row['youtube_id'],
            'youtube_thumbnail' => $row['youtube_thumbnail'],
            'youtube_channel_id' => $row['youtube_channel_id'],
            'youtube_channel_title' => $row['youtube_channel_title'],
            'youtube_views' => (int)($row['youtube_views'] ?? 0),
            'youtube_likes' => (int)($row['youtube_likes'] ?? 0),
            'youtube_comments' => (int)($row['youtube_comments'] ?? 0),
            'is_youtube_synced' => (bool)$row['is_youtube_synced'],
            'video_url' => $row['youtube_id'] ? "https://www.youtube.com/watch?v={$row['youtube_id']}" : null,
            'embed_html' => $row['youtube_id'] ? "<iframe width='560' height='315' src='https://www.youtube.com/embed/{$row['youtube_id']}' frameborder='0' allowfullscreen></iframe>" : null
        ];
    }

    echo json_encode([
        'success' => true,
        'videos' => $videos
    ]);

    $conn->close();
}

function handleUploadVideo() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request data']);
        return;
    }

    // Check if user has permission to upload
    if (!in_array($_SESSION['user']['role'], ['editor', 'admin'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only editors can upload videos']);
        return;
    }

    // Validate required fields
    $required = ['title', 'description', 'price'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            echo json_encode(['success' => false, 'message' => 'Missing required field: ' . $field]);
            return;
        }
    }

    $title = trim($input['title']);
    $description = trim($input['description']);
    $price = floatval($input['price']);
    $category = $input['category'] ?? 'other';
    $file_path = $input['file_path'] ?? '';

    // Validate data
    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        return;
    }

    if ($price < 0) {
        echo json_encode(['success' => false, 'message' => 'Price cannot be negative']);
        return;
    }

    $conn = getConnection();

    // Insert video
    $insert_video = $conn->prepare("INSERT INTO videos (title, description, price, uploader_id, file_path, category) VALUES (?, ?, ?, ?, ?, ?)");
    $uploader_id = $_SESSION['user']['id'];
    $insert_video->bind_param("ssdsss", $title, $description, $price, $uploader_id, $file_path, $category);

    if ($insert_video->execute()) {
        $video_id = $conn->insert_id;

        echo json_encode([
            'success' => true,
            'message' => 'Video uploaded successfully',
            'video' => [
                'id' => $video_id,
                'title' => $title,
                'description' => $description,
                'price' => $price,
                'uploader' => $_SESSION['user']['name'],
                'views' => 0,
                'purchased' => false,
                'file_path' => $file_path,
                'category' => $category,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to upload video']);
    }

    $conn->close();
}

function handleUpdateVideo() {
    parse_str(file_get_contents("php://input"), $input);
    $video_id = $input['id'] ?? null;

    if (!$video_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    $conn = getConnection();

    // Check if user owns the video or is admin
    $check_owner = $conn->prepare("SELECT uploader_id FROM videos WHERE id = ?");
    $check_owner->bind_param("i", $video_id);
    $check_owner->execute();
    $result = $check_owner->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        $conn->close();
        return;
    }

    $video = $result->fetch_assoc();
    if ($video['uploader_id'] !== $_SESSION['user']['id'] && $_SESSION['user']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Not authorized to edit this video']);
        $conn->close();
        return;
    }

    // Increment view count
    if (isset($input['action']) && $input['action'] === 'increment_views') {
        $update_views = $conn->prepare("UPDATE videos SET views = views + 1 WHERE id = ?");
        $update_views->bind_param("i", $video_id);
        $update_views->execute();

        echo json_encode(['success' => true, 'message' => 'View count updated']);
    }

    $conn->close();
}

function handleDeleteVideo() {
    if (!isset($_POST['id'])) {
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    $conn = getConnection();
    $video_id = $_POST['id'];
    $user_id = $_SESSION['user']['id'];

    try {
        // Check if user owns the video or is admin
        $stmt = $conn->prepare("SELECT uploader_id FROM videos WHERE id = ?");
        $stmt->bind_param("i", $video_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Video not found']);
            return;
        }

        $video = $result->fetch_assoc();
        if ($video['uploader_id'] !== $user_id && $_SESSION['user']['role'] !== 'admin') {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        // Delete video
        $stmt = $conn->prepare("DELETE FROM videos WHERE id = ?");
        $stmt->bind_param("i", $video_id);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error deleting video: ' . $e->getMessage()]);
    }

    $conn->close();
}

function handleYouTubeSync() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['videos']) || !is_array($input['videos'])) {
        echo json_encode(['success' => false, 'message' => 'Videos data is required']);
        return;
    }

    $conn = getConnection();
    $user_id = $_SESSION['user']['id'];
    $videos = $input['videos'];
    $synced_count = 0;
    $errors = [];

    try {
        foreach ($videos as $video) {
            // Check if video already exists
            $check_stmt = $conn->prepare("SELECT id FROM videos WHERE youtube_id = ?");
            $check_stmt->bind_param("s", $video['youtube_id']);
            $check_stmt->execute();
            $existing = $check_stmt->get_result();

            if ($existing->num_rows > 0) {
                // Update existing video
                $update_stmt = $conn->prepare("
                    UPDATE videos SET 
                    title = ?, 
                    description = ?, 
                    youtube_thumbnail = ?, 
                    youtube_channel_id = ?, 
                    youtube_channel_title = ?,
                    is_youtube_synced = TRUE
                    WHERE youtube_id = ?
                ");
                $update_stmt->bind_param("ssssss", 
                    $video['title'], 
                    $video['description'], 
                    $video['youtube_thumbnail'],
                    $video['youtube_channel_id'],
                    $video['youtube_channel_title'],
                    $video['youtube_id']
                );
                $update_stmt->execute();
            } else {
                // Insert new video
                $insert_stmt = $conn->prepare("
                    INSERT INTO videos (
                        title, description, uploader_id, youtube_id, 
                        youtube_thumbnail, youtube_channel_id, youtube_channel_title,
                        is_youtube_synced, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
                ");
                $created_at = date('Y-m-d H:i:s', strtotime($video['created_at']));
                $insert_stmt->bind_param("ssssssss", 
                    $video['title'], 
                    $video['description'], 
                    $user_id,
                    $video['youtube_id'],
                    $video['youtube_thumbnail'],
                    $video['youtube_channel_id'],
                    $video['youtube_channel_title'],
                    $created_at
                );
                $insert_stmt->execute();
            }
            $synced_count++;
        }

        echo json_encode([
            'success' => true, 
            'message' => "Successfully synced {$synced_count} videos from YouTube",
            'synced_count' => $synced_count
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'success' => false, 
            'message' => 'Error syncing videos: ' . $e->getMessage()
        ]);
    }

    $conn->close();
}

// Handle different request methods properly
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    if ($action === 'sync_youtube_video') {
        handleSyncYouTubeVideo($input['video']);
        exit();
    } elseif ($action === 'sync_youtube_videos') {
        syncYouTubeVideos();
        exit();
    }
}

// Handle GET request actions
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    $action = $_GET['action'];
    
    if ($action === 'get_synced_videos') {
        getSyncedYouTubeVideos();
        exit();
    }
}

function handleSyncYouTubeVideo($videoData) {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }

    if (!$videoData || !isset($videoData['youtube_id'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid video data']);
        return;
    }

    $conn = getConnection();
    
    try {
        // Check if video already exists in youtube_videos table
        $check_stmt = $conn->prepare("SELECT id FROM youtube_videos WHERE youtube_video_id = ?");
        $check_stmt->bind_param("s", $videoData['youtube_id']);
        $check_stmt->execute();
        $existing = $check_stmt->get_result();

        if ($existing->num_rows > 0) {
            // Update existing video
            $update_stmt = $conn->prepare("
                UPDATE youtube_videos SET 
                    title = ?, description = ?, thumbnail_url = ?, duration = ?,
                    view_count = ?, like_count = ?, comment_count = ?,
                    privacy_status = ?, upload_status = ?, channel_id = ?,
                    channel_title = ?, tags = ?, category_id = ?, default_language = ?,
                    last_updated = NOW()
                WHERE youtube_video_id = ?
            ");
            
            $tags_json = json_encode($videoData['tags'] ?? []);
            
            $update_stmt->bind_param("ssssiissssssss",
                $videoData['title'],
                $videoData['description'],
                $videoData['thumbnail'],
                $videoData['duration'],
                $videoData['view_count'],
                $videoData['like_count'],
                $videoData['comment_count'],
                $videoData['privacy_status'],
                $videoData['upload_status'],
                $videoData['channel_id'],
                $videoData['channel_title'],
                $tags_json,
                $videoData['category_id'],
                $videoData['default_language'],
                $videoData['youtube_id']
            );
            
            $update_stmt->execute();
            echo json_encode(['success' => true, 'message' => 'Video updated in database']);
        } else {
            // Insert new video
            $insert_stmt = $conn->prepare("
                INSERT INTO youtube_videos (
                    youtube_video_id, title, description, thumbnail_url, duration,
                    published_at, view_count, like_count, comment_count,
                    privacy_status, upload_status, channel_id, channel_title,
                    tags, category_id, default_language, synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $published_at = isset($videoData['published_at']) ? date('Y-m-d H:i:s', strtotime($videoData['published_at'])) : null;
            $tags_json = json_encode($videoData['tags'] ?? []);
            
            $insert_stmt->bind_param("sssssiiissssssss",
                $videoData['youtube_id'],
                $videoData['title'],
                $videoData['description'],
                $videoData['thumbnail'],
                $videoData['duration'],
                $published_at,
                $videoData['view_count'],
                $videoData['like_count'],
                $videoData['comment_count'],
                $videoData['privacy_status'],
                $videoData['upload_status'],
                $videoData['channel_id'],
                $videoData['channel_title'],
                $tags_json,
                $videoData['category_id'],
                $videoData['default_language']
            );
            
            $insert_stmt->execute();
            echo json_encode(['success' => true, 'message' => 'Video synced to database']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }

    $conn->close();
}

function getSyncedYouTubeVideos() {
    $conn = getConnection();
    
    try {
        $limit = isset($_GET['limit']) ? min(intval($_GET['limit']), 100) : 50;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        
        $stmt = $conn->prepare("
            SELECT youtube_video_id, title, description, thumbnail_url, duration,
                   published_at, view_count, like_count, comment_count,
                   privacy_status, upload_status, channel_id, channel_title,
                   tags, category_id, synced_at, last_updated
            FROM youtube_videos 
            ORDER BY published_at DESC 
            LIMIT ? OFFSET ?
        ");
        
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $videos = [];
        while ($row = $result->fetch_assoc()) {
            $row['tags'] = json_decode($row['tags'], true) ?? [];
            $videos[] = $row;
        }
        
        // Get total count
        $count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM youtube_videos");
        $count_stmt->execute();
        $count_result = $count_stmt->get_result();
        $total = $count_result->fetch_assoc()['total'];
        
        echo json_encode([
            'success' => true,
            'videos' => $videos,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get synced videos: ' . $e->getMessage()]);
    }
    
    $conn->close();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? 'upload';
} else {
    $action = $_GET['action'] ?? 'get';
}

switch ($action) {
    case 'get':
        handleGetVideos();
        break;
    case 'create':
    case 'upload':
        handleUploadVideo();
        break;
    case 'sync_youtube_videos':
        handleYouTubeSync();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
}

function uploadVideo() {
    echo json_encode(['success' => false, 'message' => 'Upload feature not implemented']);
}

function syncYouTubeVideos() {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit();
    }

    // Error handler to ensure JSON responses
    set_error_handler(function($severity, $message, $file, $line) {
        echo json_encode(['success' => false, 'message' => 'PHP Error: ' . $message]);
        exit();
    });

    // Exception handler
    set_exception_handler(function($exception) {
        echo json_encode(['success' => false, 'message' => 'Exception: ' . $exception->getMessage()]);
        exit();
    });

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['videos']) || !is_array($input['videos'])) {
        echo json_encode(['success' => false, 'message' => 'No videos provided']);
        return;
    }

    $videos = $input['videos'];
    $user_id = $_SESSION['user']['id'];
    $conn = getConnection();
    $synced_count = 0;
    $errors = [];

    foreach ($videos as $video) {
        try {
            // Check if video already exists
            $check_stmt = $conn->prepare("SELECT id FROM videos WHERE youtube_id = ?");
            $check_stmt->bind_param("s", $video['youtube_id']);
            $check_stmt->execute();
            $result = $check_stmt->get_result();

            if ($result->num_rows === 0) {
                // Insert new video with enhanced data
                $insert_stmt = $conn->prepare("
                    INSERT INTO videos (
                        title, description, uploader_id, youtube_id, youtube_thumbnail, 
                        youtube_channel_id, youtube_channel_title, youtube_views, 
                        youtube_likes, youtube_comments, is_youtube_synced, created_at,
                        category, price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'youtube', 0)
                ");

                $created_at = date('Y-m-d H:i:s', strtotime($video['published_at']));
                $youtube_views = isset($video['view_count']) ? intval($video['view_count']) : 0;
                $youtube_likes = isset($video['like_count']) ? intval($video['like_count']) : 0;
                $youtube_comments = isset($video['comment_count']) ? intval($video['comment_count']) : 0;

                $insert_stmt->bind_param("sssssssiiis", 
                    $video['title'], 
                    $video['description'], 
                    $user_id, 
                    $video['youtube_id'],
                    $video['thumbnail'],
                    $video['channel_id'],
                    $video['channel_title'],
                    $youtube_views,
                    $youtube_likes,
                    $youtube_comments,
                    $created_at
                );

                if ($insert_stmt->execute()) {
                    $synced_count++;
                } else {
                    $errors[] = "Failed to insert: " . $video['title'];
                }
            } else {
                // Update existing video with enhanced data
                $update_stmt = $conn->prepare("
                    UPDATE videos 
                    SET title = ?, description = ?, youtube_thumbnail = ?, 
                        youtube_channel_id = ?, youtube_channel_title = ?, 
                        youtube_views = ?, youtube_likes = ?, youtube_comments = ?,
                        is_youtube_synced = 1
                    WHERE youtube_id = ?
                ");

                $youtube_views = isset($video['view_count']) ? intval($video['view_count']) : 0;
                $youtube_likes = isset($video['like_count']) ? intval($video['like_count']) : 0;
                $youtube_comments = isset($video['comment_count']) ? intval($video['comment_count']) : 0;

                $update_stmt->bind_param("sssssiiis", 
                    $video['title'], 
                    $video['description'], 
                    $video['thumbnail'],
                    $video['channel_id'],
                    $video['channel_title'],
                    $youtube_views,
                    $youtube_likes,
                    $youtube_comments,
                    $video['youtube_id']
                );

                $update_stmt->execute();
            }
        } catch (Exception $e) {
            $errors[] = "Error processing " . $video['title'] . ": " . $e->getMessage();
        }
    }

    $conn->close();

    $message = "Synced {$synced_count} videos successfully";
    if (!empty($errors)) {
        $message .= ". Some errors occurred.";
    }

    echo json_encode([
        'success' => true,
        'synced_count' => $synced_count,
        'total_videos' => count($videos),
        'message' => $message,
        'errors' => $errors
    ]);
}
?>
</replit_final_file>