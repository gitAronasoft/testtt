<?php
require_once 'config.php';

// Configure session settings before starting
ini_set('session.cookie_lifetime', 86400);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handleVideoAccess();
}

function handleVideoAccess() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['video_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        exit();
    }

    $video_id = intval($input['video_id']);
    $user_id = $_SESSION['user']['id'];
    $user_role = $_SESSION['user']['role'];

    $conn = getConnection();

    // Get video details
    $sql = "SELECT * FROM videos WHERE id = ? OR youtube_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $video_id, $video_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        exit();
    }

    $video = $result->fetch_assoc();

    // Check access permissions
    $can_access = false;
    $reason = '';

    // Admin can access everything
    if ($user_role === 'admin') {
        $can_access = true;
        $reason = 'Admin access';
    }
    // Creator can access their own videos
    elseif ($user_role === 'editor' && $video['uploader_id'] === $user_id) {
        $can_access = true;
        $reason = 'Owner access';
    }
    // Free videos can be accessed by everyone
    elseif ($video['price'] == 0) {
        $can_access = true;
        $reason = 'Free video';
    }
    // Check if payment is required (YouTube videos are always free to watch)
    if ($video['price'] > 0 && $user['role'] !== 'admin' && !$video['is_youtube_synced']) {
        // Check if user has purchased this video
        $purchase_sql = "SELECT * FROM purchases WHERE user_id = ? AND video_id = ?";
        $purchase_stmt = $conn->prepare($purchase_sql);
        $purchase_stmt->bind_param("ii", $user_id, $video['id']);
        $purchase_stmt->execute();
        $purchase_result = $purchase_stmt->get_result();

        if ($purchase_result->num_rows === 0) {
            echo json_encode([
                'success' => false, 
                'message' => 'Payment required',
                'video' => [
                    'id' => $video['id'],
                    'title' => $video['title'],
                    'price' => $video['price']
                ]
            ]);
            exit();
        }
    }

    // Increment view count if access is granted
    if ($can_access) {
        $update_views = $conn->prepare("UPDATE videos SET views = views + 1 WHERE id = ?");
        $update_views->bind_param("i", $video['id']);
        $update_views->execute();
    }

    echo json_encode([
        'success' => $can_access,
        'message' => $reason,
        'video' => $can_access ? [
            'id' => $video['id'],
            'title' => $video['title'],
            'price' => (float)$video['price']
        ] : null
    ]);

    $conn->close();
}
?>