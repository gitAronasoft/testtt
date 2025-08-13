<?php
/**
 * Creator API Endpoints for VideoHub
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Video.php';
require_once __DIR__ . '/../models/User.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'stats') {
                // Get creator stats
                $video = new Video($db);
                $stats = $video->getCreatorStats();
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $stats
                ]);
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'videos') {
                // Get creator videos
                $video = new Video($db);
                
                $filters = [];
                if (isset($_GET['uploader_id'])) {
                    $filters['uploader_id'] = $_GET['uploader_id'];
                }
                
                $videos = $video->readAll($filters);
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => ['videos' => $videos]
                ]);
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'earnings') {
                // Get creator earnings
                $creator_id = $_GET['creator_id'] ?? null;
                
                if (!$creator_id) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Creator ID is required'
                    ]);
                    break;
                }
                
                $video = new Video($db);
                $earnings = $video->getCreatorEarnings($creator_id);
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => ['earnings' => $earnings]
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Creator endpoint not found'
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