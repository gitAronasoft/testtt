<?php
/**
 * Simplified Profile API Endpoint for VideoHub
 * Streamlined user profile management without complex logic
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize authentication middleware
$authMiddleware = new AuthMiddleware($db);

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // SECURITY: Require authentication to access profile
            $currentUser = $authMiddleware->authenticate();
            if (!$currentUser) {
                $authMiddleware->sendUnauthorizedResponse();
                exit;
            }
            
            // Users can only access their own profile
            $userId = $currentUser['id'];
            
            // Simple query to get user data
            $stmt = $db->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($userData) {
                // Split name for form compatibility
                $nameParts = explode(' ', $userData['name'], 2);
                $firstName = $nameParts[0] ?? '';
                $lastName = $nameParts[1] ?? '';
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id' => $userData['id'],
                        'firstName' => $firstName,
                        'lastName' => $lastName,
                        'name' => $userData['name'],
                        'email' => $userData['email'],
                        'role' => $userData['role'],
                        'joinDate' => date('M d, Y', strtotime($userData['created_at']))
                    ]
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
            }
            break;
            
        case 'PUT':
            // Update user profile - simple approach
            $data = json_decode(file_get_contents("php://input"), true);
            $userId = $data['user_id'] ?? $_GET['user_id'] ?? null;
            
            if (!$userId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'User ID required'
                ]);
                break;
            }
            
            // Simple update query
            $updateFields = [];
            $params = [];
            
            if (isset($data['name'])) {
                $updateFields[] = "name = ?";
                $params[] = $data['name'];
            }
            
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'No fields to update'
                ]);
                break;
            }
            
            $params[] = $userId;
            $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $db->prepare($sql);
            if ($stmt->execute($params)) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Profile updated successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Update failed'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>