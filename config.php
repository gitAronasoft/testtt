<?php
// Database configuration - using PostgreSQL from Replit
$database_url = $_ENV['DATABASE_URL'] ?? '';

if (empty($database_url)) {
    die("DATABASE_URL environment variable is not set. Please create a PostgreSQL database in Replit first by opening a new tab and typing 'Database', then click 'create a database'.");
}

try {
    $pdo = new PDO($database_url);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Test the connection
    $pdo->query("SELECT 1");
    
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n\nMake sure you've created a PostgreSQL database in Replit and run the schema from database.sql");
}

// YouTube API configuration
define('YOUTUBE_CLIENT_ID', 'your-client-id.apps.googleusercontent.com');
define('YOUTUBE_CLIENT_SECRET', 'your-client-secret');
define('YOUTUBE_REDIRECT_URI', 'http://localhost:8000/oauth/callback');
define('YOUTUBE_SCOPE', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube');

// Payment gateway configuration (Stripe example)
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_your_key');
define('STRIPE_SECRET_KEY', 'sk_test_your_key');

// Security
define('JWT_SECRET', 'your-jwt-secret-key');
define('ENCRYPTION_KEY', 'your-32-character-encryption-key');

?>