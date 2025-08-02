<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getConnection();
    
    // Check and add youtube_id column
    $check_youtube_id = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_id'");
    if ($check_youtube_id->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_id VARCHAR(255) DEFAULT NULL");
        echo json_encode(['success' => true, 'message' => 'Added youtube_id column']);
    }
    
    // Check and add youtube_thumbnail column
    $check_youtube_thumbnail = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_thumbnail'");
    if ($check_youtube_thumbnail->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_thumbnail VARCHAR(500) DEFAULT NULL");
        echo json_encode(['success' => true, 'message' => 'Added youtube_thumbnail column']);
    }
    
    // Check and add youtube_channel_id column
    $check_youtube_channel_id = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_channel_id'");
    if ($check_youtube_channel_id->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_channel_id VARCHAR(255) DEFAULT NULL");
        echo json_encode(['success' => true, 'message' => 'Added youtube_channel_id column']);
    }
    
    // Check and add youtube_channel_title column
    $check_youtube_channel_title = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_channel_title'");
    if ($check_youtube_channel_title->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_channel_title VARCHAR(255) DEFAULT NULL");
        echo json_encode(['success' => true, 'message' => 'Added youtube_channel_title column']);
    }
    
    // Check and add youtube_views column
    $check_youtube_views = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_views'");
    if ($check_youtube_views->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_views INT DEFAULT 0");
        echo json_encode(['success' => true, 'message' => 'Added youtube_views column']);
    }
    
    // Check and add youtube_likes column
    $check_youtube_likes = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_likes'");
    if ($check_youtube_likes->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_likes INT DEFAULT 0");
        echo json_encode(['success' => true, 'message' => 'Added youtube_likes column']);
    }
    
    // Check and add youtube_comments column
    $check_youtube_comments = $conn->query("SHOW COLUMNS FROM videos LIKE 'youtube_comments'");
    if ($check_youtube_comments->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN youtube_comments INT DEFAULT 0");
        echo json_encode(['success' => true, 'message' => 'Added youtube_comments column']);
    }
    
    // Check and add is_youtube_synced column
    $check_youtube_synced = $conn->query("SHOW COLUMNS FROM videos LIKE 'is_youtube_synced'");
    if ($check_youtube_synced->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD COLUMN is_youtube_synced BOOLEAN DEFAULT FALSE");
        echo json_encode(['success' => true, 'message' => 'Added is_youtube_synced column']);
    }
    
    // Add unique index on youtube_id if it doesn't exist
    $check_index = $conn->query("SHOW INDEX FROM videos WHERE Key_name = 'idx_youtube_id'");
    if ($check_index->num_rows == 0) {
        $conn->query("ALTER TABLE videos ADD UNIQUE INDEX idx_youtube_id (youtube_id)");
        echo json_encode(['success' => true, 'message' => 'Added unique index on youtube_id']);
    }
    
    $conn->close();
    echo json_encode(['success' => true, 'message' => 'Database updated successfully']);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database update failed: ' . $e->getMessage()]);
}
?>
