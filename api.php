
<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'get_stats':
        try {
            // Get user count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
            $userCount = $stmt->fetch()['count'];
            
            // Get video count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM videos");
            $videoCount = $stmt->fetch()['count'];
            
            // Get total views (mock revenue calculation)
            $stmt = $pdo->query("SELECT SUM(view_count) as total_views FROM videos");
            $totalViews = $stmt->fetch()['total_views'] ?? 0;
            $revenue = $totalViews * 0.001; // Mock: $0.001 per view
            
            // Mock engagement rate
            $engagement = rand(75, 95);
            
            echo json_encode([
                'success' => true,
                'stats' => [
                    'users' => $userCount,
                    'videos' => $videoCount,
                    'revenue' => number_format($revenue, 2),
                    'engagement' => $engagement
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
        
    case 'get_videos':
        try {
            $stmt = $pdo->query("
                SELECT v.*, c.title as channel_title 
                FROM videos v 
                LEFT JOIN channels c ON v.channel_id = c.channel_id 
                ORDER BY v.published_at DESC 
                LIMIT 20
            ");
            $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'videos' => $videos]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
        
    case 'get_users':
        try {
            $stmt = $pdo->query("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'users' => $users]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
        
    case 'delete_video':
        try {
            $videoId = $input['video_id'] ?? '';
            if (empty($videoId)) {
                echo json_encode(['success' => false, 'message' => 'Video ID is required']);
                break;
            }
            
            $stmt = $pdo->prepare("DELETE FROM videos WHERE video_id = ?");
            $stmt->execute([$videoId]);
            
            echo json_encode(['success' => true, 'message' => 'Video deleted successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
