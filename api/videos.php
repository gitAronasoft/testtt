
<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$pdo = getDB();

if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
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
        break;
}

function handleGetVideos($pdo) {
    try {
        // Get all videos from database
        $stmt = $pdo->prepare("SELECT * FROM videos ORDER BY created_at DESC");
        $stmt->execute();
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format videos for frontend
        $formattedVideos = [];
        foreach ($videos as $video) {
            $formattedVideos[] = [
                'id' => $video['video_id'],
                'title' => $video['title'],
                'description' => $video['description'],
                'thumbnail' => $video['thumbnail_url'] ?: 'https://via.placeholder.com/320x180/667eea/ffffff?text=' . urlencode($video['title']),
                'duration' => $video['duration'] ?: '10:30',
                'views' => number_format($video['view_count']),
                'likes' => number_format($video['like_count']),
                'price' => floatval($video['price']),
                'publishedAt' => $video['published_at'] ?: $video['created_at'],
                'channel_id' => $video['channel_id']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'videos' => $formattedVideos,
            'count' => count($formattedVideos)
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error fetching videos: ' . $e->getMessage()
        ]);
    }
}

function handleCreateVideo($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO videos (channel_id, video_id, title, description, thumbnail_url, duration, price) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['channel_id'] ?? 'UC_DemoChannel123',
            $input['video_id'] ?? 'VID_' . time(),
            $input['title'],
            $input['description'] ?? '',
            $input['thumbnail'] ?? '',
            $input['duration'] ?? '10:30',
            $input['price'] ?? 0
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Video created successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error creating video: ' . $e->getMessage()]);
    }
}

function handleUpdateVideo($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $videoId = $_GET['id'] ?? null;
    
    if (!$videoId) {
        echo json_encode(['success' => false, 'message' => 'Video ID required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE videos SET title = ?, description = ?, price = ? WHERE video_id = ?");
        $stmt->execute([
            $input['title'],
            $input['description'],
            $input['price'],
            $videoId
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Video updated successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error updating video: ' . $e->getMessage()]);
    }
}

function handleDeleteVideo($pdo) {
    $videoId = $_GET['id'] ?? null;
    
    if (!$videoId) {
        echo json_encode(['success' => false, 'message' => 'Video ID required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM videos WHERE video_id = ?");
        $stmt->execute([$videoId]);
        
        echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error deleting video: ' . $e->getMessage()]);
    }
}
?>

try {
    $pdo = getDB();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all videos with channel information
        $stmt = $pdo->prepare("
            SELECT 
                v.*,
                c.title as channel_title,
                c.user_id as channel_user_id
            FROM videos v 
            LEFT JOIN channels c ON v.channel_id = c.channel_id 
            ORDER BY v.published_at DESC
        ");
        $stmt->execute();
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format videos for frontend
        $formattedVideos = [];
        foreach ($videos as $video) {
            $formattedVideos[] = [
                'id' => $video['video_id'],
                'title' => $video['title'],
                'description' => $video['description'],
                'thumbnail' => $video['thumbnail_url'] ?: '🎥',
                'duration' => $video['duration'] ?: 'PT0M0S',
                'views' => (int)$video['view_count'],
                'likes' => (int)$video['like_count'],
                'price' => (float)($video['price'] ?? 0),
                'uploadedBy' => $video['channel_title'] ?: 'Unknown Channel',
                'uploadedAt' => $video['published_at'],
                'category' => 'education', // Default category
                'rating' => 4.5, // Default rating
                'status' => 'published'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'videos' => $formattedVideos,
            'count' => count($formattedVideos)
        ]);
        
    } else {
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching videos: ' . $e->getMessage()
    ]);
}
?>
