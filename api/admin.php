<?php
require_once 'config.php';

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication and admin privileges
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit();
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'users':
        handleGetUsers();
        break;
    case 'analytics':
        handleGetAnalytics();
        break;
    case 'delete_user':
        handleDeleteUser();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleGetUsers() {
    $conn = getConnection();
    
    $sql = "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC";
    $result = $conn->query($sql);
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'role' => $row['role'],
            'joined' => date('Y-m-d', strtotime($row['created_at']))
        ];
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
    $conn->close();
}

function handleGetAnalytics() {
    $conn = getConnection();
    
    // Get total counts
    $total_videos = $conn->query("SELECT COUNT(*) as count FROM videos")->fetch_assoc()['count'];
    $total_users = $conn->query("SELECT COUNT(*) as count FROM users")->fetch_assoc()['count'];
    $total_purchases = $conn->query("SELECT COUNT(*) as count FROM purchases")->fetch_assoc()['count'];
    $total_views = $conn->query("SELECT SUM(views) as total FROM videos")->fetch_assoc()['total'] ?? 0;
    
    // Get total revenue
    $revenue_result = $conn->query("
        SELECT SUM(v.price) as total_revenue 
        FROM purchases p 
        JOIN videos v ON p.video_id = v.id
    ");
    $total_revenue = $revenue_result->fetch_assoc()['total_revenue'] ?? 0;
    
    // Get recent activity
    $recent_activity = [];
    $activity_result = $conn->query("
        SELECT 'upload' as type, v.title, u.name, v.created_at
        FROM videos v 
        JOIN users u ON v.uploader_id = u.id 
        ORDER BY v.created_at DESC 
        LIMIT 5
    ");
    
    while ($row = $activity_result->fetch_assoc()) {
        $recent_activity[] = [
            'type' => $row['type'],
            'title' => $row['title'],
            'user' => $row['name'],
            'time' => $row['created_at']
        ];
    }
    
    // Get popular videos
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

function handleDeleteUser() {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    parse_str(file_get_contents("php://input"), $input);
    $user_id = $input['user_id'] ?? null;
    
    if (!$user_id) {
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }
    
    $conn = getConnection();
    
    // Don't allow deleting admin users
    $check_user = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $check_user->bind_param("s", $user_id);
    $check_user->execute();
    $result = $check_user->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        $conn->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    if ($user['role'] === 'admin') {
        echo json_encode(['success' => false, 'message' => 'Cannot delete admin users']);
        $conn->close();
        return;
    }
    
    // Delete user (cascade will handle related records)
    $delete_user = $conn->prepare("DELETE FROM users WHERE id = ?");
    $delete_user->bind_param("s", $user_id);
    
    if ($delete_user->execute()) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
    }
    
    $conn->close();
}
?>
<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
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
    case 'recent_activity':
        handleRecentActivity();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleAnalytics() {
    $conn = getConnection();
    
    // Get platform analytics
    $analytics = [];
    
    // Total users
    $users_result = $conn->query("SELECT COUNT(*) as count FROM users");
    $analytics['total_users'] = $users_result->fetch_assoc()['count'];
    
    // Total videos
    $videos_result = $conn->query("SELECT COUNT(*) as count FROM videos");
    $analytics['total_videos'] = $videos_result->fetch_assoc()['count'];
    
    // Total views
    $views_result = $conn->query("SELECT COALESCE(SUM(views), 0) as count FROM videos");
    $analytics['total_views'] = $views_result->fetch_assoc()['count'];
    
    // Total revenue
    $revenue_result = $conn->query("
        SELECT COALESCE(SUM(v.price), 0) as revenue 
        FROM purchases p 
        JOIN videos v ON p.video_id = v.id
    ");
    $analytics['total_revenue'] = $revenue_result->fetch_assoc()['revenue'];
    
    // Pending reports (placeholder)
    $analytics['pending_reports'] = 0;
    
    echo json_encode([
        'success' => true,
        'analytics' => $analytics
    ]);
    
    $conn->close();
}

function handleUsers() {
    $conn = getConnection();
    
    $users_query = $conn->query("
        SELECT id, name, email, role, created_at as joined 
        FROM users 
        ORDER BY created_at DESC
    ");
    
    $users = [];
    while ($row = $users_query->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
    $conn->close();
}

function handleRecentActivity() {
    $conn = getConnection();
    
    // Get recent activity (simplified)
    $activity = [
        [
            'type' => 'user_register',
            'description' => 'New user registered',
            'user' => 'System',
            'timestamp' => date('Y-m-d H:i:s', strtotime('-1 hour'))
        ],
        [
            'type' => 'video_upload',
            'description' => 'New video uploaded',
            'user' => 'Creator',
            'timestamp' => date('Y-m-d H:i:s', strtotime('-2 hours'))
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'activity' => $activity
    ]);
    
    $conn->close();
}
?>
