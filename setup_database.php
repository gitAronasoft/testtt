
<?php
require_once 'api/config.php';

echo "=== Database Setup and Inspection ===\n\n";

// Initialize database
echo "1. Initializing database...\n";
try {
    initializeDatabase();
    echo "✓ Database initialized successfully\n\n";
} catch (Exception $e) {
    echo "✗ Database initialization failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Show database information
echo "2. Database Connection Info:\n";
echo "Type: " . DB_TYPE . "\n";
echo "Host: " . DB_HOST . "\n";
echo "Database: " . DB_NAME . "\n";
if (defined('DB_PORT')) {
    echo "Port: " . DB_PORT . "\n";
}
echo "\n";

// Show table structure
echo "3. Database Schema:\n";
try {
    $connection = getConnection();
    
    if (DB_TYPE === 'postgresql') {
        // PostgreSQL table inspection
        $tables = ['users', 'videos', 'purchases'];
        
        foreach ($tables as $table) {
            echo "\n--- $table table structure ---\n";
            $stmt = $connection->prepare("
                SELECT column_name, data_type, is_nullable, column_default 
                FROM information_schema.columns 
                WHERE table_name = ? 
                ORDER BY ordinal_position
            ");
            $stmt->execute([$table]);
            $columns = $stmt->fetchAll();
            
            foreach ($columns as $column) {
                echo sprintf("%-20s %-15s %s %s\n", 
                    $column['column_name'],
                    $column['data_type'],
                    $column['is_nullable'] === 'NO' ? 'NOT NULL' : 'NULL',
                    $column['column_default'] ? 'DEFAULT ' . $column['column_default'] : ''
                );
            }
        }
    } else {
        // MySQL table inspection
        $tables = ['users', 'videos', 'purchases'];
        
        foreach ($tables as $table) {
            echo "\n--- $table table structure ---\n";
            $result = $connection->query("DESCRIBE $table");
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    echo sprintf("%-20s %-15s %s %s %s\n",
                        $row['Field'],
                        $row['Type'],
                        $row['Null'],
                        $row['Key'] ? 'KEY: ' . $row['Key'] : '',
                        $row['Default'] ? 'DEFAULT: ' . $row['Default'] : ''
                    );
                }
            }
        }
    }
    
    echo "\n4. Sample Data Count:\n";
    foreach (['users', 'videos', 'purchases'] as $table) {
        if (DB_TYPE === 'postgresql') {
            $stmt = $connection->prepare("SELECT COUNT(*) as count FROM $table");
            $stmt->execute();
            $result = $stmt->fetch();
            echo "$table: " . $result['count'] . " records\n";
        } else {
            $result = $connection->query("SELECT COUNT(*) as count FROM $table");
            $row = $result->fetch_assoc();
            echo "$table: " . $row['count'] . " records\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error inspecting database: " . $e->getMessage() . "\n";
}

echo "\n=== Setup Complete ===\n";
?>
