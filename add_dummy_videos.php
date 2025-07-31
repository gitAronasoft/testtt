
<?php
require_once 'config.php';

try {
    $pdo = getDB();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    // First, let's make sure we have a user to associate the channel with
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    $stmt->execute();
    $adminUser = $stmt->fetch();
    
    if (!$adminUser) {
        // Create admin user first
        $stmt = $pdo->prepare("INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
        $stmt->execute(['admin@example.com', password_hash('admin123', PASSWORD_DEFAULT), 'Admin User', 'admin']);
        $adminUserId = $pdo->lastInsertId() ?: 1;
    } else {
        $adminUserId = $adminUser['id'];
    }
    
    // Check if we have a channel
    $stmt = $pdo->prepare("SELECT channel_id FROM channels LIMIT 1");
    $stmt->execute();
    $channel = $stmt->fetch();
    
    if (!$channel) {
        // Create a demo channel first
        $stmt = $pdo->prepare("INSERT INTO channels (user_id, channel_id, title, description, subscriber_count, video_count, view_count) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$adminUserId, 'UC_DemoChannel123', 'Demo Learning Channel', 'Educational content for developers', 5000, 15, 250000]);
        $channelId = 'UC_DemoChannel123';
    } else {
        $channelId = $channel['channel_id'];
    }
    
    // Dummy videos data
    $dummyVideos = [
        [
            'video_id' => 'dQw4w9WgXcQ1',
            'title' => 'Complete JavaScript Tutorial for Beginners',
            'description' => 'Learn JavaScript from scratch with this comprehensive tutorial covering variables, functions, objects, and more.',
            'thumbnail_url' => 'https://img.youtube.com/vi/dQw4w9WgXcQ1/maxresdefault.jpg',
            'duration' => 'PT45M30S',
            'view_count' => 15420,
            'like_count' => 892,
            'price' => 29.99
        ],
        [
            'video_id' => 'ABC123XYZ456',
            'title' => 'React Hooks Deep Dive',
            'description' => 'Master React Hooks with practical examples. Learn useState, useEffect, useContext, and custom hooks.',
            'thumbnail_url' => 'https://img.youtube.com/vi/ABC123XYZ456/maxresdefault.jpg',
            'duration' => 'PT1H12M15S',
            'view_count' => 28950,
            'like_count' => 1456,
            'price' => 39.99
        ],
        [
            'video_id' => 'NODE789EXPRESS',
            'title' => 'Node.js & Express.js Masterclass',
            'description' => 'Build scalable backend applications with Node.js and Express.js. Includes authentication, databases, and deployment.',
            'thumbnail_url' => 'https://img.youtube.com/vi/NODE789EXPRESS/maxresdefault.jpg',
            'duration' => 'PT2H05M40S',
            'view_count' => 42180,
            'like_count' => 2103,
            'price' => 59.99
        ],
        [
            'video_id' => 'CSS456GRID789',
            'title' => 'CSS Grid Layout Mastery',
            'description' => 'Create responsive layouts with CSS Grid. From basic concepts to advanced techniques.',
            'thumbnail_url' => 'https://img.youtube.com/vi/CSS456GRID789/maxresdefault.jpg',
            'duration' => 'PT55M20S',
            'view_count' => 19750,
            'like_count' => 987,
            'price' => 24.99
        ],
        [
            'video_id' => 'PYTHON123DATA',
            'title' => 'Python Data Science Fundamentals',
            'description' => 'Learn data analysis with Python using pandas, numpy, and matplotlib. Perfect for beginners.',
            'thumbnail_url' => 'https://img.youtube.com/vi/PYTHON123DATA/maxresdefault.jpg',
            'duration' => 'PT1H38M55S',
            'view_count' => 35600,
            'like_count' => 1789,
            'price' => 49.99
        ],
        [
            'video_id' => 'VUE456NUXT789',
            'title' => 'Vue.js 3 Complete Guide',
            'description' => 'Master Vue.js 3 with Composition API, Pinia state management, and Nuxt.js framework.',
            'thumbnail_url' => 'https://img.youtube.com/vi/VUE456NUXT789/maxresdefault.jpg',
            'duration' => 'PT1H45M30S',
            'view_count' => 22400,
            'like_count' => 1122,
            'price' => 44.99
        ],
        [
            'video_id' => 'DOCKER123DEVOPS',
            'title' => 'Docker for Developers',
            'description' => 'Containerize your applications with Docker. Learn containers, images, and deployment strategies.',
            'thumbnail_url' => 'https://img.youtube.com/vi/DOCKER123DEVOPS/maxresdefault.jpg',
            'duration' => 'PT1H22M45S',
            'view_count' => 31200,
            'like_count' => 1560,
            'price' => 37.99
        ],
        [
            'video_id' => 'MYSQL456DATABASE',
            'title' => 'MySQL Database Design',
            'description' => 'Design efficient databases with MySQL. Learn normalization, indexing, and query optimization.',
            'thumbnail_url' => 'https://img.youtube.com/vi/MYSQL456DATABASE/maxresdefault.jpg',
            'duration' => 'PT1H15M20S',
            'view_count' => 18900,
            'like_count' => 945,
            'price' => 32.99
        ],
        [
            'video_id' => 'TYPESCRIPT789',
            'title' => 'TypeScript for JavaScript Developers',
            'description' => 'Add type safety to your JavaScript projects with TypeScript. From basics to advanced patterns.',
            'thumbnail_url' => 'https://img.youtube.com/vi/TYPESCRIPT789/maxresdefault.jpg',
            'duration' => 'PT1H28M10S',
            'view_count' => 26800,
            'like_count' => 1340,
            'price' => 42.99
        ],
        [
            'video_id' => 'ANGULAR456REACTIVE',
            'title' => 'Angular Reactive Forms',
            'description' => 'Build complex forms in Angular with reactive forms, validation, and dynamic controls.',
            'thumbnail_url' => 'https://img.youtube.com/vi/ANGULAR456REACTIVE/maxresdefault.jpg',
            'duration' => 'PT1H35M25S',
            'view_count' => 21500,
            'like_count' => 1075,
            'price' => 38.99
        ],
        [
            'video_id' => 'FIREBASE789AUTH',
            'title' => 'Firebase Authentication Complete',
            'description' => 'Implement secure authentication with Firebase. Email, Google, and social login methods.',
            'thumbnail_url' => 'https://img.youtube.com/vi/FIREBASE789AUTH/maxresdefault.jpg',
            'duration' => 'PT58M40S',
            'view_count' => 24300,
            'like_count' => 1215,
            'price' => 28.99
        ],
        [
            'video_id' => 'WEBPACK123MODERN',
            'title' => 'Modern JavaScript Build Tools',
            'description' => 'Master Webpack, Vite, and modern build tools for JavaScript applications.',
            'thumbnail_url' => 'https://img.youtube.com/vi/WEBPACK123MODERN/maxresdefault.jpg',
            'duration' => 'PT1H18M50S',
            'view_count' => 17800,
            'like_count' => 890,
            'price' => 35.99
        ],
        [
            'video_id' => 'SASS456SCSS789',
            'title' => 'SASS/SCSS Advanced Techniques',
            'description' => 'Write maintainable CSS with SASS. Learn mixins, functions, and advanced features.',
            'thumbnail_url' => 'https://img.youtube.com/vi/SASS456SCSS789/maxresdefault.jpg',
            'duration' => 'PT48M15S',
            'view_count' => 14200,
            'like_count' => 710,
            'price' => 22.99
        ],
        [
            'video_id' => 'NEXTJS123REACT',
            'title' => 'Next.js 13 App Router',
            'description' => 'Build full-stack React applications with Next.js 13. Server components and app router.',
            'thumbnail_url' => 'https://img.youtube.com/vi/NEXTJS123REACT/maxresdefault.jpg',
            'duration' => 'PT2H12M30S',
            'view_count' => 38700,
            'like_count' => 1935,
            'price' => 54.99
        ],
        [
            'video_id' => 'TESTING456JEST',
            'title' => 'JavaScript Testing with Jest',
            'description' => 'Write comprehensive tests for your JavaScript applications using Jest and testing best practices.',
            'thumbnail_url' => 'https://img.youtube.com/vi/TESTING456JEST/maxresdefault.jpg',
            'duration' => 'PT1H25M45S',
            'view_count' => 20100,
            'like_count' => 1005,
            'price' => 36.99
        ]
    ];
    
    // Insert dummy videos using SQLite syntax
    $stmt = $pdo->prepare("
        INSERT OR REPLACE INTO videos (channel_id, video_id, title, description, thumbnail_url, duration, view_count, like_count, price, published_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || abs(random() % 30) || ' days'))
    ");
    
    $insertedCount = 0;
    foreach ($dummyVideos as $video) {
        try {
            $stmt->execute([
                $channelId,
                $video['video_id'],
                $video['title'],
                $video['description'],
                $video['thumbnail_url'],
                $video['duration'],
                $video['view_count'],
                $video['like_count'],
                $video['price']
            ]);
            $insertedCount++;
        } catch (PDOException $e) {
            echo "Error inserting video {$video['title']}: " . $e->getMessage() . "\n";
        }
    }
    
    // Update channel video count
    $stmt = $pdo->prepare("UPDATE channels SET video_count = ? WHERE channel_id = ?");
    $stmt->execute([$insertedCount, $channelId]);
    
    echo "Successfully added {$insertedCount} dummy videos to the database!\n";
    echo "Videos are associated with channel: {$channelId}\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
