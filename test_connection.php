
<?php
require_once 'api/config.php';

echo "=== Testing Database Connection ===\n\n";

echo "Connection Details:\n";
echo "Host: " . DB_HOST . "\n";
echo "User: " . DB_USER . "\n";
echo "Database: " . DB_NAME . "\n";
echo "Port: " . DB_PORT . "\n\n";

try {
    echo "Attempting to connect to database...\n";
    $conn = getConnection();
    
    if ($conn->connect_error) {
        echo "❌ Connection failed: " . $conn->connect_error . "\n";
    } else {
        echo "✅ Database connection successful!\n\n";
        
        // Test basic query
        echo "Testing basic query...\n";
        $result = $conn->query("SELECT DATABASE() as current_db, VERSION() as version");
        if ($result) {
            $row = $result->fetch_assoc();
            echo "✅ Current Database: " . $row['current_db'] . "\n";
            echo "✅ MySQL Version: " . $row['version'] . "\n\n";
        }
        
        // Check existing tables
        echo "Checking existing tables...\n";
        $result = $conn->query("SHOW TABLES");
        if ($result) {
            if ($result->num_rows > 0) {
                echo "Existing tables:\n";
                while ($row = $result->fetch_array()) {
                    echo "- " . $row[0] . "\n";
                }
            } else {
                echo "No tables found.\n";
            }
        }
        
        $conn->close();
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
?>
