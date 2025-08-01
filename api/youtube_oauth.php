<?php
session_start();
require_once 'youtube_service.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    header('Location: ../login.html?error=not_authenticated');
    exit();
}

$user_id = $_SESSION['user']['id'];
$youtube_service = new YouTubeService($user_id);

if (isset($_GET['code'])) {
    // Handle OAuth callback
    $success = $youtube_service->handleOAuthCallback($_GET['code']);
    
    if ($success) {
        header('Location: ../dashboard.html?youtube_connected=1');
    } else {
        header('Location: ../dashboard.html?youtube_error=1');
    }
    exit();
} else if (isset($_GET['error'])) {
    // Handle OAuth error
    header('Location: ../dashboard.html?youtube_error=' . urlencode($_GET['error']));
    exit();
} else {
    // Start OAuth flow
    $auth_url = $youtube_service->getAuthUrl();
    header('Location: ' . $auth_url);
    exit();
}
?>
