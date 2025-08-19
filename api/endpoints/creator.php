<?php
/**
 * Creator API Endpoints for VideoHub
 * Handles creator-specific operations like videos and earnings
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Video.php';
require_once __DIR__ . '/../middleware/auth.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize authentication middleware
$authMiddleware = new AuthMiddleware($db);

// Initialize video object
$video = new Video($db);

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (strpos($path, '/videos') !== false) {
                // SECURITY: Only authenticated creators can access video data
                $currentUser = $authMiddleware->requireRole('creator');
                if (!$currentUser) {
                    exit;
                }
                
                // Get creator's videos - creators can only access their own videos
                $creatorId = $currentUser['id']; // Use authenticated user's ID, not from request
                
                $filters = ['uploader_id' => $creatorId];
                
                // Add other filters
                if (isset($_GET['category'])) {
                    $filters['category'] = $_GET['category'];
                }
                
                if (isset($_GET['search'])) {
                    $filters['search'] = $_GET['search'];
                }
                
                $stmt = $video->read($filters);
                $videos = [];
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $videos[] = [
                        'id' => $row['id'],
                        'title' => $row['title'],
                        'description' => $row['description'],
                        'creator_id' => $row['user_id'],
                        'creator_name' => $row['creator_name'],
                        'price' => $row['price'],
                        'category' => $row['category'],
                        'duration' => $row['duration'] ?? '00:00',
                        'upload_date' => $row['created_at'],
                        'views' => $row['views'] ?? 0,
                        'likes' => $row['likes'] ?? 0,
                        'status' => $row['status'] ?? 'published',
                        'thumbnail' => $row['thumbnail'],
                        'youtube_id' => $row['youtube_id'],
                        'earnings' => $row['earnings'] ?? '0.00',
                        'tags' => $row['tags'] ?? ''
                    ];
                }
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $videos
                ]);
                
            } elseif (strpos($path, '/earnings') !== false) {
                // Get creator's earnings
                $creatorId = $_GET['creator_id'] ?? null;
                
                if (!$creatorId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Creator ID is required'
                    ]);
                    return;
                }
                
                $earnings = $video->getCreatorEarnings($creatorId);
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $earnings
                ]);
                
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Endpoint not found'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>