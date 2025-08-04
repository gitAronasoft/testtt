<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication - ensure session is properly started
if (!isset($_SESSION['user']) || empty($_SESSION['user'])) {
    // Try to refresh session
    if (isset($_COOKIE['PHPSESSID'])) {
        session_regenerate_id(false);
    }
    
    if (!isset($_SESSION['user'])) {
        error_log("Video access: Authentication required - no user session");
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit();
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$youtube_id = $input['youtube_id'] ?? null;
$video_id = $input['video_id'] ?? null;

if (!$youtube_id && !$video_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Video ID or YouTube ID required']);
    exit();
}

$conn = getConnection();
$user_id = $_SESSION['user']['id'];
$user_role = $_SESSION['user']['role'];

try {
    // Get video information
    if ($video_id) {
        $video_stmt = $conn->prepare("SELECT * FROM videos WHERE id = ?");
        $video_stmt->bind_param("i", $video_id);
    } else {
        $video_stmt = $conn->prepare("SELECT * FROM videos WHERE youtube_id = ?");
        $video_stmt->bind_param("s", $youtube_id);
    }

    $video_stmt->execute();
    $video_result = $video_stmt->get_result();

    if ($video_result->num_rows === 0) {
        error_log("Video access: Video not found - video_id: $video_id, youtube_id: $youtube_id, user_id: $user_id");
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        exit();
    }

    $video = $video_result->fetch_assoc();

    // Admin, Editor, and Creator have full access
    if (in_array($user_role, ['admin', 'editor', 'creator'])) {
        echo json_encode(['success' => true, 'message' => 'Admin/Editor/Creator access granted']);
        exit();
    }

    // Check if user is the uploader
    if ($video['uploader_id'] == $user_id) {
        echo json_encode(['success' => true, 'message' => 'Owner access granted']);
        exit();
    }

    // For viewers, check access permissions
    if ($user_role === 'viewer') {
        // Check if video is free - viewers can watch free videos
        if (floatval($video['price']) === 0.0) {
            echo json_encode(['success' => true, 'message' => 'Free video access granted']);
            exit();
        }

        // For paid videos, check if user has purchased it
        $purchase_stmt = $conn->prepare("SELECT * FROM purchases WHERE user_id = ? AND video_id = ?");
        $purchase_stmt->bind_param("ii", $user_id, $video['id']);
        $purchase_stmt->execute();
        $purchase_result = $purchase_stmt->get_result();

        if ($purchase_result->num_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Purchased video access granted']);
            exit();
        }

        // Payment required for paid videos
        echo json_encode([
            'success' => false, 
            'message' => 'Payment required',
            'video' => [
                'id' => $video['id'],
                'title' => $video['title'],
                'price' => (float)$video['price']
            ]
        ]);
        exit();
    }

    // Default access granted for other roles
    echo json_encode(['success' => true, 'message' => 'Access granted']);

} catch (Exception $e) {
    error_log("Video access error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error']);
} finally {
    $conn->close();
}
?>