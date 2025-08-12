<?php
/**
 * Authentication API Endpoints for VideoHub
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
        case 'POST':
            if (isset($path_parts[2]) && $path_parts[2] === 'login') {
                // Handle login
                $data = json_decode(file_get_contents("php://input"), true);
                
                if (empty($data['email']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email and password are required'
                    ]);
                    break;
                }
                
                // Check if user exists and password is correct
                $stmt = $db->prepare("SELECT id, name, email, role, password FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($userData && password_verify($data['password'], $userData['password'])) {
                    // Generate session token
                    $token = bin2hex(random_bytes(32));
                    
                    // Store session in database (create sessions table if needed)
                    try {
                        $sessionStmt = $db->prepare("
                            INSERT INTO user_sessions (user_id, token, expires_at) 
                            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                            ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
                        ");
                        $sessionStmt->execute([$userData['id'], $token]);
                    } catch (PDOException $e) {
                        // If sessions table doesn't exist, create it
                        $db->exec("
                            CREATE TABLE IF NOT EXISTS user_sessions (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                user_id INT NOT NULL,
                                token VARCHAR(255) NOT NULL UNIQUE,
                                expires_at DATETIME NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            )
                        ");
                        $sessionStmt = $db->prepare("
                            INSERT INTO user_sessions (user_id, token, expires_at) 
                            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                        ");
                        $sessionStmt->execute([$userData['id'], $token]);
                    }
                    
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Login successful',
                        'data' => [
                            'user' => [
                                'id' => $userData['id'],
                                'name' => $userData['name'],
                                'email' => $userData['email'],
                                'role' => $userData['role']
                            ],
                            'token' => $token
                        ]
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid email or password'
                    ]);
                }
                
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'register') {
                // Handle registration
                $data = json_decode(file_get_contents("php://input"), true);
                
                if (empty($data['firstName']) || empty($data['lastName']) || 
                    empty($data['email']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'All fields are required'
                    ]);
                    break;
                }
                
                // Check if email already exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email already registered'
                    ]);
                    break;
                }
                
                // Hash password and create user
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                $userName = $data['firstName'] . ' ' . $data['lastName'];
                $role = $data['userType'] ?? 'viewer';
                
                $stmt = $db->prepare("
                    INSERT INTO users (name, email, password, role) 
                    VALUES (?, ?, ?, ?)
                ");
                
                if ($stmt->execute([$userName, $data['email'], $hashedPassword, $role])) {
                    $userId = $db->lastInsertId();
                    
                    http_response_code(201);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Registration successful',
                        'data' => [
                            'user' => [
                                'id' => $userId,
                                'name' => $userName,
                                'email' => $data['email'],
                                'role' => $role
                            ]
                        ]
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Registration failed'
                    ]);
                }
                
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'logout') {
                // Handle logout
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';
                
                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $token = $matches[1];
                    
                    // Delete session from database
                    $stmt = $db->prepare("DELETE FROM user_sessions WHERE token = ?");
                    $stmt->execute([$token]);
                }
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Logout successful'
                ]);
                
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Auth endpoint not found'
                ]);
            }
            break;
            
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'verify') {
                // Handle token verification
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';
                
                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $token = $matches[1];
                    
                    // Check if session is valid
                    $stmt = $db->prepare("
                        SELECT u.id, u.name, u.email, u.role 
                        FROM users u 
                        JOIN user_sessions s ON u.id = s.user_id 
                        WHERE s.token = ? AND s.expires_at > NOW()
                    ");
                    $stmt->execute([$token]);
                    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($userData) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'data' => [
                                'user' => $userData
                            ]
                        ]);
                    } else {
                        http_response_code(401);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Invalid or expired token'
                        ]);
                    }
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'message' => 'No token provided'
                    ]);
                }
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Auth endpoint not found'
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