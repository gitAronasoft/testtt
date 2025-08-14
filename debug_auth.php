<?php
require_once 'api/config/database.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

echo "Checking database connection and user data...\n\n";

try {
    // Check if users table exists and get structure
    echo "Users table structure:\n";
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $column) {
        echo "- {$column['Field']} ({$column['Type']})\n";
    }
    
    echo "\nChecking for demo users...\n";
    $stmt = $db->prepare("SELECT id, name, email, role, email_verified_at FROM users WHERE email IN ('admin@videohub.com', 'creator@videohub.com', 'viewer@videohub.com')");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "No demo users found. Creating them...\n";
        
        $demoUsers = [
            ['admin@videohub.com', 'Admin User', 'admin', 'admin123'],
            ['creator@videohub.com', 'Creator User', 'creator', 'creator123'],
            ['viewer@videohub.com', 'Viewer User', 'viewer', 'viewer123']
        ];
        
        foreach ($demoUsers as $user) {
            $hashedPassword = password_hash($user[3], PASSWORD_DEFAULT);
            $insertStmt = $db->prepare("INSERT INTO users (email, name, role, password, email_verified_at) VALUES (?, ?, ?, ?, NOW())");
            $insertStmt->execute([$user[0], $user[1], $user[2], $hashedPassword]);
            echo "Created user: {$user[0]} (Role: {$user[2]})\n";
        }
    } else {
        echo "Found demo users:\n";
        foreach ($users as $user) {
            echo "- {$user['email']} (Role: {$user['role']}, Verified: " . ($user['email_verified_at'] ? 'Yes' : 'No') . ")\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>