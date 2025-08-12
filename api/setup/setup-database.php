<?php
/**
 * Database Setup Script for VideoHub
 * Automatically runs the database setup SQL script
 */

require_once '../config/database.php';

echo "VideoHub Database Setup\n";
echo "=======================\n\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception("Cannot connect to database");
    }
    
    echo "✓ Connected to database successfully\n";
    
    // Read and execute SQL setup script
    $sqlFile = __DIR__ . '/database-setup.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL setup file not found: $sqlFile");
    }
    
    $sql = file_get_contents($sqlFile);
    
    if (!$sql) {
        throw new Exception("Cannot read SQL setup file");
    }
    
    echo "✓ SQL setup file loaded\n";
    
    // Split SQL into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && !preg_match('/^\s*--/', $stmt);
        }
    );
    
    echo "✓ Found " . count($statements) . " SQL statements\n\n";
    
    // Execute each statement
    $executed = 0;
    $failed = 0;
    
    foreach ($statements as $statement) {
        try {
            $conn->exec($statement);
            $executed++;
            
            // Show progress for major operations
            if (preg_match('/CREATE TABLE.*`(\w+)`/i', $statement, $matches)) {
                echo "✓ Created table: " . $matches[1] . "\n";
            } elseif (preg_match('/INSERT INTO.*`(\w+)`/i', $statement, $matches)) {
                echo "✓ Inserted data into: " . $matches[1] . "\n";
            }
            
        } catch (PDOException $e) {
            $failed++;
            echo "✗ Failed to execute statement: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n";
    echo "Setup completed!\n";
    echo "- Executed: $executed statements\n";
    echo "- Failed: $failed statements\n";
    
    if ($failed > 0) {
        echo "⚠ Some statements failed - please check the errors above\n";
    } else {
        echo "✓ All statements executed successfully!\n";
    }
    
    // Verify setup by checking tables
    echo "\nVerifying setup:\n";
    $tables = ['users', 'videos', 'purchases', 'earnings'];
    
    foreach ($tables as $table) {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM $table");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "✓ Table '$table': $count records\n";
    }
    
    echo "\n✅ Database setup completed successfully!\n";
    echo "Your VideoHub application is now ready to use with MySQL backend.\n";
    
} catch (Exception $e) {
    echo "❌ Setup failed: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database credentials in config/database.php\n";
    echo "2. Database server is accessible\n";
    echo "3. You have permission to create tables\n";
}

echo "\n";
?>