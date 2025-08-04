
<?php
require_once 'config.php';

// Create test users
$conn = getConnection();

$test_users = [
    [
        'id' => 'admin_001',
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'password' => password_hash('admin123', PASSWORD_DEFAULT),
        'role' => 'admin'
    ],
    [
        'id' => 'creator_001',
        'name' => 'Content Creator',
        'email' => 'creator@example.com',
        'password' => password_hash('creator123', PASSWORD_DEFAULT),
        'role' => 'creator'
    ],
    [
        'id' => 'viewer_001',
        'name' => 'Video Viewer',
        'email' => 'viewer@example.com',
        'password' => password_hash('viewer123', PASSWORD_DEFAULT),
        'role' => 'viewer'
    ]
];

foreach ($test_users as $user) {
    $stmt = $conn->prepare("INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $user['id'], $user['name'], $user['email'], $user['password'], $user['role']);
    $stmt->execute();
}

// Create sample videos
$sample_videos = [
    [
        'title' => 'Introduction to Web Development',
        'description' => 'Learn the basics of HTML, CSS, and JavaScript',
        'uploader' => 'Content Creator',
        'uploader_id' => 'creator_001',
        'price' => 9.99,
        'category' => 'education',
        'youtube_id' => 'demo_video_1'
    ],
    [
        'title' => 'Free Programming Tutorial',
        'description' => 'A comprehensive guide to getting started with programming',
        'uploader' => 'Content Creator',
        'uploader_id' => 'creator_001',
        'price' => 0.00,
        'category' => 'education',
        'youtube_id' => 'demo_video_2'
    ]
];

foreach ($sample_videos as $video) {
    $stmt = $conn->prepare("INSERT IGNORE INTO videos (title, description, uploader, uploader_id, price, category, youtube_id, youtube_thumbnail, is_youtube_synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $thumbnail = "/api/placeholder/300/200";
    $synced = 0;
    $stmt->bind_param("ssssdsssi", 
        $video['title'], 
        $video['description'], 
        $video['uploader'], 
        $video['uploader_id'], 
        $video['price'], 
        $video['category'], 
        $video['youtube_id'],
        $thumbnail,
        $synced
    );
    $stmt->execute();
}

echo "Test data setup complete!\n";
$conn->close();
?>
