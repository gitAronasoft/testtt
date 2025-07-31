
<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$userRole = requireRole(['viewer', 'editor', 'admin']);

try {
    $pdo = getDB();
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $videoId = $input['video_id'] ?? null;
    
    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID required']);
        exit;
    }
    
    // Check if video exists
    $stmt = $pdo->prepare("SELECT * FROM videos WHERE id = ?");
    $stmt->execute([$videoId]);
    $video = $stmt->fetch();
    
    if (!$video) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        exit;
    }
    
    // Check if already purchased
    $stmt = $pdo->prepare("SELECT id FROM purchases WHERE user_id = ? AND video_id = ?");
    $stmt->execute([$_SESSION['user_id'], $videoId]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo json_encode(['success' => false, 'message' => 'Video already purchased']);
        exit;
    }
    
    // Process purchase
    $pdo->beginTransaction();
    
    try {
        // Insert purchase record
        $stmt = $pdo->prepare("
            INSERT INTO purchases (user_id, video_id, purchase_price) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$_SESSION['user_id'], $videoId, $video['price']]);
        
        // Update video views (optional)
        $stmt = $pdo->prepare("UPDATE videos SET views = views + 1 WHERE id = ?");
        $stmt->execute([$videoId]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Purchase successful',
            'purchase_id' => $pdo->lastInsertId()
        ]);
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
