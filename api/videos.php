
<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $pdo = getDB();
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetVideos($pdo);
            break;
        case 'POST':
            handleCreateVideo($pdo);
            break;
        case 'PUT':
            handleUpdateVideo($pdo);
            break;
        case 'DELETE':
            handleDeleteVideo($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleGetVideos($pdo) {
    $session = checkAuth();
    
    try {
        $stmt = $pdo->prepare("
            SELECT v.*, u.name as uploader_name,
                   CASE WHEN p.id IS NOT NULL THEN true ELSE false END as purchased
            FROM videos v 
            LEFT JOIN users u ON v.uploaded_by = u.id 
            LEFT JOIN purchases p ON v.id = p.video_id AND p.user_id = ?
            ORDER BY v.created_at DESC
        ");
        $stmt->execute([$session['user_id'] ?? 0]);
        $videos = $stmt->fetchAll();
        
        $formattedVideos = [];
        foreach ($videos as $video) {
            $formattedVideos[] = [
                'id' => $video['id'],
                'title' => $video['title'],
                'description' => $video['description'],
                'price' => (float)$video['price'],
                'duration' => $video['duration'],
                'views' => $video['views'],
                'uploader' => $video['uploader_name'],
                'purchased' => $video['purchased'],
                'created_at' => $video['created_at']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'videos' => $formattedVideos
        ]);
    } catch (Exception $e) {
        throw new Exception('Error fetching videos: ' . $e->getMessage());
    }
}

function handleCreateVideo($pdo) {
    $userRole = requireRole(['editor', 'admin']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $title = $input['title'] ?? '';
    $description = $input['description'] ?? '';
    $price = $input['price'] ?? 0;
    $file_path = $input['file_path'] ?? '';
    
    if (empty($title) || empty($file_path)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Title and file path required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO videos (title, description, price, file_path, uploaded_by) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $description, $price, $file_path, $_SESSION['user_id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Video uploaded successfully',
            'video_id' => $pdo->lastInsertId()
        ]);
    } catch (Exception $e) {
        throw new Exception('Error creating video: ' . $e->getMessage());
    }
}

function handleUpdateVideo($pdo) {
    $userRole = requireRole(['editor', 'admin']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $videoId = $_GET['id'] ?? $input['id'] ?? null;
    
    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID required']);
        return;
    }
    
    // Check ownership or admin role
    if ($userRole !== 'admin') {
        $stmt = $pdo->prepare("SELECT uploaded_by FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video || $video['uploaded_by'] != $_SESSION['user_id']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE videos 
            SET title = ?, description = ?, price = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([
            $input['title'],
            $input['description'],
            $input['price'],
            $videoId
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Video updated successfully']);
    } catch (Exception $e) {
        throw new Exception('Error updating video: ' . $e->getMessage());
    }
}

function handleDeleteVideo($pdo) {
    $userRole = requireRole(['editor', 'admin']);
    
    $videoId = $_GET['id'] ?? null;
    
    if (!$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Video ID required']);
        return;
    }
    
    // Check ownership or admin role
    if ($userRole !== 'admin') {
        $stmt = $pdo->prepare("SELECT uploaded_by FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video || $video['uploaded_by'] != $_SESSION['user_id']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        
        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } catch (Exception $e) {
        throw new Exception('Error deleting video: ' . $e->getMessage());
    }
}
?>
