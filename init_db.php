
<?php
require_once 'config.php';

// Initialize database
$pdo = getDB();

if ($pdo) {
    echo "Database initialized successfully!\n";
    
    // Insert demo users
    try {
        $demoUsers = [
            ['admin@example.com', password_hash('admin123', PASSWORD_DEFAULT), 'Admin User', 'admin'],
            ['editor@example.com', password_hash('editor123', PASSWORD_DEFAULT), 'Editor User', 'editor'],
            ['viewer@example.com', password_hash('viewer123', PASSWORD_DEFAULT), 'Viewer User', 'viewer']
        ];
        
        $stmt = $pdo->prepare("INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
        
        foreach ($demoUsers as $user) {
            $stmt->execute($user);
        }
        
        echo "Demo users created successfully!\n";
        echo "Login credentials:\n";
        echo "Admin: admin@example.com / admin123\n";
        echo "Editor: editor@example.com / editor123\n";
        echo "Viewer: viewer@example.com / viewer123\n";
        
    } catch (PDOException $e) {
        echo "Error creating demo users: " . $e->getMessage() . "\n";
    }
} else {
    echo "Failed to initialize database!\n";
}
?>
