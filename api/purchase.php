<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_SESSION['user']['id'];

switch ($method) {
    case 'GET':
        handleGetPurchases($user_id);
        break;
    case 'POST':
        handlePurchase($user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function handleGetPurchases($user_id) {
    $conn = getConnection();

    $sql = "SELECT p.id, p.video_id, COALESCE(p.amount, v.price) as amount, p.created_at,
                   v.title, v.description, v.price, v.category,
                   u.name as uploader
            FROM purchases p
            JOIN videos v ON p.video_id = v.id
            JOIN users u ON v.uploader_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $purchases = [];
    while ($row = $result->fetch_assoc()) {
        $purchases[] = [
            'id' => $row['id'],
            'video_id' => $row['video_id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'price' => (float)$row['price'],
            'category' => $row['category'],
            'uploader' => $row['uploader'],
            'purchased_at' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'purchases' => $purchases
    ]);

    $conn->close();
}

function handlePurchase($user_id) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['video_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID is required']);
        exit();
    }

    $video_id = intval($input['video_id']);
    $conn = getConnection();

    try {
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

        // Create purchase record
        $purchase_id = uniqid('purchase_', true);
        $insert_purchase = $conn->prepare("INSERT INTO purchases (id, user_id, video_id, amount, created_at) VALUES (?, ?, ?, ?, NOW())");
        $insert_purchase->bind_param("ssid", $purchase_id, $user_id, $video_id, $video['price']);

        if ($insert_purchase->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Video purchased successfully',
                'purchase' => [
                    'id' => $purchase_id,
                    'video_id' => $video_id,
                    'video_title' => $video['title'],
                    'amount' => (float)$video['price']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to process purchase']);
        }

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Purchase failed: ' . $e->getMessage()]);
    }

    $conn->close();
}
?>
