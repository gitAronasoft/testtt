<?php
require_once 'api/config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "Testing password verification...\n\n";

// Check current password for admin user
$stmt = $db->prepare("SELECT id, email, password FROM users WHERE email = 'admin@videohub.com'");
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo "Found user: {$user['email']}\n";
    echo "Stored password hash: {$user['password']}\n";
    
    $testPassword = 'admin123';
    $isValid = password_verify($testPassword, $user['password']);
    echo "Password verify result for 'admin123': " . ($isValid ? 'VALID' : 'INVALID') . "\n";
    
    // Update password with correct hash
    $newHash = password_hash($testPassword, PASSWORD_DEFAULT);
    echo "New hash: $newHash\n";
    
    $updateStmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $updateStmt->execute([$newHash, $user['id']]);
    echo "Password updated for admin user\n";
    
    // Do the same for other demo users
    $demoUsers = [
        ['creator@videohub.com', 'creator123'],
        ['viewer@videohub.com', 'viewer123']
    ];
    
    foreach ($demoUsers as $demo) {
        $newHash = password_hash($demo[1], PASSWORD_DEFAULT);
        $updateStmt = $db->prepare("UPDATE users SET password = ? WHERE email = ?");
        $updateStmt->execute([$newHash, $demo[0]]);
        echo "Password updated for {$demo[0]}\n";
    }
} else {
    echo "Admin user not found!\n";
}
?>