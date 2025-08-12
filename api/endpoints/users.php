<?php
/**
 * Users API Endpoints for VideoHub
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize user object
$user = new User($db);

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'profile') {
                // Get user profile (demo endpoint)
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id' => 1,
                        'firstName' => 'John',
                        'lastName' => 'Doe',
                        'email' => 'john@example.com',
                        'role' => 'viewer',
                        'status' => 'active'
                    ]
                ]);
            } elseif (isset($path_parts[2]) && is_numeric($path_parts[2])) {
                // Get specific user
                $user->id = $path_parts[2];
                if ($user->readOne()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $user->role,
                            'status' => $user->status,
                            'created_at' => $user->created_at,
                            'updated_at' => $user->updated_at
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'User not found'
                    ]);
                }
            } else {
                // Get all users with filters
                $filters = [];
                
                if (isset($_GET['role'])) {
                    $filters['role'] = $_GET['role'];
                }
                
                if (isset($_GET['status'])) {
                    $filters['status'] = $_GET['status'];
                }
                
                if (isset($_GET['search'])) {
                    $filters['search'] = $_GET['search'];
                }
                
                if (isset($_GET['limit'])) {
                    $filters['limit'] = (int)$_GET['limit'];
                }
                
                if (isset($_GET['offset'])) {
                    $filters['offset'] = (int)$_GET['offset'];
                }

                // Get all users from database directly
                try {
                    $query = "SELECT * FROM users ORDER BY id ASC";
                    $stmt = $db->prepare($query);
                    $stmt->execute();
                    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format users data to match frontend expectations
                    $formattedUsers = [];
                    foreach ($users as $userData) {
                        $formattedUsers[] = [
                            'id' => (int)$userData['id'],
                            'firstName' => $userData['name'] ?? 'Unknown',
                            'lastName' => '', // Not available in current schema
                            'email' => $userData['email'] ?? 'unknown@example.com',
                            'role' => $userData['role'] ?? 'viewer',
                            'status' => $userData['email_verified'] ? 'active' : 'pending',
                            'joinDate' => date('Y-m-d', strtotime($userData['created_at'] ?? 'now')),
                            'profileImage' => 'https://via.placeholder.com/40x40/6c757d/ffffff?text=U'
                        ];
                    }

                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'users' => $formattedUsers
                    ]);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Server error: ' . $e->getMessage()
                    ]);
                }
            }
            break;

        case 'POST':
            // Create new user
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!empty($data['name']) && !empty($data['email']) && !empty($data['role'])) {
                $user->name = $data['name'];
                $user->email = $data['email'];
                $user->role = $data['role'];
                $user->status = isset($data['status']) ? $data['status'] : 'active';
                
                if ($user->create()) {
                    http_response_code(201);
                    echo json_encode([
                        'success' => true,
                        'message' => 'User created successfully',
                        'data' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $user->role,
                            'status' => $user->status
                        ]
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to create user'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: name, email, role'
                ]);
            }
            break;

        case 'PUT':
            // Update user
            if (isset($path_parts[2]) && is_numeric($path_parts[2])) {
                $data = json_decode(file_get_contents("php://input"), true);
                
                $user->id = $path_parts[2];
                
                if (!empty($data['name']) && !empty($data['email']) && !empty($data['role'])) {
                    $user->name = $data['name'];
                    $user->email = $data['email'];
                    $user->role = $data['role'];
                    $user->status = isset($data['status']) ? $data['status'] : 'active';
                    
                    if ($user->update()) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'User updated successfully'
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Unable to update user'
                        ]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Missing required fields: name, email, role'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'User ID is required'
                ]);
            }
            break;

        case 'DELETE':
            // Delete user
            if (isset($path_parts[2]) && is_numeric($path_parts[2])) {
                $user->id = $path_parts[2];
                
                if ($user->delete()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'User deleted successfully'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to delete user'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'User ID is required'
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