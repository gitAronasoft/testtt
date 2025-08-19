<?php
/**
 * VideoHub Main Router
 * Routes requests to either API endpoints or static files
 * Supports deployment in subfolders
 */

$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME'];

// Get the base path (subfolder) where the app is deployed
$base_path = dirname($script_name);
if ($base_path === '/') {
    $base_path = '';
}

// Remove base path from request URI to get relative path
$relative_uri = $request_uri;
if ($base_path && strpos($request_uri, $base_path) === 0) {
    $relative_uri = substr($request_uri, strlen($base_path));
}

$path = parse_url($relative_uri, PHP_URL_PATH);

// Handle API requests - check for /api anywhere in the path
if (preg_match('/\/api\//', $path) || preg_match('/\/api$/', $path)) {
    // Extract the API path portion and forward to API router
    if (preg_match('/.*\/api(.*)/', $relative_uri, $matches)) {
        $_SERVER['REQUEST_URI'] = $matches[1] ?: '/';
    } else {
        $_SERVER['REQUEST_URI'] = preg_replace('/.*\/api/', '', $relative_uri);
    }
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