<?php
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "=== CURRENT DATABASE SCHEMA ===\n\n";

try {
    // Show all tables
    echo "TABLES:\n";
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_NUM);
    foreach ($tables as $table) {
        echo "- " . $table[0] . "\n";
    }
    
    echo "\n";
    
    // Describe each table
    foreach ($tables as $table) {
        $tableName = $table[0];
        echo "=== TABLE: $tableName ===\n";
        $stmt = $db->query("DESCRIBE $tableName");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            echo sprintf("  %-20s %-20s %s %s %s\n", 
                $column['Field'], 
                $column['Type'], 
                $column['Null'] === 'YES' ? 'NULL' : 'NOT NULL',
                $column['Key'] ? 'KEY:' . $column['Key'] : '',
                $column['Extra']
            );
        }
        echo "\n";
    }
    
    // Show sample data from key tables
    echo "=== SAMPLE DATA ===\n\n";
    
    echo "Users (first 3):\n";
    $stmt = $db->query("SELECT * FROM users LIMIT 3");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($users);
    
    echo "\nVideos (first 3):\n";
    $stmt = $db->query("SELECT * FROM videos LIMIT 3");
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($videos);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>