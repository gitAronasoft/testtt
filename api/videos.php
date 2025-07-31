<?php
// Configure session settings before starting
ini_set('session.cookie_lifetime', 86400);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication for POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    handleGetVideos();
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handleUploadVideo();
}

function handleGetVideos() {
    // TODO: Database integration - fetch videos from database
    // For now, return sample data
    $videos = [
        [
            'id' => 1,
            'title' => 'Introduction to Web Development',
            'description' => 'Learn the basics of HTML, CSS, and JavaScript',
            'price' => 0,
            'uploader' => 'John Doe',
            'views' => 1250,
            'purchased' => false,
            'file_path' => 'uploads/sample1.mp4',
            'created_at' => '2024-01-15 10:30:00'
        ],
        [
            'id' => 2,
            'title' => 'Advanced React Concepts',
            'description' => 'Deep dive into React hooks, context, and performance optimization',
            'price' => 29.99,
            'uploader' => 'Jane Smith',
            'views' => 850,
            'purchased' => false,
            'file_path' => 'uploads/sample2.mp4',
            'created_at' => '2024-01-20 14:45:00'
        ],
        [
            'id' => 3,
            'title' => 'PHP Backend Development',
            'description' => 'Building robust server-side applications with PHP',
            'price' => 39.99,
            'uploader' => 'Mike Johnson',
            'views' => 675,
            'purchased' => true,
            'file_path' => 'uploads/sample3.mp4',
            'created_at' => '2024-01-25 09:15:00'
        ]
    ];

    echo json_encode([
        'success' => true,
        'videos' => $videos
    ]);
}

function handleUploadVideo() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request data']);
        return;
    }

    // Check if user has permission to upload
    if (!in_array($_SESSION['user']['role'], ['editor', 'admin'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only editors can upload videos']);
        return;
    }

    // Validate required fields
    $required = ['title', 'description', 'price', 'file_path'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            echo json_encode(['success' => false, 'message' => 'Missing required field: ' . $field]);
            return;
        }
    }

    $title = trim($input['title']);
    $description = trim($input['description']);
    $price = floatval($input['price']);
    $file_path = $input['file_path'];

    // Validate data
    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        return;
    }

    if ($price < 0) {
        echo json_encode(['success' => false, 'message' => 'Price cannot be negative']);
        return;
    }

    // TODO: Database integration - insert video record
    // For now, simulate successful upload
    $video = [
        'id' => rand(100, 999),
        'title' => $title,
        'description' => $description,
        'price' => $price,
        'uploader' => $_SESSION['user']['name'],
        'views' => 0,
        'purchased' => false,
        'file_path' => $file_path,
        'created_at' => date('Y-m-d H:i:s')
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Video uploaded successfully',
        'video' => $video
    ]);
}
?>