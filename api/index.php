<?php
/**
 * Main API Router for VideoShare Platform
 * Routes incoming requests to appropriate endpoints
 */

require_once 'config/config.php';

// Clean expired sessions
$database = new Database();
$pdo = $database->getConnection();

if ($pdo) {
    cleanExpiredSessions($pdo);
}

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api prefix if present
$requestUri = preg_replace('#^/api#', '', $requestUri);

// Split URI into segments
$segments = explode('/', trim($requestUri, '/'));
$endpoint = $segments[0] ?? '';

// Route to appropriate endpoint
switch ($endpoint) {
    case 'auth':
        require_once 'endpoints/auth.php';
        break;
    case 'videos':
        require_once 'endpoints/videos.php';
        break;
    case 'users':
        require_once 'endpoints/users.php';
        break;
    case 'admin':
        require_once 'endpoints/admin.php';
        break;
    case 'health':
        handleHealthCheck($pdo);
        break;
    case '':
        handleApiInfo();
        break;
    default:
        sendError('Endpoint not found', 404);
}

/**
 * Health check endpoint
 */
function handleHealthCheck($pdo) {
    $health = [
        'status' => 'healthy',
        'timestamp' => date('c'),
        'version' => API_VERSION,
        'database' => $pdo ? 'connected' : 'disconnected'
    ];
    
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as user_count FROM users");
            $health['user_count'] = $stmt->fetch()['user_count'];
        } catch (PDOException $e) {
            $health['database'] = 'error';
        }
    }
    
    sendResponse($health, 'API is healthy');
}

/**
 * API information endpoint
 */
function handleApiInfo() {
    $info = [
        'name' => APP_NAME . ' API',
        'version' => API_VERSION,
        'environment' => 'development',
        'endpoints' => [
            'auth' => [
                'POST /auth/login' => 'User login',
                'POST /auth/register' => 'User registration',
                'POST /auth/logout' => 'User logout',
                'GET /auth/me' => 'Get current user'
            ],
            'videos' => [
                'GET /videos' => 'Get videos list',
                'GET /videos/{id}' => 'Get single video',
                'POST /videos' => 'Create video',
                'PUT /videos/{id}' => 'Update video',
                'DELETE /videos/{id}' => 'Delete video',
                'POST /videos/{id}/view' => 'Record video view',
                'POST /videos/{id}/rate' => 'Rate video',
                'POST /videos/{id}/purchase' => 'Purchase video'
            ],
            'users' => [
                'GET /users' => 'Get users list (admin)',
                'GET /users/{id}' => 'Get user profile',
                'PUT /users/{id}' => 'Update user profile',
                'GET /users/{id}/videos' => 'Get user videos',
                'GET /users/{id}/purchases' => 'Get user purchases',
                'GET /users/{id}/wallet' => 'Get user wallet'
            ],
            'admin' => [
                'GET /admin/dashboard' => 'Get dashboard stats',
                'GET /admin/settings' => 'Get platform settings',
                'PUT /admin/settings' => 'Update platform settings',
                'GET /admin/logs' => 'Get admin logs',
                'POST /admin/moderate-video' => 'Moderate video content',
                'POST /admin/bulk-action' => 'Perform bulk actions'
            ]
        ]
    ];
    
    sendResponse($info, 'VideoShare API ' . API_VERSION);
}
?>