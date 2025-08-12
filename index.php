<?php
/**
 * VideoHub Main Router
 * Routes requests to either API endpoints or static files
 */

$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Handle API requests
if (preg_match('/^\/api/', $path)) {
    // Remove /api from path and forward to API router
    $_SERVER['REQUEST_URI'] = preg_replace('/^\/api/', '', $request_uri);
    require_once 'api/index.php';
    return;
}

// Handle static files
$file_path = __DIR__ . $path;

// Default to index.html for root requests
if ($path === '/') {
    $file_path = __DIR__ . '/index.html';
}

// Serve static files if they exist
if (file_exists($file_path) && is_file($file_path)) {
    // Get file extension for proper MIME type
    $extension = pathinfo($file_path, PATHINFO_EXTENSION);
    
    $mime_types = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml'
    ];
    
    if (isset($mime_types[$extension])) {
        header('Content-Type: ' . $mime_types[$extension]);
    }
    
    readfile($file_path);
    return;
}

// 404 for non-existent files
http_response_code(404);
echo '404 - File Not Found';
?>