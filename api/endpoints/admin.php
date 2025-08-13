<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../models/User.php';

header('Content-Type: application/json');

// Get database connection
$database = new Database();
$pdo = $database->getConnection();
$user = new User($pdo);

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    
    // Parse the URI to get the endpoint
    $path = parse_url($uri, PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    
    // Get request data for POST/PUT requests
    $data = json_decode(file_get_contents("php://input"), true);
    
    switch ($method) {
        case 'GET':
            if (end($pathSegments) === 'users') {
                // Check if getting single user by ID
                if (isset($_GET['id']) && !empty($_GET['id'])) {
                    $user->id = $_GET['id'];
                    if ($user->readOne()) {
                        echo json_encode([
                            'success' => true,
                            'data' => [
                                'id' => $user->id,
                                'name' => $user->name,
                                'email' => $user->email,
                                'role' => $user->role,
                                'status' => $user->status ?? 'active',
                                'email_verified_at' => $user->email_verified_at,
                                'created_at' => $user->created_at,
                                'updated_at' => $user->updated_at,
                                'joinDate' => date('M d, Y', strtotime($user->created_at)),
                                'lastActive' => 'Recently',
                                'email_verified' => $user->email_verified_at !== null
                            ]
                        ]);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'message' => 'User not found']);
                    }
                } else {
                    // Get all users for admin panel
                    $stmt = $pdo->query("
                        SELECT 
                            id,
                            name,
                            email,
                            role,
                            COALESCE(status, 'active') as status,
                            email_verified_at,
                            created_at,
                            updated_at
                        FROM users 
                        ORDER BY created_at DESC
                    ");
                    
                    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format data for admin display
                    foreach ($users as &$user) {
                        $user['joinDate'] = date('M d, Y', strtotime($user['created_at']));
                        $user['username'] = $user['name'];
                        $user['user_type'] = $user['role'];
                        $user['lastActive'] = 'Recently';
                        $user['email_verified'] = $user['email_verified_at'] !== null;
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $users
                    ]);
                }
            } elseif (end($pathSegments) === 'videos') {
                // Get all videos for admin panel - use the same structure as /api/videos
                $response = file_get_contents('http://localhost:5000/api/videos');
                $videosData = json_decode($response, true);
                
                if ($videosData && isset($videosData['data']['videos'])) {
                    $videos = $videosData['data']['videos'];
                    
                    // Format data for admin display
                    foreach ($videos as &$video) {
                        $video['creator_name'] = $video['creatorName'] ?? 'Unknown';
                        $video['creator_email'] = ''; // Not available in current structure
                        $video['upload_date'] = $video['uploadDate'] ?? date('M d, Y');
                        $video['purchase_count'] = $video['views'] ?? 0;
                        $video['views'] = $video['views'] ?? 0;
                        $video['status'] = $video['status'] ?? 'active';
                        $video['created_at'] = date('Y-m-d H:i:s');
                        
                        // Ensure thumbnail URL is properly formatted
                        if (empty($video['thumbnail'])) {
                            $video['thumbnail'] = 'https://via.placeholder.com/60x40/007bff/ffffff?text=Video';
                        }
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $videos
                    ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to load videos'
                    ]);
                }
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
            }
            break;
            
        case 'POST':
            if (end($pathSegments) === 'users') {
                // Create new user
                if (empty($data['name']) || empty($data['email']) || empty($data['role'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Name, email and role are required']);
                    break;
                }
                
                // Check if email already exists
                $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Email already exists']);
                    break;
                }
                
                $user->name = $data['name'];
                $user->email = $data['email'];
                $user->role = $data['role'];
                $user->status = $data['status'] ?? 'active';
                
                if ($user->create()) {
                    echo json_encode(['success' => true, 'message' => 'User created successfully', 'id' => $user->id]);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'message' => 'Failed to create user']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
            }
            break;
            
        case 'PUT':
            if (end($pathSegments) === 'users') {
                // Update user
                if (empty($data['id'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'User ID is required']);
                    break;
                }
                
                $user->id = $data['id'];
                
                // Check if user exists
                if (!$user->readOne()) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'User not found']);
                    break;
                }
                
                // Update fields if provided
                $user->name = $data['name'] ?? $user->name;
                $user->email = $data['email'] ?? $user->email;
                $user->role = $data['role'] ?? $user->role;
                $user->status = $data['status'] ?? $user->status;
                
                if ($user->update()) {
                    echo json_encode(['success' => true, 'message' => 'User updated successfully']);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'message' => 'Failed to update user']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
            }
            break;
            
        case 'DELETE':
            if (end($pathSegments) === 'users') {
                // Delete user
                if (empty($data['id'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'User ID is required']);
                    break;
                }
                
                $user->id = $data['id'];
                
                if ($user->delete()) {
                    echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>