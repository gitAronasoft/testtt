<?php
/**
 * Configuration API Endpoints
 * Provides configuration data for the frontend application
 */

require_once __DIR__ . '/../config/cors.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Handle CORS preflight
if ($method === 'OPTIONS') {
    exit(0);
}

// Stripe key endpoint
if ($method === 'GET' && strpos($path, '/config/stripe-key') !== false) {
    header('Content-Type: application/json');

    $publishableKey = "pk_test_51MMBpLLzvpT6nLjbuQdmrKX05xmuzLUsQhnNUnUEEiiJC1NS7eHK8jSRKbueTlYzruYf7lSYOtBtsXiIDFtAs4FE004Wt7Zqg6";

    if (!$publishableKey) {
        echo json_encode([
            'success' => false,
            'message' => 'Stripe publishable key not configured'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'publishable_key' => $publishableKey
    ]);
    exit;
}

// Basic config endpoint
if ($method === 'GET' && strpos($path, '/config') !== false) {
    header('Content-Type: application/json');

    $config = [
        'app_name' => 'VideoHub',
        'version' => '1.0.0',
        'environment' => 'production'
    ];

    echo json_encode([
        'success' => true,
        'data' => $config
    ]);
    exit;
}

// Return 404 for unmatched routes
http_response_code(404);
echo json_encode([
    'success' => false,
    'message' => 'Endpoint not found'
]);
?>