
<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_SESSION['user']['id'];

switch ($method) {
    case 'GET':
        handleGetProfile();
        break;
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        handleUpdateProfile($input);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function handleGetProfile() {
    global $user_id;
    
    $conn = getConnection();
    
    try {
        $stmt = $conn->prepare("SELECT id, name, email, role, bio, website, profile_picture, created_at FROM users WHERE id = ?");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $profile = $result->fetch_assoc();
            
            // Get user statistics based on role
            $stats = getUserStats($user_id, $profile['role']);
            $profile['stats'] = $stats;
            
            echo json_encode([
                'success' => true,
                'profile' => $profile
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Profile not found']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    } finally {
        $conn->close();
    }
}

function handleUpdateProfile($input) {
    global $user_id;
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        return;
    }
    
    $conn = getConnection();
    
    try {
        // Validate and sanitize input
        $name = isset($input['name']) ? trim($input['name']) : '';
        $bio = isset($input['bio']) ? trim($input['bio']) : '';
        $website = isset($input['website']) ? trim($input['website']) : '';
        
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            return;
        }
        
        // Validate website URL if provided
        if (!empty($website) && !filter_var($website, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid website URL']);
            return;
        }
        
        // Update user profile
        $stmt = $conn->prepare("UPDATE users SET name = ?, bio = ?, website = ? WHERE id = ?");
        $stmt->bind_param("ssss", $name, $bio, $website, $user_id);
        
        if ($stmt->execute()) {
            // Update session data
            $_SESSION['user']['name'] = $name;
            
            // Get updated profile
            $stmt = $conn->prepare("SELECT id, name, email, role, bio, website, profile_picture, created_at FROM users WHERE id = ?");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $profile = $result->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully',
                'profile' => $profile
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    } finally {
        $conn->close();
    }
}

function getUserStats($user_id, $role) {
    $conn = getConnection();
    $stats = ['videos' => 0, 'views' => 0, 'earnings' => 0, 'purchases' => 0];
    
    try {
        switch ($role) {
            case 'admin':
                // Total videos and views for admin
                $stmt = $conn->prepare("SELECT COUNT(*) as total_videos, COALESCE(SUM(views), 0) as total_views FROM videos");
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $stats['videos'] = $result['total_videos'];
                $stats['views'] = $result['total_views'];
                break;
                
            case 'creator':
            case 'editor':
                // Creator's videos and views
                $stmt = $conn->prepare("SELECT COUNT(*) as my_videos, COALESCE(SUM(views), 0) as my_views FROM videos WHERE uploader_id = ?");
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $stats['videos'] = $result['my_videos'];
                $stats['views'] = $result['my_views'];
                
                // Creator's earnings
                $stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total_earnings FROM purchases p JOIN videos v ON p.video_id = v.id WHERE v.uploader_id = ?");
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $stats['earnings'] = $result['total_earnings'];
                break;
                
            case 'viewer':
                // Viewer's purchases
                $stmt = $conn->prepare("SELECT COUNT(*) as purchase_count, COALESCE(SUM(amount), 0) as total_spent FROM purchases WHERE user_id = ?");
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $result = $stmt->get_result()->fetch_assoc();
                $stats['purchases'] = $result['purchase_count'];
                $stats['views'] = $result['total_spent']; // Using views field for total spent for viewers
                break;
        }
    } catch (Exception $e) {
        error_log("Error getting user stats: " . $e->getMessage());
    } finally {
        $conn->close();
    }
    
    return $stats;
}
?>
