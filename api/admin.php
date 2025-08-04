<?php
require_once 'config.php';

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

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

// Check admin role
if ($_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'analytics':
        handleAnalytics();
        break;
    case 'users':
        handleUsers();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleAnalytics() {
    $conn = getConnection();

    // Get total videos
    $total_videos_result = $conn->query("SELECT COUNT(*) as count FROM videos");
    $total_videos = $total_videos_result->fetch_assoc()['count'];

    // Get total users
    $total_users_result = $conn->query("SELECT COUNT(*) as count FROM users");
    $total_users = $total_users_result->fetch_assoc()['count'];

    // Get total purchases
    $total_purchases_result = $conn->query("SELECT COUNT(*) as count FROM purchases");
    $total_purchases = $total_purchases_result->fetch_assoc()['count'];

    // Get total views
    $total_views_result = $conn->query("SELECT SUM(views) as total FROM videos");
    $total_views_row = $total_views_result->fetch_assoc();
    $total_views = $total_views_row['total'] ?? 0;

    // Get total revenue (sum of all video prices that were purchased)
    $total_revenue_result = $conn->query("
        SELECT SUM(v.price) as revenue 
        FROM purchases p 
        JOIN videos v ON p.video_id = v.id
    ");
    $total_revenue_row = $total_revenue_result->fetch_assoc();
    $total_revenue = $total_revenue_row['revenue'] ?? 0;

    // Get recent activity (last 10 activities)
    $recent_activity = [];

    // Recent video uploads
    $recent_uploads = $conn->query("
        SELECT v.title, u.name as user, v.created_at, 'upload' as type
        FROM videos v 
        JOIN users u ON v.uploader_id = u.id 
        ORDER BY v.created_at DESC 
        LIMIT 5
    ");

    while ($row = $recent_uploads->fetch_assoc()) {
        $recent_activity[] = [
            'title' => 'New video uploaded: ' . $row['title'],
            'user' => $row['user'],
            'time' => $row['created_at'],
            'type' => $row['type']
        ];
    }

    // Recent purchases
    $recent_purchases = $conn->query("
        SELECT v.title, u.name as user, p.created_at, 'purchase' as type
        FROM purchases p 
        JOIN videos v ON p.video_id = v.id 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC 
        LIMIT 5
    ");

    while ($row = $recent_purchases->fetch_assoc()) {
        $recent_activity[] = [
            'title' => 'Video purchased: ' . $row['title'],
            'user' => $row['user'],
            'time' => $row['created_at'],
            'type' => $row['type']
        ];
    }

    // Recent user registrations
    $recent_users = $conn->query("
        SELECT name, created_at, 'registration' as type
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 3
    ");

    while ($row = $recent_users->fetch_assoc()) {
        $recent_activity[] = [
            'title' => 'New user registered',
            'user' => $row['name'],
            'time' => $row['created_at'],
            'type' => $row['type']
        ];
    }

    // Sort recent activity by time and limit to 10
    usort($recent_activity, function($a, $b) {
        return strtotime($b['time']) - strtotime($a['time']);
    });
    $recent_activity = array_slice($recent_activity, 0, 10);

    // Get popular videos (most viewed)
    $popular_videos = [];
    $popular_result = $conn->query("
        SELECT title, views 
        FROM videos 
        ORDER BY views DESC 
        LIMIT 5
    ");

    while ($row = $popular_result->fetch_assoc()) {
        $popular_videos[] = [
            'title' => $row['title'],
            'views' => (int)$row['views']
        ];
    }

    echo json_encode([
        'success' => true,
        'analytics' => [
            'total_videos' => (int)$total_videos,
            'total_users' => (int)$total_users,
            'total_purchases' => (int)$total_purchases,
            'total_views' => (int)$total_views,
            'total_revenue' => (float)$total_revenue,
            'recent_activity' => $recent_activity,
            'popular_videos' => $popular_videos
        ]
    ]);

    $conn->close();
}

function handleUsers() {
    $conn = getConnection();

    $users_result = $conn->query("
        SELECT id, name, email, role, created_at as joined 
        FROM users 
        ORDER BY created_at DESC
    ");

    $users = [];
    while ($row = $users_result->fetch_assoc()) {
        $users[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'role' => $row['role'],
            'joined' => date('M d, Y', strtotime($row['joined']))
        ];
    }

    echo json_encode([
        'success' => true,
        'users' => $users
    ]);

    $conn->close();
}
?>
