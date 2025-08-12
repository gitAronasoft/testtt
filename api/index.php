<?php
/**
 * VideoHub API Router
 * Routes API requests to appropriate endpoints
 */

require_once 'config/cors.php';

// Get request path and method
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Remove base path if present
$path = preg_replace('/^\/api/', '', $path);

// Route requests
switch (true) {
    // Authentication endpoints
    case preg_match('/^\/auth/', $path):
        require_once 'endpoints/auth.php';
        break;
        
    // Users endpoints
    case preg_match('/^\/users/', $path):
        require_once 'endpoints/users.php';
        break;
        
    // Videos endpoints
    case preg_match('/^\/videos/', $path):
        require_once 'endpoints/videos.php';
        break;
        
    // Purchases endpoints
    case preg_match('/^\/purchases/', $path):
        require_once 'endpoints/purchases.php';
        break;
        
    // Creator endpoints
    case preg_match('/^\/creator/', $path):
        require_once 'endpoints/creator.php';
        break;
        
    // Metrics endpoints
    case preg_match('/^\/metrics/', $path):
        require_once 'endpoints/metrics.php';
        break;
        
    // Admin endpoints
    case preg_match('/^\/admin/', $path):
        require_once 'endpoints/admin.php';
        break;
        
    // Health check
    case $path === '/' || $path === '/health':
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'VideoHub API is running',
            'version' => '1.0.0',
            'timestamp' => date('c')
        ]);
        break;
        
    // Default - not found
    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint not found',
            'path' => $path
        ]);
        break;
}
?>