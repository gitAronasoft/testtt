
<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_pass');
define('DB_NAME', 'youtube_manager');

// YouTube API configuration
define('YOUTUBE_API_KEY', 'your_youtube_api_key_here');
define('YOUTUBE_CLIENT_ID', 'your_client_id_here');
define('YOUTUBE_CLIENT_SECRET', 'your_client_secret_here');

// Application settings
define('UPLOAD_PATH', 'uploads/');
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500MB

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session
session_start();
?>
