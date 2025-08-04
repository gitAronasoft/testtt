
<?php
require_once 'config.php';

try {
    $conn = getConnection();
    
    // Check if created_at column exists in purchases table
    $check_column = "SHOW COLUMNS FROM purchases LIKE 'created_at'";
    $result = $conn->query($check_column);
    
    if ($result->num_rows == 0) {
        // Add created_at column if it doesn't exist
        $add_column = "ALTER TABLE purchases ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        if ($conn->query($add_column) === TRUE) {
            echo "✓ Added created_at column to purchases table\n";
        } else {
            echo "✗ Error adding created_at column: " . $conn->error . "\n";
        }
    } else {
        echo "✓ created_at column already exists in purchases table\n";
    }
    
    // Also ensure user_id foreign key exists
    $check_fk = "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                 WHERE TABLE_NAME = 'purchases' AND COLUMN_NAME = 'user_id' 
                 AND REFERENCED_TABLE_NAME = 'users'";
    $fk_result = $conn->query($check_fk);
    
    if ($fk_result->num_rows == 0) {
        try {
            $add_fk = "ALTER TABLE purchases ADD CONSTRAINT fk_purchases_user 
                       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE";
            if ($conn->query($add_fk) === TRUE) {
                echo "✓ Added foreign key constraint for user_id\n";
            }
        } catch (Exception $e) {
            echo "Note: Foreign key constraint may already exist or have a different name\n";
        }
    }
    
    echo "Database schema update completed!\n";
    
} catch (Exception $e) {
    echo "✗ Database update failed: " . $e->getMessage() . "\n";
}
?>
