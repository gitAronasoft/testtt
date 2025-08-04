<?php
require_once 'config.php';

// Configure session settings before starting
ini_set('session.cookie_lifetime', 86400);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    $user_id = $_SESSION['user']['id'] ?? null;
    $user_role = $_SESSION['user']['role'] ?? null;

    // Handle single video request
    if (isset($_GET['id'])) {
        $video_id = intval($_GET['id']);
        $sql = "
            SELECT v.*, u.name as uploader_name,
                   CASE WHEN p.user_id IS NOT NULL THEN 1 ELSE 0 END as purchased
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            LEFT JOIN purchases p ON v.id = p.video_id AND p.user_id = ?
            WHERE v.id = ?
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $user_id, $video_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Video not found']);
            $conn->close();
            return;
        }
        
        $row = $result->fetch_assoc();
        $video = [
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
            'is_youtube_synced' => (bool)$row['is_youtube_synced']
        ];
        
        echo json_encode(['success' => true, 'video' => $video]);
        $conn->close();
        return;
    }

    // Get filter parameters for multiple videos
    $filter = $_GET['filter'] ?? 'all';

    $sql = "
        SELECT v.*, u.name as uploader_name,
               CASE WHEN p.user_id IS NOT NULL THEN 1 ELSE 0 END as purchased
        FROM videos v 
        JOIN users u ON v.uploader_id = u.id 
        LEFT JOIN purchases p ON v.id = p.video_id AND p.user_id = ?
    ";

    $params = [$user_id];
    $types = "i";

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
            if ($user_role === 'viewer') {
                // Viewers can only see purchased videos in "my videos"
                $sql .= " WHERE p.user_id IS NOT NULL";
            } else {
                // Editors/admins see their uploaded videos
                $sql .= " WHERE v.uploader_id = ?";
                $params[] = $user_id;
                $types .= "i";
            }
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
    // Handle both JSON and FormData requests
    $input = null;
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
    } else if (strpos($contentType, 'multipart/form-data') !== false) {
        // Handle form data with file upload
        $input = $_POST;
        if (isset($_FILES['videoFile'])) {
            // Handle file upload (for traditional uploads)
            $uploadDir = 'uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $fileName = time() . '_' . $_FILES['videoFile']['name'];
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['videoFile']['tmp_name'], $targetPath)) {
                $input['file_path'] = $targetPath;
            }
        }
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
    }

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
    $required = ['title', 'description'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            echo json_encode(['success' => false, 'message' => 'Missing required field: ' . $field]);
            return;
        }
    }

    $title = trim($input['title']);
    $description = trim($input['description']);
    $price = floatval($input['price'] ?? 0);
    $category = $input['category'] ?? 'other';
    $file_path = $input['file_path'] ?? '';

    // YouTube-specific fields
    $youtube_id = $input['youtube_id'] ?? null;
    $youtube_thumbnail = $input['youtube_thumbnail'] ?? null;
    $youtube_channel_id = $input['youtube_channel_id'] ?? null;
    $youtube_channel_title = $input['youtube_channel_title'] ?? null;
    $youtube_views = intval($input['youtube_views'] ?? 0);
    $youtube_likes = intval($input['youtube_likes'] ?? 0);
    $youtube_comments = intval($input['youtube_comments'] ?? 0);
    $is_youtube_synced = isset($input['is_youtube_synced']) ? (bool)$input['is_youtube_synced'] : false;

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

    // Check if YouTube video already exists by youtube_id (if column exists)
    $columns_result = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_id'");
    $youtube_id_exists = $columns_result->num_rows > 0;

    if ($youtube_id_exists && !empty($youtube_id)) {
        $check_existing = $conn->prepare("SELECT id FROM videos WHERE youtube_id = ?");
        $check_existing->bind_param("s", $youtube_id);
        $check_existing->execute();
        $existing = $check_existing->get_result();

        if ($existing->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Video already exists in database']);
            $conn->close();
            return;
        }
    } else {
        // Check by title if youtube_id column doesn't exist
        $check_existing = $conn->prepare("SELECT id FROM videos WHERE title = ? AND uploader_id = ?");
        $check_existing->bind_param("si", $title, $_SESSION['user']['id']);
        $check_existing->execute();
        $existing = $check_existing->get_result();
        
        if ($existing->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Video already exists in database']);
            $conn->close();
            return;
        }
    }

    // Insert video with YouTube metadata
    $sql = "INSERT INTO videos (title, description, price, uploader_id, file_path, category, youtube_id, youtube_thumbnail, youtube_channel_id, youtube_channel_title, youtube_views, youtube_likes, youtube_comments, is_youtube_synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $insert_video = $conn->prepare($sql);
    $uploader_id = $_SESSION['user']['id'];
    $insert_video->bind_param("ssdsssssssiiib", 
        $title, $description, $price, $uploader_id, $file_path, $category,
        $youtube_id, $youtube_thumbnail, $youtube_channel_id, $youtube_channel_title,
        $youtube_views, $youtube_likes, $youtube_comments, $is_youtube_synced
    );

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
                'youtube_id' => $youtube_id,
                'youtube_thumbnail' => $youtube_thumbnail,
                'youtube_channel_id' => $youtube_channel_id,
                'youtube_channel_title' => $youtube_channel_title,
                'youtube_views' => $youtube_views,
                'youtube_likes' => $youtube_likes,
                'youtube_comments' => $youtube_comments,
                'is_youtube_synced' => $is_youtube_synced,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to upload video: ' . $conn->error]);
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
    
    // Allow view increment for all authenticated users, other actions require ownership/admin
    $is_view_increment = isset($input['action']) && $input['action'] === 'increment_views';
    
    if (!$is_view_increment && $video['uploader_id'] !== $_SESSION['user']['id'] && $_SESSION['user']['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Not authorized to edit this video']);
        $conn->close();
        return;
    }

    // Handle different update actions
    if (isset($input['action']) && $input['action'] === 'increment_views') {
        // Allow any authenticated user to increment view count
        $update_views = $conn->prepare("UPDATE videos SET views = views + 1 WHERE id = ?");
        $update_views->bind_param("i", $video_id);
        $update_views->execute();

        echo json_encode(['success' => true, 'message' => 'View count updated']);
    } else if (isset($input['action']) && $input['action'] === 'update_price' && isset($input['youtube_id'])) {
        // Update video price by YouTube ID
        $youtube_id = $input['youtube_id'];
        $price = floatval($input['price']);
        
        if ($price < 0) {
            echo json_encode(['success' => false, 'message' => 'Price cannot be negative']);
            $conn->close();
            return;
        }

        $update_price = $conn->prepare("UPDATE videos SET price = ? WHERE youtube_id = ? AND uploader_id = ?");
        $update_price->bind_param("dsi", $price, $youtube_id, $_SESSION['user']['id']);
        
        if ($update_price->execute()) {
            echo json_encode(['success' => true, 'message' => 'Video price updated']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update price']);
        }
    } else if (isset($input['price'])) {
        // Update video price by video ID
        $price = floatval($input['price']);
        if ($price < 0) {
            echo json_encode(['success' => false, 'message' => 'Price cannot be negative']);
            $conn->close();
            return;
        }

        $update_price = $conn->prepare("UPDATE videos SET price = ? WHERE id = ?");
        $update_price->bind_param("di", $price, $video_id);
        
        if ($update_price->execute()) {
            echo json_encode(['success' => true, 'message' => 'Video price updated']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update price']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'No valid update action specified']);
    }

    $conn->close();
}

function handleDeleteVideo() {
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
        echo json_encode(['success' => false, 'message' => 'Not authorized to delete this video']);
        $conn->close();
        return;
    }

    // Delete video
    $delete_video = $conn->prepare("DELETE FROM videos WHERE id = ?");
    $delete_video->bind_param("i", $video_id);

    if ($delete_video->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete video']);
    }

    $conn->close();
}
?>