<?php
require_once 'config.php';

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication - handle both session and cookie-based auth
$user = null;

// Check session first
if (isset($_SESSION['user'])) {
    $user = $_SESSION['user'];
} else {
    // Fallback: check if user_id cookie exists and validate it
    if (isset($_COOKIE['user_id'])) {
        $conn = getConnection();
        $user_id = $_COOKIE['user_id'];
        
        $get_user = $conn->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
        $get_user->bind_param("s", $user_id);
        $get_user->execute();
        $result = $get_user->get_result();
        
        if ($result->num_rows > 0) {
            $user_data = $result->fetch_assoc();
            $user = $user_data;
            // Restore session
            $_SESSION['user'] = $user;
        }
        $conn->close();
    }
}

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);
$video_id = $input['video_id'] ?? null;
$youtube_id = $input['youtube_id'] ?? null;

// Support both video_id and youtube_id for backward compatibility
if (!$video_id && !$youtube_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Video ID is required'
    ]);
    exit();
}

$conn = getConnection();
$user_id = $user['id'];
$user_role = $user['role'];

// Get video details - support both regular video ID and YouTube ID
if ($youtube_id) {
    $get_video = $conn->prepare("SELECT * FROM videos WHERE youtube_id = ?");
    $get_video->bind_param("s", $youtube_id);
} else {
    $get_video = $conn->prepare("SELECT * FROM videos WHERE id = ?");
    $get_video->bind_param("i", $video_id);
}

$get_video->execute();
$video_result = $get_video->get_result();

if ($video_result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Video not found']);
    $conn->close();
    exit();
}

$video = $video_result->fetch_assoc();

// Check access permissions
$has_access = false;

// Admin users have access to all videos
if ($user_role === 'admin') {
    $has_access = true;
}
// Free videos are accessible to all authenticated users
else if ($video['price'] == 0) {
    $has_access = true;
}
// Check if user has purchased the video
else {
    $check_purchase = $conn->prepare("SELECT id FROM purchases WHERE user_id = ? AND video_id = ?");
    $check_purchase->bind_param("ii", $user_id, $video['id']);
    $check_purchase->execute();
    $purchase_result = $check_purchase->get_result();

    if ($purchase_result->num_rows > 0) {
        $has_access = true;
    }
}

if ($has_access) {
    echo json_encode([
        'success' => true,
        'video' => [
            'id' => $video['id'],
            'title' => $video['title'],
            'file_path' => $video['file_path'],
            'youtube_id' => $video['youtube_id']
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Payment required',
        'video' => [
            'id' => $video['id'],
            'title' => $video['title'],
            'price' => (float)$video['price'],
            'youtube_id' => $video['youtube_id']
        ]
    ]);
}

$conn->close();
?>