<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';

header('Content-Type: application/json');

// Get database connection
$database = new Database();
$pdo = $database->getConnection();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    
    // Parse the URI to get the endpoint
    $path = parse_url($uri, PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    
    switch ($method) {
        case 'GET':
            if (end($pathSegments) === 'users') {
                // Get all users for admin panel
                $stmt = $pdo->query("
                    SELECT 
                        id,
                        name,
                        email,
                        role as user_type,
                        created_at,
                        'active' as status
                    FROM users 
                    ORDER BY created_at DESC
                ");
                
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Format dates and add additional fields for admin display
                foreach ($users as &$user) {
                    $user['joinDate'] = date('M d, Y', strtotime($user['created_at']));
                    $user['username'] = $user['name']; // Use name as username
                    $user['role'] = $user['user_type'];
                    $user['lastActive'] = 'Recently'; // Placeholder since we don't track this
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $users
                ]);
                
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint not found']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>