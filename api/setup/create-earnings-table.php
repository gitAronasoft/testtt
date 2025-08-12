<?php
require_once '../config/database.php';

echo "Creating earnings table...\n";

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $sql = "CREATE TABLE IF NOT EXISTS earnings (
        id int(11) NOT NULL AUTO_INCREMENT,
        creator_id int(11) NOT NULL,
        video_id int(11) DEFAULT NULL,
        amount decimal(10,2) NOT NULL,
        source enum('video_sale','subscription','bonus') DEFAULT 'video_sale',
        date date NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_creator (creator_id),
        INDEX idx_date (date),
        INDEX idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $conn->exec($sql);
    echo "✓ Earnings table created successfully!\n";
    
    // Insert sample data
    $earnings_data = [
        [1, 1, 19.99, 'video_sale', '2024-03-11'],
        [1, 2, 14.99, 'video_sale', '2024-03-09'],
        [1, 1, 19.99, 'video_sale', '2024-03-10'],
        [5, 4, 16.99, 'video_sale', '2024-03-06'],
        [7, 5, 22.99, 'video_sale', '2024-03-16'],
        [10, 6, 12.99, 'video_sale', '2024-03-19'],
        [1, null, 50.00, 'bonus', '2024-03-15']
    ];
    
    $insert_sql = "INSERT INTO earnings (creator_id, video_id, amount, source, date) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insert_sql);
    
    $inserted = 0;
    foreach ($earnings_data as $earning) {
        if ($stmt->execute($earning)) {
            $inserted++;
        }
    }
    
    echo "✓ Inserted $inserted earnings records\n";
    
    // Test connection
    $stmt = $conn->query("SELECT COUNT(*) as count FROM earnings");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "✓ Earnings table now has $count records\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>