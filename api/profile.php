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
        $stmt = $conn->prepare("SELECT id, name, email, role, bio, website,  created_at, updated_at FROM users WHERE id = ?");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $profile = $result->fetch_assoc();
            
            // Parse JSON fields


            
            // Get user statistics based on role
            $stats = getUserStats($user_id, $profile['role']);
            $profile['stats'] = $stats;
            
            // Add computed fields
            $profile['member_since_formatted'] = formatDate($profile['created_at']);
            $profile['profile_completion'] = calculateProfileCompletion($profile);
            
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

function calculateProfileCompletion($profile) {
    $fields = ['name', 'email', 'bio', 'location', 'phone'];
    $completed = 0;
    
    foreach ($fields as $field) {
        if (!empty($profile[$field])) {
            $completed++;
        }
    }
    
    return round(($completed / count($fields)) * 100);
}

function formatDate($dateString) {
    if (!$dateString) return 'Unknown';
    
    $date = new DateTime($dateString);
    return $date->format('M j, Y');
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
        // Handle password update
        if (isset($input['action']) && $input['action'] === 'update_password') {
            handlePasswordUpdate($input, $user_id, $conn);
            return;
        }
        
        // Validate and sanitize input
        $name = isset($input['name']) ? trim($input['name']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        $bio = isset($input['bio']) ? trim($input['bio']) : '';
        $website = isset($input['website']) ? trim($input['website']) : '';
        $location = isset($input['location']) ? trim($input['location']) : '';
        $date_of_birth = isset($input['date_of_birth']) ? $input['date_of_birth'] : null;
        $gender = isset($input['gender']) ? $input['gender'] : '';
        
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
        
        // Validate bio length
        if (strlen($bio) > 500) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Bio must be less than 500 characters']);
            return;
        }
        
        // Update user profile - First check if columns exist, add if they don't
        $columns_to_add = [
            'phone' => 'VARCHAR(20)',
            'location' => 'VARCHAR(100)',
            'date_of_birth' => 'DATE',
            'gender' => 'ENUM("male", "female", "other", "prefer_not_to_say")',
            'preferences' => 'JSON',
            'privacy_settings' => 'JSON'
        ];
        
        foreach ($columns_to_add as $column => $type) {
            $check_column = $conn->query("SHOW COLUMNS FROM users LIKE '$column'");
            if ($check_column->num_rows == 0) {
                $conn->query("ALTER TABLE users ADD COLUMN $column $type");
            }
        }
        
        // Prepare preferences and privacy settings JSON
        $preferences = json_encode([
            'theme' => $input['theme'] ?? 'light',
            'language' => $input['language'] ?? 'en',
            'timezone' => $input['timezone'] ?? 'UTC',
            'date_format' => $input['date_format'] ?? 'MM/DD/YYYY',
            'email_notifications' => $input['email_notifications'] ?? [],
            'push_notifications' => $input['push_notifications'] ?? []
        ]);
        
        $privacy_settings = json_encode([
            'profile_visibility' => $input['profile_visibility'] ?? 'public',
            'analytics_opt_in' => $input['analytics_opt_in'] ?? true,
            'allow_direct_messages' => $input['allow_direct_messages'] ?? true,
            'third_party_sharing' => $input['third_party_sharing'] ?? false
        ]);
        
        // Update user profile
        $stmt = $conn->prepare("UPDATE users SET name = ?, phone = ?, bio = ?, website = ?, location = ?, date_of_birth = ?, gender = ?, preferences = ?, privacy_settings = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("ssssssssss", $name, $phone, $bio, $website, $location, $date_of_birth, $gender, $preferences, $privacy_settings, $user_id);
        
        if ($stmt->execute()) {
            // Update session data
            $_SESSION['user']['name'] = $name;
            
            // Get updated profile
            $stmt = $conn->prepare("SELECT id, name, email, role, phone, bio, website, location, date_of_birth, gender, preferences, privacy_settings, profile_picture, created_at, updated_at FROM users WHERE id = ?");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $profile = $result->fetch_assoc();
            
            // Parse JSON fields
            if ($profile['preferences']) {
                $profile['preferences'] = json_decode($profile['preferences'], true);
            }
            if ($profile['privacy_settings']) {
                $profile['privacy_settings'] = json_decode($profile['privacy_settings'], true);
            }
            
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

function handlePasswordUpdate($input, $user_id, $conn) {
    $current_password = $input['current_password'] ?? '';
    $new_password = $input['new_password'] ?? '';
    
    if (empty($current_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Current password and new password are required']);
        return;
    }
    
    // Validate new password strength
    if (strlen($new_password) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters long']);
        return;
    }
    
    try {
        // Get current password hash
        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows !== 1) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            return;
        }
        
        $user = $result->fetch_assoc();
        
        // Verify current password
        if (!password_verify($current_password, $user['password'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
            return;
        }
        
        // Hash new password
        $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        // Update password
        $stmt = $conn->prepare("UPDATE users SET password = ?, password_updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("ss", $new_password_hash, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Password updated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update password']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
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
