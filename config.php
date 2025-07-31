
<?php
// Start session first before any output
if (session_status() == PHP_SESSION_NONE) {
    ob_start();
    session_start();
}

// Database configuration - Using SQLite for simplicity
define('DB_PATH', __DIR__ . '/youtube_manager.db');

// YouTube API configuration
define('YOUTUBE_API_KEY', 'your_youtube_api_key_here');
define('YOUTUBE_CLIENT_ID', 'your_client_id_here');
define('YOUTUBE_CLIENT_SECRET', 'your_client_secret_here');

// Application configuration
define('APP_NAME', 'YouTube Video Manager');
define('APP_URL', 'http://localhost:5000');

// Email configuration for password reset
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your_email@gmail.com');
define('SMTP_PASSWORD', 'your_app_password');
define('SMTP_FROM_EMAIL', 'your_email@gmail.com');
define('SMTP_FROM_NAME', 'YouTube Video Manager');

// Application settings
define('UPLOAD_PATH', 'uploads/');
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500MB

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Role checking functions
function checkAuth() {
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['user_id'])) {
        return false;
    }
    
    return $_SESSION;
}

function requireRole($requiredRoles) {
    $session = checkAuth();
    
    if (!$session) {
        header('HTTP/1.1 401 Unauthorized');
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $userRole = $session['user_role'] ?? 'viewer';
    
    if (is_string($requiredRoles)) {
        $requiredRoles = [$requiredRoles];
    }
    
    if (!in_array($userRole, $requiredRoles)) {
        header('HTTP/1.1 403 Forbidden');
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Access denied - insufficient permissions']);
        exit;
    }
    
    return $userRole;
}

function hasRole($userRole, $requiredRoles) {
    if (is_string($requiredRoles)) {
        $requiredRoles = [$requiredRoles];
    }
    
    return in_array($userRole, $requiredRoles);
}

// Create database connection function
function getDB() {
    try {
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create tables if they don't exist
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            google_id VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'viewer',
            profile_picture TEXT,
            bio TEXT,
            website VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create channels table
        $pdo->exec("CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            channel_id VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            thumbnail_url VARCHAR(500),
            subscriber_count INTEGER DEFAULT 0,
            video_count INTEGER DEFAULT 0,
            view_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Create videos table
        $pdo->exec("CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id VARCHAR(100) NOT NULL,
            video_id VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            thumbnail_url VARCHAR(500),
            duration VARCHAR(20),
            view_count INTEGER DEFAULT 0,
            like_count INTEGER DEFAULT 0,
            price DECIMAL(10,2) DEFAULT 0.00,
            published_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create purchases table
        $pdo->exec("CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id VARCHAR(100) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        return null;
    }
}
?>
