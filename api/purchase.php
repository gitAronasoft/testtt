
<?php
// Configure session settings before starting
ini_set('session.cookie_lifetime', 86400);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

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

session_start();

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

if (!$input || !isset($input['video_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Video ID is required']);
    exit();
}

$video_id = intval($input['video_id']);
$user_id = $_SESSION['user']['id'];

// TODO: Database integration
// - Check if video exists and get its price
// - Check if user already purchased this video
// - Process payment (integrate with payment gateway)
// - Record purchase in database

// For now, simulate successful purchase
echo json_encode([
    'success' => true,
    'message' => 'Video purchased successfully',
    'purchase' => [
        'id' => uniqid(),
        'user_id' => $user_id,
        'video_id' => $video_id,
        'purchased_at' => date('Y-m-d H:i:s')
    ]
]);
?>
