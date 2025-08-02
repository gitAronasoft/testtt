
<?php
require_once 'api/config.php';

echo "=== Setting up Demo Data ===\n\n";

try {
    // Initialize database first
    initializeDatabase();
    echo "✓ Database initialized\n";
    
    $conn = getConnection();
    
    // Create demo users
    echo "Creating demo users...\n";
    
    // Admin user
    $admin_id = 'admin_demo_' . time();
    $admin_password = password_hash('admin123', PASSWORD_DEFAULT);
    $admin_stmt = $conn->prepare("INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, 'Demo Admin', 'admin@example.com', ?, 'admin')");
    $admin_stmt->bind_param("ss", $admin_id, $admin_password);
    $admin_stmt->execute();
    
    // Creator user
    $creator_id = 'creator_demo_' . time();
    $creator_password = password_hash('creator123', PASSWORD_DEFAULT);
    $creator_stmt = $conn->prepare("INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, 'Demo Creator', 'creator@example.com', ?, 'editor')");
    $creator_stmt->bind_param("ss", $creator_id, $creator_password);
    $creator_stmt->execute();
    
    // Viewer user
    $viewer_id = 'viewer_demo_' . time();
    $viewer_password = password_hash('viewer123', PASSWORD_DEFAULT);
    $viewer_stmt = $conn->prepare("INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, 'Demo Viewer', 'viewer@example.com', ?, 'viewer')");
    $viewer_stmt->bind_param("ss", $viewer_id, $viewer_password);
    $viewer_stmt->execute();
    
    echo "✓ Demo users created\n";
    
    // Create demo videos
    echo "Creating demo videos...\n";
    
    $demo_videos = [
        [
            'title' => 'Introduction to Web Development',
            'description' => 'Learn the basics of web development with HTML, CSS, and JavaScript. Perfect for beginners who want to start their coding journey.',
            'price' => 29.99,
            'category' => 'education',
            'views' => 1250,
            'youtube_id' => 'dQw4w9WgXcQ',
            'youtube_thumbnail' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        ],
        [
            'title' => 'Advanced React Concepts',
            'description' => 'Deep dive into advanced React patterns, hooks, and performance optimization techniques for experienced developers.',
            'price' => 49.99,
            'category' => 'technology',
            'views' => 850,
            'youtube_id' => 'dQw4w9WgXcR',
            'youtube_thumbnail' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        ],
        [
            'title' => 'PHP Backend Development',
            'description' => 'Master server-side development with PHP. Build robust APIs and web applications from scratch.',
            'price' => 39.99,
            'category' => 'technology',
            'views' => 675,
            'youtube_id' => 'dQw4w9WgXcS',
            'youtube_thumbnail' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        ],
        [
            'title' => 'Free JavaScript Tutorial',
            'description' => 'Complete JavaScript tutorial covering fundamentals to advanced topics. Completely free for everyone!',
            'price' => 0.00,
            'category' => 'education',
            'views' => 2100,
            'youtube_id' => 'dQw4w9WgXcT',
            'youtube_thumbnail' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        ],
        [
            'title' => 'Database Design Principles',
            'description' => 'Learn how to design efficient and scalable databases for modern applications.',
            'price' => 34.99,
            'category' => 'technology',
            'views' => 420,
            'youtube_id' => 'dQw4w9WgXcU',
            'youtube_thumbnail' => 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        ]
    ];
    
    foreach ($demo_videos as $video) {
        $video_stmt = $conn->prepare("INSERT IGNORE INTO videos (title, description, price, uploader_id, category, views, youtube_id, youtube_thumbnail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL FLOOR(RAND() * 30) DAY)");
        $video_stmt->bind_param("ssdsssss", 
            $video['title'], 
            $video['description'], 
            $video['price'], 
            $creator_id, 
            $video['category'], 
            $video['views'],
            $video['youtube_id'],
            $video['youtube_thumbnail']
        );
        $video_stmt->execute();
    }
    
    echo "✓ Demo videos created\n";
    
    // Create some demo purchases
    echo "Creating demo purchases...\n";
    
    // Get video IDs
    $video_query = $conn->query("SELECT id, price FROM videos WHERE price > 0 LIMIT 3");
    while ($video = $video_query->fetch_assoc()) {
        $purchase_id = uniqid();
        $purchase_stmt = $conn->prepare("INSERT IGNORE INTO purchases (id, user_id, video_id, created_at) VALUES (?, ?, ?, NOW() - INTERVAL FLOOR(RAND() * 15) DAY)");
        $purchase_stmt->bind_param("ssid", $purchase_id, $viewer_id, $video['id']);
        $purchase_stmt->execute();
    }
    
    echo "✓ Demo purchases created\n";
    
    $conn->close();
    
    echo "\n=== Demo Data Setup Complete ===\n";
    echo "Test accounts created:\n";
    echo "- Admin: admin@example.com / admin123\n";
    echo "- Creator: creator@example.com / creator123\n";
    echo "- Viewer: viewer@example.com / viewer123\n\n";
    echo "You can now demo the application with realistic data!\n";
    
} catch (Exception $e) {
    echo "✗ Setup failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
