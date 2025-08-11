<?php
/**
 * Main Configuration File for VideoShare Platform API
 * Centralized configuration management
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

// CORS headers for API access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Application constants
define('APP_NAME', 'VideoShare');
define('APP_VERSION', '1.0.0');
define('API_VERSION', 'v1');

// Security settings
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production');
define('JWT_EXPIRATION', 86400); // 24 hours
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 1800); // 30 minutes

// File upload settings
define('MAX_VIDEO_SIZE', 500 * 1024 * 1024); // 500MB
define('ALLOWED_VIDEO_TYPES', ['mp4', 'webm', 'avi', 'mov']);
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif']);
define('UPLOAD_PATH', __DIR__ . '/../../uploads/');

// Pagination settings
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// Platform settings
define('DEFAULT_COMMISSION_RATE', 10); // 10%
define('MIN_PAYOUT_AMOUNT', 50); // $50

// Include required files
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../utils/validation.php';
require_once __DIR__ . '/../utils/auth.php';

/**
 * Global response helper
 */
function sendResponse($data = null, $message = '', $status = 200, $success = true) {
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('c')
    ]);
    exit();
}

/**
 * Global error handler
 */
function sendError($message = 'An error occurred', $status = 400, $details = null) {
    http_response_code($status);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'details' => $details,
        'timestamp' => date('c')
    ]);
    exit();
}

/**
 * Log errors to file
 */
function logError($message, $context = []) {
    $log = [
        'timestamp' => date('c'),
        'message' => $message,
        'context' => $context,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    error_log(json_encode($log) . PHP_EOL, 3, __DIR__ . '/../../logs/error.log');
}

// Create necessary directories
$directories = [
    __DIR__ . '/../../uploads',
    __DIR__ . '/../../uploads/videos',
    __DIR__ . '/../../uploads/thumbnails',
    __DIR__ . '/../../uploads/avatars',
    __DIR__ . '/../../logs'
];

foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
}
?>