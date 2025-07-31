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
    handlePurchase();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleGetPurchases();
}

function handlePurchase() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['video_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        exit();
    }

    $video_id = intval($input['video_id']);
    $user_id = $_SESSION['user']['id'];

    $conn = getConnection();
    
    // Check if video exists and get its price
    $get_video = $conn->prepare("SELECT id, title, price FROM videos WHERE id = ?");
    $get_video->bind_param("i", $video_id);
    $get_video->execute();
    $result = $get_video->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        $conn->close();
        return;
    }
    
    $video = $result->fetch_assoc();
    
    // Check if user already purchased this video
    $check_purchase = $conn->prepare("SELECT id FROM purchases WHERE user_id = ? AND video_id = ?");
    $check_purchase->bind_param("si", $user_id, $video_id);
    $check_purchase->execute();
    $purchase_result = $check_purchase->get_result();
    
    if ($purchase_result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Video already purchased']);
        $conn->close();
        return;
    }
    
    // Check if video is free
    if ($video['price'] == 0) {
        echo json_encode(['success' => false, 'message' => 'This video is free, no purchase needed']);
        $conn->close();
        return;
    }
    
    // Insert purchase record
    $insert_purchase = $conn->prepare("INSERT INTO purchases (user_id, video_id, purchase_date) VALUES (?, ?, NOW())");
    $insert_purchase->bind_param("si", $user_id, $video_id);
    
    if ($insert_purchase->execute()) {
        $purchase_id = $conn->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => 'Video purchased successfully',
            'purchase' => [
                'id' => $purchase_id,
                'user_id' => $user_id,
                'video_id' => $video_id,
                'purchased_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Purchase failed']);
    }
    
    $conn->close();
}

function handleGetPurchases() {
    $user_id = $_SESSION['user']['id'];
    $conn = getConnection();
    
    // Get all purchases for the user
    $get_purchases = $conn->prepare("
        SELECT p.*, v.title, v.description, v.price, v.file_path, u.name as uploader_name
        FROM purchases p
        JOIN videos v ON p.video_id = v.id
        JOIN users u ON v.uploader_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.purchased_at DESC
    ");
    $get_purchases->bind_param("s", $user_id);
    $get_purchases->execute();
    $result = $get_purchases->get_result();
    
    $purchases = [];
    while ($row = $result->fetch_assoc()) {
        $purchases[] = [
            'id' => (int)$row['id'],
            'video_id' => (int)$row['video_id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'price' => (float)$row['price'],
            'uploader' => $row['uploader_name'],
            'file_path' => $row['file_path'],
            'purchased_at' => $row['purchased_at']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'purchases' => $purchases
    ]);
    
    $conn->close();
}
?>
