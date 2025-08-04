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

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
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

// Check if video exists and get its details
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
    echo json_encode(['success' => false, 'message' => 'Video not found']);
    exit();
}

$video = $video_result->fetch_assoc();

// Check if video is free
if ($video['price'] == 0) {
    echo json_encode(['success' => true, 'message' => 'Free video access granted']);
    exit();
}

// Check if user is the uploader
if ($video['uploader_id'] == $user_id) {
    echo json_encode(['success' => true, 'message' => 'Owner access granted']);
    exit();
}

// Check if user is admin
if ($_SESSION['user']['role'] === 'admin') {
    echo json_encode(['success' => true, 'message' => 'Admin access granted']);
    exit();
}

// Check if user has purchased the video
$purchase_stmt = $conn->prepare("SELECT * FROM purchases WHERE user_id = ? AND video_id = ?");
$purchase_stmt->bind_param("ii", $user_id, $video['id']);
$purchase_stmt->execute();
$purchase_result = $purchase_stmt->get_result();

if ($purchase_result->num_rows > 0) {
    echo json_encode(['success' => true, 'message' => 'Purchased video access granted']);
    exit();
}

// Payment required
echo json_encode([
    'success' => false, 
    'message' => 'Payment required',
    'video' => [
        'id' => $video['id'],
        'title' => $video['title'],
        'price' => (float)$video['price']
    ]
]);

$conn->close();
?>
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

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

$user_id = $_SESSION['user']['id'];
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['youtube_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'YouTube ID required']);
    exit();
}

$youtube_id = $input['youtube_id'];
$conn = getConnection();

try {
    // Get video information
    $video_sql = "SELECT id, title, price, uploader_id FROM videos WHERE youtube_id = ?";
    $video_stmt = $conn->prepare($video_sql);
    $video_stmt->bind_param("s", $youtube_id);
    $video_stmt->execute();
    $video_result = $video_stmt->get_result();

    if ($video_result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        exit();
    }

    $video = $video_result->fetch_assoc();

    // Check if user is the uploader
    if ($video['uploader_id'] === $user_id) {
        echo json_encode(['success' => true, 'message' => 'Access granted - owner']);
        exit();
    }

    // Check if video is free
    if (floatval($video['price']) === 0.0) {
        echo json_encode(['success' => true, 'message' => 'Access granted - free video']);
        exit();
    }

    // Check if user has purchased the video
    $purchase_sql = "SELECT id FROM purchases WHERE user_id = ? AND video_id = ?";
    $purchase_stmt = $conn->prepare($purchase_sql);
    $purchase_stmt->bind_param("ss", $user_id, $video['id']);
    $purchase_stmt->execute();
    $purchase_result = $purchase_stmt->get_result();

    if ($purchase_result->num_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Access granted - purchased']);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Payment required',
            'video' => [
                'id' => $video['id'],
                'title' => $video['title'],
                'price' => floatval($video['price'])
            ]
        ]);
    }

} catch (Exception $e) {
    error_log("Video access error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error']);
} finally {
    $conn->close();
}
?>
