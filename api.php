<?php
require_once 'config.php';
require_once 'auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

$auth = new Auth();

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
        }

        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email and password are required']);
            break;
        }

        if ($auth->login($email, $password)) {
            echo json_encode([
                'success' => true, 
                'message' => 'Login successful',
                'user' => $auth->getCurrentUser()
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        }
        break;

    case 'register':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
        }

        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'viewer';

        if (empty($name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, email, and password are required']);
            break;
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            break;
        }

        // Validate password strength
        if (strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
            break;
        }

        $userId = $auth->register($email, $password, $name, $role);

        if ($userId) {
            echo json_encode([
                'success' => true, 
                'message' => 'Registration successful',
                'user_id' => $userId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Registration failed. Email may already be in use.']);
        }
        break;

    case 'logout':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
        }

        $auth->logout();
        echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
        break;

    case 'get_user':
        if (!checkAuth()) {
            break;
        }

        try {
            if ($auth->isLoggedIn()) {
                $user = $auth->getCurrentUser();
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            }
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication check failed']);
        }
        break;

    case 'get_videos':
        try {
            $pdo = getDB();

            if (!$pdo) {
                throw new Exception('Database connection failed');
            }

            // Get all videos with channel information
            $stmt = $pdo->prepare("
                SELECT 
                    v.*,
                    c.title as channel_title,
                    c.user_id as channel_user_id
                FROM videos v 
                LEFT JOIN channels c ON v.channel_id = c.channel_id 
                ORDER BY v.published_at DESC
            ");
            $stmt->execute();
            $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format videos for frontend
            $formattedVideos = [];
            foreach ($videos as $video) {
                $formattedVideos[] = [
                    'id' => $video['video_id'],
                    'title' => $video['title'],
                    'description' => $video['description'],
                    'thumbnail' => $video['thumbnail_url'] ?: '🎥',
                    'duration' => $video['duration'] ?: '10:30',
                    'views' => (int)$video['view_count'],
                    'likes' => (int)$video['like_count'],
                    'price' => (float)($video['price'] ?? 0),
                    'uploadedBy' => $video['channel_title'] ?: 'Unknown Channel',
                    'uploadedAt' => $video['published_at'] ?: $video['created_at'],
                    'category' => 'education', // Default category
                    'rating' => 4.5, // Default rating
                    'status' => 'published'
                ];
            }

            echo json_encode([
                'success' => true,
                'videos' => $formattedVideos,
                'count' => count($formattedVideos)
            ]);

        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error fetching videos: ' . $e->getMessage()
            ]);
        }
        break;

    case 'get_stats':
        $userRole = requireRole(['admin', 'editor']);

        // Viewers should not access stats

        try {
            $pdo = getDB();
            if (!$pdo) {
                throw new Exception('Database connection failed');
            }

            // Get user count
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
            $userCount = $stmt->fetch()['count'];

            // Mock data for demo purposes
            $videoCount = rand(50, 200);
            $totalViews = rand(10000, 100000);
            $revenue = $totalViews * 0.001; // Mock: $0.001 per view
            $engagement = rand(75, 95);

            echo json_encode([
                'success' => true,
                'stats' => [
                    'users' => $userCount,
                    'videos' => $videoCount,
                    'revenue' => number_format($revenue, 2),
                    'engagement' => $engagement
                ]
            ]);
        } catch (Exception $e) {
            error_log('Get stats error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to fetch statistics']);
        }
        break;

    case 'forgot_password':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
        }

        $email = $input['email'] ?? '';

        if (empty($email)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email is required']);
            break;
        }

        $token = $auth->generatePasswordResetToken($email);

        if ($token) {
            // In a real application, you would send an email here
            // For demo purposes, we'll just return success
            echo json_encode([
                'success' => true, 
                'message' => 'Password reset instructions sent to your email',
                'token' => $token // Don't return this in production!
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Email not found or invalid']);
        }
        break;

    case 'get_users':
        requireRole(['admin']); // Only admins can view users

        try {
            $pdo = getDB();
            if (!$pdo) {
                throw new Exception('Database connection failed');
            }

            $stmt = $pdo->query("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'users' => $users
            ]);
        } catch (Exception $e) {
            error_log('Get users error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to fetch users']);
        }
        break;

    case 'update_user_role':
        requireRole(['admin']); // Only admins can update user roles

        $userId = $input['user_id'] ?? '';
        $newRole = $input['role'] ?? '';

        if (empty($userId) || empty($newRole)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID and role are required']);
            break;
        }

        if (!in_array($newRole, ['admin', 'editor', 'viewer'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid role']);
            break;
        }

        try {
            $pdo = getDB();
            $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
            $result = $stmt->execute([$newRole, $userId]);

            if ($result) {
                echo json_encode(['success' => true, 'message' => 'User role updated successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update user role']);
            }
        } catch (Exception $e) {
            error_log('Update user role error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to update user role']);
        }
        break;

    case 'delete_user':
        requireRole(['admin']); // Only admins can delete users

        $userId = $input['user_id'] ?? '';

        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required']);
            break;
        }

        // Prevent admin from deleting themselves
        if ($userId == $_SESSION['user_id']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
            break;
        }

        try {
            $pdo = getDB();
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $result = $stmt->execute([$userId]);

            if ($result) {
                echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
            }
        } catch (Exception $e) {
            error_log('Delete user error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>