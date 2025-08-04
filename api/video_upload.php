
<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

// Only creators/editors/admins can upload
if (!in_array($_SESSION['user']['role'], ['editor', 'creator', 'admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Upload permission required']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

handleVideoUpload();

function handleVideoUpload() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
        return;
    }

    $required_fields = ['title', 'description', 'youtube_id'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => ucfirst($field) . ' is required']);
            return;
        }
    }

    $title = trim($input['title']);
    $description = trim($input['description']);
    $price = floatval($input['price'] ?? 0);
    $category = $input['category'] ?? 'other';
    $youtube_id = trim($input['youtube_id']);
    $youtube_thumbnail = $input['youtube_thumbnail'] ?? '';
    $user_id = $_SESSION['user']['id'];

    $conn = getConnection();

    try {
        // Check if YouTube ID already exists
        $check_stmt = $conn->prepare("SELECT id FROM videos WHERE youtube_id = ?");
        $check_stmt->bind_param("s", $youtube_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Video with this YouTube ID already exists']);
            $conn->close();
            return;
        }

        // Insert video record
        $sql = "INSERT INTO videos (title, description, price, uploader_id, category, youtube_id, youtube_thumbnail, is_youtube_synced, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssdssss", $title, $description, $price, $user_id, $category, $youtube_id, $youtube_thumbnail);

        if ($stmt->execute()) {
            $video_id = $conn->insert_id;
            
            echo json_encode([
                'success' => true,
                'message' => 'Video uploaded and synced successfully',
                'video' => [
                    'id' => $video_id,
                    'title' => $title,
                    'description' => $description,
                    'price' => $price,
                    'category' => $category,
                    'youtube_id' => $youtube_id,
                    'youtube_thumbnail' => $youtube_thumbnail,
                    'is_youtube_synced' => true
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save video to database']);
        }

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()]);
    }

    $conn->close();
}
?>
