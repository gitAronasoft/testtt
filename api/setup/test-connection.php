<?php
/**
 * Database Connection Test Script for VideoHub
 * Run this script to test the database connection and setup
 */

require_once '../config/database.php';

echo "VideoHub Database Connection Test\n";
echo "==================================\n\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($conn) {
        echo "✓ Database connection successful!\n";
        
        // Test basic query
        $stmt = $conn->query("SELECT VERSION() as version");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✓ MySQL Version: " . $result['version'] . "\n";
        
        // Check if tables exist
        $tables = ['users', 'videos', 'purchases', 'earnings'];
        echo "\nChecking tables:\n";
        
        foreach ($tables as $table) {
            $stmt = $conn->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            
            if ($stmt->fetch()) {
                echo "✓ Table '$table' exists\n";
                
                // Count records
                $countStmt = $conn->query("SELECT COUNT(*) as count FROM $table");
                $count = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
                echo "  - Records: $count\n";
            } else {
                echo "✗ Table '$table' missing - run database setup\n";
            }
        }
        
        echo "\n✓ Connection test completed successfully!\n";
        
    } else {
        echo "✗ Failed to connect to database\n";
    }
    
} catch (Exception $e) {
    echo "✗ Database connection error: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database credentials in config/database.php\n";
    echo "2. Database server is accessible\n";
    echo "3. Database exists\n";
}

echo "\n";
?>