
<?php
session_start();
require_once 'config.php';

// Set content type as JSON
header('Content-Type: application/json');

// Handle OPTIONS preflight requests (for browsers)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

// For admin-only operations, check role
$admin_only_actions = ['sync_youtube', 'delete'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (in_array($action, $admin_only_actions) && $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required for this action']);
    exit();
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $get_action = $_GET['action'] ?? 'get_videos';
        switch ($get_action) {
            case 'all':
            case 'featured':
            case 'my_videos':
                handleGetVideos();
                break;
            default:
                handleGetVideos();
                break;
        }
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
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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

    // Handle YouTube sync
    if (isset($input['action']) && $input['action'] === 'sync_youtube_videos') {
        handleYouTubeSyncVideos($input);
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
    $youtube_id = $input['youtube_id'] ?? null;

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

    // Insert video with YouTube ID if provided
    if ($youtube_id) {
        $insert_video = $conn->prepare("INSERT INTO videos (title, description, price, uploader_id, file_path, category, youtube_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $uploader_id = $_SESSION['user']['id'];
        $insert_video->bind_param("ssdssss", $title, $description, $price, $uploader_id, $file_path, $category, $youtube_id);
    } else {
        $insert_video = $conn->prepare("INSERT INTO videos (title, description, price, uploader_id, file_path, category) VALUES (?, ?, ?, ?, ?, ?)");
        $uploader_id = $_SESSION['user']['id'];
        $insert_video->bind_param("ssdsss", $title, $description, $price, $uploader_id, $file_path, $category);
    }

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
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to upload video']);
    }

    $conn->close();
}



function handleUpdateVideo() {
    // Handle view increment
    if (isset($_POST['action']) && $_POST['action'] === 'increment_views') {
        $video_id = $_POST['id'] ?? '';

        if (empty($video_id)) {
            echo json_encode(['success' => false, 'message' => 'Video ID required']);
            return;
        }

        $conn = getConnection();
        $update_views = $conn->prepare("UPDATE videos SET views = views + 1 WHERE id = ?");
        $update_views->bind_param("s", $video_id);

        if ($update_views->execute()) {
            echo json_encode(['success' => true, 'message' => 'View count updated']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update view count']);
        }

        $conn->close();
        return;
    }

    // Handle video update
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || $input['action'] !== 'update_video') {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }

    session_start();
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }

    $user = $_SESSION['user'];
    $video_id = $input['id'] ?? '';
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $price = floatval($input['price'] ?? 0);

    if (empty($video_id) || empty($title) || empty($description)) {
        echo json_encode(['success' => false, 'message' => 'Video ID, title, and description are required']);
        return;
    }

    $conn = getConnection();

    // Check if user owns the video or is admin
    $check_ownership = $conn->prepare("SELECT uploader_id FROM videos WHERE id = ?");
    $check_ownership->bind_param("s", $video_id);
    $check_ownership->execute();
    $result = $check_ownership->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        $conn->close();
        return;
    }

    $video = $result->fetch_assoc();
    if ($video['uploader_id'] !== $user['id'] && $user['role'] !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Permission denied']);
        $conn->close();
        return;
    }

    // Update video
    $update_video = $conn->prepare("UPDATE videos SET title = ?, description = ?, price = ?, updated_at = NOW() WHERE id = ?");
    $update_video->bind_param("ssds", $title, $description, $price, $video_id);

    if ($update_video->execute()) {
        echo json_encode(['success' => true, 'message' => 'Video updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update video']);
    }

    $conn->close();
}

function handleDeleteVideo() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || $input['action'] !== 'delete_video') {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
        return;
    }

    session_start();
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }

    $user = $_SESSION['user'];
    $video_id = $input['id'] ?? '';

    if (empty($video_id)) {
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        return;
    }

    $conn = getConnection();

    // Check if user owns the video or is admin
    $check_ownership = $conn->prepare("SELECT uploader_id, file_path FROM videos WHERE id = ?");
    $check_ownership->bind_param("s", $video_id);
    $check_ownership->execute();
    $result = $check_ownership->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        $conn->close();
        return;
    }

    $video = $result->fetch_assoc();
    if ($video['uploader_id'] !== $user['id'] && $user['role'] !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Permission denied']);
        $conn->close();
        return;
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Delete related purchases first
        $delete_purchases = $conn->prepare("DELETE FROM purchases WHERE video_id = ?");
        $delete_purchases->bind_param("s", $video_id);
        $delete_purchases->execute();

        // Delete video record
        $delete_video = $conn->prepare("DELETE FROM videos WHERE id = ?");
        $delete_video->bind_param("s", $video_id);
        $delete_video->execute();

        // Delete physical file if it exists
        if (!empty($video['file_path']) && file_exists($video['file_path'])) {
            unlink($video['file_path']);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Failed to delete video: ' . $e->getMessage()]);
    }

    $conn->close();
}

?>
