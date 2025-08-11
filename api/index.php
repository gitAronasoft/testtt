<?php
/**
 * VideoShare Platform API
 * Main entry point for backend API with MySQL database
 */

// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Autoload dependencies
require_once '../vendor/autoload.php';
require_once 'config/database.php';
require_once 'controllers/AuthController.php';
require_once 'controllers/VideoController.php';
require_once 'controllers/PurchaseController.php';

// Initialize database
$db = Database::getInstance();

// Basic API response
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

// Basic error handler
function sendError($message, $status = 400) {
    sendResponse(['error' => $message, 'status' => $status], $status);
}

// Get user ID from token (simple implementation)
function getUserIdFromToken($token) {
    if (empty($token)) return null;
    
    // Remove 'Bearer ' prefix if present
    $token = str_replace('Bearer ', '', $token);
    
    // Decode simple token (userId:timestamp:random)
    $decoded = base64_decode($token);
    $parts = explode(':', $decoded);
    
    return isset($parts[0]) ? (int)$parts[0] : null;
}

// Get authorization token
$headers = getallheaders();
$token = isset($headers['Authorization']) ? $headers['Authorization'] : null;
$userId = getUserIdFromToken($token);

// Basic routing
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Initialize controllers
$authController = new AuthController();
$videoController = new VideoController();
$purchaseController = new PurchaseController();

// Route handlers
switch (true) {
    // Status endpoint
    case ($path === '/' || $path === '/status'):
        sendResponse([
            'message' => 'VideoShare API with MySQL is running',
            'version' => '2.0.0',
            'database' => 'MySQL with mysqli',
            'timestamp' => date('c')
        ]);
        break;
        
    // Authentication endpoints
    case ($path === '/auth/login' && $method === 'POST'):
        $result = $authController->login($input['email'] ?? '', $input['password'] ?? '');
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    case ($path === '/auth/signup' && $method === 'POST'):
        $result = $authController->register(
            $input['name'] ?? '',
            $input['email'] ?? '',
            $input['password'] ?? '',
            $input['role'] ?? 'viewer'
        );
        sendResponse($result, $result['success'] ? 201 : ($result['code'] ?? 400));
        break;
        
    case ($path === '/auth/profile' && $method === 'GET'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $result = $authController->getProfile($userId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    // Video endpoints
    case ($path === '/videos' && $method === 'GET'):
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 12;
        $creatorId = $_GET['creator_id'] ?? null;
        $result = $videoController->getVideos($page, $limit, $creatorId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    case ($path === '/videos' && $method === 'POST'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $result = $videoController->createVideo(
            $input['title'] ?? '',
            $input['description'] ?? '',
            $input['price'] ?? 0,
            $userId
        );
        sendResponse($result, $result['success'] ? 201 : ($result['code'] ?? 400));
        break;
        
    case (preg_match('/^\/videos\/(\d+)$/', $path, $matches) && $method === 'GET'):
        $videoId = $matches[1];
        $result = $videoController->getVideo($videoId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    case (preg_match('/^\/videos\/(\d+)$/', $path, $matches) && $method === 'PUT'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $videoId = $matches[1];
        $result = $videoController->updateVideo(
            $videoId,
            $input['title'] ?? '',
            $input['description'] ?? '',
            $input['price'] ?? 0,
            $userId
        );
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    case (preg_match('/^\/videos\/(\d+)$/', $path, $matches) && $method === 'DELETE'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $videoId = $matches[1];
        $result = $videoController->deleteVideo($videoId, $userId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    // Purchase endpoints
    case ($path === '/purchases' && $method === 'POST'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $result = $purchaseController->purchaseVideo($userId, $input['video_id'] ?? 0);
        sendResponse($result, $result['success'] ? 201 : ($result['code'] ?? 400));
        break;
        
    case ($path === '/purchases' && $method === 'GET'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $result = $purchaseController->getUserPurchases($userId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    case ($path === '/earnings' && $method === 'GET'):
        if (!$userId) {
            sendError('Unauthorized', 401);
        }
        $result = $purchaseController->getCreatorEarnings($userId);
        sendResponse($result, $result['success'] ? 200 : ($result['code'] ?? 400));
        break;
        
    default:
        sendError('Endpoint not found', 404);
        break;
}
?>